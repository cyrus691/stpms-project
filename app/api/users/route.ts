export const dynamic = "force-dynamic";
import connectDB from '@/lib/mongoose';
import mongoose from 'mongoose';
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getUserModel } from "@/lib/models/User";
import { getTaskModel } from "@/lib/models/Task";
import { getExpenseModel } from "@/lib/models/Expense";
import type { Role } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function GET(request: Request) {
  await connectDB();
  try {
    const User = getUserModel(mongoose.connection);
    const Task = getTaskModel(mongoose.connection);
    const Expense = getExpenseModel(mongoose.connection);
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const query: any = {};
    if (role && ["student", "business", "admin"].includes(role)) {
      query.role = role;
    }
    const users = await User.find(query)
      .limit(100)
      .select("_id username email phone name role status createdAt updatedAt")
      .lean()
      .exec();
    const userIds = users.map(u => u._id);
    const [taskCounts, expenseTotals] = await Promise.all([
      Task.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: "$userId", count: { $sum: 1 } } }
      ]),
      Expense.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: "$userId", total: { $sum: "$amount" } } }
      ])
    ]);
    const taskCountMap = new Map(taskCounts.map((t: any) => [t._id.toString(), t.count]));
    const expenseMap = new Map(expenseTotals.map((e: any) => [e._id.toString(), e.total]));
    const usersWithData = users.map((user) => ({
      _id: user._id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role,
      taskCount: taskCountMap.get(user._id.toString()) || 0,
      expenseTotal: user.role === "business" ? (expenseMap.get(user._id.toString()) || 0) : 0,
      status: user.status || "Active",
      createdAt: user.createdAt
    }));
    return NextResponse.json(usersWithData);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
//
}

export async function POST(request: Request) {
  const { username, email, name, password, role } = await request.json();
  if (!username || !email || !name || !password || !role) {
    return NextResponse.json({ error: "username, email, name, password, role required" }, { status: 400 });
  }
  
  const hashed = await bcrypt.hash(password, 10);
  await connectDB();
  const User = getUserModel(mongoose.connection);
  
  const user = await User.create({
    username,
    email,
    name,
    passwordHash: hashed,
    role: role as Role,
    status: "Active"
  });

  await logAuditEvent({
    action: "user.create",
    actorRole: "admin",
    targetUserId: user._id.toString(),
    targetRole: user.role as Role,
    details: `Created user ${user.username}`
  });
  
  return NextResponse.json({ id: user._id, username: user.username, role: user.role });
}

export async function PUT(request: Request) {
  try {
    const { _id, username, email, name, role, password, status } = await request.json();
    
    if (!_id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    await connectDB();
    const User = getUserModel(mongoose.connection);
    
    const updateData: any = {};
    if (username !== undefined) {
      const trimmed = String(username).trim();
      if (!trimmed) {
        return NextResponse.json({ error: "Username cannot be empty" }, { status: 400 });
      }
      updateData.username = trimmed;
    }
    if (email !== undefined) {
      const trimmed = String(email).trim();
      if (!trimmed) {
        return NextResponse.json({ error: "Email cannot be empty" }, { status: 400 });
      }
      updateData.email = trimmed;
    }
    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      updateData.name = trimmed;
    }
    if (role !== undefined) updateData.role = role;
    if (status && ["Active", "Inactive"].includes(status)) {
      updateData.status = status;
    }
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(_id, updateData, { new: true, runValidators: true });
    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
        if (password) {
          await logAuditEvent({
            action: "user.password_reset",
            actorRole: "admin",
            targetUserId: updatedUser._id.toString(),
            targetRole: updatedUser.role,
            details: `Password reset for ${updatedUser.username}`
          });
        } else if (status) {
          await logAuditEvent({
            action: "user.status_update",
            actorRole: "admin",
            targetUserId: updatedUser._id.toString(),
            targetRole: updatedUser.role,
            details: `Status set to ${status} for ${updatedUser.username}`
          });
        } else {
          await logAuditEvent({
            action: "user.update",
            actorRole: "admin",
            targetUserId: updatedUser._id.toString(),
            targetRole: updatedUser.role,
            details: `Updated user ${updatedUser.username}`
          });
        }
    
    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      message: "User updated successfully",
      user: {
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        status: updatedUser.status
      }
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    await connectDB();
    const User = getUserModel(mongoose.connection);
    const Task = getTaskModel(mongoose.connection);
    const Expense = getExpenseModel(mongoose.connection);
    
    // Delete associated data first
    await Task.deleteMany({ userId });
    await Expense.deleteMany({ userId });
    
    // Delete the user
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
        await logAuditEvent({
          action: "user.delete",
          actorRole: "admin",
          targetUserId: userId,
          targetRole: deletedUser.role,
          details: `Deleted user ${deletedUser.username}`
        });
    
    if (!deletedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      message: "User and associated data deleted successfully",
      deletedUserId: userId
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
