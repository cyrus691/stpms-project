import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getConnection } from "@/lib/prisma";
import { getUserModel } from "@/lib/models/User";
import { getSettingModel } from "@/lib/models/Setting";

const getStudentById = async (userId: string) => {
  const conn = await getConnection();
  const User = getUserModel(conn);
  const student = await User.findById(userId);
  return { conn, User, student };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Valid userId required" }, { status: 400 });
    }

    const { conn, student } = await getStudentById(userId);
    if (!student || student.role !== "student") {
      return NextResponse.json({ error: "Student user not found" }, { status: 404 });
    }

    const Setting = getSettingModel(conn);
    const timeFormatSetting = await Setting.findOne({ key: `student:${userId}:timeFormat` });

    return NextResponse.json({
      username: student.username,
      name: student.name,
      email: student.email,
      timeFormat: timeFormatSetting?.value || "24"
    });
  } catch (error) {
    console.error("Error loading student settings:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, username, name, email, timeFormat, currentPassword, newPassword } = body;
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Valid userId required" }, { status: 400 });
    }

    const { conn, User, student } = await getStudentById(userId);
    if (!student || student.role !== "student") {
      return NextResponse.json({ error: "Student user not found" }, { status: 404 });
    }

    if (username || name || email) {
      const update: Record<string, string> = {};
      if (username) update.username = username;
      if (name) update.name = name;
      if (email) update.email = email;
      await User.findByIdAndUpdate(student._id, update);
    }

    if (typeof timeFormat === "string") {
      const Setting = getSettingModel(conn);
      await Setting.findOneAndUpdate(
        { key: `student:${userId}:timeFormat` },
        { value: timeFormat },
        { upsert: true, new: true }
      );
    }

    if (currentPassword || newPassword) {
      if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: "currentPassword and newPassword required" }, { status: 400 });
      }

      const isValid = await bcrypt.compare(currentPassword, student.passwordHash || "");
      if (!isValid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }

      const hashed = await bcrypt.hash(newPassword, 10);
      await User.findByIdAndUpdate(student._id, { passwordHash: hashed });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error saving student settings:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
