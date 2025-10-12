import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/connect-to-db";
import { httpStatusResponse } from "@/lib/utils";
import { Transaction } from "@/models/transactions";

type Timeframe = "today" | "yesterday" | "last-week" | "all";

// Timezone constant
const TIMEZONE = "Africa/Lagos"; // West Africa Time (WAT/UTC+1)
const WAT_OFFSET_MS = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Get date range for a given timeframe in Nigeria timezone (WAT)
 * Returns dates adjusted for querying UTC-stored MongoDB timestamps
 */
function getDateRange(timeframe: Timeframe) {
  if (timeframe === "all") return {} as Record<string, any>;

  const now = new Date();

  // Adjust current time to WAT
  const watNow = new Date(now.getTime() + WAT_OFFSET_MS);

  if (timeframe === "today") {
    // Start of day at 00:00:00 WAT (stored as UTC)
    const start = new Date(
      Date.UTC(
        watNow.getUTCFullYear(),
        watNow.getUTCMonth(),
        watNow.getUTCDate(),
        0,
        0,
        0,
        0
      ) - WAT_OFFSET_MS
    );

    // End of day at 23:59:59.999 WAT (stored as UTC)
    const end = new Date(
      Date.UTC(
        watNow.getUTCFullYear(),
        watNow.getUTCMonth(),
        watNow.getUTCDate(),
        23,
        59,
        59,
        999
      ) - WAT_OFFSET_MS
    );

    return { $gte: start, $lte: end };
  }

  if (timeframe === "yesterday") {
    // Get yesterday in WAT
    const watYesterday = new Date(watNow);
    watYesterday.setUTCDate(watNow.getUTCDate() - 1);

    // Start of yesterday at 00:00:00 WAT (stored as UTC)
    const start = new Date(
      Date.UTC(
        watYesterday.getUTCFullYear(),
        watYesterday.getUTCMonth(),
        watYesterday.getUTCDate(),
        0,
        0,
        0,
        0
      ) - WAT_OFFSET_MS
    );

    // End of yesterday at 23:59:59.999 WAT (stored as UTC)
    const end = new Date(
      Date.UTC(
        watYesterday.getUTCFullYear(),
        watYesterday.getUTCMonth(),
        watYesterday.getUTCDate(),
        23,
        59,
        59,
        999
      ) - WAT_OFFSET_MS
    );

    return { $gte: start, $lte: end };
  }

  // last-week: last 7 full days including today in WAT
  const watStartDay = new Date(watNow);
  watStartDay.setUTCDate(watNow.getUTCDate() - 6);

  // Start of 7 days ago at 00:00:00 WAT (stored as UTC)
  const start = new Date(
    Date.UTC(
      watStartDay.getUTCFullYear(),
      watStartDay.getUTCMonth(),
      watStartDay.getUTCDate(),
      0,
      0,
      0,
      0
    ) - WAT_OFFSET_MS
  );

  // End of today at 23:59:59.999 WAT (stored as UTC)
  const end = new Date(
    Date.UTC(
      watNow.getUTCFullYear(),
      watNow.getUTCMonth(),
      watNow.getUTCDate(),
      23,
      59,
      59,
      999
    ) - WAT_OFFSET_MS
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
