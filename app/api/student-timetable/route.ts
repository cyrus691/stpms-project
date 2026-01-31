import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getConnection } from "@/lib/prisma";
import { getStudentTimetableEntryModel } from "@/lib/models/StudentTimetableEntry";
import { getUserModel } from "@/lib/models/User";

export async function GET(request: Request) {
  try {
    const conn = await getConnection();
    const StudentTimetableEntry = getStudentTimetableEntryModel(conn);
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

    const entries = await StudentTimetableEntry.find(filter)
      .sort({ day: 1, startTime: 1 })
      .limit(200)
      .lean()
      .exec();

    return NextResponse.json(entries, {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=30"
      }
    });
  } catch (error) {
    console.error("Error fetching student timetable:", error);
    return NextResponse.json({ error: "Failed to fetch student timetable" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { day, className, startTime, endTime, venue, userId } = await request.json();
  if (!day || !className || !startTime || !endTime || !userId) {
    return NextResponse.json({ error: "day, className, startTime, endTime, userId required" }, { status: 400 });
  }
  if (!Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: "Valid userId required" }, { status: 400 });
  }

  const conn = await getConnection();
  const StudentTimetableEntry = getStudentTimetableEntryModel(conn);
  const User = getUserModel(conn);
  const user = await User.findById(userId).select("role").lean();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "Student user required" }, { status: 403 });
  }

  const entry = await StudentTimetableEntry.create({
    day,
    className,
    startTime,
    endTime,
    venue,
    userId
  });

  return NextResponse.json(entry, { status: 201 });
}
