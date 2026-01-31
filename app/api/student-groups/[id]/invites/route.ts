import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getConnection } from "@/lib/prisma";
import { getStudentGroupModel } from "@/lib/models/StudentGroup";
import { getStudentGroupInviteModel } from "@/lib/models/StudentGroupInvite";
import { getUserModel } from "@/lib/models/User";

const MAX_MEMBERS = 5;

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { inviterId, inviteeIds } = await request.json();
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Valid group id required" }, { status: 400 });
    }
    if (!inviterId || !Types.ObjectId.isValid(inviterId)) {
      return NextResponse.json({ error: "Valid inviterId required" }, { status: 400 });
    }
    if (!Array.isArray(inviteeIds) || inviteeIds.length === 0) {
      return NextResponse.json({ error: "inviteeIds required" }, { status: 400 });
    }

    const conn = await getConnection();
    const Group = getStudentGroupModel(conn);
    const Invite = getStudentGroupInviteModel(conn);
    const User = getUserModel(conn);

    const group = await Group.findById(id);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.ownerId.toString() !== inviterId) {
      return NextResponse.json({ error: "Only group admin can invite" }, { status: 403 });
    }

    const currentMembers = new Set(group.memberIds.map((member) => member.toString()));
    if (currentMembers.size >= MAX_MEMBERS) {
      return NextResponse.json({ error: "Group is full" }, { status: 400 });
    }

    const validInvitees = inviteeIds.filter((idValue: string) => Types.ObjectId.isValid(idValue));
    const students = await User.find({ _id: { $in: validInvitees }, role: "student" })
      .select("_id")
      .lean();
    const studentIds = new Set(students.map((student) => student._id.toString()));

    const pendingInvites = await Invite.find({
      groupId: id,
      inviteeId: { $in: Array.from(studentIds) },
      status: "pending"
    }).lean();
    const alreadyInvited = new Set(pendingInvites.map((invite) => invite.inviteeId.toString()));

    const remainingSlots = MAX_MEMBERS - currentMembers.size;
    const inviteList = Array.from(studentIds)
      .filter((inviteeId) => !currentMembers.has(inviteeId) && !alreadyInvited.has(inviteeId))
      .slice(0, remainingSlots);

    if (inviteList.length === 0) {
      return NextResponse.json({ error: "No available slots for invites" }, { status: 400 });
    }

    const invites = await Invite.insertMany(
      inviteList.map((inviteeId) => ({
        groupId: id,
        inviterId,
        inviteeId,
        status: "pending"
      }))
    );

    return NextResponse.json(invites, { status: 201 });
  } catch (error) {
    console.error("Error inviting members:", error);
    return NextResponse.json({ error: "Failed to invite members" }, { status: 500 });
  }
}
