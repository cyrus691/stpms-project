import { NextResponse } from "next/server";
import { getConnection } from "@/lib/prisma";
import { getAnnouncementModel } from "@/lib/models/Announcement";
import { Types } from "mongoose";
import { logAuditEvent } from "@/lib/audit";

export async function GET(request: Request) {
  const conn = await getConnection();
  const Announcement = getAnnouncementModel(conn);

  const { searchParams } = new URL(request.url);
  const audience = searchParams.get("audience");
  const userId = searchParams.get("userId");

  const query: any = {};
  if (audience && ["student", "business"].includes(audience)) {
    query.audience = audience;
  }
  if (userId && Types.ObjectId.isValid(userId)) {
    query.$or = [
      { targetUserIds: { $exists: false } },
      { targetUserIds: { $size: 0 } },
      { targetUserIds: new Types.ObjectId(userId) }
    ];
  }
  
  const announcements = await Announcement.find(query).sort({ createdAt: -1 }).limit(50);
  return NextResponse.json(announcements);
}

export async function POST(request: Request) {
  const { title, body, userId, audience, targetUserIds } = await request.json();
  if (!title || !body) {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }
  const normalizedAudience = Array.isArray(audience)
    ? audience.filter((value) => value === "student" || value === "business")
    : [];
  if (normalizedAudience.length === 0) {
    return NextResponse.json({ error: "audience must include student or business" }, { status: 400 });
  }

  const normalizedTargets = Array.isArray(targetUserIds)
    ? targetUserIds.filter((id) => typeof id === "string" && Types.ObjectId.isValid(id))
    : [];
  
  const conn = await getConnection();
  const Announcement = getAnnouncementModel(conn);
  
  const announcement = await Announcement.create({
    title,
    body,
    audience: normalizedAudience,
    targetUserIds: normalizedTargets,
    ...(userId ? { userId } : {})
  });
  await logAuditEvent({
    action: "announcement.create",
    actorRole: "admin",
    details: `Announcement created: ${title}`,
    metadata: { audience: normalizedAudience, targets: normalizedTargets }
  });
  return NextResponse.json(announcement, { status: 201 });
}

export async function PUT(request: Request) {
  const { _id, title, body, audience, targetUserIds } = await request.json();
  if (!_id) {
    return NextResponse.json({ error: "_id is required" }, { status: 400 });
  }

  const normalizedAudience = Array.isArray(audience)
    ? audience.filter((value) => value === "student" || value === "business")
    : [];
  if (normalizedAudience.length === 0) {
    return NextResponse.json({ error: "audience must include student or business" }, { status: 400 });
  }

  const normalizedTargets = Array.isArray(targetUserIds)
    ? targetUserIds.filter((id) => typeof id === "string" && Types.ObjectId.isValid(id))
    : [];

  const conn = await getConnection();
  const Announcement = getAnnouncementModel(conn);

  const updated = await Announcement.findByIdAndUpdate(
    _id,
    {
      title,
      body,
      audience: normalizedAudience,
      targetUserIds: normalizedTargets
    },
    { new: true, runValidators: true }
  );

  if (!updated) {
    return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
  }

  await logAuditEvent({
    action: "announcement.update",
    actorRole: "admin",
    details: `Announcement updated: ${updated.title}`,
    metadata: { audience: normalizedAudience, targets: normalizedTargets }
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id || !Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Valid id is required" }, { status: 400 });
  }

  const conn = await getConnection();
  const Announcement = getAnnouncementModel(conn);

  const deleted = await Announcement.findByIdAndDelete(id);
  if (!deleted) {
    return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
  }

  await logAuditEvent({
    action: "announcement.delete",
    actorRole: "admin",
    details: `Announcement deleted: ${deleted.title}`
  });

  return NextResponse.json({ message: "Announcement deleted" });
}
