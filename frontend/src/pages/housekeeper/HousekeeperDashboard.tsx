import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ElementType,
} from "react";

import {
  Activity,
  ArrowUpRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Home,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  SprayCan,
  UserRound,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

import {
  getMyAttendance,
  checkInSelf,
  checkOutSelf,
  type AttendanceRecord,
} from "../../services/attendanceApi";

import {
  getMyWorkTasks,
  type WorkTask,
} from "../../services/workTaskApi";

// =====================================================
// TYPES
// =====================================================

type Tone =
  | "blue"
  | "emerald"
  | "violet"
  | "amber";

type Metric = {
  label: string;
  value: string;
  helper: string;
  icon: ElementType;
  tone: Tone;
  path?: string;
};

// =====================================================
// CONSTANTS
// =====================================================

const TONE_STYLES: Record<
  Tone,
  {
    icon: string;
    value: string;
    glow: string;
  }
> = {
  blue: {
    icon: "bg-blue-50 text-blue-600",
    value: "text-blue-700",
    glow: "bg-blue-500/5",
  },

  emerald: {
    icon: "bg-emerald-50 text-emerald-600",
    value: "text-emerald-700",
    glow: "bg-emerald-500/5",
  },

  violet: {
    icon: "bg-violet-50 text-violet-600",
    value: "text-violet-700",
    glow: "bg-violet-500/5",
  },

  amber: {
    icon: "bg-amber-50 text-amber-600",
    value: "text-amber-700",
    glow: "bg-amber-500/5",
  },
};

// =====================================================
// HELPERS
// =====================================================

function formatTime(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}


function getInitials(name?: string) {
  return (
    (name || "Housekeeper")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(
        (part) =>
          part[0]?.toUpperCase() ?? "",
      )
      .join("") || "H"
  );
}

function getTaskStatusMeta(
  status: WorkTask["status"],
) {
  switch (status) {
    case "Completed":
      return {
        dot: "bg-emerald-500",
        badge:
          "bg-emerald-50 text-emerald-700 ring-emerald-200",
      };

    case "In Progress":
      return {
        dot: "bg-blue-500",
        badge:
          "bg-blue-50 text-blue-700 ring-blue-200",
      };

    case "Overdue":
      return {
        dot: "bg-red-500",
        badge:
          "bg-red-50 text-red-700 ring-red-200",
      };

    case "Cancelled":
      return {
        dot: "bg-slate-400",
        badge:
          "bg-slate-100 text-slate-500 ring-slate-200",
      };

    default:
      return {
        dot: "bg-amber-500",
        badge:
          "bg-amber-50 text-amber-700 ring-amber-200",
      };
  }
}

function getTaskPriorityMeta(
  priority: WorkTask["priority"],
) {
  switch (priority) {
    case "Urgent":
      return "text-red-600";

    case "High":
      return "text-orange-600";

    case "Medium":
      return "text-blue-600";

    default:
      return "text-slate-500";
  }
}

// =====================================================
// HOUSEKEEPER DASHBOARD
// =====================================================

export default function HousekeeperDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ===================================================
  // DATA
  // ===================================================

  const [attendance, setAttendance] =
    useState<AttendanceRecord | null>(null);

  const [workTasks, setWorkTasks] =
    useState<WorkTask[]>([]);

  // ===================================================
  // LOADING
  // ===================================================

  const [attendanceLoading, setAttendanceLoading] =
    useState(true);

  const [taskLoading, setTaskLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [attendanceActionLoading, setAttendanceActionLoading] =
    useState(false);

  // ===================================================
  // ERRORS
  // ===================================================

  const [attendanceError, setAttendanceError] =
    useState("");

  const [taskError, setTaskError] =
    useState("");

  // ===================================================
  // LOAD ATTENDANCE
  // ===================================================

  const loadAttendance = useCallback(
    async () => {
      try {
        setAttendanceLoading(true);
        setAttendanceError("");

        const response =
          await getMyAttendance();

        setAttendance(response);
      } catch (err) {
        const status = (
          err as {
            response?: {
              status?: number;
            };
          }
        ).response?.status;

        if (status === 404) {
          setAttendance(null);
          setAttendanceError("");
        } else {
          console.error(
            "Housekeeper attendance loading error:",
            err,
          );

          setAttendanceError(
            "Unable to load today's attendance.",
          );
        }
      } finally {
        setAttendanceLoading(false);
      }
    },
    [],
  );

  // ===================================================
  // LOAD WORK
  // ===================================================

  const loadTasks = useCallback(
    async () => {
      try {
        setTaskLoading(true);
        setTaskError("");

        const response =
          await getMyWorkTasks();

        setWorkTasks(
          Array.isArray(response)
            ? response
            : [],
        );
      } catch (err) {
        console.error(
          "Housekeeper work task loading error:",
          err,
        );

        setTaskError(
          "Unable to load your assigned work.",
        );
      } finally {
        setTaskLoading(false);
      }
    },
    [],
  );

  // ===================================================
  // INITIAL LOAD
  // ===================================================

  useEffect(() => {
    void loadAttendance();
    void loadTasks();
  }, [
    loadAttendance,
    loadTasks,
  ]);

  // ===================================================
  // REFRESH
  // ===================================================

  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      await Promise.all([
        loadAttendance(),
        loadTasks(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // ===================================================
  // CHECK IN
  // ===================================================

  const handleCheckIn = async () => {
    try {
      setAttendanceActionLoading(true);
      setAttendanceError("");

      const response =
        await checkInSelf();

      setAttendance(response);
    } catch (err) {
      const detail = (
        err as {
          response?: {
            data?: {
              detail?: string;
            };
          };
        }
      ).response?.data?.detail;

      setAttendanceError(
        detail ||
          "Unable to check in. Please try again.",
      );
    } finally {
      setAttendanceActionLoading(false);
    }
  };

  // ===================================================
  // CHECK OUT
  // ===================================================

  const handleCheckOut = async () => {
    try {
      setAttendanceActionLoading(true);
      setAttendanceError("");

      const response =
        await checkOutSelf();

      setAttendance(response);
    } catch (err) {
      const detail = (
        err as {
          response?: {
            data?: {
              detail?: string;
            };
          };
        }
      ).response?.data?.detail;

      setAttendanceError(
        detail ||
          "Unable to check out. Please try again.",
      );
    } finally {
      setAttendanceActionLoading(false);
    }
  };

  // ===================================================
  // ATTENDANCE STATE
  // ===================================================

  const isCheckedIn = Boolean(
    attendance?.check_in &&
      !attendance?.check_out,
  );

  const isCheckedOut = Boolean(
    attendance?.check_in &&
      attendance?.check_out,
  );

  // ===================================================
  // TASK SUMMARY
  // ===================================================

  const taskSummary = useMemo(() => {
    const pending = workTasks.filter(
      (task) =>
        task.status === "Pending",
    ).length;

    const inProgress = workTasks.filter(
      (task) =>
        task.status === "In Progress",
    ).length;

    const overdue = workTasks.filter(
      (task) =>
        task.status === "Overdue",
    ).length;

    const completed = workTasks.filter(
      (task) =>
        task.status === "Completed",
    ).length;

    return {
      pending,
      inProgress,
      overdue,
      completed,
      total: workTasks.length,
    };
  }, [workTasks]);

  // ===================================================
  // ACTIVE TASKS
  // ===================================================

  const visibleTasks = useMemo(
    () =>
      [...workTasks]
        .filter(
          (task) =>
            task.status !== "Completed" &&
            task.status !== "Cancelled",
        )
        .sort((a, b) => {
          const priorityRank: Record<
            WorkTask["priority"],
            number
          > = {
            Urgent: 0,
            High: 1,
            Medium: 2,
            Low: 3,
          };

          const priorityDifference =
            priorityRank[a.priority] -
            priorityRank[b.priority];

          if (
            priorityDifference !== 0
          ) {
            return priorityDifference;
          }

          const aDue = a.due_at
            ? new Date(
                a.due_at,
              ).getTime()
            : Number.MAX_SAFE_INTEGER;

          const bDue = b.due_at
            ? new Date(
                b.due_at,
              ).getTime()
            : Number.MAX_SAFE_INTEGER;

          return aDue - bDue;
        })
        .slice(0, 6),
    [workTasks],
  );

  // ===================================================
  // TODAY
  // ===================================================

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(
        "en-IN",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        },
      ).format(new Date()),
    [],
  );

  // ===================================================
  // USER
  // ===================================================

  const housekeeperName =
    user?.full_name ||
    "Housekeeper";

  const firstName =
    housekeeperName
      .split(" ")
      .slice(0, 2)
      .join(" ");

  
  
  // ===================================================
  // METRICS
  // ===================================================

  const metrics: Metric[] = [
    {
      label: "Assigned Work",
      value: taskLoading
        ? "—"
        : String(
            taskSummary.total,
          ),
      helper:
        taskSummary.overdue > 0
          ? `${taskSummary.overdue} overdue`
          : `${taskSummary.inProgress} in progress`,
      icon: ClipboardList,
      tone: "blue",
      path: "/work-management",
    },

    {
      label: "Pending Tasks",
      value: taskLoading
        ? "—"
        : String(
            taskSummary.pending,
          ),
      helper:
        "Tasks waiting to be started",
      icon: Clock3,
      tone: "amber",
      path: "/work-management",
    },

    {
      label: "In Progress",
      value: taskLoading
        ? "—"
        : String(
            taskSummary.inProgress,
          ),
      helper:
        "Tasks currently being handled",
      icon: Activity,
      tone: "violet",
      path: "/work-management",
    },

    {
      label: "Completed",
      value: taskLoading
        ? "—"
        : String(
            taskSummary.completed,
          ),
      helper:
        "Completed assigned tasks",
      icon: CheckCircle2,
      tone: "emerald",
      path: "/work-management",
    },
  ];

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f5f7fb]">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="shrink-0 border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-5 px-5 py-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between lg:px-8">

          {/* IDENTITY */}

          <div className="min-w-0">

            <div className="flex items-center gap-2">

              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <SprayCan size={15} />
              </span>

              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
                Housekeeping · Hospital Operations
              </span>

            </div>

            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-[30px]">
                Housekeeper Dashboard
              </h1>

              <span className="text-sm font-semibold text-slate-400">
                {housekeeperName}
              </span>

            </div>

            <p className="mt-1 text-sm text-slate-500">
              Your housekeeping workspace for
              assigned work, shift attendance
              and daily operational responsibilities.
            </p>

          </div>

          {/* HEADER ACTIONS */}

          <div className="flex items-center gap-2">

            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm sm:flex">

              <CalendarDays
                size={15}
                className="text-emerald-600"
              />

              <div className="leading-tight">

                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Today
                </p>

                <p className="mt-1 text-xs font-bold text-slate-700">
                  {todayLabel}
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                void handleRefresh()
              }
              disabled={
                refreshing ||
                attendanceActionLoading
              }
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Refresh dashboard"
            >

              {refreshing ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <RefreshCw size={16} />
              )}

              <span className="hidden sm:inline">
                Refresh
              </span>

            </button>

          </div>

        </div>
      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="min-h-0 flex-1 overflow-y-auto">

        <div className="mx-auto w-full max-w-[1680px] space-y-5 p-4 sm:p-6 lg:p-8">

          {/* =================================================
              ATTENDANCE ERROR
          ================================================= */}

          {attendanceError && (
            <AlertBar
              message={attendanceError}
              onRetry={() =>
                void loadAttendance()
              }
            />
          )}

          {/* =================================================
              WELCOME / ATTENDANCE
          ================================================= */}

          <section className="relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-r from-emerald-50 via-white to-blue-50 shadow-sm">

            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />

            <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-blue-400/10 blur-3xl" />

            <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">

              {/* WELCOME */}

              <div className="flex items-center gap-4">

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-sm font-bold text-white shadow-lg shadow-emerald-600/20">
                  {getInitials(
                    housekeeperName,
                  )}
                </div>

                <div>

                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                    Housekeeping Workspace
                  </p>

                  <h2 className="mt-1 text-lg font-bold text-slate-950">
                    Good to see you,{" "}
                    {firstName}
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Review your assigned work,
                    manage today's shift and keep
                    operational tasks moving.
                  </p>

                </div>

              </div>

              {/* ATTENDANCE */}

              <AttendanceControl
                attendance={attendance}
                loading={attendanceLoading}
                actionLoading={
                  attendanceActionLoading
                }
                error={attendanceError}
                isCheckedIn={isCheckedIn}
                isCheckedOut={isCheckedOut}
                onCheckIn={handleCheckIn}
                onCheckOut={handleCheckOut}
                onRetry={loadAttendance}
              />

            </div>

          </section>

          {/* =================================================
              METRICS
          ================================================= */}

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

            {metrics.map((metric) => (
              <MetricCard
                key={metric.label}
                metric={metric}
                loading={
                  taskLoading
                }
                onClick={
                  metric.path
                    ? () =>
                        navigate(
                          metric.path!,
                        )
                    : undefined
                }
              />
            ))}

          </section>

          {/* =================================================
              AI ASSISTANT
          ================================================= */}

          <button
            type="button"
            onClick={() => navigate("/ai-assistant")}
            className="group relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
                  <Bot size={18} strokeWidth={1.9} />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs font-bold text-slate-900">
                      Operations AI Assistant
                    </p>
                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-emerald-700">
                      AI
                    </span>
                  </div>

                  <p className="mt-0.5 truncate text-[10px] text-slate-400">
                    Role-based assistance for housekeeping operations and assigned work
                  </p>
                </div>
              </div>

              <ArrowUpRight
                size={16}
                className="shrink-0 text-slate-300 transition group-hover:text-emerald-600"
              />
            </div>
          </button>

          {/* =================================================
              OPERATIONAL SNAPSHOT
          ================================================= */}

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.85fr)]">

            {/* =================================================
                MY ASSIGNED WORK
            ================================================= */}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <SectionHeader
                eyebrow="Operational Work"
                title="My Assigned Work"
                description="Tasks assigned specifically to your housekeeper account."
                actionLabel="Open Work Management"
                onAction={() =>
                  navigate(
                    "/work-management",
                  )
                }
              />

              <div className="p-4 sm:p-5">

                {taskLoading ? (
                  <TaskSkeleton />
                ) : taskError ? (
                  <AlertBar
                    message={taskError}
                    onRetry={() =>
                      void loadTasks()
                    }
                  />
                ) : visibleTasks.length ===
                  0 ? (
                  <EmptyPanel
                    icon={ClipboardCheck}
                    title="No active work assigned"
                    description={
                      taskSummary.completed >
                      0
                        ? "Your current assigned work is complete."
                        : "New housekeeping tasks assigned by an administrator will appear here."
                    }
                    actionLabel="Open Work Management"
                    onAction={() =>
                      navigate(
                        "/work-management",
                      )
                    }
                  />
                ) : (
                  <div className="space-y-2.5">

                    {visibleTasks.map(
                      (task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          onOpen={() =>
                            navigate(
                              "/work-management",
                            )
                          }
                        />
                      ),
                    )}

                  </div>
                )}

                {!taskLoading &&
                  !taskError &&
                  workTasks.length > 0 && (
                    <div className="mt-4 grid grid-cols-4 gap-2">

                      <MiniStat
                        label="Pending"
                        value={
                          taskSummary.pending
                        }
                      />

                      <MiniStat
                        label="In Progress"
                        value={
                          taskSummary.inProgress
                        }
                      />

                      <MiniStat
                        label="Overdue"
                        value={
                          taskSummary.overdue
                        }
                        alert={
                          taskSummary.overdue >
                          0
                        }
                      />

                      <MiniStat
                        label="Completed"
                        value={
                          taskSummary.completed
                        }
                      />

                    </div>
                  )}

              </div>

            </div>

            {/* =================================================
                QUICK ACTIONS
            ================================================= */}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <SectionHeader
                eyebrow="Housekeeping Tools"
                title="Quick Actions"
                description="Open the staff tools you use most."
              />

              <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-1 sm:p-5">

                <QuickAction
                  icon={ClipboardList}
                  title="My Assigned Work"
                  description="Review and manage your operational tasks."
                  tone="blue"
                  onClick={() =>
                    navigate(
                      "/work-management",
                    )
                  }
                />

                <QuickAction
                  icon={SprayCan}
                  title="Housekeeping Work"
                  description="Open your housekeeping task workspace."
                  tone="emerald"
                  onClick={() =>
                    navigate(
                      "/work-management",
                    )
                  }
                />

                <QuickAction
                  icon={Clock3}
                  title="Attendance"
                  description="Review your attendance and shift records."
                  tone="violet"
                  onClick={() =>
                    navigate(
                      "/attendance",
                    )
                  }
                />

                <QuickAction
                  icon={UserRound}
                  title="My Profile"
                  description="View your staff profile information."
                  tone="amber"
                  onClick={() =>
                    navigate(
                      "/profile",
                    )
                  }
                />

              </div>

              <div className="border-t border-slate-100 px-5 py-4">

                <div className="flex items-center gap-2">

                  <CheckCircle2
                    size={15}
                    className="text-emerald-500"
                  />

                  <span className="text-[10px] font-semibold text-slate-500">
                    Housekeeper workspace connected
                    to live operational work
                  </span>

                </div>

              </div>

            </div>

          </section>

          
          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="flex flex-col gap-2 border-t border-slate-200/70 pt-2 text-[10px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">

            <span>
              HospitaX · Digital Hospital
              Operations Platform
            </span>

            <span className="inline-flex items-center gap-1.5">

              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

              Live operational data

            </span>

          </div>

        </div>

      </main>

    </div>
  );
}

