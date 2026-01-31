import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getConnection } from "@/lib/prisma";
import { getUserModel } from "@/lib/models/User";
import { getTimetableEntryModel } from "@/lib/models/TimetableEntry";
import { getAnnouncementModel } from "@/lib/models/Announcement";
import { getLoginEventModel } from "@/lib/models/LoginEvent";
import { getAuditLogModel } from "@/lib/models/AuditLog";
import { getSessionEventModel } from "@/lib/models/SessionEvent";
import { getRestockLogModel } from "@/lib/models/RestockLog";

const parseDate = (value: string | null, endOfDay = false) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
};

const buildDateMatch = (field: string, start?: Date | null, end?: Date | null) => {
  if (!start && !end) return {};
  const range: { $gte?: Date; $lte?: Date } = {};
  if (start) range.$gte = start;
  if (end) range.$lte = end;
  return { [field]: range };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = parseDate(searchParams.get("start"));
    const end = parseDate(searchParams.get("end"), true);
    const role = searchParams.get("role") || "all";
    const status = searchParams.get("status") || "all";
    const sessionUserId = searchParams.get("sessionUserId") || "all";
    const sessionStart = parseDate(searchParams.get("sessionStart"));
    const sessionEnd = parseDate(searchParams.get("sessionEnd"), true);
    const activityUserId = searchParams.get("activityUserId") || "all";
    const activityStart = parseDate(searchParams.get("activityStart"));
    const activityEnd = parseDate(searchParams.get("activityEnd"), true);
    const search = (searchParams.get("search") || "").trim();

    const conn = await getConnection();
    const User = getUserModel(conn);
    const TimetableEntry = getTimetableEntryModel(conn);
    const Announcement = getAnnouncementModel(conn);
    const LoginEvent = getLoginEventModel(conn);
    const AuditLog = getAuditLogModel(conn);
    const SessionEvent = getSessionEventModel(conn);
    const RestockLog = getRestockLogModel(conn);
    // Aggregate restock logs for accountability
    const restockMatch: Record<string, any> = buildDateMatch("createdAt", start, end);
    const restockLogs = await RestockLog.find(restockMatch)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec();

    const userMatch: Record<string, any> = {};
    if (role !== "all") userMatch.role = role;
    if (status !== "all") userMatch.status = status === "active" ? "Active" : "Inactive";
    if (search) {
      userMatch.$or = [
        { username: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    const userDateMatch = buildDateMatch("createdAt", start, end);
    const [totalUsers, byRoleAgg, byStatusAgg, newRegistrations, filteredUsers] = await Promise.all([
      User.countDocuments(userMatch),
      User.aggregate([
        { $match: userMatch },
        { $group: { _id: "$role", count: { $sum: 1 } } }
      ]),
      User.aggregate([
        { $match: userMatch },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      User.countDocuments({ ...userMatch, ...userDateMatch }),
      Object.keys(userMatch).length
        ? User.find(userMatch).select("_id role status").lean().exec()
        : Promise.resolve([])
    ]);

    const byRole = byRoleAgg.reduce((acc: Record<string, number>, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
    const byStatus = byStatusAgg.reduce((acc: Record<string, number>, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const filteredUserIds = (filteredUsers || []).map((u: any) => u._id);

    const timetableMatch: Record<string, any> = {
      ...buildDateMatch("startTime", start, end)
    };
    if (filteredUserIds.length > 0) {
      timetableMatch.userId = { $in: filteredUserIds };
    }
    const totalTimetables = await TimetableEntry.countDocuments(timetableMatch);
    const now = new Date();
    const activeTimetables = await TimetableEntry.countDocuments({
      ...timetableMatch,
      endTime: { $gte: now }
    });
    const archivedTimetables = Math.max(totalTimetables - activeTimetables, 0);

    const timetableUpdateCount = await TimetableEntry.countDocuments(buildDateMatch("updatedAt", start, end));

    const timetableEntries = await TimetableEntry.find(timetableMatch)
      .sort({ userId: 1, startTime: 1 })
      .lean()
      .exec();

    let conflicts = 0;
    const userEntriesMap: Record<string, typeof timetableEntries> = {};
    timetableEntries.forEach((entry) => {
      const key = entry.userId?.toString() || "unknown";
      if (!userEntriesMap[key]) userEntriesMap[key] = [];
      userEntriesMap[key].push(entry);
    });

    Object.values(userEntriesMap).forEach((entries) => {
      for (let i = 0; i < entries.length - 1; i += 1) {
        const current = entries[i];
        const next = entries[i + 1];
        if (current.endTime > next.startTime) {
          conflicts += 1;
        }
      }
    });

    const approvalsMatch = {
      action: { $regex: /^approval\./ },
      ...buildDateMatch("createdAt", start, end)
    };
    const approvalActions = await AuditLog.aggregate([
      { $match: approvalsMatch },
      { $group: { _id: "$action", count: { $sum: 1 } } }
    ]);

    const approvalCounts = approvalActions.reduce(
      (acc: Record<string, number>, item: any) => {
        acc[item._id] = item.count;
        return acc;
      },
      {}
    );

    const notificationsMatch = buildDateMatch("createdAt", start, end);
    const notificationsSent = await Announcement.countDocuments(notificationsMatch);

    const loginMatch: Record<string, any> = buildDateMatch("createdAt", activityStart || start, activityEnd || end);
    if (role !== "all") {
      loginMatch.role = role;
    }
    if (activityUserId !== "all") {
      loginMatch.userId = new Types.ObjectId(activityUserId);
    }
    const sessionMatch: Record<string, any> = {
      logoutAt: { $ne: null },
      ...buildDateMatch("loginAt", sessionStart || start, sessionEnd || end)
    };
    if (role !== "all") {
      sessionMatch.role = role;
    }
    if (sessionUserId !== "all") {
      sessionMatch.userId = new Types.ObjectId(sessionUserId);
    }

    const [loginCount, loginByRoleAgg, adminActionsCount, failedLoginsCount, avgSessionAgg, sessionCount] = await Promise.all([
      LoginEvent.countDocuments(loginMatch),
      LoginEvent.aggregate([
        { $match: loginMatch },
        { $group: { _id: "$role", count: { $sum: 1 } } }
      ]),
      AuditLog.countDocuments({
        ...buildDateMatch("createdAt", activityStart || start, activityEnd || end),
        actorRole: "admin",
        ...(activityUserId !== "all" ? { actorId: new Types.ObjectId(activityUserId) } : {})
      }),
      AuditLog.countDocuments({
        ...buildDateMatch("createdAt", activityStart || start, activityEnd || end),
        action: { $in: ["auth.failed_login", "auth.inactive_login"] },
        ...(activityUserId !== "all" ? { $or: [
          { actorId: new Types.ObjectId(activityUserId) },
          { targetUserId: new Types.ObjectId(activityUserId) }
        ] } : {})
      }),
      SessionEvent.aggregate([
        { $match: sessionMatch },
        { $group: { _id: null, avgMinutes: { $avg: "$durationMinutes" } } }
      ]),
      SessionEvent.countDocuments(sessionMatch)
    ]);
    const avgSessionMinutes = avgSessionAgg[0]?.avgMinutes
      ? Math.round(avgSessionAgg[0].avgMinutes * 10) / 10
      : null;

    const loginByRole = loginByRoleAgg.reduce((acc: Record<string, number>, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const auditMatch: Record<string, any> = buildDateMatch("createdAt", activityStart || start, activityEnd || end);
    if (role !== "all") {
      auditMatch.$or = [{ actorRole: role }, { targetRole: role }];
    }
    if (activityUserId !== "all") {
      auditMatch.$or = [
        { actorId: new Types.ObjectId(activityUserId) },
        { targetUserId: new Types.ObjectId(activityUserId) }
      ];
    }

    const auditLogs = await AuditLog.find(auditMatch)
      .sort({ createdAt: -1 })
      .limit(80)
      .lean()
      .exec();

    const auditUserIds = auditLogs
      .flatMap((log: any) => [log.actorId, log.targetUserId])
      .filter(Boolean);

    const auditUsers = auditUserIds.length
      ? await User.find({ _id: { $in: auditUserIds } })
          .select("name username")
          .lean()
          .exec()
      : [];

    const auditUserMap = new Map(
      auditUsers.map((user: any) => [user._id.toString(), user.name || user.username || "Unknown"])
    );

    const auditLogsWithNames = auditLogs.map((log: any) => ({
      ...log,
      actorName: log.actorId ? auditUserMap.get(log.actorId.toString()) : null,
      targetName: log.targetUserId ? auditUserMap.get(log.targetUserId.toString()) : null
    }));

    return NextResponse.json({
      users: {
        total: totalUsers,
        byRole,
        byStatus,
        newRegistrations
      },
      timetable: {
        total: totalTimetables,
        active: activeTimetables,
        archived: archivedTimetables,
        conflicts,
        updates: timetableUpdateCount
      },
      approvals: {
        submitted: approvalCounts["approval.submitted"] || approvalCounts["approval.requested"] || 0,
        approved: approvalCounts["approval.approved"] || 0,
        rejected: approvalCounts["approval.rejected"] || 0,
        pending: approvalCounts["approval.pending"] || 0,
        avgApprovalHours: null
      },
      notifications: {
        sent: notificationsSent,
        read: null,
        unread: null,
        failed: null,
        byType: { announcement: notificationsSent }
      },
      activity: {
        logins: loginCount,
        loginsByRole: loginByRole,
        adminActions: adminActionsCount,
        failedLogins: failedLoginsCount,
        avgSessionMinutes
      },
      sessions: {
        count: sessionCount,
        avgDurationMinutes: avgSessionMinutes
      },
      auditLogs: auditLogsWithNames,
      restocks: restockLogs
    });
  } catch (error) {
    console.error("Error generating report summary:", error);
    return NextResponse.json({ error: "Failed to generate report summary" }, { status: 500 });
  }
}
