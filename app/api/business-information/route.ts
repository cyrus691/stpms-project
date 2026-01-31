

import { NextRequest, NextResponse } from "next/server";
import BusinessInformation from "@/lib/models/BusinessInformation";
import { connectToDatabase } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await connectToDatabase();
  const session = await getServerSession({ req, ...authOptions });
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const info = await BusinessInformation.findOne({ userId });
  return NextResponse.json(info || {});
}

export async function POST(req: NextRequest) {
  await connectToDatabase();
  const session = await getServerSession({ req, ...authOptions });
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await req.json();
  let info = await BusinessInformation.findOne({ userId });
  if (info) {
    Object.assign(info, data);
    await info.save();
  } else {
    info = await BusinessInformation.create({ ...data, userId });
  }
  return NextResponse.json(info);
}
