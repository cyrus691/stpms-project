import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getConnection } from "@/lib/prisma";
import { getStudentTaskModel } from "@/lib/models/StudentTask";
import { getUserModel } from "@/lib/models/User";

export async function GET(request: Request) {
  try {
    const conn = await getConnection();
    const StudentTask = getStudentTaskModel(conn);
    const User = getUserModel(conn);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const filter: Record<string, unknown> = {};
    if (userId) {
      if (!Types.ObjectId.isValid(userId)) {
        return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
      }
      const user = await User.findById(userId).select("role").lean();
      if (!user || user.role !== "student") {
        return NextResponse.json({ error: "Student user required" }, { status: 403 });
      }
      filter.userId = userId;
    }

    const tasks = await StudentTask.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec();

    return NextResponse.json(tasks, {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=30"
      }
    });
  } catch (error) {
    console.error("Error fetching student tasks:", error);
    return NextResponse.json({ error: "Failed to fetch student tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { title, details, dueDate, userId, status, priority } = await request.json();
  if (!title || !userId) {
    return NextResponse.json({ error: "title and userId required" }, { status: 400 });
  }
  if (!Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: "Valid userId required" }, { status: 400 });
  }
  if (priority && !["low", "medium", "high"].includes(priority)) {
    return NextResponse.json({ error: "Valid priority is required" }, { status: 400 });
  }

  const conn = await getConnection();
  const StudentTask = getStudentTaskModel(conn);
  const User = getUserModel(conn);
  const user = await User.findById(userId).select("role").lean();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "Student user required" }, { status: 403 });
  }

  const task = await StudentTask.create({
    title,
    details,
    userId,
    status: status ?? "pending",
    priority: priority ?? "medium",
    dueDate: dueDate ? new Date(dueDate) : null
  });

  return NextResponse.json(task, { status: 201 });
}
