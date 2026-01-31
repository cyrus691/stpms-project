import { NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/auth";
import { getConnection } from "@/lib/prisma";
import { getUserModel } from "@/lib/models/User";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const conn = await getConnection();
  const User = getUserModel(conn);
  const existingUser = await User.findOne({ username }).select("status").lean();
  if (existingUser?.status === "Inactive") {
    await logAuditEvent({
      action: "auth.inactive_login",
      actorRole: "system",
      details: `Inactive account login attempt for ${username}. Reason: account inactive.`,
      metadata: { username, reason: "account inactive" }
    });
    return NextResponse.json({ error: "Account inactive. Contact an administrator." }, { status: 403 });
  }

  const user = await verifyCredentials(username, password);
  if (!user) {
    await logAuditEvent({
      action: "auth.failed_login",
      actorRole: "system",
      details: `Failed login attempt for ${username}. Reason: invalid credentials.`,
      metadata: { username, reason: "invalid credentials" }
    });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  return NextResponse.json({
    message: "Authenticated (session wiring TODO)",
    user
  });
}
