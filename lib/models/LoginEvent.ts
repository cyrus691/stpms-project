import { Schema, Document, Connection, Types, Model } from "mongoose";

export interface ILoginEvent extends Document {
  userId: Types.ObjectId;
  role: "admin" | "student" | "business";
  createdAt: Date;
}

const loginEventSchema = new Schema<ILoginEvent>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    role: { type: String, enum: ["admin", "student", "business"], required: true }
  },
  { timestamps: true }
);

export const getLoginEventModel = (conn: Connection): Model<ILoginEvent> => {
  if (conn.models.LoginEvent) {
    return conn.models.LoginEvent as Model<ILoginEvent>;
  }
  return conn.model<ILoginEvent>("LoginEvent", loginEventSchema);
};