// =====================================================
// ATTENDANCE CONTROL
// =====================================================

function AttendanceControl({
  attendance,
  loading,
  actionLoading,
  error,
  isCheckedIn,
  isCheckedOut,
  onCheckIn,
  onCheckOut,
  onRetry,
}: {
  attendance: AttendanceRecord | null;
  loading: boolean;
  actionLoading: boolean;
  error: string;
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  onCheckIn: () => Promise<void>;
  onCheckOut: () => Promise<void>;
  onRetry: () => Promise<void>;
}) {
  if (loading) {
    return (
      <div className="h-16 w-full animate-pulse rounded-xl bg-white/80 sm:w-72" />
    );
  }

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm sm:w-[340px]">

      <div className="flex items-center justify-between gap-3">

        <div className="min-w-0">

          <div className="flex items-center gap-2">

            <span
              className={`h-2 w-2 rounded-full ${
                isCheckedOut
                  ? "bg-slate-400"
                  : isCheckedIn
                    ? "bg-emerald-500"
                    : "bg-amber-500"
              }`}
            />

            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Today's Attendance
            </p>

          </div>

          <p className="mt-1 text-xs font-bold text-slate-800">

            {isCheckedOut
              ? "Shift completed"
              : isCheckedIn
                ? "Shift is active"
                : "Shift not started"}

          </p>

          {attendance?.check_in && (
            <p className="mt-1 text-[9px] text-slate-400">

              In{" "}
              {formatTime(
                attendance.check_in,
              )}

              {attendance.check_out
                ? ` · Out ${formatTime(
                    attendance.check_out,
                  )}`
                : ""}

            </p>
          )}

        </div>

        <div className="shrink-0">

          {isCheckedOut ? (
            <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-[10px] font-bold text-slate-500">

              <CheckCircle2 size={13} />

              Complete

            </span>
          ) : isCheckedIn ? (
            <button
              type="button"
              onClick={() =>
                void onCheckOut()
              }
              disabled={actionLoading}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[10px] font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >

              {actionLoading ? (
                <Loader2
                  size={13}
                  className="animate-spin"
                />
              ) : (
                <LogOut size={13} />
              )}

              Check out

            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                void onCheckIn()
              }
              disabled={actionLoading}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[10px] font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >

              {actionLoading ? (
                <Loader2
                  size={13}
                  className="animate-spin"
                />
              ) : (
                <LogIn size={13} />
              )}

              Check in

            </button>
          )}

        </div>

      </div>

      {error && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-2.5 py-2 text-[9px] text-red-600">

          <span className="flex-1">
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              void onRetry()
            }
            className="font-bold underline"
          >
            Retry
          </button>

        </div>
      )}

    </div>
  );
}

