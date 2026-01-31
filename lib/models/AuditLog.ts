import { Schema, Document, Connection, Types, Model } from "mongoose";

export interface IAuditLog extends Document {
  action: string;
  actorId?: Types.ObjectId;
  actorRole?: "admin" | "student" | "business" | "system";
  targetUserId?: Types.ObjectId;
  targetRole?: "admin" | "student" | "business";
  details?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    actorRole: { type: String, enum: ["admin", "student", "business", "system"], default: "system" },
    targetUserId: { type: Schema.Types.ObjectId, ref: "User" },
    targetRole: { type: String, enum: ["admin", "student", "business"] },
    details: { type: String },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

export const getAuditLogModel = (conn: Connection): Model<IAuditLog> => {
  if (conn.models.AuditLog) {
    return conn.models.AuditLog as Model<IAuditLog>;
  }
  return conn.model<IAuditLog>("AuditLog", auditLogSchema);
};
