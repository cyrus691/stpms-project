import { NextResponse } from "next/server";
import { getConnection } from "@/lib/prisma";
import { getUserModel } from "@/lib/models/User";
import { getTaskModel } from "@/lib/models/Task";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const { username, message } = await request.json();
    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const conn = await getConnection();
    const User = getUserModel(conn);
    const Task = getTaskModel(conn);
    const user = await User.findOne({ username }).lean();
    const admin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 }).lean();

    await logAuditEvent({
      action: "user.password_reset_request",
      actorRole: "system",
      ...(user ? { targetUserId: user._id.toString(), targetRole: user.role } : {}),
      details: user
        ? `Password reset requested by ${user.username}`
        : `Password reset requested for unknown username ${username}`,
      metadata: { username, message: message?.trim() || undefined }
    });

    if (admin) {
      await Task.create({
        title: `Handle password reset request: ${user?.username || username}`,
        details: message?.trim()
          ? `User message: ${message.trim()}`
          : "User requested a password reset.",
        userId: admin._id,
        status: "pending"
      });
    }

    return NextResponse.json({ message: "Request sent to admin." });
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json({ error: "Failed to send request" }, { status: 500 });
  }
}
