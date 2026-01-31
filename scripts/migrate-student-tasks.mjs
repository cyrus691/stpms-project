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
    {
      role: { type: String, enum: ["admin", "student", "business"], required: true }
    },
    { collection: "users" }
  );

  const taskSchema = new mongoose.Schema(
    {
      title: { type: String, required: true },
      details: { type: String },
      dueDate: { type: Date },
      status: { type: String, enum: ["pending", "done", "overdue"], default: "pending" },
      priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
      userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" }
    },
    { timestamps: true, collection: "tasks" }
  );

  const studentTaskSchema = new mongoose.Schema(
    {
      title: { type: String, required: true },
      details: { type: String },
      dueDate: { type: Date },
      status: { type: String, enum: ["pending", "done", "overdue"], default: "pending" },
      priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
      userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" }
    },
    { timestamps: true, collection: "student_tasks" }
  );

  const User = conn.models.User || conn.model("User", userSchema);
  const Task = conn.models.Task || conn.model("Task", taskSchema);
  const StudentTask = conn.models.StudentTask || conn.model("StudentTask", studentTaskSchema);

  const students = await User.find({ role: "student" }).select({ _id: 1 }).lean();
  const studentIds = new Set(students.map((s) => s._id.toString()));

  const tasks = await Task.find().lean();
  const studentTasks = tasks.filter((task) => studentIds.has(task.userId?.toString()));

  if (studentTasks.length === 0) {
    console.log("No student tasks found to migrate.");
    return;
  }

  const operations = studentTasks.map((task) => ({
    updateOne: {
      filter: { _id: task._id },
      update: {
        $setOnInsert: {
          _id: task._id,
          title: task.title,
          details: task.details,
          dueDate: task.dueDate ?? null,
          status: task.status ?? "pending",
          priority: task.priority ?? "medium",
          userId: task.userId
        }
      },
      upsert: true
    }
  }));

  const result = await StudentTask.bulkWrite(operations, { ordered: false });
  console.log(`Student tasks migrated. Inserted: ${result.upsertedCount}`);
  await conn.disconnect();
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
