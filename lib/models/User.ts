
import { Schema, Document, Connection, Model } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  phone?: string;
  name: string;
  passwordHash: string;
  role: "admin" | "student" | "business";
  status: "Active" | "Inactive";
  fcmTokens?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "student", "business"], required: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    fcmTokens: { type: [String], default: [] }
  },
  { timestamps: true }
);

export const getUserModel = (conn: Connection): Model<IUser> => {
  // Check if model already exists to avoid OverwriteModelError
  if (conn.models.User) {
    const existingModel = conn.models.User as Model<IUser>;
    if (!existingModel.schema.path("status")) {
      existingModel.schema.add({
        status: { type: String, enum: ["Active", "Inactive"], default: "Active" }
      });
    }
    if (!existingModel.schema.path("phone")) {
      existingModel.schema.add({
        phone: { type: String }
      });
    }
    return existingModel;
  }
  return conn.model<IUser>("User", userSchema);
};
