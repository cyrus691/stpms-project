import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getConnection } from "@/lib/prisma";
import { getStudentGroupInviteModel } from "@/lib/models/StudentGroupInvite";
import { getStudentGroupModel } from "@/lib/models/StudentGroup";

const MAX_MEMBERS = 5;

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
    const Group = getStudentGroupModel(conn);

    const invite = await Invite.findById(id);
    if (!invite || invite.status !== "pending") {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }
    if (invite.inviteeId.toString() !== userId) {
      return NextResponse.json({ error: "Not authorized for this invite" }, { status: 403 });
    }

    const group = await Group.findById(invite.groupId);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const members = new Set(group.memberIds.map((member) => member.toString()));
    if (members.size >= MAX_MEMBERS) {
      return NextResponse.json({ error: "Group is full" }, { status: 400 });
    }

    members.add(invite.inviteeId.toString());
    group.memberIds = Array.from(members) as any;
    await group.save();

    invite.status = "accepted";
    await invite.save();

    return NextResponse.json({ success: true, groupId: group._id });
  } catch (error) {
    console.error("Error accepting invite:", error);
    return NextResponse.json({ error: "Failed to accept invite" }, { status: 500 });
  }
}