// =====================================================
// METRIC CARD
// =====================================================

function MetricCard({
  metric,
  loading,
  onClick,
}: {
  metric: Metric;
  loading: boolean;
  onClick?: () => void;
}) {
  const Icon = metric.icon;
  const tone =
    TONE_STYLES[metric.tone];

  const content = (
    <>
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl ${tone.glow}`}
      />

      <div className="relative flex items-start justify-between gap-3">

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone.icon}`}
        >
          <Icon size={18} />
        </div>

        {metric.path && (
          <ArrowUpRight
            size={15}
            className="text-slate-300 transition group-hover:text-slate-500"
          />
        )}

      </div>

      <div className="relative mt-5">

        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
          {metric.label}
        </p>

        <p
          className={`mt-1 truncate text-2xl font-bold tracking-tight ${
            loading
              ? "text-slate-300"
              : tone.value
          }`}
        >
          {metric.value}
        </p>

        <p className="mt-1 truncate text-[10px] text-slate-400">
          {metric.helper}
        </p>

      </div>
    </>
  );

  if (!onClick) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-5"
    >
      {content}
    </button>
  );
}

// =====================================================
// SECTION HEADER
// =====================================================

function SectionHeader({
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">

      <div>

        <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-slate-400">
          {eyebrow}
        </p>

        <h2 className="mt-1 text-base font-bold text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-xs text-slate-400">
          {description}
        </p>

      </div>

      {actionLabel &&
        onAction && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex h-9 items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 sm:self-center"
          >

            {actionLabel}

            <ArrowUpRight size={12} />

          </button>
        )}

    </div>
  );
}

