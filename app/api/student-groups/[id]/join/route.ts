import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getConnection } from "@/lib/prisma";
import { getStudentGroupModel } from "@/lib/models/StudentGroup";
import { getUserModel } from "@/lib/models/User";

const MAX_MEMBERS = 5;

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
    const User = getUserModel(conn);

    const user = await User.findById(userId).select("role").lean();
    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Student user required" }, { status: 403 });
    }

    const group = await StudentGroup.findById(id);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const currentMembers = new Set(group.memberIds.map((member) => member.toString()));
    if (currentMembers.has(userId)) {
      return NextResponse.json(group);
    }
    if (currentMembers.size >= MAX_MEMBERS) {
      return NextResponse.json({ error: "Group is full" }, { status: 400 });
    }

    currentMembers.add(userId);
    group.memberIds = Array.from(currentMembers) as any;
    await group.save();

    return NextResponse.json(group);
  } catch (error) {
    console.error("Error joining student group:", error);
    return NextResponse.json({ error: "Failed to join group" }, { status: 500 });
  }
}
