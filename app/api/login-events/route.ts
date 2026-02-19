export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getConnection } from "@/lib/prisma";
import { getLoginEventModel } from "@/lib/models/LoginEvent";

export async function GET() {
  try {
    const conn = await getConnection();
    const LoginEvent = getLoginEventModel(conn);

    const events = await LoginEvent.find()
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()
      .exec();

    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching login events:", error);
    return NextResponse.json({ error: "Failed to fetch login events" }, { status: 500 });
  }
}
