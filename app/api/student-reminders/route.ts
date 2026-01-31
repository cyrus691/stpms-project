import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getConnection } from "@/lib/prisma";
import { getStudentReminderModel } from "@/lib/models/StudentReminder";
import { getUserModel } from "@/lib/models/User";

export async function GET(request: Request) {
  try {
    const conn = await getConnection();
    const StudentReminder = getStudentReminderModel(conn);
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

    const reminders = await StudentReminder.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec();

    return NextResponse.json(reminders, {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=30"
      }
    });
  } catch (error) {
    console.error("Error fetching student reminders:", error);
    return NextResponse.json({ error: "Failed to fetch student reminders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { title, note, userId, remindAt, status } = await request.json();
  if (!title || !userId) {
    return NextResponse.json({ error: "title and userId required" }, { status: 400 });
  }
  if (!Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: "Valid userId required" }, { status: 400 });
  }
  if (status && !["active", "dismissed", "expired"].includes(status)) {
    return NextResponse.json({ error: "Valid status is required" }, { status: 400 });
  }

  const conn = await getConnection();
  const StudentReminder = getStudentReminderModel(conn);
  const User = getUserModel(conn);
  const user = await User.findById(userId).select("role").lean();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "Student user required" }, { status: 403 });
  }

  const reminder = await StudentReminder.create({
    title,
    note,
    userId,
    status: status ?? "active",
    remindAt: remindAt ? new Date(remindAt) : null
  });

  return NextResponse.json(reminder, { status: 201 });
}
