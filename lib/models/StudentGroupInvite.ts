import { Schema, Document, Connection, Types, Model } from "mongoose";

export interface IStudentGroupInvite extends Document {
  groupId: Types.ObjectId;
  inviterId: Types.ObjectId;
  inviteeId: Types.ObjectId;
  status: "pending" | "accepted" | "declined";
  createdAt: Date;
  updatedAt: Date;
}

const studentGroupInviteSchema = new Schema<IStudentGroupInvite>(
  {
    groupId: { type: Schema.Types.ObjectId, required: true, ref: "StudentGroup" },
    inviterId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    inviteeId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" }
  },
  { timestamps: true, collection: "student_group_invites" }
);

export const getStudentGroupInviteModel = (conn: Connection): Model<IStudentGroupInvite> => {
  if (conn.models.StudentGroupInvite) {
    return conn.models.StudentGroupInvite as Model<IStudentGroupInvite>;
  }
  return conn.model<IStudentGroupInvite>("StudentGroupInvite", studentGroupInviteSchema);
};
