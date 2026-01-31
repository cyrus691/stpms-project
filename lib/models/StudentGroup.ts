import { Schema, Document, Connection, Types, Model } from "mongoose";

export interface IStudentGroup extends Document {
  name: string;
  description?: string;
  ownerId: Types.ObjectId;
  memberIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const studentGroupSchema = new Schema<IStudentGroup>(
  {
    name: { type: String, required: true },
    description: { type: String },
    ownerId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    memberIds: [{ type: Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true, collection: "student_groups" }
);

export const getStudentGroupModel = (conn: Connection): Model<IStudentGroup> => {
  if (conn.models.StudentGroup) {
    return conn.models.StudentGroup as Model<IStudentGroup>;
  }
  return conn.model<IStudentGroup>("StudentGroup", studentGroupSchema);
};
