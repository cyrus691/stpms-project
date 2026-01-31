import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getConnection } from "@/lib/prisma";
import { getStudentGroupInviteModel } from "@/lib/models/StudentGroupInvite";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { userId } = await request.json();
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Valid invite id required" }, { status: 400 });
    }
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Valid userId required" }, { status: 400 });
    }

    const conn = await getConnection();
    const Invite = getStudentGroupInviteModel(conn);

    const invite = await Invite.findById(id);
    if (!invite || invite.status !== "pending") {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }
    if (invite.inviteeId.toString() !== userId) {
      return NextResponse.json({ error: "Not authorized for this invite" }, { status: 403 });
    }

    invite.status = "declined";
    await invite.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error declining invite:", error);
    return NextResponse.json({ error: "Failed to decline invite" }, { status: 500 });
  }
}
