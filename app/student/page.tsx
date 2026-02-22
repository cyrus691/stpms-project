"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, FormEvent } from "react"
import dynamic from "next/dynamic";
const NotificationRegistrationClient = dynamic(() => import("./NotificationRegistrationClient"), { ssr: false });

function formatTime(date: Date, timeFormat: string, withDate: boolean = false) {
  if (withDate) {
    // Show date and time
    return date.toLocaleString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: timeFormat === '12',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  // Only time
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12',
  });
}

interface Task {
  _id: string;
  title: string;
  details?: string;
  status: "pending" | "done" | "overdue";
  dueDate?: string;
  priority?: "low" | "medium" | "high";
  createdAt: string;
}

interface StudentTimetableEntry {
  _id: string;
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  className: string;
  startTime: string;
  endTime: string;
  venue?: string;
}

interface StudentReminder {
  _id: string;
  title: string;
  note?: string;
  status: "active" | "dismissed" | "expired";
  remindAt?: string;
  createdAt: string;
}

interface StudentUser {
  _id: string;
  name: string;
  username?: string;
  email?: string;
}

interface StudentGroup {
  _id: string;
  name: string;
  description?: string;
  ownerId: string;
  memberIds: string[];
  createdAt: string;
}

interface StudentGroupMessage {
  _id: string;
  groupId: string;
  senderId: string;
  message: string;
  createdAt: string;
}

