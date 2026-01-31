import { Schema, Document, Connection, Types, Model } from "mongoose";

export interface IAnnouncement extends Document {
  title: string;
  body: string;
  userId?: Types.ObjectId;
  targetUserIds?: Types.ObjectId[];
  audience: ("student" | "business")[];
  createdAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    targetUserIds: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    audience: { type: [String], enum: ["student", "business"], default: ["student", "business"] }
  },
  { timestamps: true }
);

export const getAnnouncementModel = (conn: Connection): Model<IAnnouncement> => {
  if (conn.models.Announcement) {
    return conn.models.Announcement as Model<IAnnouncement>;
  }
  return conn.model<IAnnouncement>("Announcement", announcementSchema);
};
