import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getConnection } from "@/lib/prisma";
import { getStudentGroupModel } from "@/lib/models/StudentGroup";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { requesterId, memberId } = await request.json();
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Valid group id required" }, { status: 400 });
    }
    if (!requesterId || !Types.ObjectId.isValid(requesterId)) {
      return NextResponse.json({ error: "Valid requesterId required" }, { status: 400 });
    }
    if (!memberId || !Types.ObjectId.isValid(memberId)) {
      return NextResponse.json({ error: "Valid memberId required" }, { status: 400 });
    }

    const conn = await getConnection();
    const Group = getStudentGroupModel(conn);

    const group = await Group.findById(id);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.ownerId.toString() !== requesterId) {
      return NextResponse.json({ error: "Only group admin can remove members" }, { status: 403 });
    }

    if (group.ownerId.toString() === memberId) {
      return NextResponse.json({ error: "Admin cannot remove themselves" }, { status: 400 });
    }

    group.memberIds = group.memberIds.filter((member) => member.toString() !== memberId) as any;
    await group.save();

    return NextResponse.json(group);
  } catch (error) {
    console.error("Error removing group member:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
