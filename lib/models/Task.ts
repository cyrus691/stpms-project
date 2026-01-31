import { Schema, Document, Connection, Types, Model } from "mongoose";

export interface ITask extends Document {
  title: string;
  details?: string;
  dueDate?: Date;
  status: "pending" | "done" | "overdue";
  priority?: "low" | "medium" | "high";
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    details: { type: String },
    dueDate: { type: Date },
    status: { type: String, enum: ["pending", "done", "overdue"], default: "pending" },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" }
  },
  { timestamps: true }
);

export const getTaskModel = (conn: Connection): Model<ITask> => {
  if (conn.models.Task) {
    return conn.models.Task as Model<ITask>;
  }
  return conn.model<ITask>("Task", taskSchema);
};
