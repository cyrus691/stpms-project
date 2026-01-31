import { Schema, Document, Connection, Types, Model } from "mongoose";

export interface IReminder extends Document {
  message: string;
  status: "active" | "dismissed" | "expired";
  remindAt?: Date;
  userId: Types.ObjectId;
  createdAt: Date;
}

const reminderSchema = new Schema<IReminder>(
  {
    message: { type: String, required: true },
    status: { type: String, enum: ["active", "dismissed", "expired"], default: "active" },
    remindAt: { type: Date },
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" }
  },
  { timestamps: true }
);

export const getReminderModel = (conn: Connection): Model<IReminder> => {
  if (conn.models.Reminder) {
    return conn.models.Reminder as Model<IReminder>;
  }
  return conn.model<IReminder>("Reminder", reminderSchema);
};
