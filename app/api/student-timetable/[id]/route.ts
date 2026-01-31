import { NextResponse } from "next/server";
import { getConnection } from "@/lib/prisma";
import { getStudentTimetableEntryModel } from "@/lib/models/StudentTimetableEntry";
import { getUserModel } from "@/lib/models/User";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { day, className, startTime, endTime, venue, userId } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Entry id is required" }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const updateFields: Record<string, unknown> = {};
    if (day) updateFields.day = day;
    if (typeof className === "string") updateFields.className = className.trim();
    if (typeof startTime === "string") updateFields.startTime = startTime;
    if (typeof endTime === "string") updateFields.endTime = endTime;
    if (typeof venue === "string") updateFields.venue = venue.trim() || undefined;

    const conn = await getConnection();
    const StudentTimetableEntry = getStudentTimetableEntryModel(conn);
    const User = getUserModel(conn);
    const user = await User.findById(userId).select("role").lean();
    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Student user required" }, { status: 403 });
    }

    const existing = await StudentTimetableEntry.findById(id).lean();
    if (!existing || existing.userId?.toString() !== String(userId)) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const updated = await StudentTimetableEntry.findByIdAndUpdate(id, updateFields, { new: true }).lean();
    if (!updated) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating student timetable entry:", error);
    return NextResponse.json({ error: "Failed to update entry" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { userId } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Entry id is required" }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const conn = await getConnection();
    const StudentTimetableEntry = getStudentTimetableEntryModel(conn);
    const User = getUserModel(conn);
    const user = await User.findById(userId).select("role").lean();
    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Student user required" }, { status: 403 });
    }

    const existing = await StudentTimetableEntry.findById(id).lean();
    if (!existing || existing.userId?.toString() !== String(userId)) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const deleted = await StudentTimetableEntry.findByIdAndDelete(id).lean();
    if (!deleted) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting student timetable entry:", error);
    return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 });
  }
}
