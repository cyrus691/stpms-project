
import { NextResponse } from "next/server";
import { getUserModel } from "@/lib/models/User";
import mongoose from "mongoose";
import connectDB from '@/lib/mongoose';

export async function POST(req: Request) {
  try {
    await connectDB();
    const { userId, token } = await req.json();
    
    console.log("[SAVE_FCM] Received userId:", userId);
    console.log("[SAVE_FCM] Received token:", token ? token.substring(0, 30) + "..." : "null");
    
    if (!userId) {
      console.error("[SAVE_FCM] ❌ userId is missing!");
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    
    if (!token) {
      console.error("[SAVE_FCM] ❌ token is missing!");
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }
    
    // Validate userId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error("[SAVE_FCM] ❌ Invalid userId format:", userId);
      return NextResponse.json({ error: "Invalid userId format" }, { status: 400 });
    }
    
    const User = getUserModel(mongoose.connection);
    
    // Multi-tenancy: update by userId, append token to array
    const result = await User.updateOne(
      { _id: userId },
      { $addToSet: { fcmTokens: token } }
    );
    
    console.log("[SAVE_FCM] Update result:", result);
    console.log("[SAVE_FCM] Matched documents:", result.matchedCount);
    console.log("[SAVE_FCM] Modified documents:", result.modifiedCount);
    
    if (result.matchedCount === 0) {
      console.error("[SAVE_FCM] ❌ User not found with userId:", userId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    console.log("[SAVE_FCM] ✅ FCM token saved successfully");
    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[SAVE_FCM] ❌ Error saving FCM token:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
