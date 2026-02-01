"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

interface User {
  _id: string;
  username: string;
  email: string;
  phone?: string;
  name: string;
  role: string;
  taskCount: number;
  expenseTotal: number;
  status: string;
  createdAt: string;
}

interface Activity {
  id: string;
  user: string;
  action: string;
  type: string;
  time: string;
  role?: string;
  icon: string;
}

interface LoginEvent {
  _id: string;
  userId: string;
  role: "admin" | "student" | "business";
  createdAt: string;
}


interface Announcement {
  _id: string;
  title: string;
  body: string;
  audience: ("student" | "business")[];
  targetUserIds?: string[];
  createdAt: string;
}

interface SystemHealthMetric {
  label: string;
  value: string;
  status: "good" | "warning" | "critical";
  target: string;
  percentage: number;
}

interface SystemHealthData {
  score: number;
  status: "operational" | "degraded" | "down";
  statusLabel: string;
  updatedAt: string;
  metrics: SystemHealthMetric[];
  trend: { label: string; score: number }[];
}

interface AuditLog {
  _id: string;
  action: string;
  actorRole?: string;
  targetRole?: string;
  actorName?: string;
  targetName?: string;
  details?: string;
  createdAt: string;
}

interface ReportSummary {
  users: {
    total: number;
    byRole: Record<string, number>;
    byStatus: Record<string, number>;
    newRegistrations: number;
  };
  timetable: {
    total: number;
    active: number;
    archived: number;
    conflicts: number;
    updates: number;
  };
  approvals: {
    submitted: number;
    approved: number;
    rejected: number;
    pending: number;
    avgApprovalHours: number | null;
  };
  notifications: {
    sent: number;
    read: number | null;
    unread: number | null;
    failed: number | null;
    byType: Record<string, number>;
  };
  activity: {
    logins: number;
    loginsByRole: Record<string, number>;
    adminActions: number;
    failedLogins: number;
    avgSessionMinutes: number | null;
  };
  sessions: {
    count: number;
    avgDurationMinutes: number | null;
  };
  auditLogs: AuditLog[];
}

interface ReminderItem {
  id: string;
  title: string;
  note: string;
  dueAt: string;
  completed: boolean;
  notified: boolean;
}

