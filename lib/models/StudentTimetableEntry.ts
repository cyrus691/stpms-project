import { Schema, Document, Connection, Types, Model } from "mongoose";

export interface IStudentTimetableEntry extends Document {
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  className: string;
  startTime: string;
  endTime: string;
  venue?: string;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const studentTimetableEntrySchema = new Schema<IStudentTimetableEntry>(
  {
    day: {
      type: String,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      required: true
    },
    className: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    venue: { type: String },
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" }
  },
  { timestamps: true, collection: "student_timetable" }
);

export const getStudentTimetableEntryModel = (conn: Connection): Model<IStudentTimetableEntry> => {
  if (conn.models.StudentTimetableEntry) {
    return conn.models.StudentTimetableEntry as Model<IStudentTimetableEntry>;
  }
  return conn.model<IStudentTimetableEntry>("StudentTimetableEntry", studentTimetableEntrySchema);
};
