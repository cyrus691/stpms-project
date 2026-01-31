import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getConnection } from "@/lib/prisma";
import { getStudentGroupModel } from "@/lib/models/StudentGroup";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { userId } = await request.json();
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Valid group id required" }, { status: 400 });
    }
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Valid userId required" }, { status: 400 });
    }

    const conn = await getConnection();
    const StudentGroup = getStudentGroupModel(conn);

    const group = await StudentGroup.findById(id);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const remaining = group.memberIds.filter((member) => member.toString() !== userId);
    if (remaining.length === group.memberIds.length) {
      return NextResponse.json(group);
    }

    if (remaining.length === 0) {
      await StudentGroup.findByIdAndDelete(id);
      return NextResponse.json({ success: true, deleted: true });
    }

    group.memberIds = remaining as any;
    if (group.ownerId.toString() === userId) {
      group.ownerId = remaining[0];
    }
    await group.save();

    return NextResponse.json(group);
  } catch (error) {
    console.error("Error leaving student group:", error);
    return NextResponse.json({ error: "Failed to leave group" }, { status: 500 });
  }
}
