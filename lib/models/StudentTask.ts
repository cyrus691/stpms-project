import { Schema, Document, Connection, Types, Model } from "mongoose";

export interface IStudentTask extends Document {
  title: string;
  details?: string;
  dueDate?: Date;
  status: "pending" | "done" | "overdue";
  priority?: "low" | "medium" | "high";
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const studentTaskSchema = new Schema<IStudentTask>(
  {
    title: { type: String, required: true },
    details: { type: String },
    dueDate: { type: Date },
    status: { type: String, enum: ["pending", "done", "overdue"], default: "pending" },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" }
  },
  { timestamps: true, collection: "student_tasks" }
);

export const getStudentTaskModel = (conn: Connection): Model<IStudentTask> => {
  if (conn.models.StudentTask) {
    return conn.models.StudentTask as Model<IStudentTask>;
  }
  return conn.model<IStudentTask>("StudentTask", studentTaskSchema);
};