interface StudentGroupInvite {
  _id: string;
  groupId: string;
  inviterId: string;
  inviteeId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

interface Announcement {
  _id: string;
  title: string;
  body: string;
  createdAt: string;
}

export default function StudentPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskSaving, setTaskSaving] = useState(false);
  const [timetableForm, setTimetableForm] = useState({
    day: "Monday" as StudentTimetableEntry["day"],
    className: "",
    startTime: "",
    endTime: "",
    venue: ""
  });
  const [showTimetableForm, setShowTimetableForm] = useState(false);
  const [editingTimetableId, setEditingTimetableId] = useState<string | null>(null);
  const [timetableSaving, setTimetableSaving] = useState(false);
  const [timetableError, setTimetableError] = useState<string | null>(null);
  const [reminderForm, setReminderForm] = useState({
    title: "",
    note: "",
    remindAt: "",
    status: "active" as StudentReminder["status"]
  });
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showInviteList, setShowInviteList] = useState<Record<string, boolean>>({});
  const [showParticipantsList, setShowParticipantsList] = useState<Record<string, boolean>>({});
  const [taskForm, setTaskForm] = useState({
    title: "",
    details: "",
    dueDate: "",
    priority: "medium" as "low" | "medium" | "high"
  });
  const [taskError, setTaskError] = useState<string | null>(null);
  const [studentUsers, setStudentUsers] = useState<StudentUser[]>([]);
    const [groups, setGroups] = useState<StudentGroup[]>([]);
    const [reminders, setReminders] = useState<StudentReminder[]>([]);
    const [timetable, setTimetable] = useState<StudentTimetableEntry[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  // ...existing code...
  const router = useRouter();
  const { data: session } = useSession();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [discoverGroups, setDiscoverGroups] = useState<StudentGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
    memberIds: [] as string[]
  });
  const [groupError, setGroupError] = useState<string | null>(null);
  const [groupSaving, setGroupSaving] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupMessages, setGroupMessages] = useState<StudentGroupMessage[]>([]);
  const [groupMessagesLoading, setGroupMessagesLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [groupInvites, setGroupInvites] = useState<StudentGroupInvite[]>([]);
  const [groupActionLoading, setGroupActionLoading] = useState<Record<string, boolean>>({});
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [studentSettings, setStudentSettings] = useState({
    username: "",
    name: "",
    email: "",
    timeFormat: "24"
  });
  const [settingsErrors, setSettingsErrors] = useState<{ [key: string]: string }>({});
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordErrors, setPasswordErrors] = useState<{ [key: string]: string }>({});

  // Notification registration is handled by NotificationRegistrationClient (client-only component)

  // Move fetchData outside useEffect so it's in scope
  const fetchData = async () => {
    try {
      setLoading(true);
      const userId = (session?.user as any)?.id as string | undefined;
      // Essential: tasks, timetable, reminders
      const tasksUrl = new URL("/api/student-tasks", window.location.origin);
      if (userId) tasksUrl.searchParams.set("userId", userId);
      const timetableUrl = new URL("/api/student-timetable", window.location.origin);
      if (userId) timetableUrl.searchParams.set("userId", userId);
      const remindersUrl = new URL("/api/student-reminders", window.location.origin);
      if (userId) remindersUrl.searchParams.set("userId", userId);

      // Fetch essential data first
      const [tasksRes, timetableRes, remindersRes] = await Promise.all([
        userId ? fetch(tasksUrl.toString()) : Promise.resolve(null),
        userId ? fetch(timetableUrl.toString()) : Promise.resolve(null),
        userId ? fetch(remindersUrl.toString()) : Promise.resolve(null)
      ]);
      const safeJson = async (res: Response | null | undefined, fallback: any) => {
        if (!res) return fallback;
        try { return await res.json(); } catch { return fallback; }
      };
      const [tasksData, timetableData, remindersData] = await Promise.all([
        safeJson(tasksRes, []),
        safeJson(timetableRes, []),
        safeJson(remindersRes, []),
      ]);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setTimetable(Array.isArray(timetableData) ? timetableData : []);
      setReminders(Array.isArray(remindersData) ? remindersData : []);
      setLoading(false);

      // Secondary/background data (non-blocking)
      setTimeout(async () => {
        const announcementUrl = new URL("/api/announcements", window.location.origin);
        announcementUrl.searchParams.set("audience", "student");
        if (userId) announcementUrl.searchParams.set("userId", userId);
        const studentsPromise = userId ? fetch("/api/users?role=student") : Promise.resolve(null);
        const groupsPromise = userId ? fetch(`/api/student-groups?userId=${userId}`) : Promise.resolve(null);
        const discoverGroupsPromise = userId ? fetch(`/api/student-groups?userId=${userId}`) : Promise.resolve(null);
        const invitesPromise = userId ? fetch(`/api/student-group-invites?userId=${userId}`) : Promise.resolve(null);
        const settingsPromise = userId ? fetch(`/api/student/settings?userId=${userId}`) : Promise.resolve(null);
        const announcementsRes = await fetch(announcementUrl.toString());
        const [studentsRes, groupsRes, discoverRes, invitesRes, settingsRes] = await Promise.all([
          studentsPromise,
          groupsPromise,
          discoverGroupsPromise,
          invitesPromise,
          settingsPromise
        ]);
        const [studentsData, groupsData, discoverData, invitesData, settingsData] = await Promise.all([
          safeJson(studentsRes, []),
          safeJson(groupsRes, []),
          safeJson(discoverRes, []),
          safeJson(invitesRes, []),
          safeJson(settingsRes, null)
        ]);
        const announcementsData = await safeJson(announcementsRes, []);
        setStudentUsers(Array.isArray(studentsData) ? studentsData : []);
        setGroups(Array.isArray(groupsData) ? groupsData : []);
        setDiscoverGroups(Array.isArray(discoverData) ? discoverData : []);
        setGroupInvites(Array.isArray(invitesData) ? invitesData : []);
        // Only show discover groups that have invited the user
        if (Array.isArray(invitesData) && Array.isArray(discoverData)) {
          const invitedGroupIds = new Set(invitesData.map((invite: any) => invite.groupId));
          setDiscoverGroups(discoverData.filter((group: any) => invitedGroupIds.has(group._id)));
        } else {
          setDiscoverGroups([]);
        }
        setStudentSettings(settingsData || {});
        setAnnouncements(Array.isArray(announcementsData) ? announcementsData : []);
      }, 0);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    // Defer data loading to make page interactive immediately
    const timer = setTimeout(() => fetchData(), 100);
    // Auto-refresh groups section every 10 seconds
    const interval = setInterval(() => {
      if (activeSection === "groups") fetchData();
    }, 10000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user, activeSection]);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
    { id: "tasks", label: "My Tasks", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
    { id: "timetable", label: "Timetable", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { id: "reminders", label: "Reminders", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg> },
    { id: "groups", label: "Groups", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
    { id: "settings", label: "Settings", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> }
  ];

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  const handleCreateTask = async (event: FormEvent) => {
    event.preventDefault();
    setTaskError(null);

    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      setTaskError("Unable to add tasks without a student account.");
      return;
    }
    if (!taskForm.title.trim()) {
      setTaskError("Task title is required.");
      return;
    }

    try {
      setTaskSaving(true);
      const isEditing = Boolean(editingTaskId);
      const url = isEditing ? `/api/student-tasks/${editingTaskId}` : "/api/student-tasks";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskForm.title.trim(),
          details: taskForm.details.trim() || undefined,
          dueDate: taskForm.dueDate || undefined,
          priority: taskForm.priority,
          userId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setTaskError(errorData?.error || "Failed to create task.");
        return;
      }

      const newTask = await response.json();
      if (isEditing) {
        setTasks((prev) => prev.map((task) => (task._id === newTask._id ? newTask : task)));
      } else {
        setTasks((prev) => [newTask, ...prev]);
      }
      setTaskForm({ title: "", details: "", dueDate: "", priority: "medium" });
      setEditingTaskId(null);
      setShowTaskForm(false);
    } catch (error) {
      console.error("Error creating task:", error);
      setTaskError("Failed to create task.");
    } finally {
      setTaskSaving(false);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTaskId(task._id);
    setTaskForm({
      title: task.title,
      details: task.details || "",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
      priority: task.priority ?? "medium"
    });
    setTaskError(null);
    setShowTaskForm(true);
  };

  const handleToggleTaskStatus = async (task: Task) => {
    try {
      const nextStatus = task.status === "done" ? "pending" : "done";
      const response = await fetch(`/api/student-tasks/${task._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, userId: currentUserId })
      });
      if (!response.ok) {
        return;
      }
      const updated = await response.json();
      setTasks((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/student-tasks/${taskId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId })
      });
      if (!response.ok) {
        return;
      }
      setTasks((prev) => prev.filter((task) => task._id !== taskId));
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleSaveTimetable = async (event: FormEvent) => {
    event.preventDefault();
    setTimetableError(null);

    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      setTimetableError("Unable to add timetable entries without a student account.");
      return;
    }
    if (!timetableForm.className.trim() || !timetableForm.startTime || !timetableForm.endTime) {
      setTimetableError("Class name, start time, and end time are required.");
      return;
    }

    try {
      setTimetableSaving(true);
      const isEditing = Boolean(editingTimetableId);
      const url = isEditing ? `/api/student-timetable/${editingTimetableId}` : "/api/student-timetable";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day: timetableForm.day,
          className: timetableForm.className.trim(),
          startTime: timetableForm.startTime,
          endTime: timetableForm.endTime,
          venue: timetableForm.venue.trim() || undefined,
          userId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setTimetableError(errorData?.error || "Failed to save timetable entry.");
        return;
      }

      const saved = await response.json();
      if (isEditing) {
        setTimetable((prev) => prev.map((entry) => (entry._id === saved._id ? saved : entry)));
      } else {
        setTimetable((prev) => [saved, ...prev]);
      }

      setTimetableForm({ day: "Monday", className: "", startTime: "", endTime: "", venue: "" });
      setEditingTimetableId(null);
      setShowTimetableForm(false);
    } catch (error) {
      console.error("Error saving timetable entry:", error);
      setTimetableError("Failed to save timetable entry.");
    } finally {
      setTimetableSaving(false);
    }
  };

  const handleEditTimetable = (entry: StudentTimetableEntry) => {
    setEditingTimetableId(entry._id);
    setTimetableForm({
      day: entry.day,
      className: entry.className,
      startTime: entry.startTime,
      endTime: entry.endTime,
      venue: entry.venue || ""
    });
    setTimetableError(null);
    setShowTimetableForm(true);
  };

  const handleDeleteTimetable = async (entryId: string) => {
    try {
      const response = await fetch(`/api/student-timetable/${entryId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId })
      });
      if (!response.ok) return;
      setTimetable((prev) => prev.filter((entry) => entry._id !== entryId));
    } catch (error) {
      console.error("Error deleting timetable entry:", error);
    }
  };

  const handleSaveReminder = async (event: FormEvent) => {
    event.preventDefault();
    setReminderError(null);

    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      setReminderError("Unable to add reminders without a student account.");
      return;
    }
    if (!reminderForm.title.trim()) {
      setReminderError("Reminder title is required.");
      return;
    }

    try {
      setReminderSaving(true);
      const isEditing = Boolean(editingReminderId);
      const url = isEditing ? `/api/student-reminders/${editingReminderId}` : "/api/student-reminders";
      const method = isEditing ? "PATCH" : "POST";

      // Convert local datetime-local string to UTC ISO string for remindAt
      let remindAtISO = reminderForm.remindAt;
      if (reminderForm.remindAt) {
        const localDate = new Date(reminderForm.remindAt);
        remindAtISO = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000).toISOString();
      }
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: reminderForm.title.trim(),
          note: reminderForm.note.trim() || undefined,
          remindAt: remindAtISO || undefined,
          status: reminderForm.status,
          userId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setReminderError(errorData?.error || "Failed to save reminder.");
        return;
      }

      const saved = await response.json();
      if (isEditing) {
        setReminders((prev) => prev.map((item) => (item._id === saved._id ? saved : item)));
      } else {
        setReminders((prev) => [saved, ...prev]);
      }

      setReminderForm({ title: "", note: "", remindAt: "", status: "active" });
      setEditingReminderId(null);
      setShowReminderForm(false);
    } catch (error) {
      console.error("Error saving reminder:", error);
      setReminderError("Failed to save reminder.");
    } finally {
      setReminderSaving(false);
    }
  };

  const handleEditReminder = (reminder: StudentReminder) => {
    setEditingReminderId(reminder._id);
    // Convert UTC or ISO string to local datetime-local string
    let localRemindAt = "";
    if (reminder.remindAt) {
      const date = new Date(reminder.remindAt);
      const tzOffset = date.getTimezoneOffset() * 60000;
      const localISO = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
      localRemindAt = localISO;
    }
    setReminderForm({
      title: reminder.title,
      note: reminder.note || "",
      remindAt: localRemindAt,
      status: reminder.status
    });
    setReminderError(null);
    setShowReminderForm(true);
  };

  const handleDismissReminder = async (reminderId: string) => {
    try {
      const response = await fetch(`/api/student-reminders/${reminderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed", userId: currentUserId })
      });
      if (!response.ok) return;
      const updated = await response.json();
      setReminders((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
    } catch (error) {
      console.error("Error dismissing reminder:", error);
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    try {
      const response = await fetch(`/api/student-reminders/${reminderId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId })
      });
      if (!response.ok) return;
      setReminders((prev) => prev.filter((item) => item._id !== reminderId));
    } catch (error) {
      console.error("Error deleting reminder:", error);
    }
  };

  const refreshGroups = async (userId: string) => {
    try {
      setGroupsLoading(true);
      const [groupsRes, discoverRes] = await Promise.all([
        fetch(`/api/student-groups?userId=${userId}`),
        fetch(`/api/student-groups?userId=${userId}&discover=true`)
      ]);
      const [groupsData, discoverData] = await Promise.all([
        groupsRes.ok ? groupsRes.json() : [],
        discoverRes.ok ? discoverRes.json() : []
      ]);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
      setDiscoverGroups(Array.isArray(discoverData) ? discoverData : []);
    } catch (error) {
      console.error("Error refreshing groups:", error);
    } finally {
      setGroupsLoading(false);
    }
  };

  const handleCreateGroup = async (event: FormEvent) => {
    event.preventDefault();
    setGroupError(null);

    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      setGroupError("Unable to create a group without a student account.");
      return;
    }
    if (!groupForm.name.trim()) {
      setGroupError("Group name is required.");
      return;
    }
    if (groupForm.memberIds.length > 4) {
      setGroupError("You can add up to 4 additional members (max 5 total)." );
      return;
    }

    try {
      setGroupSaving(true);
      const response = await fetch("/api/student-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupForm.name.trim(),
          description: groupForm.description.trim() || undefined,
          ownerId: userId,
          memberIds: groupForm.memberIds
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setGroupError(errorData?.error || "Failed to create group.");
        return;
      }

      setGroupForm({ name: "", description: "", memberIds: [] });
      setShowGroupForm(false);
      await refreshGroups(userId);
    } catch (error) {
      console.error("Error creating group:", error);
      setGroupError("Failed to create group.");
    } finally {
      setGroupSaving(false);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return;

    try {
      setGroupActionLoading((prev) => ({ ...prev, [`join-${groupId}`]: true }));
      const response = await fetch(`/api/student-groups/${groupId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      if (!response.ok) return;
      await refreshGroups(userId);
    } catch (error) {
      console.error("Error joining group:", error);
    } finally {
      setGroupActionLoading((prev) => ({ ...prev, [`join-${groupId}`]: false }));
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return;

    try {
      setGroupActionLoading((prev) => ({ ...prev, [`leave-${groupId}`]: true }));
      const response = await fetch(`/api/student-groups/${groupId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      if (!response.ok) return;
      if (selectedGroupId === groupId) {
        setSelectedGroupId(null);
        setGroupMessages([]);
      }
      await refreshGroups(userId);
    } catch (error) {
      console.error("Error leaving group:", error);
    } finally {
      setGroupActionLoading((prev) => ({ ...prev, [`leave-${groupId}`]: false }));
    }
  };

  const handleSelectGroup = async (groupId: string) => {
    setSelectedGroupId(groupId);
    try {
      setGroupMessagesLoading(true);
      const response = await fetch(`/api/student-groups/${groupId}/messages?userId=${currentUserId}`);
      const data = response.ok ? await response.json() : [];
      setGroupMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading group messages:", error);
      setGroupMessages([]);
    } finally {
      setGroupMessagesLoading(false);
    }
  };

  const handleSendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId || !selectedGroupId || !messageInput.trim()) return;

    try {
      const response = await fetch(`/api/student-groups/${selectedGroupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, message: messageInput.trim() })
      });
      if (!response.ok) return;
      const saved = await response.json();
      setGroupMessages((prev) => [...prev, saved]);
      setMessageInput("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleInviteMembers = async (groupId: string, inviteeIds: string[]) => {
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId || inviteeIds.length === 0) return;

    try {
      setGroupActionLoading((prev) => ({ ...prev, [`invite-${groupId}`]: true }));
      const response = await fetch(`/api/student-groups/${groupId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviterId: userId, inviteeIds })
      });
      if (!response.ok) return;
      await refreshGroups(userId);
      const invitesRes = await fetch(`/api/student-group-invites?userId=${userId}`);
      const invitesData = invitesRes.ok ? await invitesRes.json() : [];
      setGroupInvites(Array.isArray(invitesData) ? invitesData : []);
    } catch (error) {
      console.error("Error inviting members:", error);
    } finally {
      setGroupActionLoading((prev) => ({ ...prev, [`invite-${groupId}`]: false }));
    }
  };

  const handleRemoveMember = async (groupId: string, memberId: string) => {
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return;

    try {
      setGroupActionLoading((prev) => ({ ...prev, [`remove-${groupId}-${memberId}`]: true }));
      const response = await fetch(`/api/student-groups/${groupId}/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId: userId, memberId })
      });
      if (!response.ok) return;
      await refreshGroups(userId);
    } catch (error) {
      console.error("Error removing member:", error);
    } finally {
      setGroupActionLoading((prev) => ({ ...prev, [`remove-${groupId}-${memberId}`]: false }));
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return;
    try {
      setGroupActionLoading((prev) => ({ ...prev, [`accept-${inviteId}`]: true }));
      const response = await fetch(`/api/student-group-invites/${inviteId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      if (!response.ok) return;
      await refreshGroups(userId);
      const invitesRes = await fetch(`/api/student-group-invites?userId=${userId}`);
      const invitesData = invitesRes.ok ? await invitesRes.json() : [];
      setGroupInvites(Array.isArray(invitesData) ? invitesData : []);
    } catch (error) {
      console.error("Error accepting invite:", error);
    } finally {
      setGroupActionLoading((prev) => ({ ...prev, [`accept-${inviteId}`]: false }));
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return;
    try {
      setGroupActionLoading((prev) => ({ ...prev, [`decline-${inviteId}`]: true }));
      const response = await fetch(`/api/student-group-invites/${inviteId}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      if (!response.ok) return;
      const invitesRes = await fetch(`/api/student-group-invites?userId=${userId}`);
      const invitesData = invitesRes.ok ? await invitesRes.json() : [];
      setGroupInvites(Array.isArray(invitesData) ? invitesData : []);
    } catch (error) {
      console.error("Error declining invite:", error);
    } finally {
      setGroupActionLoading((prev) => ({ ...prev, [`decline-${inviteId}`]: false }));
    }
  };

  const handleEditStudentSettings = () => {
    setIsEditingSettings(true);
  };

  const handleSaveStudentSettings = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nextErrors: { [key: string]: string } = {};
    if (!studentSettings.name.trim()) nextErrors.name = "Name is required";
    if (!studentSettings.email.trim()) nextErrors.email = "Email is required";
    if (studentSettings.email && !emailRegex.test(studentSettings.email)) nextErrors.email = "Enter a valid email";
    if (Object.keys(nextErrors).length > 0) {
      setSettingsErrors(nextErrors);
      return;
    }
    setSettingsErrors({});

    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return;

    try {
      const response = await fetch("/api/student/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          username: studentSettings.username,
          name: studentSettings.name,
          email: studentSettings.email,
          timeFormat: studentSettings.timeFormat
        })
      });

      if (response.ok) {
        // Update local state with saved values (in case backend returns updated data)
        const updated = await response.json();
        setStudentSettings((prev) => ({ ...prev, ...updated }));
        setIsEditingSettings(false); // Make form read-only after save
      } else {
        const data = await response.json();
        alert(data.error || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Error saving settings");
    }
  };

  const handleUpdateStudentPassword = async () => {
    const nextErrors: { [key: string]: string } = {};
    if (!passwordForm.currentPassword) nextErrors.currentPassword = "Current password is required";
    if (!passwordForm.newPassword) nextErrors.newPassword = "New password is required";
    if (passwordForm.newPassword && passwordForm.newPassword.length < 6) {
      nextErrors.newPassword = "Password must be at least 6 characters";
    }
    if (!passwordForm.confirmPassword) nextErrors.confirmPassword = "Confirm your new password";
    if (passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }
    if (Object.keys(nextErrors).length > 0) {
      setPasswordErrors(nextErrors);
      return;
    }
    setPasswordErrors({});

    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return;

    try {
      const response = await fetch("/api/student/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      if (response.ok) {
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update password");
      }
    } catch (error) {
      console.error("Error updating password:", error);
      alert("Error updating password");
    }
  };

  const isTaskOverdue = (task: Task) => {
    if (task.status === "done") return false;
    if (!task.dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() < today.getTime();
  };

  const getTaskStatus = (task: Task) => {
    if (task.status === "done") return "done";
    if (isTaskOverdue(task)) return "overdue";
    return task.status;
  };

  const pendingTasks = tasks.filter((task) => getTaskStatus(task) === "pending");
  const completedTasks = tasks.filter((task) => getTaskStatus(task) === "done");
  const overdueTasks = tasks.filter((task) => getTaskStatus(task) === "overdue");
  const activeReminders = reminders.filter((reminder) => reminder.status === "active");
  const currentUserId = (session?.user as any)?.id as string | undefined;
  const studentLookup = new Map(studentUsers.map((student) => [student._id, student]));
  const selectedGroup = groups.find((group) => group._id === selectedGroupId) || null;
  const displayName =
    (session?.user as any)?.name ||
    (session?.user as any)?.username ||
    (session?.user as any)?.email ||
    "Student";
  const roleLabel = ((session?.user as any)?.role || "student").toString();
  const accountLabel = `${roleLabel.charAt(0).toUpperCase()}${roleLabel.slice(1)} Account`;
  const avatarInitials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join("") || "S";
  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long" }) as StudentTimetableEntry["day"];
  const todaysTimetable = timetable.filter((entry) => entry.day === todayLabel);

  return (
    <>
      <NotificationRegistrationClient />
      <div className="flex h-screen overflow-hidden bg-slate-50 text-base sm:text-lg md:text-xl">
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-gradient-to-b from-blue-600 to-blue-800 text-white transition-transform duration-300 lg:relative lg:translate-x-0 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Logo/Header */}
          <div className="border-b border-blue-500 px-6 py-5">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">STPMS Student</h1>
            <p className="mt-1 text-sm sm:text-base text-blue-200">Portal</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-base sm:text-lg font-medium transition ${
                  activeSection === item.id
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-blue-100 hover:bg-blue-700 hover:text-white"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}

            {/* Notifications button for mobile only, below nav */}
            <div className="relative px-3 py-2 lg:hidden">
              <button
                onClick={() => setShowNotifications((prev) => !prev)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                <span>Notifications</span>
                {announcements.length > 0 && (
                  <span className="ml-2 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
                    {announcements.length}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute left-0 right-0 z-50 mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base sm:text-lg font-semibold text-slate-900">Notifications</h4>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-sm text-slate-500 hover:text-slate-700"
                    >
                      Close
                    </button>
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    {announcements.length === 0 ? (
                      <p className="text-slate-500">No notifications yet.</p>
                    ) : (
                      announcements.map((announcement) => (
                        <div key={announcement._id} className="rounded-lg border border-blue-100 bg-blue-50 p-2">
                          <p className="font-semibold text-blue-900 text-base sm:text-lg">{announcement.title}</p>
                          <p className="text-blue-700 text-sm sm:text-base">{announcement.body}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* User info */}
          <div className="border-t border-blue-500 px-6 py-4">
            <div className="mb-3 flex items-center gap-4">
              <div className="flex h-12 w-12 lg:h-16 lg:w-16 items-center justify-center rounded-full bg-blue-400 text-lg lg:text-2xl font-bold">
                {avatarInitials}
              </div>
              <div className="flex-1">
                <p className="text-lg lg:text-2xl font-semibold">{displayName}</p>
                <p className="text-base lg:text-lg text-blue-200">{accountLabel}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full rounded-lg bg-red-500 px-4 py-2 text-base sm:text-lg font-semibold text-white transition hover:bg-red-600 mt-3"
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden text-base sm:text-lg">
          {/* Top Bar */}
          <header className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm lg:px-6 lg:py-4">
            <div className="flex items-center justify-between gap-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50 lg:hidden"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className="flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 lg:text-4xl">
                  {menuItems.find((m) => m.id === activeSection)?.label}
                </h2>
                <p className="hidden text-base text-slate-600 sm:block">
                  Manage your academic journey
                </p>
              </div>
              <div className="flex items-center gap-2 lg:gap-3">
                {/* Notifications button for desktop only */}
                <div className="relative hidden lg:block">
                  <button
                    onClick={() => setShowNotifications((prev) => !prev)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 lg:px-4"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    <span>Notifications</span>
                    {announcements.length > 0 && (
                      <span className="ml-2 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
                        {announcements.length}
                      </span>
                    )}
                  </button>
                  {showNotifications && (
                    <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base sm:text-lg font-semibold text-slate-900">Notifications</h4>
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="text-sm text-slate-500 hover:text-slate-700"
                        >
                          Close
                        </button>
                      </div>
                      <div className="mt-3 space-y-2 text-sm">
                        {announcements.length === 0 ? (
                          <p className="text-slate-500">No notifications yet.</p>
                        ) : (
                          announcements.map((announcement) => (
                            <div key={announcement._id} className="rounded-lg border border-blue-100 bg-blue-50 p-2">
                              <p className="font-semibold text-blue-900 text-base sm:text-lg">{announcement.title}</p>
                              <p className="text-blue-700 text-sm sm:text-base">{announcement.body}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600 lg:hidden"
                >
                  Logout
                </button>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {activeSection === "dashboard" && (
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Pending Tasks", value: loading ? "..." : pendingTasks.length.toString(), color: "blue", icon: "📝" },
                    { label: "Completed", value: loading ? "..." : completedTasks.length.toString(), color: "green", icon: "✅" },
                    { label: "Active Reminders", value: loading ? "..." : activeReminders.length.toString(), color: "purple", icon: "🔔" },
                    { label: "Overdue Tasks", value: loading ? "..." : overdueTasks.length.toString(), color: "red", icon: "⚠️" }
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="group cursor-pointer rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-blue-200"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-600">{stat.label}</p>
                        <span className="text-2xl">{stat.icon}</span>
                      </div>
                      <div className="mt-3">
                        <span className="text-3xl font-bold text-slate-900">{stat.value}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Today's Overview */}
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Upcoming Tasks */}
                  <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-xl md:text-2xl font-bold text-slate-900">Upcoming Tasks</h3>
                      <button 
                        onClick={() => setActiveSection("tasks")}
                        className="text-base md:text-lg font-semibold text-blue-600 hover:text-blue-700"
                      >
                        View All →
                      </button>
                    </div>
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                      </div>
                    ) : pendingTasks.length === 0 ? (
                      <div className="py-8 text-center text-base md:text-lg text-slate-600">
                        No pending tasks. Great job! 🎉
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingTasks.slice(0, 4).map((task) => (
                          <div key={task._id} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-400 bg-white"></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-lg md:text-xl font-semibold text-slate-900 truncate">{task.title}</p>
                              {task.dueDate && (
                                <p className="text-base md:text-lg text-slate-600">
                                  Due: {new Date(task.dueDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Active Reminders */}
                  <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-xl md:text-2xl font-bold text-slate-900">Active Reminders</h3>
                      <button 
                        onClick={() => setActiveSection("reminders")}
                        className="text-base md:text-lg font-semibold text-blue-600 hover:text-blue-700"
                      >
                        View All →
                      </button>
                    </div>
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                      </div>
                    ) : activeReminders.length === 0 ? (
                      <div className="py-8 text-center text-base md:text-lg text-slate-600">
                        No active reminders
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activeReminders.slice(0, 4).map((reminder) => (
                          <div key={reminder._id} className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <p className="text-lg md:text-xl font-semibold text-slate-900">{reminder.title}</p>
                              {reminder.note && (
                                <p className="text-base md:text-lg text-slate-600">{reminder.note}</p>
                              )}
                              {reminder.remindAt && (
                                <p className="text-base md:text-lg text-slate-600">
                                  {formatTime(new Date(reminder.remindAt), studentSettings.timeFormat, true)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Today's Schedule */}
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-xl md:text-2xl font-bold text-slate-900">Today&apos;s Schedule</h3>
                    <button 
                      onClick={() => setActiveSection("timetable")}
                      className="text-base md:text-lg font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Full Timetable →
                    </button>
                  </div>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    </div>
                  ) : todaysTimetable.length === 0 ? (
                    <div className="py-8 text-center text-base md:text-lg text-slate-600">
                      No scheduled classes today
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {todaysTimetable.slice(0, 5).map((entry) => (
                        <div key={entry._id} className="flex items-center gap-4 rounded-lg border border-slate-200 p-3">
                          <div className="text-center">
                            <p className="text-base md:text-lg font-semibold text-slate-600">
                              {entry.startTime ? formatTime(new Date(`1970-01-01T${entry.startTime}`), studentSettings.timeFormat) : "—"}
                            </p>
                            <p className="text-base md:text-lg text-slate-500">-</p>
                            <p className="text-base md:text-lg text-slate-600">
                              {entry.endTime ? formatTime(new Date(`1970-01-01T${entry.endTime}`), studentSettings.timeFormat) : "—"}
                            </p>
                          </div>
                          <div className="h-12 w-1 rounded-full bg-blue-500"></div>
                          <div className="flex-1">
                            <p className="text-lg md:text-xl font-semibold text-slate-900">{entry.className}</p>
                            {entry.venue && (
                              <p className="text-base md:text-lg text-slate-600">📍 {entry.venue}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSection === "tasks" && (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">My Tasks</h3>
                    <p className="text-sm text-slate-600">Track and manage your assignments</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowTaskForm((prev) => {
                        const next = !prev;
                        if (!next) {
                          setEditingTaskId(null);
                          setTaskForm({ title: "", details: "", dueDate: "", priority: "medium" });
                          setTaskError(null);
                        }
                        return next;
                      });
                    }}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    {showTaskForm ? "Close" : "+ Add Task"}
                  </button>
                </div>
                {showTaskForm && (
                  <form onSubmit={handleCreateTask} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                      <div className="flex-1">
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Task title</label>
                        <input
                          type="text"
                          value={taskForm.title}
                          onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="e.g. Math assignment 2"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Details</label>
                        <input
                          type="text"
                          value={taskForm.details}
                          onChange={(event) => setTaskForm((prev) => ({ ...prev, details: event.target.value }))}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="Optional notes or resources"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end">
                      <div className="w-full lg:w-56">
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Priority</label>
                        <select
                          value={taskForm.priority}
                          onChange={(event) => setTaskForm((prev) => ({ ...prev, priority: event.target.value as "low" | "medium" | "high" }))}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                      <div className="w-full lg:w-56">
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Due date</label>
                        <input
                          type="date"
                          value={taskForm.dueDate}
                          onChange={(event) => setTaskForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                      <div className="flex-1">
                        <button
                          type="submit"
                          disabled={taskSaving}
                          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 lg:w-auto"
                        >
                          {taskSaving ? "Saving..." : editingTaskId ? "Update Task" : "Save Task"}
                        </button>
                      </div>
                    </div>
                    {taskError && (
                      <p className="mt-3 text-sm font-medium text-red-600">{taskError}</p>
                    )}
                  </form>
                )}

                {/* Task Stats */}
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { label: "Pending", value: pendingTasks.length, color: "blue" },
                    { label: "Completed", value: completedTasks.length, color: "green" },
                    { label: "Overdue", value: overdueTasks.length, color: "red" }
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                      <p className="text-sm text-slate-600">{stat.label}</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Tasks List */}
                <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                  <div className="border-b border-slate-200 px-6 py-4">
                    <h4 className="font-semibold text-slate-900">All Tasks</h4>
                  </div>
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-slate-600">No tasks yet</p>
                      <p className="mt-1 text-sm text-slate-500">Create your first task to get started</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="hidden bg-blue-600 text-left text-xs font-semibold uppercase tracking-wide text-white md:table-header-group">
                          <tr>
                            <th className="px-4 py-3">Title</th>
                            <th className="px-4 py-3">Due date</th>
                            <th className="px-4 py-3">Priority</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {tasks.map((task) => {
                            const displayStatus = getTaskStatus(task);
                            return (
                              <tr key={task._id} className="block border border-slate-200/70 bg-white p-4 shadow-sm md:table-row md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                                <td className="flex items-start justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3">
                                  <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Title</span>
                                  <div className="flex items-start gap-3">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleTaskStatus(task)}
                                      className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${
                                        task.status === "done"
                                          ? "border-green-500 bg-green-500 text-white"
                                          : "border-slate-400 bg-white text-transparent hover:border-blue-500"
                                      }`}
                                      aria-label={task.status === "done" ? "Mark task pending" : "Mark task done"}
                                    >
                                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </button>
                                    <div>
                                      <p className={`font-medium ${task.status === "done" ? "text-slate-500 line-through" : "text-slate-900"}`}>
                                        {task.title}
                                      </p>
                                      {task.details && (
                                        <p className="text-xs text-slate-500">{task.details}</p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3">
                                  <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Due date</span>
                                  <span className="text-sm text-slate-700">
                                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
                                  </span>
                                </td>
                                <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3">
                                  <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Priority</span>
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                    {task.priority ?? "medium"}
                                  </span>
                                </td>
                                <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3">
                                  <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Status</span>
                                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    displayStatus === "done" ? "bg-green-100 text-green-800" :
                                    displayStatus === "overdue" ? "bg-red-100 text-red-800" :
                                    "bg-blue-100 text-blue-800"
                                  }`}>
                                    {displayStatus}
                                  </span>
                                </td>
                                <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3 md:text-right">
                                  <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Actions</span>
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleEditTask(task)}
                                      className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTask(task._id)}
                                      className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSection === "timetable" && (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">My Timetable</h3>
                    <p className="text-sm text-slate-600">Plan and manage your class schedule</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowTimetableForm((prev) => {
                        const next = !prev;
                        if (!next) {
                          setEditingTimetableId(null);
                          setTimetableForm({ day: "Monday", className: "", startTime: "", endTime: "", venue: "" });
                          setTimetableError(null);
                        }
                        return next;
                      });
                    }}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    {showTimetableForm ? "Close" : "+ Add Class"}
                  </button>
                </div>

                {showTimetableForm && (
                  <form onSubmit={handleSaveTimetable} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <div className="grid gap-4 lg:grid-cols-3">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Day</label>
                        <select
                          value={timetableForm.day}
                          onChange={(event) => setTimetableForm((prev) => ({ ...prev, day: event.target.value as StudentTimetableEntry["day"] }))}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                          {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                            <option key={day} value={day}>{day}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Class</label>
                        <input
                          type="text"
                          value={timetableForm.className}
                          onChange={(event) => setTimetableForm((prev) => ({ ...prev, className: event.target.value }))}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="e.g. Chemistry 101"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Venue</label>
                        <input
                          type="text"
                          value={timetableForm.venue}
                          onChange={(event) => setTimetableForm((prev) => ({ ...prev, venue: event.target.value }))}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="e.g. Room B12"
                        />
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 lg:grid-cols-3 lg:items-end">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Start time</label>
                        <input
                          type="time"
                          value={timetableForm.startTime}
                          onChange={(event) => setTimetableForm((prev) => ({ ...prev, startTime: event.target.value }))}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">End time</label>
                        <input
                          type="time"
                          value={timetableForm.endTime}
                          onChange={(event) => setTimetableForm((prev) => ({ ...prev, endTime: event.target.value }))}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                      <div>
                        <button
                          type="submit"
                          disabled={timetableSaving}
                          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 lg:w-auto"
                        >
                          {timetableSaving ? "Saving..." : editingTimetableId ? "Update Class" : "Save Class"}
                        </button>
                      </div>
                    </div>
                    {timetableError && (
                      <p className="mt-3 text-sm font-medium text-red-600">{timetableError}</p>
                    )}
                  </form>
                )}

                <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                  <div className="border-b border-slate-200 px-6 py-4">
                    <h4 className="font-semibold text-slate-900">Weekly Schedule</h4>
                  </div>
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    </div>
                  ) : timetable.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-slate-600">No classes scheduled</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="hidden bg-blue-600 text-left text-xs font-semibold uppercase tracking-wide text-white md:table-header-group">
                          <tr>
                            <th className="px-4 py-3">Day</th>
                            <th className="px-4 py-3">Class</th>
                            <th className="px-4 py-3">Time</th>
                            <th className="px-4 py-3">Venue</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {timetable.map((entry) => (
                            <tr key={entry._id} className="block border border-slate-200/70 bg-white p-4 shadow-sm md:table-row md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                              <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3">
                                <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Day</span>
                                <span className="font-medium text-slate-900">{entry.day}</span>
                              </td>
                              <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3">
                                <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Class</span>
                                <span className="text-slate-700">{entry.className}</span>
                              </td>
                              <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3">
                                <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Time</span>
                                <span className="text-slate-700">
                                  {entry.startTime ? formatTime(new Date(`1970-01-01T${entry.startTime}`), studentSettings.timeFormat) : "—"}
                                  {" - "}
                                  {entry.endTime ? formatTime(new Date(`1970-01-01T${entry.endTime}`), studentSettings.timeFormat) : "—"}
                                </span>
                              </td>
                              <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3">
                                <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Venue</span>
                                <span className="text-slate-700">{entry.venue || "—"}</span>
                              </td>
                              <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3 md:text-right">
                                <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Actions</span>
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditTimetable(entry)}
                                    className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTimetable(entry._id)}
                                    className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSection === "reminders" && (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Reminders</h3>
                    <p className="text-sm text-slate-600">Stay on top of deadlines and personal alerts</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowReminderForm((prev) => {
                        const next = !prev;
                        if (!next) {
                          setEditingReminderId(null);
                          setReminderForm({ title: "", note: "", remindAt: "", status: "active" });
                          setReminderError(null);
                        }
                        return next;
                      });
                    }}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    {showReminderForm ? "Close" : "+ Add Reminder"}
                  </button>
                </div>

                {showReminderForm && (
                  <form onSubmit={handleSaveReminder} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <div className="grid gap-4 lg:grid-cols-3">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title</label>
                        <input
                          type="text"
                          value={reminderForm.title}
                          onChange={(event) => setReminderForm((prev) => ({ ...prev, title: event.target.value }))}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="e.g. Submit project draft"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</label>
                        <input
                          type="text"
                          value={reminderForm.note}
                          onChange={(event) => setReminderForm((prev) => ({ ...prev, note: event.target.value }))}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="Optional details"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Remind at</label>
                        <input
                          type="datetime-local"
                          value={reminderForm.remindAt}
                          onChange={(event) => setReminderForm((prev) => ({ ...prev, remindAt: event.target.value }))}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div className="w-full lg:w-56">
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
                        <select
                          value={reminderForm.status}
                          onChange={(event) => setReminderForm((prev) => ({ ...prev, status: event.target.value as StudentReminder["status"] }))}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                          <option value="active">Active</option>
                          <option value="dismissed">Dismissed</option>
                          <option value="expired">Expired</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        disabled={reminderSaving}
                        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 lg:w-auto"
                      >
                        {reminderSaving ? "Saving..." : editingReminderId ? "Update Reminder" : "Save Reminder"}
                      </button>
                    </div>
                    {reminderError && (
                      <p className="mt-3 text-sm font-medium text-red-600">{reminderError}</p>
                    )}
                  </form>
                )}

                <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                  <div className="border-b border-slate-200 px-6 py-4">
                    <h4 className="font-semibold text-slate-900">Your Reminders</h4>
                  </div>
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    </div>
                  ) : reminders.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-slate-600">No active reminders</p>
                      <p className="mt-1 text-sm text-slate-500">Create reminders to stay organized</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="hidden bg-blue-600 text-left text-xs font-semibold uppercase tracking-wide text-white md:table-header-group">
                          <tr>
                            <th className="px-4 py-3">Title</th>
                            <th className="px-4 py-3">Notes</th>
                            <th className="px-4 py-3">Remind At</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {reminders.map((reminder) => (
                            <tr key={reminder._id} className="block border border-slate-200/70 bg-white p-4 shadow-sm md:table-row md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                              <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3">
                                <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Title</span>
                                <span className="font-medium text-slate-900">{reminder.title}</span>
                              </td>
                              <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3">
                                <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Notes</span>
                                <span className="text-slate-700">{reminder.note || "—"}</span>
                              </td>
                              <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3">
                                <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Remind At</span>
                                <span className="text-slate-700">
                                  {reminder.remindAt ? formatTime(new Date(reminder.remindAt), studentSettings.timeFormat, true) : "—"}
                                </span>
                              </td>
                              <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3">
                                <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Status</span>
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  reminder.status === "active" ? "bg-emerald-100 text-emerald-800" :
                                  reminder.status === "dismissed" ? "bg-slate-100 text-slate-700" :
                                  "bg-amber-100 text-amber-800"
                                }`}>
                                  {reminder.status}
                                </span>
                              </td>
                              <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3 md:text-right">
                                <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Actions</span>
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditReminder(reminder)}
                                    className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                  >
                                    Edit
                                  </button>
                                  {reminder.status === "active" && (
                                    <button
                                      type="button"
                                      onClick={() => handleDismissReminder(reminder._id)}
                                      className="rounded-lg border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                                    >
                                      Dismiss
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteReminder(reminder._id)}
                                    className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSection === "groups" && (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Discussion Groups</h3>
                    <p className="text-sm text-slate-600">Create groups, invite classmates, and chat in real time</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowGroupForm((prev) => {
                        const next = !prev;
                        if (!next) {
                          setGroupForm({ name: "", description: "", memberIds: [] });
                          setGroupError(null);
                        }
                        return next;
                      });
                    }}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    {showGroupForm ? "Close" : "+ Create Group"}
                  </button>
                </div>

                {showGroupForm && (
                  <form onSubmit={handleCreateGroup} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <div className="grid gap-4 lg:grid-cols-3">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Group name</label>
                        <input
                          type="text"
                          value={groupForm.name}
                          onChange={(event) => setGroupForm((prev) => ({ ...prev, name: event.target.value }))}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="e.g. Biology Study Squad"
                        />
                      </div>
                      <div className="lg:col-span-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</label>
                        <input
                          type="text"
                          value={groupForm.description}
                          onChange={(event) => setGroupForm((prev) => ({ ...prev, description: event.target.value }))}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="Optional purpose or topic"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invite members (max 4)</label>
                        <span className="text-xs text-slate-500">
                          {groupForm.memberIds.length} / 4 selected
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {studentUsers
                          .filter((student) => student._id !== currentUserId)
                          .map((student) => (
                            <label key={student._id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={groupForm.memberIds.includes(student._id)}
                                disabled={!groupForm.memberIds.includes(student._id) && groupForm.memberIds.length >= 4}
                                onChange={(event) => {
                                  const checked = event.target.checked;
                                  setGroupForm((prev) => {
                                    const updated = new Set(prev.memberIds);
                                    if (checked) {
                                      updated.add(student._id);
                                    } else {
                                      updated.delete(student._id);
                                    }
                                    return { ...prev, memberIds: Array.from(updated) };
                                  });
                                }}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                              />
                              <span>{student.name}</span>
                            </label>
                          ))}
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        type="submit"
                        disabled={groupSaving}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {groupSaving ? "Saving..." : "Create Group"}
                      </button>
                    </div>
                    {groupError && (
                      <p className="mt-3 text-sm font-medium text-red-600">{groupError}</p>
                    )}
                  </form>
                )}

                {/* My Groups */}
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:p-6">
                  <h4 className="mb-4 text-base font-semibold text-slate-900">My Groups</h4>
                  {groupsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    </div>
                  ) : groups.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-600">No groups yet. Create one to get started.</div>
                  ) : (
                    <div className="space-y-3">
                      {groups.map((group) => (
                        <div key={group._id} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h5 className="font-semibold text-slate-900">{group.name}</h5>
                            <p className="mt-1 text-xs text-slate-600">
                              {group.memberIds.length} / 5 members
                            </p>
                            {group.description && (
                              <p className="mt-1 text-sm text-slate-600">{group.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                              {group.memberIds.map((memberId) => (
                                <span key={memberId} className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
                                  {studentLookup.get(memberId)?.name || "Student"}
                                  {group.ownerId === memberId && (
                                    <span className="text-[10px] font-semibold text-blue-600">(admin)</span>
                                  )}
                                  {group.ownerId === currentUserId && memberId !== group.ownerId && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveMember(group._id, memberId)}
                                      disabled={groupActionLoading[`remove-${group._id}-${memberId}`]}
                                      className="ml-1 text-[10px] font-semibold text-red-500 hover:text-red-700 disabled:opacity-60"
                                    >
                                      {groupActionLoading[`remove-${group._id}-${memberId}`] ? "Removing..." : "Remove"}
                                    </button>
                                  )}
                                </span>
                              ))}
                            </div>
                            {group.ownerId === currentUserId && group.memberIds.length < 5 && (
                              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-md">
                                <div className="flex items-center justify-between mb-2">
                                  <h6 className="text-sm font-semibold text-blue-700">Group Actions</h6>
                                </div>
                                <button
                                  type="button"
                                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 transition"
                                  onClick={() => setShowInviteList((prev) => ({ ...prev, [group._id]: !prev[group._id] }))}
                                >
                                  Invite Members
                                </button>
                                {showInviteList && showInviteList[group._id] && (
                                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
                                    <div className="rounded-xl bg-white p-6 shadow-lg w-full max-w-md">
                                      <h6 className="mb-4 text-base font-semibold text-blue-700">Select Member to Invite</h6>
                                      <div className="flex flex-wrap gap-3">
                                        {studentUsers
                                          .filter((student) => student._id !== currentUserId && !group.memberIds.includes(student._id))
                                          .map((student) => {
                                            const loadingKey = `invite-${group._id}-${student._id}`;
                                            return (
                                              <button
                                                key={student._id}
                                                type="button"
                                                onClick={async () => {
                                                  setGroupActionLoading((prev) => ({ ...prev, [loadingKey]: true }));
                                                  await handleInviteMembers(group._id, [student._id]);
                                                  setGroupActionLoading((prev) => ({ ...prev, [loadingKey]: false }));
                                                  setInviteMessage(`${student.name} has been invited.`);
                                                  fetchData(); // Refresh group data only
                                                  setTimeout(() => setInviteMessage(null), 3000);
                                                }}
                                                disabled={groupActionLoading[loadingKey]}
                                                className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-60 transition"
                                              >
                                                {groupActionLoading[loadingKey] ? "Inviting..." : student.name}
                                              </button>
                                            );
                                          })}
                                      </div>
                                      <button
                                        type="button"
                                        className="mt-6 w-full rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-700 transition"
                                        onClick={() => setShowInviteList((prev) => ({ ...prev, [group._id]: false }))}
                                      >
                                        Close
                                      </button>
                                    </div>
                                  </div>
                                )}
                                {inviteMessage && (
                                  <div className="mt-2 text-xs text-green-600 font-semibold">{inviteMessage}</div>
                                )}
                                <div className="mt-6">
                                  <button
                                    type="button"
                                    className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-700 transition"
                                    onClick={() => setShowParticipantsList((prev) => ({ ...prev, [group._id]: !prev[group._id] }))}
                                  >
                                    {showParticipantsList && showParticipantsList[group._id] ? "Hide Participants" : "Show Participants"}
                                  </button>
                                  {showParticipantsList && showParticipantsList[group._id] && (
                                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                      <h6 className="mb-2 text-base font-semibold text-slate-700">Participants</h6>
                                      <ul className="flex flex-wrap gap-3">
                                        {group.memberIds.map((memberId) => (
                                          <li key={memberId} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 flex items-center gap-2 shadow">
                                            {studentLookup.get(memberId)?.name || "Student"}
                                            {group.ownerId === memberId && <span className="ml-1 text-blue-600">(admin)</span>}
                                            {group.ownerId === currentUserId && memberId !== group.ownerId && (
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveMember(group._id, memberId)}
                                                disabled={groupActionLoading[`remove-${group._id}-${memberId}`]}
                                                className="ml-1 rounded border border-red-200 px-2 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                                              >
                                                {groupActionLoading[`remove-${group._id}-${memberId}`] ? "Removing..." : "Remove"}
                                              </button>
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSelectGroup(group._id)}
                              className="rounded-lg px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
                            >
                              Open Chat
                            </button>
                            <button
                              type="button"
                              onClick={() => handleLeaveGroup(group._id)}
                              disabled={groupActionLoading[`leave-${group._id}`]}
                              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                            >
                              {groupActionLoading[`leave-${group._id}`] ? "Leaving..." : "Leave"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Available Groups to Join */}
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:p-6">
                  <h4 className="mb-4 text-base font-semibold text-slate-900">Discover Groups</h4>
                  {discoverGroups.length === 0 && groupInvites.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-600">No available groups right now.</div>
                  ) : (
                    <div className="space-y-4">
                      {groupInvites.length > 0 && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                          <h5 className="text-sm font-semibold text-blue-900">Invitations</h5>
                          <div className="mt-3 space-y-3">
                            {groupInvites.map((invite) => {
                              const group = discoverGroups.find((g) => g._id === invite.groupId) || groups.find((g) => g._id === invite.groupId);
                              return (
                                <div key={invite._id} className="flex items-center justify-between rounded-lg border border-blue-100 bg-white p-3">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">{group?.name || "Group"}</p>
                                    <p className="text-xs text-slate-500">Invited by {studentLookup.get(invite.inviterId)?.name || "Admin"}</p>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleAcceptInvite(invite._id)}
                                      disabled={groupActionLoading[`accept-${invite._id}`]}
                                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                                    >
                                      {groupActionLoading[`accept-${invite._id}`] ? "Joining..." : "Join"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeclineInvite(invite._id)}
                                      disabled={groupActionLoading[`decline-${invite._id}`]}
                                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                                    >
                                      {groupActionLoading[`decline-${invite._id}`] ? "Declining..." : "Decline"}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      <div className="grid gap-4 sm:grid-cols-2">
                        {discoverGroups.map((group) => (
                          <div key={group._id} className="rounded-lg border border-slate-200 p-4">
                            <div className="mb-3 flex items-start justify-between">
                              <div>
                                <h5 className="font-semibold text-slate-900">{group.name}</h5>
                                <p className="mt-1 text-xs text-slate-600">{group.memberIds.length} / 5 members</p>
                              </div>
                              <button
                                type="button"
                                onClick={async () => {
                                  setGroupActionLoading((prev) => ({ ...prev, [`join-${group._id}`]: true }));
                                  await handleJoinGroup(group._id);
                                  setGroupActionLoading((prev) => ({ ...prev, [`join-${group._id}`]: false }));
                                  setInviteMessage(`Joined group: ${group.name}`);
                                  fetchData();
                                  setTimeout(() => setInviteMessage(null), 3000);
                                }}
                                disabled={groupActionLoading[`join-${group._id}`]}
                                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                              >
                                {groupActionLoading[`join-${group._id}`] ? "Joining..." : "Join"}
                              </button>
                            </div>
                            {group.description && (
                              <p className="text-sm text-slate-600">{group.description}</p>
                            )}
                            {inviteMessage && inviteMessage === `Joined group: ${group.name}` && (
                              <div className="mt-2 text-xs text-green-600 font-semibold">{inviteMessage}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Group Chat */}
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:p-6">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h4 className="text-base font-semibold text-slate-900">Group Chat</h4>
                    {selectedGroup && (
                      <span className="text-xs text-slate-500">{selectedGroup.name}</span>
                    )}
                  </div>
                  {!selectedGroup ? (
                    <div className="py-10 text-center text-sm text-slate-600">Select a group to start chatting.</div>
                  ) : (
                    <div className="space-y-4">
                      <div className="h-64 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4">
                        {groupMessagesLoading ? (
                          <div className="flex items-center justify-center py-10">
                            <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                          </div>
                        ) : groupMessages.length === 0 ? (
                          <div className="text-center text-sm text-slate-600">No messages yet. Start the discussion!</div>
                        ) : (
                          <div className="space-y-3">
                            {groupMessages.map((message) => {
                              const sender = studentLookup.get(message.senderId);
                              const isOwn = message.senderId === currentUserId;
                              return (
                                <div key={message._id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                                  <div className={`max-w-xs rounded-xl px-3 py-2 text-sm ${
                                    isOwn ? "bg-blue-600 text-white" : "bg-white text-slate-700 border border-slate-200"
                                  }`}>
                                    <p className="text-xs font-semibold opacity-80">{sender?.name || "Student"}</p>
                                    <p>{message.message}</p>
                                    <p className={`mt-1 text-[10px] ${isOwn ? "text-blue-100" : "text-slate-400"}`}>
                                      {formatTime(new Date(message.createdAt), studentSettings.timeFormat)}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <form onSubmit={handleSendMessage} className="flex flex-col gap-3 sm:flex-row">
                        <input
                          type="text"
                          value={messageInput}
                          onChange={(event) => setMessageInput(event.target.value)}
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="Type a message..."
                        />
                        <button
                          type="submit"
                          disabled={!messageInput.trim()}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Send
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSection === "settings" && (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Account Settings</h3>
                    <p className="text-sm text-slate-600">Customize your account settings</p>
                  </div>
                  {isEditingSettings ? (
                    <button
                      onClick={handleSaveStudentSettings}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Save Changes
                    </button>
                  ) : (
                    <button
                      onClick={handleEditStudentSettings}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                  )}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                    <h4 className="text-lg font-semibold text-slate-900">Student Profile</h4>
                    <div className="mt-4 space-y-4 text-sm">
                      <div>
                        <label className="text-slate-600">Username</label>
                        <input
                          type="text"
                          value={studentSettings.username}
                          onChange={(e) => setStudentSettings({ ...studentSettings, username: e.target.value })}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          readOnly={!isEditingSettings}
                        />
                      </div>
                      <div>
                        <label className="text-slate-600">Full Name</label>
                        <input
                          type="text"
                          value={studentSettings.name}
                          onChange={(e) => {
                            setStudentSettings({ ...studentSettings, name: e.target.value });
                            setSettingsErrors((prev) => ({ ...prev, name: "" }));
                          }}
                          className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                            settingsErrors.name ? "border-red-400" : "border-slate-300"
                          }`}
                          readOnly={!isEditingSettings}
                        />
                        {settingsErrors.name && (
                          <p className="mt-1 text-xs text-red-600">{settingsErrors.name}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-slate-600">Email</label>
                        <input
                          type="email"
                          value={studentSettings.email}
                          onChange={(e) => {
                            setStudentSettings({ ...studentSettings, email: e.target.value });
                            setSettingsErrors((prev) => ({ ...prev, email: "" }));
                          }}
                          className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                            settingsErrors.email ? "border-red-400" : "border-slate-300"
                          }`}
                          readOnly={!isEditingSettings}
                        />
                        {settingsErrors.email && (
                          <p className="mt-1 text-xs text-red-600">{settingsErrors.email}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-slate-600">Role</label>
                        <input
                          type="text"
                          value="Student"
                          readOnly
                          className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                        />
                      </div>
                    </div>
                  </div>

                  {isEditingSettings && (
                    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                      <h4 className="font-semibold text-slate-900">Password Reset</h4>
                      <div className="mt-4 space-y-4 text-sm">
                        <div>
                          <label className="text-slate-600">Current Password</label>
                          <input
                            type="password"
                            value={passwordForm.currentPassword}
                            onChange={(e) => {
                              setPasswordForm({ ...passwordForm, currentPassword: e.target.value });
                              setPasswordErrors((prev) => ({ ...prev, currentPassword: "" }));
                            }}
                            className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                              passwordErrors.currentPassword ? "border-red-400" : "border-slate-300"
                            }`}
                          />
                          {passwordErrors.currentPassword && (
                            <p className="mt-1 text-xs text-red-600">{passwordErrors.currentPassword}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-slate-600">New Password</label>
                          <input
                            type="password"
                            value={passwordForm.newPassword}
                            onChange={(e) => {
                              setPasswordForm({ ...passwordForm, newPassword: e.target.value });
                              setPasswordErrors((prev) => ({ ...prev, newPassword: "" }));
                            }}
                            className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                              passwordErrors.newPassword ? "border-red-400" : "border-slate-300"
                            }`}
                          />
                          {passwordErrors.newPassword && (
                            <p className="mt-1 text-xs text-red-600">{passwordErrors.newPassword}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-slate-600">Confirm New Password</label>
                          <input
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => {
                              setPasswordForm({ ...passwordForm, confirmPassword: e.target.value });
                              setPasswordErrors((prev) => ({ ...prev, confirmPassword: "" }));
                            }}
                            className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                              passwordErrors.confirmPassword ? "border-red-400" : "border-slate-300"
                            }`}
                          />
                          {passwordErrors.confirmPassword && (
                            <p className="mt-1 text-xs text-red-600">{passwordErrors.confirmPassword}</p>
                          )}
                        </div>
                        <button
                          onClick={handleUpdateStudentPassword}
                          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                          Update Password
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <h4 className="font-semibold text-slate-900">Time Format</h4>
                  <p className="mt-1 text-sm text-slate-600">Choose how time is displayed across your dashboard</p>
                  {isEditingSettings ? (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700">
                        <input
                          type="radio"
                          name="timeFormat"
                          checked={studentSettings.timeFormat === "24"}
                          onChange={() => setStudentSettings({ ...studentSettings, timeFormat: "24" })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        24-hour
                      </label>
                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700">
                        <input
                          type="radio"
                          name="timeFormat"
                          checked={studentSettings.timeFormat === "12"}
                          onChange={() => setStudentSettings({ ...studentSettings, timeFormat: "12" })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        12-hour
                      </label>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-700">
                      Current format: {studentSettings.timeFormat === "12" ? "12-hour" : "24-hour"}
                    </p>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

