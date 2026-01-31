import { NextResponse } from "next/server";
import { getConnection } from "@/lib/prisma";
import { getTaskModel } from "@/lib/models/Task";
import { getExpenseModel } from "@/lib/models/Expense";
import { getUserModel } from "@/lib/models/User";
import { getReminderModel } from "@/lib/models/Reminder";

export async function GET() {
  try {
    const conn = await getConnection();
    const Task = getTaskModel(conn);
    const Expense = getExpenseModel(conn);
    const User = getUserModel(conn);
    const Reminder = getReminderModel(conn);
    
    const adminUsers = await User.find({ role: "admin" })
      .select("_id name role")
      .lean()
      .exec();
    const adminIdSet = new Set(adminUsers.map((user) => user._id.toString()));

    // Fetch recent activities from different collections
    const [recentTasks, recentExpenses, recentUsers, recentReminders] = await Promise.all([
      Task.find({ userId: { $in: adminUsers.map((user) => user._id) } })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
        .exec(),
      Expense.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
        .exec(),
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name role createdAt")
        .lean()
        .exec(),
      Reminder.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
        .exec()
    ]);

    // Get user info for tasks and expenses
    const userIds = [
      ...recentTasks.map(t => t.userId),
      ...recentExpenses.map(e => e.userId),
      ...recentReminders.map(r => r.userId)
    ].filter(id => id);

    const users = await User.find({ _id: { $in: userIds } })
      .select("_id name role")
      .lean()
      .exec();
    
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    // Combine and format activities
    const activities = [
      ...recentTasks
        .filter(task => task.userId && adminIdSet.has(task.userId.toString()))
        .map(task => {
          const taskUserId = task.userId?.toString();
          const taskUser = taskUserId ? userMap.get(taskUserId) : undefined;
          return {
            id: task._id,
            user: taskUser?.name || "Unknown User",
            action: `created task "${task.title || "Untitled task"}"`,
            type: "task",
            time: task.createdAt,
            role: taskUser?.role || "unknown",
            icon: "✅"
          };
        }),
      ...recentExpenses.map(expense => {
        const expenseUserId = expense.userId?.toString();
        const expenseUser = expenseUserId ? userMap.get(expenseUserId) : undefined;
        return {
          id: expense._id,
          user: expenseUser?.name || "Business User",
          action: `recorded expense "${expense.label}" - $${expense.amount}`,
          type: "expense",
          time: expense.createdAt,
          role: expenseUser?.role || "unknown",
          icon: "💰"
        };
      }),
      ...recentUsers.map(user => ({
        id: user._id,
        user: user.name,
        action: `registered as ${user.role}`,
        type: "user",
        time: user.createdAt,
        role: user.role || "unknown",
        icon: "👤"
      })),
      ...recentReminders.map(reminder => {
        const reminderUserId = reminder.userId?.toString();
        const reminderUser = reminderUserId ? userMap.get(reminderUserId) : undefined;
        return {
          id: reminder._id,
          user: reminderUser?.name || "Unknown User",
          action: `set reminder "${reminder.message}"`,
          type: "reminder",
          time: reminder.createdAt,
          role: reminderUser?.role || "unknown",
          icon: "🔔"
        };
      })
    ];

    // Sort by time and take top 10
    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    const recentActivities = activities.slice(0, 10);

    return NextResponse.json(recentActivities, {
      headers: {
        'Cache-Control': 'private, max-age=5, stale-while-revalidate=15',
      },
    });
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
  }
}
