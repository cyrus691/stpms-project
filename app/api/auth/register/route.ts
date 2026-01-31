import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getConnection } from "@/lib/prisma";
import { getUserModel } from "@/lib/models/User";
import type { Role } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, email, phone, password, role, name } = await request.json();

    if (!username || !email || !phone || !password || !role) {
      return NextResponse.json({ error: "username, email, phone, password, role required" }, { status: 400 });
    }

    // Validate role
    if (!["student", "business"].includes(role)) {
      return NextResponse.json({ error: "Invalid role. Must be student or business" }, { status: 400 });
    }

    const conn = await getConnection();
    const User = getUserModel(conn);

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      const field = existingUser.username === username ? "Username" : "Email";
      return NextResponse.json({ error: `${field} already exists` }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      phone,
      name: name ?? username,
      passwordHash: hashed,
      role: role as Role
    });

    return NextResponse.json({ 
      id: user._id, 
      username: user.username, 
      email: user.email,
      role: user.role,
      message: "Registration successful" 
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json({ 
      error: error.message || "Registration failed" 
    }, { status: 500 });
  }
}