interface TaskItem {
  _id: string;
  title: string;
  details?: string;
  status: "pending" | "done" | "overdue";
  userId: string;
  createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const initialEndDate = new Date().toISOString().split("T")[0];
  const initialStartDate = (() => {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return start.toISOString().split("T")[0];
  })();
  const [activeSection, setActiveSection] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [students, setStudents] = useState<User[]>([]);
  const [businessUsers, setBusinessUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loginEvents] = useState<LoginEvent[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  // Removed unused: loginEventsLoading, setLoginEventsLoading
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportFilters, setReportFilters] = useState({
    startDate: initialStartDate,
    endDate: initialEndDate,
    role: "all",
    status: "all",
    sessionUserId: "all",
    sessionStartDate: initialStartDate,
    sessionEndDate: initialEndDate,
    activityUserId: "all",
    activityStartDate: initialStartDate,
    activityEndDate: initialEndDate,
    search: ""
  });
  const [stats, setStats] = useState({
    studentsGrowth: 0,
    businessGrowth: 0,
    tasksGrowth: 0,
    totalUsersGrowth: 0,
    previousStudents: 0,
    previousBusiness: 0,
    previousTasks: 0
  });
  const [chartData, setChartData] = useState({
    userGrowth: [] as { month: string; students: number; business: number }[],
    taskDistribution: { pending: 0, completed: 0 }
  });
  const [systemHealth, setSystemHealth] = useState<SystemHealthData>({
    score: 0,
    status: "operational",
    statusLabel: "Loading...",
    updatedAt: "",
    metrics: [],
    trend: []
  });
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [editFormData, setEditFormData] = useState({
    username: "",
    email: "",
    name: "",
    role: "",
    password: ""
  });
  const [editErrors, setEditErrors] = useState<{ [key: string]: string }>({});
  // Removed unused: showResetModal, setShowResetModal, resetUserId, setResetUserId
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announcementErrors, setAnnouncementErrors] = useState<{ [key: string]: string }>({});
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({
    type: "users",
    range: "30",
    includeDetails: true
  });
  const [reportErrors, setReportErrors] = useState<{ [key: string]: string }>({});
  const [adminSettings, setAdminSettings] = useState({
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
  const [newUserForm, setNewUserForm] = useState({
    username: "",
    email: "",
    name: "",
    role: "student",
    password: ""
  });
  const [newUserErrors, setNewUserErrors] = useState<{ [key: string]: string }>({});
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [businessSearchTerm, setBusinessSearchTerm] = useState("");
  const [businessStatusFilter, setBusinessStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [activityRange, setActivityRange] = useState<"today" | "7" | "30" | "365">("7");
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    message: "",
    sendToStudents: true,
    sendToBusiness: true,
    targetMode: "all" as "all" | "specific",
    targetRole: "student" as "student" | "business",
    targetUserIds: [] as string[]
  });
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [remindersLoaded, setRemindersLoaded] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    title: "",
    note: "",
    dueAt: ""
  });
  const reminderSectionRef = useRef<HTMLDivElement | null>(null);

  // Initialize arrays to prevent undefined errors

  useEffect(() => {
    // Defer data loading to make page interactive immediately
    const timer = setTimeout(() => {
      fetchUsers();
      fetchTasks();
    }, 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeSection !== "reports") return;
    fetchReportSummary(reportFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportFilters, activeSection]);

  useEffect(() => {
    const stored = localStorage.getItem("adminReminders");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ReminderItem[];
        if (Array.isArray(parsed)) {
          setReminders(parsed);
        }
      } catch {
        setReminders([]);
      }
    }
    setRemindersLoaded(true);
  }, []);

  useEffect(() => {
    if (!remindersLoaded) return;
    localStorage.setItem("adminReminders", JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    if (activeSection !== "tasks") return;
    fetchTasks({ silent: true });
    const interval = setInterval(() => {
      fetchTasks({ silent: true });
    }, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "overview") return;
    fetchActivities({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "reports") return;
    if (reportForm.type !== "activities") return;
    fetchActivities({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, reportForm.type]);

  useEffect(() => {
    if (activeSection !== "announcements") return;
    fetchAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  const fetchUsers = async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setLoading(true);
      }
      
      // Fetch students, business users, and settings in parallel
      const [studentsRes, businessRes, healthRes, adminSettingsRes] = await Promise.all([
        fetch("/api/users?role=student"),
        fetch("/api/users?role=business"),
        fetch("/api/system-health"),
        fetch("/api/admin/settings"),
      ]);
      
      const [studentsData, businessData, healthData, adminSettingsData] = await Promise.all([
        studentsRes.json(),
        businessRes.json(),
        healthRes.ok ? healthRes.json() : Promise.resolve(null),
        adminSettingsRes.ok ? adminSettingsRes.json() : Promise.resolve(null)
      ]);
      
      setStudents(studentsData);
      setBusinessUsers(businessData);
      if (adminSettingsData) {
        setAdminSettings({
          username: adminSettingsData.username || "",
          name: adminSettingsData.name || "",
          email: adminSettingsData.email || "",
          timeFormat: adminSettingsData.timeFormat || "24"
        });
      }
      if (healthData) {
        setSystemHealth(healthData);
      }
      
      // Calculate growth percentages and chart data
      calculateGrowthAndCharts(studentsData, businessData);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  };

  const fetchActivities = async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setActivitiesLoading(true);
      }
      const response = await fetch("/api/activities");
      const data = response.ok ? await response.json() : [];
      setActivities(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching activities:", error);
      setActivities([]);
    } finally {
      if (!options?.silent) {
        setActivitiesLoading(false);
      }
    }
  };

  // Removed unused: fetchLoginEvents

  const fetchAnnouncements = async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setAnnouncementsLoading(true);
      }
      const response = await fetch("/api/announcements");
      const data = response.ok ? await response.json() : [];
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      setAnnouncements([]);
    } finally {
      if (!options?.silent) {
        setAnnouncementsLoading(false);
      }
    }
  };

  const fetchTasks = async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setTasksLoading(true);
      }
      const [tasksResponse, usersResponse] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/users")
      ]);
      const tasksData = tasksResponse.ok ? await tasksResponse.json() : [];
      const usersData = usersResponse.ok ? await usersResponse.json() : [];

      const adminIds = new Set(
        (Array.isArray(usersData) ? usersData : [])
          .filter((user: { role?: string; _id?: string }) => user.role === "admin" && user._id)
          .map((user: { _id: string }) => user._id)
      );

      const filteredTasks = (Array.isArray(tasksData) ? tasksData : []).filter((task: { userId?: string }) =>
        task.userId ? adminIds.has(task.userId) : false
      );

      setTasks(filteredTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setTasks([]);
    } finally {
      if (!options?.silent) {
        setTasksLoading(false);
      }
    }
  };

  const fetchReportSummary = async (filters: typeof reportFilters) => {
    try {
      setReportLoading(true);
      const params = new URLSearchParams();
      if (filters.startDate) params.set("start", filters.startDate);
      if (filters.endDate) params.set("end", filters.endDate);
      if (filters.role !== "all") params.set("role", filters.role);
      if (filters.status !== "all") params.set("status", filters.status);
      if (filters.sessionUserId !== "all") params.set("sessionUserId", filters.sessionUserId);
      if (filters.sessionStartDate) params.set("sessionStart", filters.sessionStartDate);
      if (filters.sessionEndDate) params.set("sessionEnd", filters.sessionEndDate);
      if (filters.activityUserId !== "all") params.set("activityUserId", filters.activityUserId);
      if (filters.activityStartDate) params.set("activityStart", filters.activityStartDate);
      if (filters.activityEndDate) params.set("activityEnd", filters.activityEndDate);
      if (filters.search.trim()) params.set("search", filters.search.trim());

      const res = await fetch(`/api/reports/summary?${params.toString()}`);
      const data = await res.json();
      setReportSummary(data);
    } catch (error) {
      console.error("Error fetching report summary:", error);
    } finally {
      setReportLoading(false);
    }
  };

  const getMaxValue = (values: Record<string, number>) => {
    const list = Object.values(values || {});
    return list.length ? Math.max(...list, 0) : 0;
  };

  const getBarWidth = (value: number, max: number) => {
    if (!max) return "0%";
    return `${Math.min(100, Math.round((value / max) * 100))}%`;
  };

  // Removed unused: getLoginTrend

  const buildPieGradient = (values: Record<string, number>, colors: string[]) => {
    const entries = Object.entries(values || {});
    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    if (!total) {
      return "conic-gradient(#e2e8f0 0deg, #e2e8f0 360deg)";
    }
    let start = 0;
    const segments = entries.map(([, value], index) => {
      const angle = (value / total) * 360;
      const end = start + angle;
      const color = colors[index % colors.length];
      const segment = `${color} ${start}deg ${end}deg`;
      start = end;
      return segment;
    });
    return `conic-gradient(${segments.join(", ")})`;
  };

  const calculateGrowthAndCharts = (studentsData: User[], businessData: User[]) => {
    // Calculate users created in last 7 days vs previous 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Students growth
    const recentStudents = studentsData.filter(s => s.createdAt && new Date(s.createdAt) >= sevenDaysAgo).length;
    const previousStudents = studentsData.filter(s => {
      if (!s.createdAt) return false;
      const date = new Date(s.createdAt);
      return date >= fourteenDaysAgo && date < sevenDaysAgo;
    }).length;
    
    let studentsGrowth = 0;
    if (previousStudents > 0) {
      studentsGrowth = ((recentStudents - previousStudents) / previousStudents) * 100;
    } else if (recentStudents > 0) {
      studentsGrowth = 100;
    }

    // Business users growth
    const recentBusiness = businessData.filter(b => b.createdAt && new Date(b.createdAt) >= sevenDaysAgo).length;
    const previousBusiness = businessData.filter(b => {
      if (!b.createdAt) return false;
      const date = new Date(b.createdAt);
      return date >= fourteenDaysAgo && date < sevenDaysAgo;
    }).length;
    
    let businessGrowth = 0;
    if (previousBusiness > 0) {
      businessGrowth = ((recentBusiness - previousBusiness) / previousBusiness) * 100;
    } else if (recentBusiness > 0) {
      businessGrowth = 100;
    }

    // Tasks growth
    const totalTasks = studentsData.reduce((sum, s) => sum + (s.taskCount || 0), 0) + 
                       businessData.reduce((sum, b) => sum + (b.taskCount || 0), 0);
    const totalUsers = studentsData.length + businessData.length;
    const avgTasksPerUser = totalUsers > 0 ? totalTasks / totalUsers : 0;
    const tasksGrowth = totalUsers > 0 ? Math.min((avgTasksPerUser * 20), 50) : 0;

    // Total users growth
    const recentTotalUsers = recentStudents + recentBusiness;
    const previousTotalUsers = previousStudents + previousBusiness;
    let totalUsersGrowth = 0;
    if (previousTotalUsers > 0) {
      totalUsersGrowth = ((recentTotalUsers - previousTotalUsers) / previousTotalUsers) * 100;
    } else if (recentTotalUsers > 0) {
      totalUsersGrowth = 100;
    }

    setStats({
      studentsGrowth: Math.round(studentsGrowth * 10) / 10,
      businessGrowth: Math.round(businessGrowth * 10) / 10,
      tasksGrowth: Math.round(tasksGrowth * 10) / 10,
      totalUsersGrowth: Math.round(totalUsersGrowth * 10) / 10,
      previousStudents,
      previousBusiness,
      previousTasks: 0
    });

    // Calculate chart data - last 3 days
    const daysData = [];
    for (let i = 2; i >= 0; i--) {
      const dayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const nextDayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
      const dayName = dayDate.toLocaleDateString('default', { month: 'short', day: 'numeric' });
      
      const studentsCount = studentsData.filter(s => {
        if (!s.createdAt) return false;
        const date = new Date(s.createdAt);
        return date >= dayDate && date < nextDayDate;
      }).length;
      
      const businessCount = businessData.filter(b => {
        if (!b.createdAt) return false;
        const date = new Date(b.createdAt);
        return date >= dayDate && date < nextDayDate;
      }).length;
      
      daysData.push({
        month: dayName,
        students: studentsCount,
        business: businessCount
      });
    }
    
    // Calculate cumulative totals
    let cumulativeStudents = 0;
    let cumulativeBusiness = 0;
    const cumulativeData = daysData.map(day => {
      cumulativeStudents += day.students;
      cumulativeBusiness += day.business;
      return {
        month: day.month,
        students: cumulativeStudents,
        business: cumulativeBusiness
      };
    });
    
    setChartData({
      userGrowth: cumulativeData,
      taskDistribution: {
        pending: Math.floor(totalTasks * 0.7),
        completed: Math.floor(totalTasks * 0.3)
      }
    });
  };



  const menuItems = [
    { id: "overview", label: "Overview", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
    { id: "students", label: "Students", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
    { id: "business", label: "Business Users", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
    { id: "announcements", label: "Announcements", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg> },
    { id: "tasks", label: "Tasks", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h6m-6 4h6m-6 4h6m-7 7h8a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 002 2z" /></svg> },
    { id: "timetable", label: "Timetables", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { id: "reports", label: "Reports", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    { id: "settings", label: "Settings", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> }
  ];

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditErrors({});
    setEditFormData({
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      password: ""
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nextErrors: { [key: string]: string } = {};
    if (!editFormData.username.trim()) nextErrors.username = "Username is required";
    if (!editFormData.name.trim()) nextErrors.name = "Name is required";
    if (!editFormData.email.trim()) nextErrors.email = "Email is required";
    if (editFormData.email && !emailRegex.test(editFormData.email)) nextErrors.email = "Enter a valid email";
    if (editFormData.password && editFormData.password.length < 6) nextErrors.password = "Password must be at least 6 characters";
    if (!editFormData.role) nextErrors.role = "Role is required";
    if (Object.keys(nextErrors).length > 0) {
      setEditErrors(nextErrors);
      return;
    }
    setEditErrors({});

    try {
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: editingUser._id,
          ...editFormData
        })
      });

      const data = await response.json();
      if (response.ok) {
        const updated = data.user as User | undefined;
        if (updated) {
          setStudents((prev) => prev.map((u) => (u._id === updated._id ? { ...u, ...updated } : u)));
          setBusinessUsers((prev) => prev.map((u) => (u._id === updated._id ? { ...u, ...updated } : u)));
        }
        alert("User updated successfully!");
        setEditingUser(null);
        fetchUsers({ silent: true });
      } else {
        alert(data.error || "Failed to update user");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Error updating user");
    }
  };

  
  const handleOpenAddUser = () => {
    setNewUserForm({
      username: "",
      email: "",
      name: "",
      role: "student",
      password: ""
    });
    setNewUserErrors({});
    setShowAddUserModal(true);
  };

  const handleOpenAddBusiness = () => {
    setNewUserForm({
      username: "",
      email: "",
      name: "",
      role: "business",
      password: ""
    });
    setNewUserErrors({});
    setShowAddUserModal(true);
  };
  
  const handleCreateUser = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nextErrors: { [key: string]: string } = {};
    if (!newUserForm.username.trim()) nextErrors.username = "Username is required";
    if (!newUserForm.name.trim()) nextErrors.name = "Name is required";
    if (!newUserForm.email.trim()) nextErrors.email = "Email is required";
    if (newUserForm.email && !emailRegex.test(newUserForm.email)) nextErrors.email = "Enter a valid email";
    if (!newUserForm.password) nextErrors.password = "Password is required";
    if (newUserForm.password && newUserForm.password.length < 6) nextErrors.password = "Password must be at least 6 characters";
    if (!newUserForm.role) nextErrors.role = "Role is required";
    if (Object.keys(nextErrors).length > 0) {
      setNewUserErrors(nextErrors);
      return;
    }
    setNewUserErrors({});
  
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUserForm)
      });
  
      if (response.ok) {
        const data = await response.json();
        alert("User created successfully!");
        const newUser: User = {
          _id: data.id,
          username: newUserForm.username,
          email: newUserForm.email,
          name: newUserForm.name,
          role: newUserForm.role,
          taskCount: 0,
          expenseTotal: 0,
          status: "Active",
          createdAt: new Date().toISOString()
        };
        if (newUser.role === "business") {
          setBusinessUsers((prev) => [newUser, ...prev]);
        } else {
          setStudents((prev) => [newUser, ...prev]);
        }
        setShowAddUserModal(false);
        fetchUsers({ silent: true });
      } else {
        const data = await response.json();
        alert(data.error || "Failed to create user");
      }
    } catch (error) {
      console.error("Error creating user:", error);
      alert("Error creating user");
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    const currentStatus = user.status || "Active";
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";

    try {
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: user._id, status: nextStatus })
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to update status");
        return;
      }

      setStudents((prev) =>
        prev.map((item) => (item._id === user._id ? { ...item, status: nextStatus } : item))
      );
      setBusinessUsers((prev) =>
        prev.map((item) => (item._id === user._id ? { ...item, status: nextStatus } : item))
      );
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Error updating status");
    }
  };
  
  const handleOpenAnnouncementModal = () => {
    setAnnouncementForm({
      title: "",
      message: "",
      sendToStudents: true,
      sendToBusiness: true,
      targetMode: "all",
      targetRole: "student",
      targetUserIds: []
    });
    setAnnouncementErrors({});
    setShowAnnouncementModal(true);
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setAnnouncementForm({
      title: announcement.title,
      message: announcement.body,
      sendToStudents: announcement.audience.includes("student"),
      sendToBusiness: announcement.audience.includes("business"),
      targetMode: announcement.targetUserIds && announcement.targetUserIds.length > 0 ? "specific" : "all",
      targetRole: announcement.audience.includes("business") ? "business" : "student",
      targetUserIds: announcement.targetUserIds || []
    });
    setAnnouncementErrors({});
    setShowAnnouncementModal(true);
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!confirm("Delete this announcement?")) return;
    try {
      const response = await fetch(`/api/announcements?id=${announcementId}`, { method: "DELETE" });
      if (response.ok) {
        setAnnouncements((prev) => prev.filter((item) => item._id !== announcementId));
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete announcement");
      }
    } catch (error) {
      console.error("Error deleting announcement:", error);
      alert("Error deleting announcement");
    }
  };
  
  const handleCreateAnnouncement = async () => {
    const nextErrors: { [key: string]: string } = {};
    if (!announcementForm.title.trim()) nextErrors.title = "Title is required";
    if (!announcementForm.message.trim()) nextErrors.message = "Message is required";

    const audience: ("student" | "business")[] = [];
    if (announcementForm.sendToStudents) audience.push("student");
    if (announcementForm.sendToBusiness) audience.push("business");
  
    if (audience.length === 0) {
      nextErrors.audience = "Select at least one audience";
    }

    if (announcementForm.targetMode === "specific" && announcementForm.targetUserIds.length === 0) {
      nextErrors.targetUserIds = "Select at least one recipient";
    }

    if (Object.keys(nextErrors).length > 0) {
      setAnnouncementErrors(nextErrors);
      return;
    }
    setAnnouncementErrors({});
  
    try {
      const response = await fetch("/api/announcements", {
        method: editingAnnouncement ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingAnnouncement ? { _id: editingAnnouncement._id } : {}),
          title: announcementForm.title,
          body: announcementForm.message,
          audience,
          targetUserIds: announcementForm.targetMode === "specific" ? announcementForm.targetUserIds : []
        })
      });
  
      if (response.ok) {
        const data = await response.json();
        alert(editingAnnouncement ? "Announcement updated successfully!" : "Announcement created successfully!");
        setShowAnnouncementModal(false);
        setEditingAnnouncement(null);
        if (editingAnnouncement) {
          setAnnouncements((prev) => prev.map((item) => (item._id === data._id ? data : item)));
        } else {
          setAnnouncements((prev) => [data, ...prev]);
        }
        fetchUsers({ silent: true });
      } else {
        const data = await response.json();
        alert(data.error || "Failed to create announcement");
      }
    } catch (error) {
      console.error("Error creating announcement:", error);
      alert("Error creating announcement");
    }
  };

  const handleOpenReportModal = () => {
    setReportForm({
      type: "users",
      range: "30",
      includeDetails: true
    });
    setReportErrors({});
    setShowReportModal(true);
  };

  const downloadCsv = (filename: string, rows: string[][]) => {
    const escapeValue = (value: string) => {
      if (value.includes("\"") || value.includes(",") || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csv = rows.map((row) => row.map((cell) => escapeValue(cell)).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleExportReportsExcel = () => {
    if (!reportSummary) return;
    const rows: string[][] = [
      ["Report Section", "Metric", "Value"],
      ["User Management", "Total Users", String(reportSummary.users.total)],
      ["User Management", "New Registrations", String(reportSummary.users.newRegistrations)],
      ["User Management", "Active Users", String(reportSummary.users.byStatus.Active || 0)],
      ["User Management", "Inactive Users", String(reportSummary.users.byStatus.Inactive || 0)],
      ["Timetable", "Total Timetables", String(reportSummary.timetable.total)],
      ["Timetable", "Active Timetables", String(reportSummary.timetable.active)],
      ["Timetable", "Archived Timetables", String(reportSummary.timetable.archived)],
      ["Timetable", "Conflicts", String(reportSummary.timetable.conflicts)],
      ["Approvals", "Submitted", String(reportSummary.approvals.submitted)],
      ["Approvals", "Approved", String(reportSummary.approvals.approved)],
      ["Approvals", "Rejected", String(reportSummary.approvals.rejected)],
      ["Approvals", "Pending", String(reportSummary.approvals.pending)],
      ["Notifications", "Sent", String(reportSummary.notifications.sent)],
      ["Activity", "Login Events", String(reportSummary.activity.logins)],
      ["Activity", "Admin Actions", String(reportSummary.activity.adminActions)],
      ["Activity", "Failed Logins", String(reportSummary.activity.failedLogins)]
    ];

    downloadCsv("stpms-reports.csv", rows);
  };

  const handlePrintReports = () => {
    window.print();
  };

  const handleExportReportsPdf = () => {
    window.print();
  };

  const handleGenerateReport = () => {
    const validTypes = ["users", "activities", "announcements"];
    const validRanges = ["7", "30", "90", "all"];
    const nextErrors: { [key: string]: string } = {};
    if (!validTypes.includes(reportForm.type)) nextErrors.type = "Select a report type";
    if (!validRanges.includes(reportForm.range)) nextErrors.range = "Select a valid range";
    if (Object.keys(nextErrors).length > 0) {
      setReportErrors(nextErrors);
      return;
    }
    setReportErrors({});

    const now = new Date();
    const rangeDays = reportForm.range === "all" ? null : Number(reportForm.range);
    const cutoff = rangeDays ? new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000) : null;

    if (reportForm.type === "users") {
      const combinedUsers = [...students, ...businessUsers];
      const filtered = cutoff
        ? combinedUsers.filter((u) => u.createdAt && new Date(u.createdAt) >= cutoff)
        : combinedUsers;
      const rows = [
        ["Name", "Username", "Email", "Role", "Status", "Created At"],
        ...filtered.map((u) => [
          u.name || "",
          u.username || "",
          u.email || "",
          u.role || "",
          u.status || "",
          u.createdAt ? new Date(u.createdAt).toLocaleString() : ""
        ])
      ];
      downloadCsv(`users-report-${Date.now()}.csv`, rows);
    }

    if (reportForm.type === "activities") {
      const filtered = cutoff
        ? activities.filter((a) => a.time && new Date(a.time) >= cutoff)
        : activities;
      const rows = [
        ["User", "Action", "Type", "Time"],
        ...filtered.map((a) => [
          a.user || "",
          a.action || "",
          a.type || "",
          a.time ? new Date(a.time).toLocaleString() : ""
        ])
      ];
      downloadCsv(`activity-report-${Date.now()}.csv`, rows);
    }

    if (reportForm.type === "announcements") {
      const filtered = cutoff
        ? announcements.filter((a) => a.createdAt && new Date(a.createdAt) >= cutoff)
        : announcements;
      const rows = [
        ["Title", "Message", "Audience", "Created At"],
        ...filtered.map((a) => [
          a.title || "",
          a.body || "",
          a.audience?.join("/") || "",
          a.createdAt ? new Date(a.createdAt).toLocaleString() : ""
        ])
      ];
      downloadCsv(`announcements-report-${Date.now()}.csv`, rows);
    }

    setShowReportModal(false);
  };

  const handleSaveAdminSettings = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nextErrors: { [key: string]: string } = {};
    if (!adminSettings.name.trim()) nextErrors.name = "Name is required";
    if (!adminSettings.email.trim()) nextErrors.email = "Email is required";
    if (adminSettings.email && !emailRegex.test(adminSettings.email)) nextErrors.email = "Enter a valid email";
    if (Object.keys(nextErrors).length > 0) {
      setSettingsErrors(nextErrors);
      return;
    }
    setSettingsErrors({});

    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: adminSettings.username,
          name: adminSettings.name,
          email: adminSettings.email,
          timeFormat: adminSettings.timeFormat
        })
      });

      if (response.ok) {
        alert("Settings saved successfully!");
        setIsEditingSettings(false);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Error saving settings");
    }
  };

  const handleEditAdminSettings = () => {
    setIsEditingSettings(true);
  };

  const handleUpdateAdminPassword = async () => {
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

    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      if (response.ok) {
        alert("Password updated successfully!");
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

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This will also delete all their associated data.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users?id=${userId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        alert("User deleted successfully!");
        setStudents((prev) => prev.filter((user) => user._id !== userId));
        setBusinessUsers((prev) => prev.filter((user) => user._id !== userId));
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Error deleting user");
    }
  };

  const handleResetPassword = async (userId: string) => {
    const newPassword = prompt("Enter new password for user:");
    if (!newPassword) return;

    try {
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: userId,
          password: newPassword
        })
      });

      if (response.ok) {
        alert("Password reset successfully!");
      } else {
        const data = await response.json();
        alert(data.error || "Failed to reset password");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      alert("Error resetting password");
    }
  };

  const handleCreateRequestTask = async (log: AuditLog) => {
    try {
      const response = await fetch("/api/tasks/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditLogId: log._id })
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || "Failed to create task");
        return;
      }
      fetchTasks({ silent: true });
      setActiveSection("tasks");
      alert("Task created for request");
    } catch (error) {
      console.error("Error creating task:", error);
      alert("Failed to create task");
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: "pending" | "done" | "overdue") => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        }
      );
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || "Failed to update task");
        return;
      }
      setTasks((prev) => prev.map((task) => (task._id === taskId ? { ...task, status: data.status || status } : task)));
    } catch (error) {
      console.error("Error updating task:", error);
      alert("Failed to update task");
    }
  };

  function getTimeAgo(dateString: string) {
    if (!dateString) return "Just now";
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Just now";
    
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 0) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    return date.toLocaleDateString();
  }

  const scrollToReminders = () => {
    const target = reminderSectionRef.current;
    if (!target) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  };

  const dueReminders = reminders.filter((reminder) => {
    if (reminder.completed) return false;
    if (!reminder.dueAt) return false;
    return new Date(reminder.dueAt) <= new Date();
  });

  const pendingTaskCount = tasks.filter((task) => task.status === "pending").length;

  useEffect(() => {
    if (dueReminders.length === 0) return;
    setReminders((prev) =>
      prev.map((reminder) =>
        reminder.completed || reminder.notified || !reminder.dueAt || new Date(reminder.dueAt) > new Date()
          ? reminder
          : { ...reminder, notified: true }
      )
    );
  }, [dueReminders.length, remindersLoaded]);

  const handleAddReminder = () => {
    const trimmedTitle = reminderForm.title.trim();
    if (!trimmedTitle || !reminderForm.dueAt) {
      alert("Title and date/time are required.");
      return;
    }
    const newReminder: ReminderItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: trimmedTitle,
      note: reminderForm.note.trim(),
      dueAt: reminderForm.dueAt,
      completed: false,
      notified: false
    };
    setReminders((prev) => [newReminder, ...prev]);
    setReminderForm({ title: "", note: "", dueAt: "" });
  };

  const handleToggleReminder = (id: string) => {
    setReminders((prev) =>
      prev.map((reminder) =>
        reminder.id === id ? { ...reminder, completed: !reminder.completed } : reminder
      )
    );
  };

  const handleDeleteReminder = (id: string) => {
    setReminders((prev) => prev.filter((reminder) => reminder.id !== id));
  };

  const handleExportStudentsCsv = () => {
    const rows = filteredStudents.map((student) => ({
      name: student.name || "",
      username: student.username || "",
      email: student.email || "",
      phone: student.phone || "",
      tasks: student.taskCount ?? 0,
      status: student.status || "",
      joined: student.createdAt ? new Date(student.createdAt).toLocaleDateString() : ""
    }));

    const headers = ["Name", "Username", "Email", "Phone", "Tasks", "Status", "Joined"];
    const escapeCsv = (value: string | number) => {
      const str = String(value ?? "");
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        [
          row.name,
          row.username,
          row.email,
          row.phone,
          row.tasks,
          row.status,
          row.joined
        ]
          .map(escapeCsv)
          .join(",")
      )
    ].join("\n");

    const blob = new Blob(["\uFEFF", csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `students-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportBusinessesCsv = () => {
    const rows = filteredBusinesses.map((biz) => ({
      name: biz.name || "",
      username: biz.username || "",
      email: biz.email || "",
      phone: biz.phone || "",
      status: biz.status || "",
      joined: biz.createdAt ? new Date(biz.createdAt).toLocaleDateString() : ""
    }));

    const headers = ["Business Name", "Username", "Email", "Phone", "Status", "Joined"];
    const escapeCsv = (value: string | number) => {
      const str = String(value ?? "");
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        [row.name, row.username, row.email, row.phone, row.status, row.joined]
          .map(escapeCsv)
          .join(",")
      )
    ].join("\n");

    const blob = new Blob(["\uFEFF", csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `businesses-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const normalizedStudentSearch = studentSearchTerm.trim().toLowerCase();
  const filteredStudents = (students || []).filter((student) => {
    const status = (student.status || "").toLowerCase();
    const matchesStatus =
      studentStatusFilter === "all" ||
      (studentStatusFilter === "active" && status === "active") ||
      (studentStatusFilter === "inactive" && status !== "active");
    if (!matchesStatus) return false;
    if (!normalizedStudentSearch) return true;
    const searchable = `${student.name || ""} ${student.username || ""} ${student.email || ""} ${student.phone || ""}`.toLowerCase();
    return searchable.includes(normalizedStudentSearch);
  });

  const normalizedBusinessSearch = businessSearchTerm.trim().toLowerCase();
  const filteredBusinesses = (businessUsers || []).filter((biz) => {
    const status = (biz.status || "").toLowerCase();
    const matchesStatus =
      businessStatusFilter === "all" ||
      (businessStatusFilter === "active" && status === "active") ||
      (businessStatusFilter === "inactive" && status !== "active");
    if (!matchesStatus) return false;
    if (!normalizedBusinessSearch) return true;
    const searchable = `${biz.name || ""} ${biz.username || ""} ${biz.email || ""} ${biz.phone || ""}`.toLowerCase();
    return searchable.includes(normalizedBusinessSearch);
  });

  const activityWindowStart = new Date();
  if (activityRange === "today") {
    activityWindowStart.setHours(0, 0, 0, 0);
  } else {
    const days = Number(activityRange);
    activityWindowStart.setDate(activityWindowStart.getDate() - days);
  }
  const activityCounts = loginEvents.reduce(
    (acc, activity) => {
      const activityTime = activity.createdAt ? new Date(activity.createdAt) : null;
      if (!activityTime || activityTime < activityWindowStart) return acc;
      if (activity.role === "student") acc.student += 1;
      if (activity.role === "business") acc.business += 1;
      return acc;
    },
    { student: 0, business: 0 }
  );
  const activityTotal = activityCounts.student + activityCounts.business;
  const mostActiveTeam =
    activityTotal === 0
      ? "No activity"
      : activityCounts.student === activityCounts.business
        ? "Students & Business (tie)"
        : activityCounts.student > activityCounts.business
          ? "Students"
          : "Business";

  const reportUserRoleMax = getMaxValue(reportSummary?.users.byRole || {});


  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {selectedAuditLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedAuditLog(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Audit Log Details</h3>
                <p className="text-xs text-slate-500">{new Date(selectedAuditLog.createdAt).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-500">Action</p>
                <p className="text-slate-900">{selectedAuditLog.action}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Actor</p>
                  <p className="text-slate-700">{selectedAuditLog.actorName || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Target</p>
                  <p className="text-slate-700">{selectedAuditLog.targetName || "—"}</p>
                </div>
              </div>
              {selectedAuditLog.details && (
                <div>
                  <p className="text-xs font-semibold text-slate-500">Details</p>
                  <p className="text-slate-700">{selectedAuditLog.details}</p>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Actor Role</p>
                  <p className="text-slate-700">{selectedAuditLog.actorRole || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Target Role</p>
                  <p className="text-slate-700">{selectedAuditLog.targetRole || "—"}</p>
                </div>
              </div>
              {selectedAuditLog.action === "user.password_reset_request" && (
                <button
                  type="button"
                  onClick={() => handleCreateRequestTask(selectedAuditLog)}
                  className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Create Task
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Edit User</h3>
            </div>
            <div className="space-y-4 px-6 py-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  value={editFormData.username}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, username: e.target.value });
                    setEditErrors((prev) => ({ ...prev, username: "" }));
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    editErrors.username ? "border-red-400" : "border-slate-300"
                  }`}
                />
                {editErrors.username && (
                  <p className="mt-1 text-xs text-red-600">{editErrors.username}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, email: e.target.value });
                    setEditErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    editErrors.email ? "border-red-400" : "border-slate-300"
                  }`}
                />
                {editErrors.email && (
                  <p className="mt-1 text-xs text-red-600">{editErrors.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, name: e.target.value });
                    setEditErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    editErrors.name ? "border-red-400" : "border-slate-300"
                  }`}
                />
                {editErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{editErrors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={editFormData.role}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, role: e.target.value });
                    setEditErrors((prev) => ({ ...prev, role: "" }));
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    editErrors.role ? "border-red-400" : "border-slate-300"
                  }`}
                >
                  <option value="student">Student</option>
                  <option value="business">Business</option>
                  <option value="admin">Admin</option>
                </select>
                {editErrors.role && (
                  <p className="mt-1 text-xs text-red-600">{editErrors.role}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  value={editFormData.password}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, password: e.target.value });
                    setEditErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  placeholder="Leave blank to keep current password"
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    editErrors.password ? "border-red-400" : "border-slate-300"
                  }`}
                />
                {editErrors.password && (
                  <p className="mt-1 text-xs text-red-600">{editErrors.password}</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Add User</h3>
            </div>
            <div className="space-y-4 px-6 py-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  value={newUserForm.username}
                  onChange={(e) => {
                    setNewUserForm({ ...newUserForm, username: e.target.value });
                    setNewUserErrors((prev) => ({ ...prev, username: "" }));
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    newUserErrors.username ? "border-red-400" : "border-slate-300"
                  }`}
                />
                {newUserErrors.username && (
                  <p className="mt-1 text-xs text-red-600">{newUserErrors.username}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => {
                    setNewUserForm({ ...newUserForm, email: e.target.value });
                    setNewUserErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    newUserErrors.email ? "border-red-400" : "border-slate-300"
                  }`}
                />
                {newUserErrors.email && (
                  <p className="mt-1 text-xs text-red-600">{newUserErrors.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newUserForm.name}
                  onChange={(e) => {
                    setNewUserForm({ ...newUserForm, name: e.target.value });
                    setNewUserErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    newUserErrors.name ? "border-red-400" : "border-slate-300"
                  }`}
                />
                {newUserErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{newUserErrors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => {
                    setNewUserForm({ ...newUserForm, role: e.target.value });
                    setNewUserErrors((prev) => ({ ...prev, role: "" }));
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    newUserErrors.role ? "border-red-400" : "border-slate-300"
                  }`}
                >
                  <option value="student">Student</option>
                  <option value="business">Business</option>
                  <option value="admin">Admin</option>
                </select>
                {newUserErrors.role && (
                  <p className="mt-1 text-xs text-red-600">{newUserErrors.role}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newUserForm.password}
                  onChange={(e) => {
                    setNewUserForm({ ...newUserForm, password: e.target.value });
                    setNewUserErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    newUserErrors.password ? "border-red-400" : "border-slate-300"
                  }`}
                />
                {newUserErrors.password && (
                  <p className="mt-1 text-xs text-red-600">{newUserErrors.password}</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() => setShowAddUserModal(false)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Create User
              </button>
            </div>
          </div>
        </div>
      )}

      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">New Announcement</h3>
            </div>
            <div className="space-y-4 px-6 py-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={announcementForm.title}
                  onChange={(e) => {
                    setAnnouncementForm({ ...announcementForm, title: e.target.value });
                    setAnnouncementErrors((prev) => ({ ...prev, title: "" }));
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    announcementErrors.title ? "border-red-400" : "border-slate-300"
                  }`}
                />
                {announcementErrors.title && (
                  <p className="mt-1 text-xs text-red-600">{announcementErrors.title}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <textarea
                  rows={4}
                  value={announcementForm.message}
                  onChange={(e) => {
                    setAnnouncementForm({ ...announcementForm, message: e.target.value });
                    setAnnouncementErrors((prev) => ({ ...prev, message: "" }));
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    announcementErrors.message ? "border-red-400" : "border-slate-300"
                  }`}
                />
                {announcementErrors.message && (
                  <p className="mt-1 text-xs text-red-600">{announcementErrors.message}</p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Send To</p>
                <div className="mt-2 flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={announcementForm.sendToStudents}
                      onChange={(e) => {
                        setAnnouncementForm({ ...announcementForm, sendToStudents: e.target.checked });
                        setAnnouncementErrors((prev) => ({ ...prev, audience: "" }));
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Students
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={announcementForm.sendToBusiness}
                      onChange={(e) => {
                        setAnnouncementForm({ ...announcementForm, sendToBusiness: e.target.checked });
                        setAnnouncementErrors((prev) => ({ ...prev, audience: "" }));
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Business Users
                  </label>
                </div>
                {announcementErrors.audience && (
                  <p className="mt-1 text-xs text-red-600">{announcementErrors.audience}</p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Recipients</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      checked={announcementForm.targetMode === "all"}
                      onChange={() => setAnnouncementForm({ ...announcementForm, targetMode: "all", targetUserIds: [] })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    All selected audiences
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      checked={announcementForm.targetMode === "specific"}
                      onChange={() => setAnnouncementForm({ ...announcementForm, targetMode: "specific" })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    Specific users
                  </label>
                </div>
              </div>
              {announcementForm.targetMode === "specific" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Role</label>
                    <select
                      value={announcementForm.targetRole}
                      onChange={(e) =>
                        setAnnouncementForm({
                          ...announcementForm,
                          targetRole: e.target.value as "student" | "business",
                          targetUserIds: []
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="student">Student</option>
                      <option value="business">Business</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Users</label>
                    <select
                      multiple
                      value={announcementForm.targetUserIds}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions).map((option) => option.value);
                        setAnnouncementForm({ ...announcementForm, targetUserIds: selected });
                        setAnnouncementErrors((prev) => ({ ...prev, targetUserIds: "" }));
                      }}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      {(announcementForm.targetRole === "student" ? students : businessUsers).map((user) => (
                        <option key={user._id} value={user._id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                    {announcementErrors.targetUserIds && (
                      <p className="mt-1 text-xs text-red-600">{announcementErrors.targetUserIds}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() => setShowAnnouncementModal(false)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAnnouncement}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {editingAnnouncement ? "Save Changes" : "Send Announcement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Generate Report</h3>
            </div>
            <div className="space-y-4 px-6 py-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Report Type</label>
                <select
                  value={reportForm.type}
                  onChange={(e) => {
                    setReportForm({ ...reportForm, type: e.target.value });
                    setReportErrors((prev) => ({ ...prev, type: "" }));
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    reportErrors.type ? "border-red-400" : "border-slate-300"
                  }`}
                >
                  <option value="users">Users</option>
                  <option value="activities">Activities</option>
                  <option value="announcements">Announcements</option>
                </select>
                {reportErrors.type && (
                  <p className="mt-1 text-xs text-red-600">{reportErrors.type}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date Range</label>
                <select
                  value={reportForm.range}
                  onChange={(e) => {
                    setReportForm({ ...reportForm, range: e.target.value });
                    setReportErrors((prev) => ({ ...prev, range: "" }));
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    reportErrors.range ? "border-red-400" : "border-slate-300"
                  }`}
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="all">All time</option>
                </select>
                {reportErrors.range && (
                  <p className="mt-1 text-xs text-red-600">{reportErrors.range}</p>
                )}
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                The report will be generated as a CSV file and downloaded to your device.
              </div>
            </div>
            <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateReport}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Download CSV
              </button>
            </div>
          </div>
        </div>
      )}


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
          <h1 className="text-xl font-bold">STPMS Admin</h1>
          <p className="mt-1 text-xs text-blue-200">System Management</p>
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
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition ${
                activeSection === item.id
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-blue-100 hover:bg-blue-700 hover:text-white"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User info */}
        <div className="border-t border-blue-500 px-6 py-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-400 text-sm font-bold">
              A
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Admin</p>
              <p className="text-xs text-blue-200">Administrator</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
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
              <h2 className="text-lg font-bold text-slate-900 lg:text-2xl">
                {menuItems.find((m) => m.id === activeSection)?.label}
              </h2>
              <p className="hidden text-sm text-slate-600 sm:block">
                Manage and monitor system activities
              </p>
            </div>
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setShowNotifications((prev) => !prev)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:flex sm:items-center sm:gap-2 lg:px-4"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  <span className="hidden lg:inline">Notifications</span>
                  {dueReminders.length > 0 && (
                    <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {dueReminders.length}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-900">Notifications</h4>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        Close
                      </button>
                    </div>
                    {pendingTaskCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSection("tasks");
                          setShowNotifications(false);
                        }}
                        className="mt-3 w-full rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-100"
                      >
                        New tasks: {pendingTaskCount} pending
                      </button>
                    )}
                    <div className="mt-3 space-y-2 text-xs">
                      {dueReminders.length === 0 ? (
                        <p className="text-slate-500">No reminders due right now.</p>
                      ) : (
                        dueReminders.map((reminder) => (
                          <div key={reminder.id} className="rounded-lg border border-amber-200 bg-amber-50 p-2">
                            <p className="font-semibold text-amber-900">{reminder.title}</p>
                            <p className="text-amber-700">{new Date(reminder.dueAt).toLocaleString()}</p>
                            {reminder.note && <p className="mt-1 text-amber-700">{reminder.note}</p>}
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
          {activeSection === "overview" && (
            <div className="space-y-6">
              {/* Quick Actions Bar */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleOpenAddUser}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  <span>➕</span> Add User
                </button>
                <button
                  onClick={handleOpenAnnouncementModal}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <span>📢</span> New Announcement
                </button>
                <button
                  onClick={handleOpenReportModal}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <span>📊</span> Generate Report
                </button>
                <button
                  onClick={() => setActiveSection("settings")}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <span>⚙️</span> System Settings
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { 
                    label: "Total Students", 
                    value: loading ? "..." : (students?.length || 0).toString(), 
                    change: stats.studentsGrowth > 0 ? `+${stats.studentsGrowth}%` : stats.studentsGrowth < 0 ? `${stats.studentsGrowth}%` : "—", 
                    trend: stats.studentsGrowth > 0 ? "up" : stats.studentsGrowth < 0 ? "down" : "stable", 
                    icon: "👨‍🎓" 
                  },
                  { 
                    label: "Business Users", 
                    value: loading ? "..." : (businessUsers?.length || 0).toString(), 
                    change: stats.businessGrowth > 0 ? `+${stats.businessGrowth}%` : stats.businessGrowth < 0 ? `${stats.businessGrowth}%` : "—", 
                    trend: stats.businessGrowth > 0 ? "up" : stats.businessGrowth < 0 ? "down" : "stable", 
                    icon: "💼" 
                  },
                  { 
                    label: "Active Users", 
                    value: loading
                      ? "..."
                      : (
                          (students?.filter((s) => (s.status || "").toLowerCase() === "active").length || 0) +
                          (businessUsers?.filter((b) => (b.status || "").toLowerCase() === "active").length || 0)
                        ).toString(), 
                    change: stats.totalUsersGrowth > 0 ? `+${stats.totalUsersGrowth}%` : stats.totalUsersGrowth < 0 ? `${stats.totalUsersGrowth}%` : "—", 
                    trend: stats.totalUsersGrowth > 0 ? "up" : stats.totalUsersGrowth < 0 ? "down" : "stable", 
                    icon: "👥" 
                  },
                  { 
                    label: "System Health", 
                    value: loading ? "..." : `${systemHealth.score}%`, 
                    change: systemHealth.statusLabel || "—", 
                    trend: systemHealth.status === "operational" ? "up" : systemHealth.status === "degraded" ? "stable" : "down", 
                    icon: "💚" 
                  }
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="group cursor-pointer rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-blue-200"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-600">{stat.label}</p>
                      <span className="text-2xl">{stat.icon}</span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900">{stat.value}</span>
                      <span className={`text-xs font-semibold ${stat.trend === 'up' ? 'text-green-600' : stat.trend === 'down' ? 'text-red-600' : 'text-blue-600'}`}>
                        {stat.change}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent Activity */}
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
                    <button
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      onClick={() => setShowAllActivities((prev) => !prev)}
                    >
                      {showAllActivities ? "Hide Details" : "View All →"}
                    </button>
                  </div>
                  {activitiesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    </div>
                  ) : (activities?.length || 0) === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-500">
                      No recent activities
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(showAllActivities ? activities : activities?.slice(0, 5))?.map((activity) => {
                        const timeAgo = getTimeAgo(activity.time);
                        return (
                          <div key={activity.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                              {activity.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">{activity.user}</p>
                              <p className="text-xs text-slate-600 truncate">{activity.action}</p>
                            </div>
                            <span className="text-xs text-slate-500 whitespace-nowrap">{timeAgo}</span>
                          </div>
                        );
                      })}
                      {showAllActivities && (activities?.length || 0) > 0 && (
                        <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
                          <p className="font-semibold text-slate-900">Activity Details</p>
                          <ul className="mt-2 space-y-1">
                            {activities.map((activity) => (
                              <li key={`detail-${activity.id}`} className="flex items-start gap-2">
                                <span className="text-blue-600">•</span>
                                <span>
                                  <span className="font-medium text-slate-900">{activity.user}</span> {activity.action} — {getTimeAgo(activity.time)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">System Health</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${systemHealth.status === "operational" ? "bg-green-100 text-green-700" : systemHealth.status === "degraded" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                      {systemHealth.statusLabel || "System Status"}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {(loading || systemHealth.metrics.length === 0) ? (
                      <div className="flex items-center justify-center py-8 text-sm text-slate-500">
                        Loading system metrics...
                      </div>
                    ) : systemHealth.metrics.map((metric) => (
                      <div key={metric.label}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-700">{metric.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{metric.value}</span>
                            <span className={`h-2 w-2 rounded-full ${metric.status === "good" ? "bg-green-500" : metric.status === "warning" ? "bg-amber-500" : "bg-red-500"}`}></span>
                          </div>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full bg-gradient-to-r ${metric.status === "good" ? "from-green-400 to-green-600" : metric.status === "warning" ? "from-amber-400 to-amber-600" : "from-red-400 to-red-600"}`}
                            style={{ width: `${Math.min(Math.max(metric.percentage, 0), 100)}%` }}
                          ></div>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Target: {metric.target}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chart Examples - Mobile Responsive */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Bar Chart Example */}
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:p-6">
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">User Growth (Last 3 Days)</h3>
                  <div className="space-y-2">
                    {chartData.userGrowth.length > 0 ? chartData.userGrowth.map((data) => {
                      const total = data.students + data.business;
                      const maxTotal = Math.max(...chartData.userGrowth.map(d => d.students + d.business), 1);
                      return (
                        <div key={data.month}>
                          <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                            <span className="font-medium">{data.month}</span>
                            <span className="font-semibold text-slate-900">{total} total</span>
                          </div>
                          <div className="group flex h-8 gap-1 overflow-hidden rounded-lg">
                            <div
                              className="relative bg-blue-500 transition-all duration-300 hover:bg-blue-600"
                              style={{ width: `${(data.students / maxTotal) * 100}%` }}
                            >
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                                <span className="text-xs font-semibold text-white">{data.students}</span>
                              </div>
                            </div>
                            <div
                              className="relative bg-green-500 transition-all duration-300 hover:bg-green-600"
                              style={{ width: `${(data.business / maxTotal) * 100}%` }}
                            >
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                                <span className="text-xs font-semibold text-white">{data.business}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="flex h-32 items-center justify-center text-sm text-slate-500">
                        No data available
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded bg-blue-500"></div>
                        <span className="text-slate-600">Students</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded bg-green-500"></div>
                        <span className="text-slate-600">Business</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Donut Chart Example */}
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">Login Activity</h3>
                    <select
                      value={activityRange}
                      onChange={(e) => setActivityRange(e.target.value as "today" | "7" | "30" | "365")}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                    >
                      <option value="today">Today</option>
                      <option value="7">Last 7 days</option>
                      <option value="30">Last 30 days</option>
                      <option value="365">Last year</option>
                    </select>
                  </div>
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
                    <div className="relative h-32 w-32 sm:h-40 sm:w-40">
                      {(() => {
                        const total = activityTotal;
                        const circumference = 2 * Math.PI * 40;
                        const studentPercent = total > 0 ? (activityCounts.student / total) : 0;
                        const businessPercent = total > 0 ? (activityCounts.business / total) : 0;
                        const studentDash = circumference * studentPercent;
                        const businessDash = circumference * businessPercent;
                        
                        return (
                          <>
                            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="#e2e8f0"
                                strokeWidth="20"
                              />
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="20"
                                strokeDasharray={`${studentDash} ${circumference}`}
                                strokeLinecap="round"
                                className="transition-all duration-500 hover:stroke-[22]"
                              />
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="20"
                                strokeDasharray={`${businessDash} ${circumference}`}
                                strokeDashoffset={-studentDash}
                                strokeLinecap="round"
                                className="transition-all duration-500 hover:stroke-[22]"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-2xl font-bold text-slate-900">{total}</span>
                              <span className="text-xs text-slate-600">Total</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                          <span className="text-slate-700">Students</span>
                        </div>
                        <span className="font-semibold text-slate-900">
                          {activityCounts.student} ({Math.round((activityCounts.student / Math.max(activityTotal, 1)) * 100)}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-green-500"></div>
                          <span className="text-slate-700">Business</span>
                        </div>
                        <span className="font-semibold text-slate-900">
                          {activityCounts.business} ({Math.round((activityCounts.business / Math.max(activityTotal, 1)) * 100)}%)
                        </span>
                      </div>
                      <div className="pt-2 text-xs text-slate-500">
                        Most active: <span className="font-semibold text-slate-700">{mostActiveTeam}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:p-6">
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">System Health (Last 3 Days)</h3>
                  <div className="space-y-3">
                    {systemHealth.trend.length > 0 ? systemHealth.trend.map((day) => (
                      <div key={day.label} className="flex items-center gap-3">
                        <span className="w-16 text-xs font-medium text-slate-600">{day.label}</span>
                        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full ${day.score >= 90 ? "bg-green-500" : day.score >= 70 ? "bg-amber-500" : "bg-red-500"}`}
                            style={{ width: `${Math.min(Math.max(day.score, 0), 100)}%` }}
                          ></div>
                        </div>
                        <span className="w-12 text-right text-xs font-semibold text-slate-900">{day.score}%</span>
                      </div>
                    )) : (
                      <div className="flex h-24 items-center justify-center text-sm text-slate-500">
                        No system health data yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "students" && (
            <div className="space-y-6">
              {/* Search and Filter Bar */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 gap-3">
                  <div className="relative flex-1 max-w-md">
                    <input
                      type="text"
                      placeholder="Search students by name or email..."
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
                  </div>
                  <select
                    value={studentStatusFilter}
                    onChange={(e) => setStudentStatusFilter(e.target.value as "all" | "active" | "inactive")}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <button
                  onClick={handleOpenAddUser}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  + Add Student
                </button>
              </div>

              {/* Summary Stats */}
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Active Students", value: loading ? "..." : (students?.filter(s => s.status === "Active").length || 0).toString(), color: "green" },
                  { label: "Inactive", value: loading ? "..." : (students?.filter(s => s.status !== "Active").length || 0).toString(), color: "gray" },
                  { label: "Total Students", value: loading ? "..." : (students?.length || 0).toString(), color: "blue" }
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                    <p className="text-sm text-slate-600">{stat.label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                <div className="border-b border-slate-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-900">Student List</h4>
                    <button
                      onClick={handleExportStudentsCsv}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Export CSV
                    </button>
                  </div>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                      <p className="mt-2 text-sm text-slate-600">Loading students...</p>
                    </div>
                  </div>
                ) : (students?.length || 0) === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <p className="text-slate-600">No students found</p>
                      <p className="mt-1 text-sm text-slate-500">Add your first student to get started</p>
                    </div>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <p className="text-slate-600">No matching students</p>
                      <p className="mt-1 text-sm text-slate-500">Try a different search or filter.</p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          {["Name", "Username", "Email", "Phone", "Status", "Joined", "Actions"].map((h) => (
                            <th key={h} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 lg:px-6">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredStudents.map((student) => (
                          <tr key={student._id} className="hover:bg-slate-50">
                            <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-slate-900 lg:px-6">
                              {student.name}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 lg:px-6">
                              {student.username}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 lg:px-6">
                              <span className="hidden sm:inline">{student.email}</span>
                              <span className="sm:hidden">{student.email.split('@')[0]}</span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 lg:px-6">
                              {student.phone || "—"}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 lg:px-6">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold lg:px-2.5 ${
                                student.status === "Active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}>
                                {student.status}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 lg:px-6">
                              <span className="hidden lg:inline">{new Date(student.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                              <span className="lg:hidden">{new Date(student.createdAt).toLocaleDateString('en-US', { month: 'short' })}</span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 lg:px-6">
                              <div className="flex items-center gap-1 lg:gap-2">
                                <button
                                  onClick={() => handleEditUser(student)}
                                  className="group relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-700"
                                  title="Edit"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
                                    Edit
                                  </span>
                                </button>
                                <button
                                  onClick={() => handleResetPassword(student._id)}
                                  className="group relative rounded-lg p-2 text-purple-600 transition hover:bg-purple-50 hover:text-purple-700"
                                  title="Reset Password"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
                                    Reset Password
                                  </span>
                                </button>
                                <button
                                  onClick={() => handleToggleUserStatus(student)}
                                  className={`group relative rounded-lg p-2 transition ${
                                    (student.status || "Active") === "Active"
                                      ? "text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                                      : "text-green-600 hover:bg-green-50 hover:text-green-700"
                                  }`}
                                  title={(student.status || "Active") === "Active" ? "Deactivate" : "Activate"}
                                >
                                  {(student.status || "Active") === "Active" ? (
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-1.414 1.414A7.98 7.98 0 0119 12a7.98 7.98 0 01-2.05 5.364l1.414 1.414A9.958 9.958 0 0021 12a9.958 9.958 0 00-2.636-6.364zM5.636 5.636A9.958 9.958 0 003 12c0 2.485.905 4.758 2.404 6.5l1.414-1.414A7.98 7.98 0 015 12c0-2.207.894-4.207 2.343-5.657L5.636 5.636z" />
                                    </svg>
                                  ) : (
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m-9 8h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  )}
                                  <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
                                    {(student.status || "Active") === "Active" ? "Deactivate" : "Activate"}
                                  </span>
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(student._id, student.name)}
                                  className="group relative rounded-lg p-2 text-red-600 transition hover:bg-red-50 hover:text-red-700"
                                  title="Delete"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
                                    Delete
                                  </span>
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

          {activeSection === "business" && (
            <div className="space-y-6">
              {/* Search and Filter Bar */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 gap-3">
                  <div className="relative flex-1 max-w-md">
                    <input
                      type="text"
                      placeholder="Search business accounts..."
                      value={businessSearchTerm}
                      onChange={(e) => setBusinessSearchTerm(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
                  </div>
                  <select
                    value={businessStatusFilter}
                    onChange={(e) => setBusinessStatusFilter(e.target.value as "all" | "active" | "inactive")}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <button
                  onClick={handleOpenAddBusiness}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  + Add Business
                </button>
              </div>

              {/* Summary Stats */}
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Active Businesses", value: loading ? "..." : (businessUsers?.filter(b => b.status === "Active").length || 0).toString(), color: "green" },
                  { label: "Total Businesses", value: loading ? "..." : (businessUsers?.length || 0).toString(), color: "blue" },
                  { label: "Inactive Businesses", value: loading ? "..." : (businessUsers?.filter(b => b.status !== "Active").length || 0).toString(), color: "purple" }
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                    <p className="text-sm text-slate-600">{stat.label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                <div className="border-b border-slate-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-900">Business Accounts</h4>
                    <button
                      onClick={handleExportBusinessesCsv}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Export CSV
                    </button>
                  </div>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                      <p className="mt-2 text-sm text-slate-600">Loading business users...</p>
                    </div>
                  </div>
                ) : (businessUsers?.length || 0) === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <p className="text-slate-600">No business users found</p>
                      <p className="mt-1 text-sm text-slate-500">Add your first business user to get started</p>
                    </div>
                  </div>
                ) : filteredBusinesses.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <p className="text-slate-600">No matching businesses</p>
                      <p className="mt-1 text-sm text-slate-500">Try a different search or filter.</p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          {["Business Name", "Username", "Email", "Phone", "Joined", "Status", "Actions"].map((h) => (
                            <th key={h} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 lg:px-6">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredBusinesses.map((biz) => (
                          <tr key={biz._id} className="hover:bg-slate-50">
                            <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-slate-900 lg:px-6">
                              {biz.name}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 lg:px-6">
                              {biz.username}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 lg:px-6">
                              <span className="hidden sm:inline">{biz.email}</span>
                              <span className="sm:hidden">{biz.email.split('@')[0]}</span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 lg:px-6">
                              {biz.phone || "—"}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 lg:px-6">
                              <span className="hidden lg:inline">{new Date(biz.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                              <span className="lg:hidden">{new Date(biz.createdAt).toLocaleDateString('en-US', { month: 'short' })}</span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 lg:px-6">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold lg:px-2.5 ${
                                biz.status === "Active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}>
                                {biz.status}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 lg:px-6">
                              <div className="flex items-center gap-1 lg:gap-2">
                                <button
                                  onClick={() => handleEditUser(biz)}
                                  className="group relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-700"
                                  title="Edit"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
                                    Edit
                                  </span>
                                </button>
                                <button
                                  onClick={() => handleResetPassword(biz._id)}
                                  className="group relative rounded-lg p-2 text-purple-600 transition hover:bg-purple-50 hover:text-purple-700"
                                  title="Reset Password"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
                                    Reset Password
                                  </span>
                                </button>
                                <button
                                  onClick={() => handleToggleUserStatus(biz)}
                                  className={`group relative rounded-lg p-2 transition ${
                                    (biz.status || "Active") === "Active"
                                      ? "text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                                      : "text-green-600 hover:bg-green-50 hover:text-green-700"
                                  }`}
                                  title={(biz.status || "Active") === "Active" ? "Deactivate" : "Activate"}
                                >
                                  {(biz.status || "Active") === "Active" ? (
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-1.414 1.414A7.98 7.98 0 0119 12a7.98 7.98 0 01-2.05 5.364l1.414 1.414A9.958 9.958 0 0021 12a9.958 9.958 0 00-2.636-6.364zM5.636 5.636A9.958 9.958 0 003 12c0 2.485.905 4.758 2.404 6.5l1.414-1.414A7.98 7.98 0 015 12c0-2.207.894-4.207 2.343-5.657L5.636 5.636z" />
                                    </svg>
                                  ) : (
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m-9 8h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  )}
                                  <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
                                    {(biz.status || "Active") === "Active" ? "Deactivate" : "Activate"}
                                  </span>
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(biz._id, biz.name)}
                                  className="group relative rounded-lg p-2 text-red-600 transition hover:bg-red-50 hover:text-red-700"
                                  title="Delete"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
                                    Delete
                                  </span>
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

          {activeSection === "announcements" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold text-slate-900">System Announcements</h3>
                <button
                  onClick={handleOpenAnnouncementModal}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  + New Announcement
                </button>
              </div>

              <div className="space-y-4">
                {announcementsLoading ? (
                  <div className="rounded-xl bg-white p-6 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
                    Loading announcements...
                  </div>
                ) : (announcements?.length || 0) === 0 ? (
                  <div className="rounded-xl bg-white p-6 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
                    No announcements yet.
                  </div>
                ) : (
                  announcements.map((announcement) => (
                    <div key={announcement._id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-slate-900">{announcement.title}</h4>
                          <p className="mt-1 text-base text-slate-600">{announcement.body}</p>
                          <p className="mt-2 text-xs text-slate-500">
                            {new Date(announcement.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            Audience: {announcement.audience?.includes("student") ? "Students" : ""}{announcement.audience?.includes("student") && announcement.audience?.includes("business") ? ", " : ""}{announcement.audience?.includes("business") ? "Business" : ""}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditAnnouncement(announcement)}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAnnouncement(announcement._id)}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeSection === "tasks" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Tasks</h3>
                  <p className="text-sm text-slate-600">Handle user requests and admin follow-ups.</p>
                </div>
                <button
                  onClick={() => fetchTasks()}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Refresh
                </button>
              </div>

              {tasksLoading ? (
                <div className="rounded-xl bg-white p-6 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
                  Loading tasks...
                </div>
              ) : tasks.length === 0 ? (
                <div className="rounded-xl bg-white p-6 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
                  No tasks right now.
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div key={task._id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <h4 className="text-base font-semibold text-slate-900">{task.title}</h4>
                          {task.details && <p className="mt-1 text-sm text-slate-600">{task.details}</p>}
                          <p className="mt-2 text-xs text-slate-500">Created {new Date(task.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              task.status === "done"
                                ? "bg-emerald-100 text-emerald-700"
                                : task.status === "overdue"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {task.status}
                          </span>
                          {task.status !== "done" && (
                            <button
                              onClick={() => handleUpdateTaskStatus(task._id, "done")}
                              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              Mark done
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === "timetable" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Admin Timetable</h3>
                  <p className="text-sm text-slate-600">Manage reminders and schedules</p>
                </div>
              </div>

              <div ref={reminderSectionRef} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <h4 className="font-semibold text-slate-900">Reminder Calendar</h4>
                <p className="mt-1 text-sm text-slate-600">Schedule reminders for important tasks and deadlines.</p>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2 space-y-3">
                    <div>
                      <label className="text-sm text-slate-600">Title</label>
                      <input
                        type="text"
                        value={reminderForm.title}
                        onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })}
                        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="e.g. Review timetable updates"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-600">Date & Time</label>
                      <input
                        type="datetime-local"
                        value={reminderForm.dueAt}
                        onChange={(e) => setReminderForm({ ...reminderForm, dueAt: e.target.value })}
                        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-600">Notes</label>
                      <textarea
                        rows={3}
                        value={reminderForm.note}
                        onChange={(e) => setReminderForm({ ...reminderForm, note: e.target.value })}
                        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="Optional details"
                      />
                    </div>
                    <button
                      onClick={handleAddReminder}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Save Reminder
                    </button>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <h5 className="text-sm font-semibold text-slate-900">Upcoming</h5>
                    <div className="mt-3 space-y-3">
                      {reminders.length === 0 ? (
                        <p className="text-xs text-slate-500">No reminders yet.</p>
                      ) : (
                        reminders
                          .slice()
                          .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
                          .map((reminder) => (
                            <div key={reminder.id} className="rounded-lg bg-white p-3 text-xs shadow-sm ring-1 ring-slate-200">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className={`font-semibold ${reminder.completed ? "text-slate-400 line-through" : "text-slate-900"}`}>
                                    {reminder.title}
                                  </p>
                                  <p className="text-slate-500">
                                    {reminder.dueAt ? new Date(reminder.dueAt).toLocaleString() : ""}
                                  </p>
                                  {reminder.note && <p className="mt-1 text-slate-500">{reminder.note}</p>}
                                </div>
                                <div className="flex flex-col gap-2">
                                  <button
                                    onClick={() => handleToggleReminder(reminder.id)}
                                    className="rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-200"
                                  >
                                    {reminder.completed ? "Reopen" : "Done"}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteReminder(reminder.id)}
                                    className="rounded bg-red-100 px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-200"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                              {new Date(reminder.dueAt) <= new Date() && !reminder.completed && (
                                <p className="mt-2 text-[10px] font-semibold text-amber-600">Due now</p>
                              )}
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => {
                  const dayDate = new Date();
                  dayDate.setHours(0, 0, 0, 0);
                  dayDate.setDate(dayDate.getDate() + index);
                  const nextDay = new Date(dayDate);
                  nextDay.setDate(nextDay.getDate() + 1);
                  const dayLabel = dayDate.toLocaleDateString("en-US", { weekday: "long" });
                  const dateLabel = dayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  const dayReminders = reminders.filter((reminder) => {
                    if (!reminder.dueAt) return false;
                    const due = new Date(reminder.dueAt);
                    return due >= dayDate && due < nextDay;
                  });
                  const pendingCount = dayReminders.filter((r) => !r.completed).length;
                  return (
                    <div key={dayDate.toISOString()} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-slate-900">{dayLabel}</h4>
                        <span className="text-xs text-slate-500">{dateLabel}</span>
                      </div>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Reminders</span>
                          <span className="font-semibold text-slate-900">{dayReminders.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Pending</span>
                          <span className="font-semibold text-slate-900">{pendingCount}</span>
                        </div>
                      </div>
                      <button
                        onClick={scrollToReminders}
                        className="mt-4 w-full rounded-lg border border-blue-200 bg-blue-50 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                      >
                        View Reminders
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeSection === "reports" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Reports</h3>
                  <p className="text-sm text-slate-600">Administrative oversight, performance tracking, and audit support.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleExportReportsPdf}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Export PDF
                  </button>
                  <button
                    onClick={handleExportReportsExcel}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Export Excel
                  </button>
                  <button
                    onClick={handlePrintReports}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Print report
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Start date</label>
                    <input
                      type="date"
                      value={reportFilters.startDate}
                      onChange={(e) => setReportFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">End date</label>
                    <input
                      type="date"
                      value={reportFilters.endDate}
                      onChange={(e) => setReportFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Role</label>
                    <select
                      value={reportFilters.role}
                      onChange={(e) => setReportFilters((prev) => ({ ...prev, role: e.target.value }))}
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="all">All roles</option>
                      <option value="student">Student</option>
                      <option value="business">Business</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Status</label>
                    <select
                      value={reportFilters.status}
                      onChange={(e) => setReportFilters((prev) => ({ ...prev, status: e.target.value }))}
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="all">All statuses</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Search</label>
                    <input
                      type="text"
                      value={reportFilters.search}
                      onChange={(e) => setReportFilters((prev) => ({ ...prev, search: e.target.value }))}
                      placeholder="Search users"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              {!reportSummary ? (
                <div className="rounded-xl bg-white p-6 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
                  Loading reports...
                </div>
              ) : (
                <div className="space-y-6">
                  {reportLoading && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
                      Updating reports...
                    </div>
                  )}
                  <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-base font-semibold text-slate-900">User Management Report</h4>
                        <p className="text-sm text-slate-600">System usage and access control</p>
                      </div>
                      <span className="text-xs text-slate-500">Filters apply to counts</span>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        { label: "Total Users", value: reportSummary.users.total },
                        { label: "Active Users", value: reportSummary.users.byStatus.Active || 0 },
                        { label: "Inactive Users", value: reportSummary.users.byStatus.Inactive || 0 },
                        { label: "New Registrations", value: reportSummary.users.newRegistrations }
                      ].map((card) => (
                        <div key={card.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold text-slate-600">{card.label}</p>
                          <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 grid gap-6 lg:grid-cols-2">
                      <div>
                        <h5 className="text-sm font-semibold text-slate-800">Users by role</h5>
                        <div className="mt-3 space-y-3">
                          {Object.entries(reportSummary.users.byRole).map(([role, count]) => (
                            <div key={role}>
                              <div className="flex items-center justify-between text-xs text-slate-600">
                                <span className="capitalize">{role}</span>
                                <span>{count}</span>
                              </div>
                              <div className="mt-2 h-2 rounded-full bg-slate-100">
                                <div
                                  className="h-2 rounded-full bg-blue-600"
                                  style={{ width: getBarWidth(count, reportUserRoleMax) }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="text-sm font-semibold text-slate-800">Active vs inactive</h5>
                        <div className="mt-4 flex items-center gap-4">
                          <div
                            className="h-24 w-24 rounded-full"
                            style={{ background: buildPieGradient({
                              Active: reportSummary.users.byStatus.Active || 0,
                              Inactive: reportSummary.users.byStatus.Inactive || 0
                            }, ["#10b981", "#f59e0b"]) }}
                          />
                          <div className="space-y-2 text-xs text-slate-600">
                            <div className="flex items-center gap-2">
                              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#10b981" }} />
                              <span>Active</span>
                              <span className="text-slate-500">({reportSummary.users.byStatus.Active || 0})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                              <span>Inactive</span>
                              <span className="text-slate-500">({reportSummary.users.byStatus.Inactive || 0})</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-base font-semibold text-slate-900">Activity & Audit Report</h4>
                        <p className="text-sm text-slate-600">Security and traceability</p>
                      </div>
                      <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-600">Start date</label>
                          <input
                            type="date"
                            value={reportFilters.activityStartDate}
                            onChange={(e) => setReportFilters((prev) => ({ ...prev, activityStartDate: e.target.value }))}
                            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600">End date</label>
                          <input
                            type="date"
                            value={reportFilters.activityEndDate}
                            onChange={(e) => setReportFilters((prev) => ({ ...prev, activityEndDate: e.target.value }))}
                            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600">Activity user</label>
                          <select
                            value={reportFilters.activityUserId}
                            onChange={(e) => setReportFilters((prev) => ({ ...prev, activityUserId: e.target.value }))}
                            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                          >
                            <option value="all">All users</option>
                            {[...students, ...businessUsers]
                              .filter((user) => user && user._id)
                              .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                              .map((user) => (
                                <option key={user._id} value={user._id}>
                                  {user.name || user.username} ({user.role})
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        { label: "Login History", value: reportSummary.activity.logins },
                        { label: "Admin Actions", value: reportSummary.activity.adminActions },
                        { label: "Failed Logins", value: reportSummary.activity.failedLogins }
                      ].map((card) => (
                        <div key={card.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold text-slate-600">{card.label}</p>
                          <p className="mt-2 text-xl font-bold text-slate-900">{card.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6">
                      <h5 className="text-sm font-semibold text-slate-800">Logins by role</h5>
                      <div className="mt-3 space-y-3">
                        {Object.entries(reportSummary.activity.loginsByRole).map(([role, count]) => (
                          <div key={role}>
                            <div className="flex items-center justify-between text-xs text-slate-600">
                              <span className="capitalize">{role}</span>
                              <span>{count}</span>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-slate-100">
                              <div
                                className="h-2 rounded-full bg-indigo-500"
                                style={{ width: getBarWidth(count, reportSummary.activity.logins || 0) }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-base font-semibold text-slate-900">Sessions Report</h4>
                        <p className="text-sm text-slate-600">Session duration tracking and filters</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-600">Session start</label>
                        <input
                          type="date"
                          value={reportFilters.sessionStartDate}
                          onChange={(e) => setReportFilters((prev) => ({ ...prev, sessionStartDate: e.target.value }))}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600">Session end</label>
                        <input
                          type="date"
                          value={reportFilters.sessionEndDate}
                          onChange={(e) => setReportFilters((prev) => ({ ...prev, sessionEndDate: e.target.value }))}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600">Session user</label>
                        <select
                          value={reportFilters.sessionUserId}
                          onChange={(e) => setReportFilters((prev) => ({ ...prev, sessionUserId: e.target.value }))}
                          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        >
                          <option value="all">All users</option>
                          {[...students, ...businessUsers]
                            .filter((user) => user && user._id)
                            .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                            .map((user) => (
                              <option key={user._id} value={user._id}>
                                {user.name || user.username} ({user.role})
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {(() => {
                        const sessions = reportSummary.sessions || { count: 0, avgDurationMinutes: null };
                        return [
                          { label: "Sessions Logged", value: sessions.count },
                          { label: "Average Duration", value: sessions.avgDurationMinutes ? `${sessions.avgDurationMinutes} min` : "Not tracked" }
                        ].map((card) => (
                        <div key={card.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold text-slate-600">{card.label}</p>
                          <p className="mt-2 text-xl font-bold text-slate-900">{card.value}</p>
                        </div>
                        ));
                      })()}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                    <div className="border-b border-slate-200 px-6 py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h4 className="font-semibold text-slate-900">Audit Logs</h4>
                        <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-3">
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500">Start</label>
                            <input
                              type="date"
                              value={reportFilters.activityStartDate}
                              onChange={(e) => setReportFilters((prev) => ({ ...prev, activityStartDate: e.target.value }))}
                              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500">End</label>
                            <input
                              type="date"
                              value={reportFilters.activityEndDate}
                              onChange={(e) => setReportFilters((prev) => ({ ...prev, activityEndDate: e.target.value }))}
                              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500">User</label>
                            <select
                              value={reportFilters.activityUserId}
                              onChange={(e) => setReportFilters((prev) => ({ ...prev, activityUserId: e.target.value }))}
                              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                            >
                              <option value="all">All users</option>
                              {[...students, ...businessUsers]
                                .filter((user) => user && user._id)
                                .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                                .map((user) => (
                                  <option key={user._id} value={user._id}>
                                    {user.name || user.username} ({user.role})
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {reportSummary.auditLogs.length === 0 ? (
                        <div className="px-6 py-6 text-sm text-slate-600">No audit logs for this period.</div>
                      ) : (
                        reportSummary.auditLogs.map((log) => (
                          <button
                            key={log._id}
                            type="button"
                            onClick={() => setSelectedAuditLog(log)}
                            className="flex w-full flex-col gap-2 px-6 py-4 text-left hover:bg-slate-50 sm:flex-row sm:items-start sm:justify-between"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-slate-900">{log.action}</p>
                              {log.actorName && <p className="mt-1 text-xs text-slate-600">User: {log.actorName}</p>}
                              {log.details && <p className="mt-1 text-xs text-slate-600">{log.details}</p>}
                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                                {log.actorRole && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">Actor: {log.actorRole}</span>}
                                {log.targetRole && <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">Target: {log.targetRole}</span>}
                              </div>
                            </div>
                            <div className="text-xs text-slate-500">
                              {new Date(log.createdAt).toLocaleString()}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === "settings" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">System Settings</h3>
                  <p className="text-sm text-slate-600">Manage admin profile, password, and time format</p>
                </div>
                {isEditingSettings ? (
                  <button
                    onClick={handleSaveAdminSettings}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                ) : (
                  <button
                    onClick={handleEditAdminSettings}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                )}
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <h4 className="font-semibold text-slate-900">Admin Profile</h4>
                  {isEditingSettings ? (
                    <div className="mt-4 space-y-4 text-sm">
                      <div>
                        <label className="text-slate-600">Username</label>
                        <input
                          type="text"
                          value={adminSettings.username}
                          onChange={(e) => setAdminSettings({ ...adminSettings, username: e.target.value })}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div>
                        <label className="text-slate-600">Full Name</label>
                        <input
                          type="text"
                          value={adminSettings.name}
                          onChange={(e) => {
                            setAdminSettings({ ...adminSettings, name: e.target.value });
                            setSettingsErrors((prev) => ({ ...prev, name: "" }));
                          }}
                          className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                            settingsErrors.name ? "border-red-400" : "border-slate-300"
                          }`}
                        />
                        {settingsErrors.name && (
                          <p className="mt-1 text-xs text-red-600">{settingsErrors.name}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-slate-600">Email</label>
                        <input
                          type="email"
                          value={adminSettings.email}
                          onChange={(e) => {
                            setAdminSettings({ ...adminSettings, email: e.target.value });
                            setSettingsErrors((prev) => ({ ...prev, email: "" }));
                          }}
                          className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                            settingsErrors.email ? "border-red-400" : "border-slate-300"
                          }`}
                        />
                        {settingsErrors.email && (
                          <p className="mt-1 text-xs text-red-600">{settingsErrors.email}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-slate-600">Role</label>
                        <input
                          type="text"
                          value="Administrator"
                          readOnly
                          className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2 text-sm">
                      <p className="text-slate-700"><span className="font-semibold text-slate-900">Username:</span> {adminSettings.username || "—"}</p>
                      <p className="text-slate-700"><span className="font-semibold text-slate-900">Name:</span> {adminSettings.name || "—"}</p>
                      <p className="text-slate-700"><span className="font-semibold text-slate-900">Email:</span> {adminSettings.email || "—"}</p>
                      <p className="text-slate-700"><span className="font-semibold text-slate-900">Role:</span> Administrator</p>
                    </div>
                  )}
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
                        onClick={handleUpdateAdminPassword}
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
                <p className="mt-1 text-sm text-slate-600">Choose how time is displayed across the dashboard</p>
                {isEditingSettings ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        name="timeFormat"
                        checked={adminSettings.timeFormat === "24"}
                        onChange={() => setAdminSettings({ ...adminSettings, timeFormat: "24" })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      24-hour
                    </label>
                    <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        name="timeFormat"
                        checked={adminSettings.timeFormat === "12"}
                        onChange={() => setAdminSettings({ ...adminSettings, timeFormat: "12" })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      12-hour
                    </label>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-700">
                    Current format: {adminSettings.timeFormat === "12" ? "12-hour" : "24-hour"}
                  </p>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
