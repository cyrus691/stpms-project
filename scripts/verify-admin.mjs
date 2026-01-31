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
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  envVars[key] = value;
});

const mongoUrl = envVars.DATABASE_URL;

async function checkAdmin() {
  try {
    await mongoose.connect(mongoUrl);
    console.log("Connected to MongoDB");

    const userSchema = new mongoose.Schema({
      username: String,
      email: String,
      name: String,
      passwordHash: String,
      role: String
    });

    const User = mongoose.model("User", userSchema);

    const admin = await User.findOne({ email: "muwanguzicyrus7@gmail.com" });
    
    if (admin) {
      console.log("✓ Admin account found in database:");
      console.log(`  ID: ${admin._id}`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  Username: ${admin.username}`);
      console.log(`  Name: ${admin.name}`);
      console.log(`  Role: ${admin.role}`);
      console.log(`  Password Hash: ${admin.passwordHash.substring(0, 20)}...`);
    } else {
      console.log("✗ Admin account not found in database");
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkAdmin();
