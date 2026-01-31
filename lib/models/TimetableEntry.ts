import { Schema, Document, Connection, Types, Model } from "mongoose";

export interface ITimetableEntry extends Document {
  title: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  userId: Types.ObjectId;
}

const timetableEntrySchema = new Schema<ITimetableEntry>(
  {
    title: { type: String, required: true },
    location: { type: String },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" }
  },
  { timestamps: true }
);

export const getTimetableEntryModel = (conn: Connection): Model<ITimetableEntry> => {
  if (conn.models.TimetableEntry) {
    return conn.models.TimetableEntry as Model<ITimetableEntry>;
  }
  return conn.model<ITimetableEntry>("TimetableEntry", timetableEntrySchema);
};
