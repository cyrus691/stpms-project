export const dynamic = "force-dynamic";
import { getStudentTaskModel } from '@/lib/models/StudentTask';
import { getStudentTimetableEntryModel } from '@/lib/models/StudentTimetableEntry';
import { sendFcmNotification } from '@/lib/send-fcm-notification';
import mongoose from 'mongoose';
import { getStudentReminderModel } from '@/lib/models/StudentReminder';
import { getUserModel } from '@/lib/models/User';

export async function POST(request: Request) {
  // Verify cron secret for security
  const cronSecret = request.headers.get('X-Cron-Secret');
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const StudentTask = getStudentTaskModel(mongoose.connection);
  const StudentTimetableEntry = getStudentTimetableEntryModel(mongoose.connection);
  const User = getUserModel(mongoose.connection);
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  // --- TASKS: Notify for tasks due in 1 hour or now ---
  const tasks = await StudentTask.find({
    status: { $in: ['pending', 'overdue'] },
    dueDate: { $gte: now, $lte: oneHourLater },
  }).lean();
  const tasksByUser: Record<string, any[]> = {};
  tasks.forEach(task => {
    const userId = task.userId?.toString();
    if (!userId) return;
    if (!tasksByUser[userId]) tasksByUser[userId] = [];
    tasksByUser[userId].push(task);
  });

  for (const userId in tasksByUser) {
    const user = await User.findById(userId).lean();
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) continue;
    for (const task of tasksByUser[userId]) {
      const due = new Date(task.dueDate);
      const diff = due.getTime() - now.getTime();
      if (diff > 0 && diff <= 60 * 60 * 1000) {
        await sendFcmNotification(user.fcmTokens, {
          title: `Task due in 1 hour`,
          body: `${task.title}: ${task.details || ''} at ${due.toLocaleString()}`,
          data: { taskId: task._id.toString() },
        });
      }
      if (Math.abs(diff) < 60 * 1000) {
        await sendFcmNotification(user.fcmTokens, {
          title: `Task due now`,
          body: `${task.title}: ${task.details || ''} (${due.toLocaleString()})`,
          data: { taskId: task._id.toString() },
        });
      }
    }
  }

  // --- TIMETABLE: Notify for classes starting in 1 hour or now ---
  const timetableEntries = await StudentTimetableEntry.find({
    startTime: { $exists: true, $ne: null },
    userId: { $exists: true, $ne: null },
  }).lean();
  const timetableByUser: Record<string, any[]> = {};
  timetableEntries.forEach(entry => {
    const userId = entry.userId?.toString();
    if (!userId) return;
    if (!timetableByUser[userId]) timetableByUser[userId] = [];
    timetableByUser[userId].push(entry);
  });

  for (const userId in timetableByUser) {
    const user = await User.findById(userId).lean();
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) continue;
    for (const entry of timetableByUser[userId]) {
      // Parse today's date with entry.startTime (assume format 'HH:mm')
      const today = new Date(now);
      const [h, m] = (entry.startTime || '').split(':');
      if (h === undefined || m === undefined) continue;
      today.setHours(Number(h), Number(m), 0, 0);
      const diff = today.getTime() - now.getTime();
      if (diff > 0 && diff <= 60 * 60 * 1000) {
        await sendFcmNotification(user.fcmTokens, {
          title: `Class in 1 hour`,
          body: `${entry.className} at ${entry.startTime} in ${entry.venue || 'TBA'}`,
          data: { timetableId: entry._id.toString() },
        });
      }
      if (Math.abs(diff) < 60 * 1000) {
        await sendFcmNotification(user.fcmTokens, {
          title: `Class starting now`,
          body: `${entry.className} at ${entry.startTime} in ${entry.venue || 'TBA'}`,
          data: { timetableId: entry._id.toString() },
        });
      }
    }
  }

  // --- REMINDERS: Notify for reminders due in 1 hour or now ---
  const StudentReminder = getStudentReminderModel(mongoose.connection);
  const reminders = await StudentReminder.find({
    status: 'active',
    remindAt: {
      $gte: now,
      $lte: oneHourLater,
    },
  }).lean();
  const remindersByUser: Record<string, any[]> = {};
  reminders.forEach(reminder => {
    const userId = reminder.userId?.toString();
    if (!userId) return;
    if (!remindersByUser[userId]) remindersByUser[userId] = [];
    remindersByUser[userId].push(reminder);
  });
  for (const userId in remindersByUser) {
    const user = await User.findById(userId).lean();
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) continue;
    for (const reminder of remindersByUser[userId]) {
      // 1hr before notification
      const remindAt = new Date(reminder.remindAt);
      const diff = remindAt.getTime() - now.getTime();
      if (diff > 0 && diff <= 60 * 60 * 1000) {
        await sendFcmNotification(user.fcmTokens, {
          title: `Reminder in 1 hour`,
          body: `${reminder.title}: ${reminder.note || ''} at ${remindAt.toLocaleString()}`,
          data: { reminderId: reminder._id.toString() },
        });
      }
      if (Math.abs(diff) < 60 * 1000) {
        await sendFcmNotification(user.fcmTokens, {
          title: `Reminder now`,
          body: `${reminder.title}: ${reminder.note || ''} (${remindAt.toLocaleString()})`,
          data: { reminderId: reminder._id.toString() },
        });
      }
    }
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
