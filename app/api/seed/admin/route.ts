import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getConnection } from "@/lib/prisma";
import { getUserModel } from "@/lib/models/User";

export async function POST() {
  try {
    const conn = await getConnection();
    const User = getUserModel(conn);

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: "muwanguzicyrus7@gmail.com" });
    if (existingAdmin) {
      return NextResponse.json({ message: "Admin account already exists" }, { status: 200 });
    }

    // Create admin account
    const hashedPassword = await bcrypt.hash("kasule", 10);
    const admin = await User.create({
      username: "admin",
      email: "muwanguzicyrus7@gmail.com",
      name: "System Administrator",
      passwordHash: hashedPassword,
      role: "admin"
    });

    return NextResponse.json(
      { message: "Admin account created successfully", admin: { id: admin._id, email: admin.email, role: admin.role } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Seeding error:", error);
    return NextResponse.json({ error: "Failed to create admin account" }, { status: 500 });
  }
}
