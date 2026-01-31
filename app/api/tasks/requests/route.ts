import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getConnection } from "@/lib/prisma";
import { getTaskModel } from "@/lib/models/Task";
import { getAuditLogModel } from "@/lib/models/AuditLog";
import { getUserModel } from "@/lib/models/User";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const { auditLogId } = await request.json();
    if (!auditLogId || !Types.ObjectId.isValid(auditLogId)) {
      return NextResponse.json({ error: "Valid auditLogId is required" }, { status: 400 });
    }

    const conn = await getConnection();
    const AuditLog = getAuditLogModel(conn);
    const Task = getTaskModel(conn);
    const User = getUserModel(conn);

    const log = await AuditLog.findById(auditLogId).lean();
    if (!log) {
      return NextResponse.json({ error: "Audit log not found" }, { status: 404 });
    }

    const admin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 }).lean();
    if (!admin) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
    }

    const targetUser = log.targetUserId ? await User.findById(log.targetUserId).lean() : null;
    const targetName = targetUser?.username || targetUser?.name || "Unknown user";

    const task = await Task.create({
      title: `Handle password reset request: ${targetName}`,
      details: log.details || "User requested a password reset.",
      userId: admin._id,
      status: "pending"
    });

    await logAuditEvent({
      action: "task.create",
      actorRole: "admin",
      actorId: admin._id.toString(),
      targetUserId: targetUser?._id?.toString(),
      targetRole: targetUser?.role,
      details: `Task created for password reset request: ${targetName}`,
      metadata: { auditLogId }
    });

    return NextResponse.json({ message: "Task created", task });
  } catch (error) {
    console.error("Error creating request task:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
