export const dynamic = "force-dynamic";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getConnection } from "@/lib/prisma";
import { getUserModel } from "@/lib/models/User";
import { getSettingModel } from "@/lib/models/Setting";
import { logAuditEvent } from "@/lib/audit";

async function getAdminUser() {
  const conn = await getConnection();
  const User = getUserModel(conn);
  const admin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });
  return { conn, User, admin };
}

export async function GET() {
  try {
    const { conn, admin } = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
    }

    const Setting = getSettingModel(conn);
    const timeFormatSetting = await Setting.findOne({ key: "timeFormat" });

    return NextResponse.json({
      username: admin.username,
      name: admin.name,
      email: admin.email,
      timeFormat: timeFormatSetting?.value || "24"
    });
  } catch (error) {
    console.error("Error loading admin settings:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, name, email, timeFormat, currentPassword, newPassword } = body;

    const { conn, User, admin } = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
    }

    if (username || name || email) {
      const update: Record<string, string> = {};
      if (username) update.username = username;
      if (name) update.name = name;
      if (email) update.email = email;
      await User.findByIdAndUpdate(admin._id, update);
      await logAuditEvent({
        action: "admin.settings_update",
        actorRole: "admin",
        actorId: admin._id.toString(),
        details: "Admin profile updated"
      });
    }

    if (typeof timeFormat === "string") {
      const Setting = getSettingModel(conn);
      await Setting.findOneAndUpdate(
        { key: "timeFormat" },
        { value: timeFormat },
        { upsert: true, new: true }
      );
      await logAuditEvent({
        action: "admin.settings_update",
        actorRole: "admin",
        actorId: admin._id.toString(),
        details: `Time format set to ${timeFormat}`
      });
    }

    if (currentPassword || newPassword) {
      if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: "currentPassword and newPassword required" }, { status: 400 });
      }

      const isValid = await bcrypt.compare(currentPassword, admin.passwordHash || "");
      if (!isValid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }

      const hashed = await bcrypt.hash(newPassword, 10);
      await User.findByIdAndUpdate(admin._id, { passwordHash: hashed });
      await logAuditEvent({
        action: "user.password_reset",
        actorRole: "admin",
        actorId: admin._id.toString(),
        targetUserId: admin._id.toString(),
        targetRole: "admin",
        details: `Password reset by ${admin.username}`,
        metadata: { reason: "self-service" }
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error saving admin settings:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}