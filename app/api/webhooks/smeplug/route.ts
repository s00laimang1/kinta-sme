import { httpStatusResponse } from "@/lib/utils";
import { Transaction } from "@/models/transactions";
import { NextRequest, NextResponse } from "next/server";
import { refundUser } from "@/lib/server-utils";
import { connectToDatabase } from "@/lib/connect-to-db";
import mongoose from "mongoose";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transaction } = body;

    if (!transaction) {
      return NextResponse.json(
        httpStatusResponse(400, "Invalid payload: 'transaction' field missing"),
        { status: 400 },
      );
    }

    const {
      status,
      customer_reference: tx_ref,
      response: vendingMessage,
    } = transaction;

    await connectToDatabase();

    // 1. Find the transaction
    const transactionRecord = await Transaction.findOne({
      $or: [
        { tx_ref },
        { "meta.transactionRef": tx_ref },
        ...(mongoose.isValidObjectId(tx_ref)
          ? [{ _id: new mongoose.Types.ObjectId(tx_ref!) }]
          : []),
      ],
    });

    if (!transactionRecord) {
      console.error(`Webhook: Transaction not found for ref ${tx_ref}`);
      return NextResponse.json(
        httpStatusResponse(404, "Transaction not found"),
        { status: 404 },
      );
    }

    // 2. Check for idempotency (if already processed)
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

    // 3. Update status based on webhook payload
    const isSuccess = status === "success";

    await Transaction.updateOne(
      { _id: transactionRecord._id },
      {
        $set: {
          status: isSuccess ? "success" : "failed",
          "meta.vendingResponse": transaction,
          "meta.vendingSuccess": isSuccess,
          "meta.vendingMessage": vendingMessage,
          "meta.completedAt": new Date(),
        },
      },
    );

    // 4. Handle Refund if failed
    if (!isSuccess) {
      console.log(
        `Webhook: Transaction ${transactionRecord._id} failed. Initiating refund...`,
      );
      try {
        const refundResult = await refundUser(transactionRecord._id.toString());
        if (!refundResult.success) {
          console.error(
            `Webhook: Failed to refund transaction ${transactionRecord._id}`,
          );
        }
      } catch (refundError) {
        console.error("Webhook: Refund validation error:", refundError);
        // We still return 200 to acknowledge the webhook, but maybe log this critically
      }
    }

    return NextResponse.json(
      httpStatusResponse(200, "Webhook processed successfully"),
      { status: 200 },
    );
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json(
      httpStatusResponse(500, (error as Error).message),
      { status: 500 },
    );
  }
}
