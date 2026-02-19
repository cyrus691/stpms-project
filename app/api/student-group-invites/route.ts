export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getConnection } from "@/lib/prisma";
import { getStudentGroupInviteModel } from "@/lib/models/StudentGroupInvite";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Valid userId required" }, { status: 400 });
    }

    const conn = await getConnection();
    const Invite = getStudentGroupInviteModel(conn);

    const invites = await Invite.find({ inviteeId: userId, status: "pending" })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return NextResponse.json(invites, {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=30"
      }
    });
  } catch (error) {
    console.error("Error fetching group invites:", error);
    return NextResponse.json({ error: "Failed to fetch invites" }, { status: 500 });
  }
}
