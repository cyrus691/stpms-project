import { NextResponse } from "next/server";
import { getConnection } from "@/lib/prisma";
import { getStudentReminderModel } from "@/lib/models/StudentReminder";
import { getUserModel } from "@/lib/models/User";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { title, note, status, remindAt, userId } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Reminder id is required" }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    if (status && !["active", "dismissed", "expired"].includes(status)) {
      return NextResponse.json({ error: "Valid status is required" }, { status: 400 });
    }

    const updateFields: Record<string, unknown> = {};
    if (typeof title === "string") updateFields.title = title.trim();
    if (typeof note === "string") updateFields.note = note.trim() || undefined;
    if (status) updateFields.status = status;
    if (remindAt !== undefined) {
      updateFields.remindAt = remindAt ? new Date(remindAt) : null;
    }

    const conn = await getConnection();
    const StudentReminder = getStudentReminderModel(conn);
    const User = getUserModel(conn);
    const user = await User.findById(userId).select("role").lean();
    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Student user required" }, { status: 403 });
    }

    const existing = await StudentReminder.findById(id).lean();
    if (!existing || existing.userId?.toString() !== String(userId)) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    const updated = await StudentReminder.findByIdAndUpdate(id, updateFields, { new: true }).lean();
    if (!updated) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating student reminder:", error);
    return NextResponse.json({ error: "Failed to update reminder" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { userId } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Reminder id is required" }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const conn = await getConnection();
    const StudentReminder = getStudentReminderModel(conn);
    const User = getUserModel(conn);
    const user = await User.findById(userId).select("role").lean();
    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Student user required" }, { status: 403 });
    }

    const existing = await StudentReminder.findById(id).lean();
    if (!existing || existing.userId?.toString() !== String(userId)) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    const deleted = await StudentReminder.findByIdAndDelete(id).lean();
    if (!deleted) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting student reminder:", error);
    return NextResponse.json({ error: "Failed to delete reminder" }, { status: 500 });
  }
}
