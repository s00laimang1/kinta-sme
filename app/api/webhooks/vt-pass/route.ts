import { httpStatusResponse } from "@/lib/utils";
import { Transaction } from "@/models/transactions";
import { NextRequest, NextResponse } from "next/server";
import { refundUser } from "@/lib/server-utils";
import { connectToDatabase } from "@/lib/connect-to-db";
import mongoose from "mongoose";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    // 1. Validate Payload
    if (type !== "transaction-update" || !data) {
      return NextResponse.json(
        httpStatusResponse(400, "Invalid payload or type"),
        { status: 400 },
      );
    }

    const { requestId, content } = data;
    const tx_ref = requestId;
    const vtpassStatus = content?.transactions?.status;

    if (!tx_ref) {
      return NextResponse.json(
        httpStatusResponse(400, "Missing requestId (tx_ref)"),
        { status: 400 },
      );
    }

    await connectToDatabase();

    // 2. Find the transaction
    // robust search for custom refs or ObjectIds
    const orConditions: any[] = [{ tx_ref }, { "meta.transactionRef": tx_ref }];

    if (mongoose.isValidObjectId(tx_ref)) {
      orConditions.push({ _id: new mongoose.Types.ObjectId(tx_ref) });
    }

    const transactionRecord = await Transaction.findOne({
      $or: orConditions,
    });

    if (!transactionRecord) {
      console.error(`VTpass Webhook: Transaction not found for ref ${tx_ref}`);
      return NextResponse.json(
        httpStatusResponse(404, "Transaction not found"),
        { status: 404 },
      );
    }

    // 3. Check for idempotency
    if (
      transactionRecord.status === "success" ||
      transactionRecord.status === "failed" ||
      transactionRecord.status === "refunded"
    ) {
      return NextResponse.json(
        httpStatusResponse(200, "Transaction already processed"),
        { status: 200 },
      );
    }

    // 4. Determine Status
    let isSuccess = false;
    let isReversal = false;

    if (vtpassStatus === "delivered") {
      isSuccess = true;
    } else if (vtpassStatus === "reversed") {
      isReversal = true;
      isSuccess = false;
    } else {
      // "initiated", "pending", etc. - ignore or log
      return NextResponse.json(
        httpStatusResponse(200, `Status ${vtpassStatus} ignored`),
        { status: 200 },
      );
    }

    // 5. Update Transaction
    await Transaction.updateOne(
      { _id: transactionRecord._id },
      {
        $set: {
          status: isSuccess ? "success" : "failed",
          "meta.vendingResponse": data,
          "meta.vendingSuccess": isSuccess,
          "meta.vendingMessage": isSuccess
            ? "Transaction Delivered"
            : "Transaction Reversed/Failed",
          "meta.completedAt": new Date(),
        },
      },
    );

    // 6. Handle Refund for Reversals
    if (isReversal) {
      console.log(
        `VTpass Webhook: Transaction ${transactionRecord._id} REVERSED. Initiating refund...`,
      );
      try {
        const refundResult = await refundUser(transactionRecord._id.toString());
        if (!refundResult.success) {
          console.error(
            `VTpass Webhook: Failed to refund transaction ${transactionRecord._id}`,
          );
        }
      } catch (refundError) {
        console.error("VTpass Webhook: Refund validation error:", refundError);
      }
    }

    return NextResponse.json(
      httpStatusResponse(200, "Webhook processed successfully"),
      { status: 200 },
    );
  } catch (error) {
    console.error("VTpass Webhook Error:", error);
    return NextResponse.json(
      httpStatusResponse(500, (error as Error).message),
      { status: 500 },
    );
  }
}
