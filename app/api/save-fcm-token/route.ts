
import { NextResponse } from "next/server";
import { getUserModel } from "@/lib/models/User";
import mongoose from "mongoose";
import connectDB from '@/lib/mongoose';

export async function POST(req: Request) {
  await connectDB();
  const { userId, token } = await req.json();
  const User = getUserModel(mongoose.connection);
  // Multi-tenancy: update by userId, append token to array
  await User.updateOne(
    { _id: userId },
    { $addToSet: { fcmTokens: token } }
  );
  return NextResponse.json({ success: true });
}
