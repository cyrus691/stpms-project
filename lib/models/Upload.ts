import { Schema, Document, Connection, Types, Model } from "mongoose";

export interface IUpload extends Document {
  fileName: string;
  path: string;
  kind: "group_file" | "user_file";
  userId?: Types.ObjectId;
  createdAt: Date;
}

const uploadSchema = new Schema<IUpload>(
  {
    fileName: { type: String, required: true },
    path: { type: String, required: true },
    kind: { type: String, enum: ["group_file", "user_file"], required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const getUploadModel = (conn: Connection): Model<IUpload> => {
  if (conn.models.Upload) {
    return conn.models.Upload as Model<IUpload>;
  }
  return conn.model<IUpload>("Upload", uploadSchema);
};
