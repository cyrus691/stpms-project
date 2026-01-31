import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getConnection } from "@/lib/prisma";
import { getStudentGroupModel } from "@/lib/models/StudentGroup";
import { getStudentGroupMessageModel } from "@/lib/models/StudentGroupMessage";
import { getUserModel } from "@/lib/models/User";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Valid group id required" }, { status: 400 });
    }
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Valid userId required" }, { status: 400 });
    }

    const conn = await getConnection();
    const StudentGroup = getStudentGroupModel(conn);
    const Message = getStudentGroupMessageModel(conn);
    const User = getUserModel(conn);

    const user = await User.findById(userId).select("role").lean();
    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Student user required" }, { status: 403 });
    }

    const group = await StudentGroup.findById(id).lean();
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const isMember = group.memberIds.some((member) => member.toString() === userId);
    if (!isMember) {
      return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 });
    }

    const messages = await Message.find({ groupId: id })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean()
      .exec();

    return NextResponse.json(messages, {
      headers: {
        "Cache-Control": "private, max-age=5, stale-while-revalidate=15"
      }
    });
  } catch (error) {
    console.error("Error fetching group messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { userId, message } = await request.json();
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Valid group id required" }, { status: 400 });
    }
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Valid userId required" }, { status: 400 });
    }
    if (!message || !String(message).trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const conn = await getConnection();
    const StudentGroup = getStudentGroupModel(conn);
    const Message = getStudentGroupMessageModel(conn);
    const User = getUserModel(conn);

    const user = await User.findById(userId).select("role").lean();
    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Student user required" }, { status: 403 });
    }

    const group = await StudentGroup.findById(id).lean();
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const isMember = group.memberIds.some((member) => member.toString() === userId);
    if (!isMember) {
      return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 });
    }

    const newMessage = await Message.create({
      groupId: id,
      senderId: userId,
      message: String(message).trim()
    });

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error("Error sending group message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
