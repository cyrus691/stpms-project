import { Schema, Document, Connection, Types, Model } from "mongoose";

export interface ISessionEvent extends Document {
  userId: Types.ObjectId;
  role: "admin" | "student" | "business";
  loginAt: Date;
  logoutAt?: Date | null;
  durationMinutes?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const sessionEventSchema = new Schema<ISessionEvent>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    role: { type: String, enum: ["admin", "student", "business"], required: true },
    loginAt: { type: Date, required: true, default: Date.now },
    logoutAt: { type: Date, default: null },
    durationMinutes: { type: Number, default: null }
  },
  { timestamps: true }
);

export const getSessionEventModel = (conn: Connection): Model<ISessionEvent> => {
  if (conn.models.SessionEvent) {
    return conn.models.SessionEvent as Model<ISessionEvent>;
  }
  return conn.model<ISessionEvent>("SessionEvent", sessionEventSchema);
};
