import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/connect-to-db";
import { httpStatusResponse } from "@/lib/utils";
import { Transaction } from "@/models/transactions";
import { DataPlan } from "@/models/data-plan";

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

    const sp = request?.nextUrl?.searchParams;
    const timeframe = (sp?.get("timeframe") as Timeframe) || "today";
    const network = sp?.get("network");

    const createdAtRange = getDateRange(timeframe);

    // Step 1: Get all data plans (with optional network filter)
    const dataPlanFilter: any = {};
    if (network) {
      dataPlanFilter.network = network;
    }

    const dataPlans = await DataPlan?.find(dataPlanFilter)?.lean();

    // Step 2: For each data plan, find transactions and calculate totals
    const results = [];

    for (const plan of dataPlans || []) {
      // Build transaction filter
      const transactionFilter: any = {
        type: "data",
        status: "success",
        "meta.dataId": plan?._id,
      };

      // Add date range if not "all"
      if (Object.keys(createdAtRange || {}).length > 0) {
        transactionFilter.createdAt = createdAtRange;
      }

      // Get transactions for this plan
      const transactions = await Transaction?.find(transactionFilter)?.lean();

      if (transactions?.length > 0) {
        // Calculate totals
        const totalAmount =
          transactions?.reduce((sum, tx) => sum + (tx?.amount || 0), 0) || 0;
        const totalDataAmount =
          (plan?.dataAmount || 0) * (transactions?.length || 0);

        results.push({
          network: plan?.network,
          type: plan?.type,
          dataAmountSold: totalDataAmount,
          amount: totalAmount,
        });
      }
    }

    // Step 3: Group by network and type
    const groupedResults: Record<string, any> = {};

    results?.forEach((item) => {
      const key = `${item?.network}-${item?.type}`;
      if (groupedResults?.[key]) {
        groupedResults[key].dataAmountSold += item?.dataAmountSold || 0;
        groupedResults[key].amount += item?.amount || 0;
      } else {
        groupedResults[key] = { ...item };
      }
    });

    // Convert to array and sort
    const finalResults =
      Object.values(groupedResults || {})?.sort((a: any, b: any) => {
        if (a?.network !== b?.network) {
          return (a?.network || "").localeCompare(b?.network || "");
        }
        return (a?.type || "").localeCompare(b?.type || "");
      }) || [];

    return NextResponse.json(
      httpStatusResponse(200, undefined, { items: finalResults || [] }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in data-sold API:", error);
    return NextResponse.json(
      httpStatusResponse(
        500,
        (error as Error).message || "Internal Server Error"
      ),
      { status: 500 }
    );
  }
}
