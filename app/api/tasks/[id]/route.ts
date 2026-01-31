import { NextResponse } from "next/server";
import { getConnection } from "@/lib/prisma";
import { getTaskModel } from "@/lib/models/Task";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { status, title, details, dueDate, priority } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Task id is required" }, { status: 400 });
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
    const Task = getTaskModel(conn);
    const updated = await Task.findByIdAndUpdate(id, updateFields, { new: true }).lean();
    if (!updated) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Task id is required" }, { status: 400 });
    }

    const conn = await getConnection();
    const Task = getTaskModel(conn);
    const deleted = await Task.findByIdAndDelete(id).lean();
    if (!deleted) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
