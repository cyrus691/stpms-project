import { NextResponse } from "next/server";
import { getConnection } from "@/lib/prisma";
import { getAuditLogModel } from "@/lib/models/AuditLog";

function getRangeStart(range: string) {
  const now = new Date();
  if (range === "today") {
    now.setHours(0, 0, 0, 0);
    return now;
  }
  if (range === "7" || range === "30" || range === "90" || range === "365") {
    const days = Number(range);
    const start = new Date();
    start.setDate(start.getDate() - days);
    return start;
  }
  return null;
}

function parseDate(value: string | null, endOfDay = false) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "7";
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const startDate = parseDate(startParam);
    const endDate = parseDate(endParam, true);

    const conn = await getConnection();
    const AuditLog = getAuditLogModel(conn);

    const query: any = {};
    if (startDate || endDate) {
      query.createdAt = {
        ...(startDate ? { $gte: startDate } : {}),
        ...(endDate ? { $lte: endDate } : {})
      };
    } else {
      const start = getRangeStart(range);
      if (start) {
        query.createdAt = { $gte: start };
      }
    }

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()
      .exec();

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
