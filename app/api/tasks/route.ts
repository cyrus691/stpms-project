import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getConnection } from "@/lib/prisma";
import { getTaskModel } from "@/lib/models/Task";

export async function GET(request: Request) {
  try {
    const conn = await getConnection();
    const Task = getTaskModel(conn);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const filter: Record<string, unknown> = {};
    if (userId) {
      if (!Types.ObjectId.isValid(userId)) {
        return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
      }
      filter.userId = userId;
    }
    
    // Use lean() for faster queries
    const tasks = await Task.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec();
      
    return NextResponse.json(tasks, {
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { title, details, dueDate, userId, status, priority } = await request.json();
  if (!title || !userId) {
    return NextResponse.json({ error: "title and userId required" }, { status: 400 });
  }
  if (!Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: "Valid userId required" }, { status: 400 });
  }
  if (priority && !["low", "medium", "high"].includes(priority)) {
    return NextResponse.json({ error: "Valid priority is required" }, { status: 400 });
  }
  
  const conn = await getConnection();
  const Task = getTaskModel(conn);
  
  const task = await Task.create({
    title,
    details,
    userId,
    status: status ?? "pending",
    priority: priority ?? "medium",
    dueDate: dueDate ? new Date(dueDate) : null
  });
  
  return NextResponse.json(task, { status: 201 });
}