// =====================================================
// QUICK ACTION
// =====================================================

function QuickAction({
  icon,
  title,
  description,
  tone,
  onClick,
}: {
  icon: ElementType;
  title: string;
  description: string;
  tone: Tone;
  onClick: () => void;
}) {
  const Icon = icon;

  const styles =
    TONE_STYLES[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-left transition hover:border-slate-200 hover:bg-white hover:shadow-sm"
    >

      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.icon} transition group-hover:scale-105`}
      >
        <Icon size={17} />
      </div>

      <div className="min-w-0 flex-1">

        <p className="text-xs font-bold text-slate-800">
          {title}
        </p>

        <p className="mt-1 truncate text-[10px] text-slate-400">
          {description}
        </p>

      </div>

      <ArrowUpRight
        size={14}
        className="shrink-0 text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-500"
      />

    </button>
  );
}

// =====================================================
// TASK ROW
// =====================================================

function TaskRow({
  task,
  onOpen,
}: {
  task: WorkTask;
  onOpen: () => void;
}) {
  const status =
    getTaskStatusMeta(
      task.status,
    );

  const priorityClass =
    getTaskPriorityMeta(
      task.priority,
    );

  const dueLabel = task.due_at
    ? new Intl.DateTimeFormat(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        },
      ).format(
        new Date(task.due_at),
      )
    : "No due time";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-emerald-200 hover:bg-emerald-50/20 hover:shadow-sm"
    >

      <div className="flex items-start gap-3">

        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <SprayCan size={16} />
        </div>

        <div className="min-w-0 flex-1">

          <div className="flex flex-wrap items-center gap-2">

            <p className="truncate text-xs font-bold text-slate-800">
              {task.title}
            </p>

            <span
              className={`text-[9px] font-bold ${priorityClass}`}
            >
              {task.priority}
            </span>

          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-slate-400">

            <span className="inline-flex items-center gap-1">
              <Home size={10} />
              {task.location ||
                "No location"}
            </span>

            <span className="inline-flex items-center gap-1">
              <Clock3 size={10} />
              Due {dueLabel}
            </span>

          </div>

        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold ring-1 ${status.badge}`}
        >

          <span
            className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
          />

          {task.status}

        </span>

      </div>

    </button>
  );
}


