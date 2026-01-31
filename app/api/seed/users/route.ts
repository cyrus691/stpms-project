import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getConnection } from "@/lib/prisma";
import { getUserModel } from "@/lib/models/User";
import { getTaskModel } from "@/lib/models/Task";
import { getExpenseModel } from "@/lib/models/Expense";

export async function POST() {
  try {
    const conn = await getConnection();
    const User = getUserModel(conn);
    const Task = getTaskModel(conn);
    const Expense = getExpenseModel(conn);

    // Check if sample data already exists
    const existingStudents = await User.countDocuments({ role: "student" });
    if (existingStudents > 3) {
      return NextResponse.json({ message: "Sample data already exists" }, { status: 200 });
    }

    const hashedPassword = await bcrypt.hash("password123", 10);

    // Create sample students
    const students = await User.create([
      {
        username: "alice_student",
        email: "alice@students.com",
        name: "Alice Johnson",
        passwordHash: hashedPassword,
        role: "student"
      },
      {
        username: "bob_student",
        email: "bob@students.com",
        name: "Bob Smith",
        passwordHash: hashedPassword,
        role: "student"
      },
      {
        username: "carol_student",
        email: "carol@students.com",
        name: "Carol White",
        passwordHash: hashedPassword,
        role: "student"
      }
    ]);

    // Create sample business users
    const businessUsers = await User.create([
      {
        username: "techsolutions",
        email: "david@techsolutions.com",
        name: "Tech Solutions Inc",
        passwordHash: hashedPassword,
        role: "business"
      },
      {
        username: "designstudio",
        email: "emma@designstudio.com",
        name: "Design Studio LLC",
        passwordHash: hashedPassword,
        role: "business"
      }
    ]);

    // Create sample tasks for students
    for (const student of students) {
      const taskCount = Math.floor(Math.random() * 10) + 5;
      const tasks = [];
      for (let i = 0; i < taskCount; i++) {
        tasks.push({
          title: `Task ${i + 1} for ${student.name}`,
          details: `Sample task description`,
          userId: student._id,
          status: i % 3 === 0 ? "done" : "pending",
          dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000)
        });
      }
      await Task.create(tasks);
    }

    // Create sample expenses for business users
    for (const biz of businessUsers) {
      const expenseCount = Math.floor(Math.random() * 15) + 5;
      const expenses = [];
      for (let i = 0; i < expenseCount; i++) {
        expenses.push({
          label: `Expense ${i + 1}`,
          amount: Math.floor(Math.random() * 5000) + 100,
          occurredOn: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
          userId: biz._id
        });
      }
      await Expense.create(expenses);
    }

    return NextResponse.json(
      {
        message: "Sample data created successfully",
        data: {
          students: students.length,
          businessUsers: businessUsers.length
        }
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Seeding error:", error);
    return NextResponse.json({ error: error.message || "Seeding failed" }, { status: 500 });
  }
}
