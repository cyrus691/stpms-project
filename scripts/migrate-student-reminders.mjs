import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

const loadEnvFromFile = () => {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const contents = fs.readFileSync(envPath, "utf-8");
  contents.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
};

const run = async () => {
  loadEnvFromFile();
  const mongoUrl = process.env.DATABASE_URL;
  if (!mongoUrl) {
    throw new Error("DATABASE_URL is not defined");
  }

  const conn = await mongoose.connect(mongoUrl, {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 60000,
    connectTimeoutMS: 30000,
  });

  const userSchema = new mongoose.Schema(
    { role: { type: String, enum: ["admin", "student", "business"], required: true } },
    { collection: "users" }
  );

  const reminderSchema = new mongoose.Schema(
    {
      message: { type: String, required: true },
      status: { type: String, enum: ["active", "dismissed", "expired"], default: "active" },
      remindAt: { type: Date },
      userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" }
    },
    { timestamps: true, collection: "reminders" }
  );

  const studentReminderSchema = new mongoose.Schema(
    {
      title: { type: String, required: true },
      note: { type: String },
      status: { type: String, enum: ["active", "dismissed", "expired"], default: "active" },
      remindAt: { type: Date },
      userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" }
    },
    { timestamps: true, collection: "student_reminders" }
  );

  const User = conn.models.User || conn.model("User", userSchema);
  const Reminder = conn.models.Reminder || conn.model("Reminder", reminderSchema);
  const StudentReminder = conn.models.StudentReminder || conn.model("StudentReminder", studentReminderSchema);

  const students = await User.find({ role: "student" }).select({ _id: 1 }).lean();
  const studentIds = new Set(students.map((s) => s._id.toString()));

  const reminders = await Reminder.find().lean();
  const studentReminders = reminders.filter((reminder) => studentIds.has(reminder.userId?.toString()));

  if (studentReminders.length === 0) {
    console.log("No student reminders found to migrate.");
    await conn.disconnect();
    return;
  }

  const operations = studentReminders.map((reminder) => ({
    updateOne: {
      filter: { _id: reminder._id },
      update: {
        $setOnInsert: {
          _id: reminder._id,
          title: reminder.message,
          note: undefined,
          status: reminder.status ?? "active",
          remindAt: reminder.remindAt ?? null,
          userId: reminder.userId
        }
      },
      upsert: true
    }
  }));

  const result = await StudentReminder.bulkWrite(operations, { ordered: false });
  console.log(`Student reminders migrated. Inserted: ${result.upsertedCount}`);
  await conn.disconnect();
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
