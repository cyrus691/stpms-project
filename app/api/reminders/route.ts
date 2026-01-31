import { NextResponse } from "next/server";
import { getConnection } from "@/lib/prisma";
import { getReminderModel } from "@/lib/models/Reminder";

export async function GET() {
  try {
    const conn = await getConnection();
    const Reminder = getReminderModel(conn);
    
    const reminders = await Reminder.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec();
      
    return NextResponse.json(reminders);
  } catch (error) {
    console.error("Error fetching reminders:", error);
    return NextResponse.json({ error: "Failed to fetch reminders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { message, userId, remindAt, status } = await request.json();
  if (!message || !userId) {
    return NextResponse.json({ error: "message and userId required" }, { status: 400 });
  }
  
  const conn = await getConnection();
  const Reminder = getReminderModel(conn);
  
  const reminder = await Reminder.create({
    message,
    userId,
    status: status ?? "active",
    remindAt: remindAt ? new Date(remindAt) : null
  });
  
  return NextResponse.json(reminder, { status: 201 });
}
