import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/connect-to-db";
import { httpStatusResponse } from "@/lib/utils";
import { Transaction } from "@/models/transactions";

type Timeframe = "today" | "yesterday" | "last-week" | "all";

function getDateRange(timeframe: Timeframe) {
  if (timeframe === "all") return {} as Record<string, any>;

  const now = new Date();

  if (timeframe === "today") {
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );
    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );
    return { $gte: start, $lte: end };
  }

  if (timeframe === "yesterday") {
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    const start = new Date(
      y.getFullYear(),
      y.getMonth(),
      y.getDate(),
      0,
      0,
      0,
      0
    );
    const end = new Date(
      y.getFullYear(),
      y.getMonth(),
      y.getDate(),
      23,
      59,
      59,
      999
    );
    return { $gte: start, $lte: end };
  }

  // last-week: last 7 full days including today
  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );
  return { $gte: start, $lte: end };
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const sp = request.nextUrl.searchParams;
    const timeframe = (sp.get("timeframe") as Timeframe) || "today";
    const network = sp.get("network"); // Optional: Mtn | Airtel | Glo | 9Mobile

    const createdAtRange = getDateRange(timeframe);

    const matchStage: Record<string, any> = {
      type: "data",
      status: "success",
    };

    if (Object.keys(createdAtRange).length > 0) {
      matchStage.createdAt = createdAtRange;
    }

    // Only transactions that have a dataId in meta
    matchStage["meta.dataId"] = { $exists: true, $ne: null };

    const pipeline: any[] = [
      { $match: matchStage },
      // Join DataPlan by meta.dataId to get network, type, and dataAmount
      {
        $lookup: {
          from: "dataplans",
          let: { planId: "$meta.dataId" },
          pipeline: [
            {
              $match: { $expr: { $eq: ["$_id", { $toObjectId: "$$planId" }] } },
            },
            { $project: { network: 1, type: 1, dataAmount: 1 } },
          ],
          as: "plan",
        },
      },
      { $unwind: { path: "$plan", preserveNullAndEmptyArrays: false } },
      // Optional network filter
      ...(network ? [{ $match: { "plan.network": network } }] : []),
      {
        $group: {
          _id: { network: "$plan.network", type: "$plan.type" },
          dataAmountSold: { $sum: { $ifNull: ["$plan.dataAmount", 0] } },
          amount: { $sum: "$amount" },
        },
      },
      {
        $project: {
          _id: 0,
          network: "$_id.network",
          type: "$_id.type",
          dataAmountSold: 1,
          amount: 1,
        },
      },
      { $sort: { network: 1, type: 1 } },
    ];

    const result = await Transaction.aggregate(pipeline);

    return NextResponse.json(
      httpStatusResponse(200, undefined, { items: result }),
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      httpStatusResponse(
        500,
        (error as Error).message || "Internal Server Error"
      ),
      { status: 500 }
    );
  }
}
