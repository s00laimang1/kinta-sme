import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/connect-to-db";
import { httpStatusResponse } from "@/lib/utils";
import { Transaction } from "@/models/transactions";
// DataPlan no longer needed for aggregation; we compute from transaction meta

type Timeframe = "today" | "yesterday" | "last-week" | "all";

function getDateRange(timeframe: Timeframe) {
  if (timeframe === "all") return {} as Record<string, any>;

  const now = new Date();

  if (timeframe === "today") {
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );
    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
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

    // Step 1: Fetch all successful data transactions within timeframe
    const transactionFilter: any = {
      type: "data",
      status: "success",
    };
    if (Object.keys(createdAtRange || {}).length > 0) {
      transactionFilter.createdAt = createdAtRange;
    }
    if (network) {
      transactionFilter["meta.network"] = network;
    }

    const dataTransactions = await Transaction?.find(transactionFilter)?.lean();

    if (!dataTransactions?.length) {
      return NextResponse.json(
        httpStatusResponse(200, undefined, { items: [] }),
        { status: 200 }
      );
    }

    // Step 2: Aggregate directly from transaction meta by network and type
    const groupedResults: Record<string, any> = {};

    for (const tx of dataTransactions || []) {
      const meta = tx?.meta || {};
      const net = meta?.network;
      const typ = meta?.type;
      if (!net || !typ) continue;

      const key = `${net}-${typ}`;
      if (!groupedResults[key]) {
        groupedResults[key] = {
          network: net,
          type: typ,
          dataAmountSold: 0,
          amount: 0,
        };
      }

      groupedResults[key].amount += Number(tx?.amount || 0);
      groupedResults[key].dataAmountSold += Number(meta?.dataAmount || 0);
    }

    // Step 3: Convert to array and sort
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