// =====================================================
// MINI STAT
// =====================================================

function MiniStat({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-3 ${
        alert
          ? "border-red-100 bg-red-50"
          : "border-slate-100 bg-slate-50/70"
      }`}
    >

      <p
        className={`text-[9px] font-bold uppercase tracking-[0.08em] ${
          alert
            ? "text-red-500"
            : "text-slate-400"
        }`}
      >
        {label}
      </p>

      <p
        className={`mt-1 text-xl font-bold ${
          alert
            ? "text-red-700"
            : "text-slate-800"
        }`}
      >
        {value}
      </p>

    </div>
  );
}


// =====================================================
// ALERT BAR
// =====================================================

function AlertBar({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

      <CircleAlert
        size={17}
        className="shrink-0"
      />

      <span className="flex-1">
        {message}
      </span>

      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-red-600 shadow-sm ring-1 ring-red-200 transition hover:bg-red-100"
      >
        Retry
      </button>

    </div>
  );
}

// =====================================================
// EMPTY PANEL
// =====================================================

function EmptyPanel({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const Icon = icon;

  return (
    <div className="flex min-h-[190px] flex-col items-center justify-center text-center">

      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <Icon size={20} />
      </div>

      <p className="mt-3 text-xs font-bold text-slate-700">
        {title}
      </p>

      <p className="mt-1 max-w-sm text-[10px] leading-4 text-slate-400">
        {description}
      </p>

      {actionLabel &&
        onAction && (
          <button
            type="button"
            onClick={onAction}
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
          >

            {actionLabel}

            <ArrowUpRight size={12} />

          </button>
        )}

    </div>
  );
}

// =====================================================
// TASK SKELETON
// =====================================================

function TaskSkeleton() {
  return (
    <div className="space-y-2.5">

      {Array.from({
        length: 5,
      }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-xl border border-slate-100 p-4"
        >

          <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-100" />

          <div className="flex-1 space-y-2">

            <div className="h-2.5 w-48 animate-pulse rounded bg-slate-100" />

            <div className="h-2 w-32 animate-pulse rounded bg-slate-100" />

          </div>

          <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />

        </div>
      ))}

    </div>
  );
}