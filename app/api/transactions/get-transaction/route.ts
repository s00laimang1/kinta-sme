import { httpStatusResponse } from "@/lib/utils";
import { Transaction } from "@/models/transactions";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams;
    const tx_ref = q.get("tx_ref");
    const useExpirationDate = q.get("useExpirationDate") || true;

    let query: Record<string, any> = {};

    if (useExpirationDate !== "false") {
      query["meta.expirationTime"] = { $gte: new Date().toISOString() };
    }

    const transaction = await Transaction.findOne({
      $or: [
        { tx_ref },
        { "meta.transactionRef": tx_ref },
        ...(mongoose.isValidObjectId(tx_ref)
          ? [{ _id: new mongoose.Types.ObjectId(tx_ref!) }]
          : []),
      ],
      //...query,
    });

    console.log(transaction);

    return NextResponse.json(httpStatusResponse(200, "Success", transaction), {
      status: 200,
    });
  } catch (error) {
    return NextResponse.json(
      httpStatusResponse(500, (error as Error).message),
      { status: 500 },
    );
  }
}
