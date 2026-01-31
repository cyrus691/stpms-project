import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

// Load .env file
const envPath = path.resolve(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars = {};

envContent.split("\n").forEach((line) => {
  if (!line.trim() || line.startsWith("#")) return;
  const equalsIndex = line.indexOf("=");
  if (equalsIndex === -1) return;
  const key = line.substring(0, equalsIndex).trim();
  let value = line.substring(equalsIndex + 1).trim();
  // Remove surrounding quotes
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  envVars[key] = value;
});

const mongoUrl = envVars.DATABASE_URL;

if (!mongoUrl) {
  console.error("DATABASE_URL not found in .env");
  process.exit(1);
}

async function seedAdmin() {
  try {
    await mongoose.connect(mongoUrl);
    console.log("Connected to MongoDB");

    const userSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      email: { type: String, required: true, unique: true },
      name: { type: String, required: true },
      passwordHash: { type: String, required: true },
      role: { type: String, enum: ["admin", "student", "business"], required: true }
    });

    const User = mongoose.model("User", userSchema);

    // Check if admin exists
    const existingAdmin = await User.findOne({ email: "muwanguzicyrus7@gmail.com" });
    if (existingAdmin) {
      console.log("Admin account already exists!");
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create admin account
    const hashedPassword = await bcrypt.hash("kasule", 10);
    const admin = await User.create({
      username: "admin",
      email: "muwanguzicyrus7@gmail.com",
      name: "System Administrator",
      passwordHash: hashedPassword,
      role: "admin"
    });

    console.log("✓ Admin account created successfully!");
    console.log(`  Email: ${admin.email}`);
    console.log(`  Username: ${admin.username}`);
    console.log(`  Role: ${admin.role}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error creating admin account:", error);
    process.exit(1);
  }
}

seedAdmin();
