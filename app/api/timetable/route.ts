import { NextResponse } from "next/server";
import { getConnection } from "@/lib/prisma";
import { getTimetableEntryModel } from "@/lib/models/TimetableEntry";

export async function GET() {
  try {
    const conn = await getConnection();
    const TimetableEntry = getTimetableEntryModel(conn);
    
    const entries = await TimetableEntry.find()
      .sort({ startTime: 1 })
      .limit(100)
      .lean()
      .exec();
      
    return NextResponse.json(entries);
  } catch (error) {
    console.error("Error fetching timetable:", error);
    return NextResponse.json({ error: "Failed to fetch timetable" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { title, location, startTime, endTime, userId } = await request.json();
  if (!title || !startTime || !endTime || !userId) {
    return NextResponse.json({ error: "title, startTime, endTime, userId required" }, { status: 400 });
  }
  
  const conn = await getConnection();
  const TimetableEntry = getTimetableEntryModel(conn);
  
  const entry = await TimetableEntry.create({
    title,
    location,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    userId
  });
  
  return NextResponse.json(entry, { status: 201 });
}
