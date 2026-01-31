import { getConnection } from "@/lib/prisma";
import { getAuditLogModel } from "@/lib/models/AuditLog";

interface AuditLogInput {
  action: string;
  actorId?: string;
  actorRole?: "admin" | "student" | "business" | "system";
  targetUserId?: string;
  targetRole?: "admin" | "student" | "business";
  details?: string;
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent(input: AuditLogInput) {
  try {
    const conn = await getConnection();
    const AuditLog = getAuditLogModel(conn);
    await AuditLog.create({
      action: input.action,
      actorId: input.actorId,
      actorRole: input.actorRole || "system",
      targetUserId: input.targetUserId,
      targetRole: input.targetRole,
      details: input.details,
      metadata: input.metadata
    });
  } catch (error) {
    console.error("Error logging audit event:", error);
  }
}
