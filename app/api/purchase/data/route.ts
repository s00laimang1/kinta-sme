import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { httpStatusResponse } from "@/lib/utils";
import { User } from "@/models/users";
import { DataPlan } from "@/models/data-plan";
import { dataRequestSchema } from "@/lib/validator.schema";
import { App } from "@/models/app";
import { connectToDatabase } from "@/lib/connect-to-db";
import { BuyVTU } from "@/lib/server-utils";
import { dataPlan, IBuyVtuNetworks } from "@/types";
import { format } from "date-fns";
import { Transaction } from "@/models/transactions"; // Add this import
import { inngest } from "@/inngest/client";

// Add a new schema for idempotency
const dataRequestSchemaWithIdempotency = dataRequestSchema.extend({
  idempotencyKey: z.string(),
});

export async function POST(request: Request) {
  const buyVtu = new BuyVTU();
  let isTransactionCommitted = false;
  let user: any = null;

  try {
    const body = await request.json();
    const validationResult = dataRequestSchemaWithIdempotency.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        httpStatusResponse(
          400,
          "INVALID_DATA_REQUEST: The format of your request is invalid",
          validationResult.error.format(),
        ),
        { status: 400 },
      );
    }

    const {
      pin,
      _id,
      phoneNumber,
      byPassValidator = false,
      idempotencyKey,
    } = validationResult.data;

    // Get the email of the current authenticated user
    const serverSession = await getServerSession();

    if (!serverSession?.user?.email) {
      throw new Error(
        "UNAUTHORIZED_REQUEST: Please login before you continue.",
      );
    }

    await connectToDatabase();

    const userEmail = serverSession.user.email;

    // Find the current user in the db
    user = await User.findOne({ "auth.email": userEmail }).select(
      "+auth.transactionPin",
    );

    if (!user) {
      throw new Error("USER_NOT_FOUND: please contact admin");
    }

    // Check for existing transaction with same idempotency key (if provided)
    if (idempotencyKey) {
      const existingTransaction = await Transaction.exists({
        user: user._id,
        "meta.idempotencyKey": idempotencyKey,
        type: "data",
        createdAt: {
          $gte: new Date(Date.now() - 10 * 60 * 1000), // Within last 10 minutes
        },
      });

      if (!!existingTransaction?._id) {
        // Return the existing transaction result
        return NextResponse.json(
          httpStatusResponse(
            200,
            "Transaction already processed",
            existingTransaction._id,
          ),
          { status: 200 },
        );
      }
    }

    // Verify the user transaction pin
    await user?.verifyTransactionPin(pin);

    // Find data plan
    const dataPlan = await DataPlan.findById(_id);

    if (!dataPlan) {
      throw new Error("PLAN_NOT_FOUND: we cannot find this plan");
    }

    if (dataPlan.isDisabled || dataPlan.removedFromList) {
      throw new Error(
        "PLAN_DISABLED: this plan is disabled and cannot be purchased at the moment",
      );
    }

    // Start session after all validations
    await buyVtu.startSession();

    // Get the entire application configuration
    const app = await App.findOne({}).select("+buyVtu").session(buyVtu.session);

    const disablePlan = app?.disabledPlans.find((plan) => {
      const [ntwk = "", planType = ""] = plan.split("-");

      return (
        ntwk.toLowerCase() === dataPlan.network.toLowerCase() &&
        planType.toLowerCase() === dataPlan.type.toLowerCase()
      );
    });

    if (!!disablePlan) {
      return NextResponse.json(
        httpStatusResponse(400, "Plan has been disabled"),
        { status: 400 },
      );
    }

    await app?.systemIsunderMaintainance();
    await app?.isTransactionEnable("data");

    // Check the transaction limit
    await app?.checkTransactionLimit(dataPlan.amount);

    // Verify user has sufficient balance
    await user.verifyUserBalance(dataPlan.amount);

    // Set network
    buyVtu.setNetwork = dataPlan.network;

    // Create a unique reference for this transaction
    const transactionRef = buyVtu.createRequestIdForVtuPass();

    // Update user balance with session
    await user.updateOne(
      { $inc: { balance: -dataPlan.amount } },
      { session: buyVtu.session },
    );

    // Create transaction record BEFORE making external API calls
    buyVtu.amount = dataPlan?.amount;

    // Pre-create transaction with pending status
    await buyVtu.createPendingTransaction("data", user.id, {
      //@ts-ignore
      ...dataPlan?.toJSON(),
      payerName: user.fullName,
      completionTime: format(new Date(), "PPP"),
      customerPhone: phoneNumber,
      applicableCountry: "NG",
      idempotencyKey: idempotencyKey,
      transactionRef: transactionRef,
      phoneNumber,
      dataId: dataPlan._id,
    });

    // Commit the balance deduction and pending transaction
    await buyVtu.commitSession();
    isTransactionCommitted = true;

    // Send event to Inngest
    await inngest.send({
      name: "kinta-sme/purchase.data",
      data: {
        phoneNumber,
        planId: dataPlan._id,
        userEmail,
        transactionId: transactionRef,
      },
    });

    return NextResponse.json(
      httpStatusResponse(
        200,
        "Your data purchase is being processed. You will be notified once it is completed.",
        {
          transactionRef: transactionRef,
          vendingSuccess: true,
        },
      ),
      { status: 200 },
    );
  } catch (error) {
    console.error("Data purchase error:", error);

    // If transaction hasn't been committed and we have an active session, abort it
    if (!isTransactionCommitted && buyVtu.session) {
      try {
        await buyVtu.abortSession();
      } catch (abortError) {
        console.error("Error aborting transaction:", abortError);
      }
    }

    // Determine appropriate status code
    const statusCode = error instanceof z.ZodError ? 400 : 500;
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";

    return NextResponse.json(httpStatusResponse(statusCode, errorMessage), {
      status: statusCode,
    });
  } finally {
    // Clean up session
    if (buyVtu.session) {
      try {
        await buyVtu.endSession();
      } catch (endError) {
        console.error("Error ending session:", endError);
      }
    }
  }
}
