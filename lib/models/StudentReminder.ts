import { Schema, Document, Connection, Types, Model } from "mongoose";

export interface IStudentReminder extends Document {
  title: string;
  note?: string;
  status: "active" | "dismissed" | "expired";
  remindAt?: Date;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const studentReminderSchema = new Schema<IStudentReminder>(
  {
    title: { type: String, required: true },
    note: { type: String },
    status: { type: String, enum: ["active", "dismissed", "expired"], default: "active" },
    remindAt: { type: Date },
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" }
  },
  { timestamps: true, collection: "student_reminders" }
);

export const getStudentReminderModel = (conn: Connection): Model<IStudentReminder> => {
  if (conn.models.StudentReminder) {
    return conn.models.StudentReminder as Model<IStudentReminder>;
  }
  return conn.model<IStudentReminder>("StudentReminder", studentReminderSchema);
};
