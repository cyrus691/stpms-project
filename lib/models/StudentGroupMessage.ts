import { Schema, Document, Connection, Types, Model } from "mongoose";

export interface IStudentGroupMessage extends Document {
  groupId: Types.ObjectId;
  senderId: Types.ObjectId;
  message: string;
  createdAt: Date;
}

const studentGroupMessageSchema = new Schema<IStudentGroupMessage>(
  {
    groupId: { type: Schema.Types.ObjectId, required: true, ref: "StudentGroup" },
    senderId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    message: { type: String, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "student_group_messages" }
);

export const getStudentGroupMessageModel = (conn: Connection): Model<IStudentGroupMessage> => {
  if (conn.models.StudentGroupMessage) {
    return conn.models.StudentGroupMessage as Model<IStudentGroupMessage>;
  }
  return conn.model<IStudentGroupMessage>("StudentGroupMessage", studentGroupMessageSchema);
};
