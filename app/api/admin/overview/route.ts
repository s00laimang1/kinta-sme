import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/connect-to-db";
import { Transaction } from "@/models/transactions";
import { formatCurrency, httpStatusResponse } from "@/lib/utils";
import { User } from "@/models/users";

// Type definitions for aggregation results
interface AggregationResult {
  _id: null;
  total?: number;
  totalAmount?: number;
}

/**
 * Get start and end of day in a specific timezone
 * @param timezone - IANA timezone string (e.g., 'Africa/Lagos')
 * @returns Object with startOfDay and endOfDay Date objects in UTC
 */
function getDayBoundaries(timezone: string = "Africa/Lagos") {
  const now = new Date();

  // Get the current date string in the specified timezone
  const dateStr = now.toLocaleDateString("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }); // Returns 'YYYY-MM-DD'

  // Create start of day (00:00:00) in the target timezone
  const startOfDayLocal = new Date(`${dateStr}T00:00:00`);
  const startOfDay = new Date(
    startOfDayLocal.toLocaleString("en-US", { timeZone: timezone })
  );

  // Create end of day (23:59:59.999) in the target timezone
  const endOfDayLocal = new Date(`${dateStr}T23:59:59.999`);
  const endOfDay = new Date(
    endOfDayLocal.toLocaleString("en-US", { timeZone: timezone })
  );

  // Convert back to UTC for MongoDB query
  const utcOffset = startOfDay.getTimezoneOffset() * 60 * 1000;

  return {
    startOfDay: new Date(startOfDayLocal.getTime() - utcOffset),
    endOfDay: new Date(endOfDayLocal.getTime() - utcOffset),
  };
}

export async function GET() {
  try {
    await connectToDatabase();

    // Get day boundaries in West Africa Time (Nigeria timezone)
    const { startOfDay, endOfDay } = getDayBoundaries("Africa/Lagos");

    // Run all queries in parallel for better performance
    const [totalTransactions, users, todaysPayment, totalUserBalance] =
      await Promise.all([
        // Total successful funding transactions
        Transaction.aggregate<AggregationResult>([
          {
            $match: {
              status: "success",
              type: "funding",
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" },
            },
          },
        ]),

        // Total user count
        User.countDocuments({}),

        // Today's successful funding payments
        Transaction.aggregate<AggregationResult>([
          {
            $match: {
              type: "funding",
              status: "success",
              createdAt: {
                $gte: startOfDay,
                $lte: endOfDay,
              },
            },
          },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: "$amount" },
            },
          },
        ]),

        // Total balance across all users
        User.aggregate<AggregationResult>([
          {
            $group: {
              _id: null,
              totalAmount: { $sum: "$balance" },
            },
          },
        ]),
      ]);

    // Extract values with proper null handling
    const _totalTransactions = totalTransactions[0]?.total || 0;
    const _todaysPayment = todaysPayment[0]?.totalAmount || 0;
    const _totalUserBalance = totalUserBalance[0]?.totalAmount || 0;

    // Return combined data
    return NextResponse.json(
      httpStatusResponse(200, undefined, {
        totalTransactions: formatCurrency(_totalTransactions),
        users,
        todaysPayment: formatCurrency(_todaysPayment),
        totalUsersBalance: formatCurrency(_totalUserBalance),
      })
    );
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      httpStatusResponse(500, (error as Error).message),
      { status: 500 }
    );
  }
}
