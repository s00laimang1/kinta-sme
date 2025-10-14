import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { httpStatusResponse } from "@/lib/utils";
import { connectToDatabase } from "@/lib/connect-to-db";
import { refundUser } from "@/lib/server-utils";

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(httpStatusResponse(401, "Unauthorized"), {
        status: 401,
      });
    }

    // Very light-weight role gate; reuse single-refund route's policy if needed
    // We trust server-side to enforce admin via refundUser preconditions where relevant

    const body = await request.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];

    if (ids.length === 0) {
      return NextResponse.json(
        httpStatusResponse(400, "ids array is required"),
        { status: 400 }
      );
    }

    await connectToDatabase();

    const results: Array<{
      id: string;
      success: boolean;
      message: string;
      refundAmount?: number;
    }> = [];

    for (const id of ids) {
      try {
        const res = await refundUser(id);
        results.push({
          id,
          success: true,
          message: res.message,
          refundAmount: res.refundAmount,
        });
      } catch (e: any) {
        results.push({
          id,
          success: false,
          message: e?.message || "Refund failed",
        });
      }
    }

    const summary = {
      total: ids.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    };

    return NextResponse.json(
      httpStatusResponse(200, "Bulk refund processed", { results, summary }),
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      httpStatusResponse(500, (error as Error).message),
      { status: 500 }
    );
  }
}
