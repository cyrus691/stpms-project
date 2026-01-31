import { Schema, Document, Connection, Model } from "mongoose";

export interface ISetting extends Document {
  key: string;
  value: string;
}

const settingSchema = new Schema<ISetting>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true }
  },
  { timestamps: true }
);

export const getSettingModel = (conn: Connection): Model<ISetting> => {
  if (conn.models.Setting) {
    return conn.models.Setting as Model<ISetting>;
  }
  return conn.model<ISetting>("Setting", settingSchema);
};
