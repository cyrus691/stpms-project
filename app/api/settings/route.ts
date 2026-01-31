import { NextResponse } from "next/server";
import { getConnection } from "@/lib/prisma";
import { getSettingModel } from "@/lib/models/Setting";

export async function GET() {
  const conn = await getConnection();
  const Setting = getSettingModel(conn);
  
  const settings = await Setting.find();
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  const { key, value } = await request.json();
  if (!key) {
    return NextResponse.json({ error: "key required" }, { status: 400 });
  }
  
  const conn = await getConnection();
  const Setting = getSettingModel(conn);
  
  const setting = await Setting.findOneAndUpdate(
    { key },
    { value },
    { upsert: true, new: true }
  );
  
  return NextResponse.json(setting);
}
