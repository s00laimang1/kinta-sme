import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/connect-to-db";
import { Transaction } from "@/models/transactions";
import { formatCurrency, httpStatusResponse } from "@/lib/utils";
import { User } from "@/models/users";

export async function GET() {
  try {
    await connectToDatabase();

    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      1, // 1 AM
      0,
      0,
      0
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      12, // 12 PM
      59, // 59 minutes
      59, // 59 seconds
      999 // 999 milliseconds
    );

    const totalTransactions = await Transaction.aggregate([
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
    ]);

    const users = await User.countDocuments({});

    const todaysPayment = await Transaction.aggregate([
      {
        $match: {
          type: "funding",
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
    ]);

    const totalUserBalance = await User.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$balance" },
        },
      },
    ]);

    const _totalTransactions =
      totalTransactions.length > 0 ? totalTransactions[0].total : 0;

    // Return combined data
    return NextResponse.json(
      httpStatusResponse(200, undefined, {
        totalTransactions: formatCurrency(_totalTransactions),
        users,
        todaysPayment:
          formatCurrency(todaysPayment[0]?.totalAmount) || formatCurrency(0),
        totalUsersBalance: formatCurrency(
          totalUserBalance?.[0]?.totalAmount || 0
        ),
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
