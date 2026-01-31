import { NextResponse } from "next/server";
import { getConnection } from "@/lib/prisma";
import { getStudentTaskModel } from "@/lib/models/StudentTask";
import { getUserModel } from "@/lib/models/User";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { status, title, details, dueDate, priority, userId } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Task id is required" }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    if (status && !["pending", "done", "overdue"].includes(status)) {
      return NextResponse.json({ error: "Valid status is required" }, { status: 400 });
    }
    if (priority && !["low", "medium", "high"].includes(priority)) {
      return NextResponse.json({ error: "Valid priority is required" }, { status: 400 });
    }

    const updateFields: Record<string, unknown> = {};
    if (status) updateFields.status = status;
    if (typeof title === "string") updateFields.title = title.trim();
    if (typeof details === "string") updateFields.details = details.trim() || undefined;
    if (dueDate !== undefined) {
      updateFields.dueDate = dueDate ? new Date(dueDate) : null;
    }
    if (priority) updateFields.priority = priority;

    const conn = await getConnection();
    const StudentTask = getStudentTaskModel(conn);
    const User = getUserModel(conn);
    const user = await User.findById(userId).select("role").lean();
    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Student user required" }, { status: 403 });
    }

    const existing = await StudentTask.findById(id).lean();
    if (!existing || existing.userId?.toString() !== String(userId)) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const updated = await StudentTask.findByIdAndUpdate(id, updateFields, { new: true }).lean();
    if (!updated) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating student task:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { userId } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Task id is required" }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const conn = await getConnection();
    const StudentTask = getStudentTaskModel(conn);
    const User = getUserModel(conn);
    const user = await User.findById(userId).select("role").lean();
    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Student user required" }, { status: 403 });
    }

    const existing = await StudentTask.findById(id).lean();
    if (!existing || existing.userId?.toString() !== String(userId)) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const deleted = await StudentTask.findByIdAndDelete(id).lean();
    if (!deleted) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting student task:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
