import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getConnection } from "@/lib/prisma";
import { getStudentGroupModel } from "@/lib/models/StudentGroup";
import { getUserModel } from "@/lib/models/User";

const MAX_MEMBERS = 5;

export async function GET(request: Request) {
  try {
    const conn = await getConnection();
    const StudentGroup = getStudentGroupModel(conn);
    const User = getUserModel(conn);

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const discover = searchParams.get("discover") === "true";

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Valid userId required" }, { status: 400 });
    }

    const user = await User.findById(userId).select("role").lean();
    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Student user required" }, { status: 403 });
    }

    const query = discover
      ? { memberIds: { $ne: new Types.ObjectId(userId) } }
      : { memberIds: new Types.ObjectId(userId) };

    const groups = await StudentGroup.find(query)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const filtered = discover
      ? groups.filter((group) => (group.memberIds?.length || 0) < MAX_MEMBERS)
      : groups;

    return NextResponse.json(filtered, {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=30"
      }
    });
  } catch (error) {
    console.error("Error fetching student groups:", error);
    return NextResponse.json({ error: "Failed to fetch student groups" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, description, ownerId, memberIds } = await request.json();
    if (!name || !ownerId) {
      return NextResponse.json({ error: "name and ownerId required" }, { status: 400 });
    }
    if (!Types.ObjectId.isValid(ownerId)) {
      return NextResponse.json({ error: "Valid ownerId required" }, { status: 400 });
    }

    const conn = await getConnection();
    const StudentGroup = getStudentGroupModel(conn);
    const User = getUserModel(conn);

    const owner = await User.findById(ownerId).select("role").lean();
    if (!owner || owner.role !== "student") {
      return NextResponse.json({ error: "Owner must be a student" }, { status: 403 });
    }

    const initialMembers = Array.isArray(memberIds) ? memberIds : [];
    const uniqueMembers = new Set<string>([ownerId, ...initialMembers].filter((id) => Types.ObjectId.isValid(id)));

    if (uniqueMembers.size > MAX_MEMBERS) {
      return NextResponse.json({ error: "Group cannot exceed 5 members" }, { status: 400 });
    }

    const students = await User.find({ _id: { $in: Array.from(uniqueMembers) }, role: "student" })
      .select("_id")
      .lean();

    if (students.length !== uniqueMembers.size) {
      return NextResponse.json({ error: "All members must be valid students" }, { status: 400 });
    }

    const group = await StudentGroup.create({
      name: String(name).trim(),
      description: description ? String(description).trim() : undefined,
      ownerId,
      memberIds: Array.from(uniqueMembers)
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error("Error creating student group:", error);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
