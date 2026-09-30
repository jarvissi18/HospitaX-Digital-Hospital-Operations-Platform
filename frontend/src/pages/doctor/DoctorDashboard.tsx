import {
  Activity,
  ArrowUpRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Hospital,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ElementType,
} from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import {
  checkInSelf,
  checkOutSelf,
  getMyAttendance,
  type AttendanceRecord,
} from "../../services/attendanceApi";
import {
  getDashboardStats,
  getPatients,
  type DashboardStats,
} from "../../services/patientApi";
import {
  getMyClinicalEncounters,
  type ClinicalEncounter,
} from "../../services/clinicalEncounterApi";
import {
  getMyWorkTasks,
  type WorkTask,
} from "../../services/workTaskApi";
import type { Patient } from "../../types/patient";

type Tone = "blue" | "emerald" | "violet" | "amber";

type Metric = {
  label: string;
  value: string;
  helper: string;
  icon: ElementType;
  tone: Tone;
  path?: string;
};

const TONE_STYLES: Record<
  Tone,
  { icon: string; value: string; glow: string }
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

function formatTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getInitials(name?: string) {
  return (
    (name || "Doctor")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "D"
  );
}

function getTaskStatusMeta(status: WorkTask["status"]) {
  switch (status) {
    case "Completed":
      return {
        dot: "bg-emerald-500",
        badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      };
    case "In Progress":
      return {
        dot: "bg-blue-500",
        badge: "bg-blue-50 text-blue-700 ring-blue-200",
      };
    case "Overdue":
      return {
        dot: "bg-red-500",
        badge: "bg-red-50 text-red-700 ring-red-200",
      };
    case "Cancelled":
      return {
        dot: "bg-slate-400",
        badge: "bg-slate-100 text-slate-500 ring-slate-200",
      };
    default:
      return {
        dot: "bg-amber-500",
        badge: "bg-amber-50 text-amber-700 ring-amber-200",
      };
  }
}

function getTaskPriorityMeta(priority: WorkTask["priority"]) {
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

function getEncounterStatusMeta(status: ClinicalEncounter["status"]) {
  switch (status) {
    case "Completed":
      return {
        dot: "bg-emerald-500",
        badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      };
    case "Cancelled":
      return {
        dot: "bg-slate-400",
        badge: "bg-slate-100 text-slate-500 ring-slate-200",
      };
    default:
      return {
        dot: "bg-blue-500",
        badge: "bg-blue-50 text-blue-700 ring-blue-200",
      };
  }
}

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [attendance, setAttendance] =
    useState<AttendanceRecord | null>(null);
  const [encounters, setEncounters] = useState<ClinicalEncounter[]>([]);
  const [workTasks, setWorkTasks] = useState<WorkTask[]>([]);

  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [encounterLoading, setEncounterLoading] = useState(true);
  const [taskLoading, setTaskLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [attendanceError, setAttendanceError] = useState("");
  const [encounterError, setEncounterError] = useState("");
  const [taskError, setTaskError] = useState("");
  const [attendanceActionLoading, setAttendanceActionLoading] =
    useState(false);

  const doctorName = user?.full_name || "Doctor";
  const displayDoctorName = doctorName.toLowerCase().startsWith("dr.")
    ? doctorName
    : `Dr. ${doctorName}`;

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [dashboardStats, patientResponse] = await Promise.all([
        getDashboardStats(),
        getPatients(),
      ]);

      setStats(dashboardStats);
      setPatients(
        Array.isArray(patientResponse) ? patientResponse : [],
      );
    } catch (err) {
      console.error("Doctor dashboard loading error:", err);
      setError(
        "We couldn't load the latest hospital data. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAttendance = useCallback(async () => {
    try {
      setAttendanceLoading(true);
      setAttendanceError("");

      const response = await getMyAttendance();
      setAttendance(response);
    } catch (err) {
      const status = (
        err as { response?: { status?: number } }
      ).response?.status;

      if (status === 404) {
        setAttendance(null);
        setAttendanceError("");
      } else {
        console.error("Doctor attendance loading error:", err);
        setAttendanceError("Unable to load today's attendance.");
      }
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  const loadEncounters = useCallback(async () => {
    try {
      setEncounterLoading(true);
      setEncounterError("");

      const response = await getMyClinicalEncounters();
      setEncounters(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error("Doctor clinical encounters loading error:", err);
      setEncounterError("Unable to load your recent consultations.");
    } finally {
      setEncounterLoading(false);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      setTaskLoading(true);
      setTaskError("");

      const response = await getMyWorkTasks();
      setWorkTasks(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error("Doctor work task loading error:", err);
      setTaskError("Unable to load your assigned work.");
    } finally {
      setTaskLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
    void loadAttendance();
    void loadEncounters();
    void loadTasks();
  }, [loadDashboard, loadAttendance, loadEncounters, loadTasks]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        loadDashboard(),
        loadAttendance(),
        loadEncounters(),
        loadTasks(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setAttendanceActionLoading(true);
      setAttendanceError("");
      const response = await checkInSelf();
      setAttendance(response);
    } catch (err) {
      const detail = (
        err as { response?: { data?: { detail?: string } } }
      ).response?.data?.detail;

      setAttendanceError(
        detail || "Unable to check in. Please try again.",
      );
    } finally {
      setAttendanceActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setAttendanceActionLoading(true);
      setAttendanceError("");
      const response = await checkOutSelf();
      setAttendance(response);
    } catch (err) {
      const detail = (
        err as { response?: { data?: { detail?: string } } }
      ).response?.data?.detail;

      setAttendanceError(
        detail || "Unable to check out. Please try again.",
      );
    } finally {
      setAttendanceActionLoading(false);
    }
  };

  const isCheckedIn = Boolean(
    attendance?.check_in && !attendance?.check_out,
  );

  const isCheckedOut = Boolean(
    attendance?.check_in && attendance?.check_out,
  );

  const taskSummary = useMemo(() => {
    const pending = workTasks.filter(
      (task) => task.status === "Pending",
    ).length;
    const inProgress = workTasks.filter(
      (task) => task.status === "In Progress",
    ).length;
    const overdue = workTasks.filter(
      (task) => task.status === "Overdue",
    ).length;
    const completed = workTasks.filter(
      (task) => task.status === "Completed",
    ).length;

    return {
      pending,
      inProgress,
      overdue,
      completed,
      total: workTasks.length,
    };
  }, [workTasks]);

  const visibleTasks = useMemo(
    () =>
      [...workTasks]
        .filter(
          (task) =>
            task.status !== "Completed" &&
            task.status !== "Cancelled",
        )
        .sort((a, b) => {
          const priorityRank = {
            Urgent: 0,
            High: 1,
            Medium: 2,
            Low: 3,
          };

          const priorityDifference =
            priorityRank[a.priority] - priorityRank[b.priority];

          if (priorityDifference !== 0) {
            return priorityDifference;
          }

          const aDue = a.due_at
            ? new Date(a.due_at).getTime()
            : Number.MAX_SAFE_INTEGER;
          const bDue = b.due_at
            ? new Date(b.due_at).getTime()
            : Number.MAX_SAFE_INTEGER;

          return aDue - bDue;
        })
        .slice(0, 4),
    [workTasks],
  );

  const recentEncounters = useMemo(
    () =>
      [...encounters]
        .sort((a, b) => {
          const aDate = a.updated_at || a.created_at;
          const bDate = b.updated_at || b.created_at;
          return (
            new Date(bDate).getTime() - new Date(aDate).getTime()
          );
        })
        .slice(0, 5),
    [encounters],
  );

  const recentPatients = useMemo(
    () =>
      [...patients]
        .sort((a, b) => {
          const aDate = a.created_at
            ? new Date(a.created_at).getTime()
            : 0;
          const bDate = b.created_at
            ? new Date(b.created_at).getTime()
            : 0;
          return bDate - aDate;
        })
        .slice(0, 5),
    [patients],
  );

  const completedEncounters = encounters.filter(
    (encounter) => encounter.status === "Completed",
  ).length;

  const draftEncounters = encounters.filter(
    (encounter) => encounter.status === "Draft",
  ).length;

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    [],
  );

  const metrics: Metric[] = [
    {
      label: "Patients Today",
      value: loading
        ? "—"
        : String(stats?.todayPatients ?? 0),
      helper: "New registrations today",
      icon: UserRound,
      tone: "blue",
      path: "/patients",
    },
    {
      label: "Active Cases",
      value: loading
        ? "—"
        : String(stats?.activeCases ?? 0),
      helper: "Current operational cases",
      icon: Activity,
      tone: "emerald",
      path: "/patients",
    },
    {
      label: "My Consultations",
      value: encounterLoading
        ? "—"
        : String(encounters.length),
      helper:
        completedEncounters > 0
          ? `${completedEncounters} completed`
          : "Clinical encounters",
      icon: Stethoscope,
      tone: "violet",
      path: "/doctor/clinical-records",
    },
    {
      label: "Assigned Work",
      value: taskLoading ? "—" : String(taskSummary.total),
      helper:
        taskSummary.overdue > 0
          ? `${taskSummary.overdue} overdue`
          : `${taskSummary.inProgress} in progress`,
      icon: ClipboardList,
      tone: "amber",
      path: "/work-management",
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f5f7fb]">
      <header className="shrink-0 border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-5 px-5 py-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Stethoscope size={15} />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-700">
                Doctor · Clinical Operations
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-[30px]">
                Doctor Dashboard
              </h1>
              <span className="text-sm font-semibold text-slate-400">
                {displayDoctorName}
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Your clinical workspace for consultations, patient activity,
              assigned work and daily attendance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm sm:flex">
              <CalendarDays size={15} className="text-blue-600" />
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
              onClick={() => void handleRefresh()}
              disabled={refreshing || attendanceActionLoading}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Refresh dashboard"
            >
              {refreshing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1680px] space-y-5 p-4 sm:p-6 lg:p-8">
          {error && (
            <AlertBar
              message={error}
              onRetry={() => void loadDashboard()}
            />
          )}

          <section className="relative overflow-hidden rounded-2xl border border-blue-200/70 bg-gradient-to-r from-blue-50 via-white to-violet-50 shadow-sm">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-violet-400/10 blur-3xl" />

            <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/20">
                  {getInitials(doctorName)}
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
                    Daily Clinical Workspace
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-slate-950">
                    Good to see you, {displayDoctorName.split(" ").slice(0, 2).join(" ").replace(/\.$/, "")}.
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Review consultations, patient records and assigned
                    operational work from one place.
                  </p>
                </div>
              </div>

              <AttendanceControl
                attendance={attendance}
                loading={attendanceLoading}
                actionLoading={attendanceActionLoading}
                error={attendanceError}
                isCheckedIn={isCheckedIn}
                isCheckedOut={isCheckedOut}
                onCheckIn={handleCheckIn}
                onCheckOut={handleCheckOut}
                onRetry={loadAttendance}
              />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <MetricCard
                key={metric.label}
                metric={metric}
                loading={
                  (loading &&
                    metric.label !== "My Consultations" &&
                    metric.label !== "Assigned Work") ||
                  (metric.label === "My Consultations" &&
                    encounterLoading) ||
                  (metric.label === "Assigned Work" && taskLoading)
                }
                onClick={
                  metric.path
                    ? () => navigate(metric.path!)
                    : undefined
                }
              />
            ))}
          </section>

          {/* =================================================
              AI ASSISTANT
          ================================================== */}

          <button
            type="button"
            onClick={() => navigate("/ai-assistant")}
            className="group relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
                  <Bot
                    size={18}
                    strokeWidth={1.9}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs font-bold text-slate-900">
                      Clinical AI Assistant
                    </p>
                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-emerald-700">
                      AI
                    </span>
                  </div>

                  <p className="mt-0.5 truncate text-[10px] text-slate-400">
                    Patient records, clinical workflow and role-based assistance
                  </p>
                </div>
              </div>

              <ArrowUpRight
                size={16}
                className="shrink-0 text-slate-300 transition group-hover:text-blue-600"
              />
            </div>
          </button>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.85fr)]">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <SectionHeader
                eyebrow="Clinical Workflow"
                title="Recent Consultations"
                description="Your latest clinical encounters and documentation."
                actionLabel="Open Clinical Records"
                onAction={() => navigate("/doctor/clinical-records")}
              />

              <div className="border-t border-slate-100 p-4 sm:p-5">
                {encounterLoading ? (
                  <EncounterSkeleton />
                ) : encounterError ? (
                  <AlertBar
                    message={encounterError}
                    onRetry={() => void loadEncounters()}
                  />
                ) : recentEncounters.length === 0 ? (
                  <EmptyPanel
                    icon={Stethoscope}
                    title="No consultations yet"
                    description="Clinical encounters you create will appear here."
                    actionLabel="Open Clinical Records"
                    onAction={() => navigate("/doctor/clinical-records")}
                  />
                ) : (
                  <div className="space-y-2.5">
                    {recentEncounters.map((encounter) => (
                      <EncounterRow
                        key={encounter.id}
                        encounter={encounter}
                        onOpen={() =>
                          navigate(`/patients/${encounter.patient_id}`)
                        }
                      />
                    ))}
                  </div>
                )}

                {!encounterLoading &&
                  !encounterError &&
                  encounters.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <MiniStat
                        label="Completed"
                        value={completedEncounters}
                      />
                      <MiniStat
                        label="Draft"
                        value={draftEncounters}
                      />
                    </div>
                  )}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <SectionHeader
                eyebrow="Doctor Tools"
                title="Quick Actions"
                description="Open the clinical tools you use most."
              />

              <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-1 sm:p-5">
                <QuickAction
                  icon={Users}
                  title="Patient Registry"
                  description="Review registered patient records."
                  tone="blue"
                  onClick={() => navigate("/patients")}
                />

                <QuickAction
                  icon={Stethoscope}
                  title="Clinical History"
                  description="Review your consultations and clinical history."
                  tone="emerald"
                  onClick={() => navigate("/doctor/clinical-records")}
                />

                <QuickAction
                  icon={ClipboardList}
                  title="Assigned Work"
                  description="Review and manage your assigned tasks."
                  tone="amber"
                  onClick={() => navigate("/work-management")}
                />

                <QuickAction
                  icon={FileText}
                  title="Attendance"
                  description="Review your attendance workspace."
                  tone="violet"
                  onClick={() => navigate("/attendance")}
                />
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeader
              eyebrow="Operational Work"
              title="My Assigned Work"
              description="Tasks assigned specifically to your account."
              actionLabel="Open Work Management"
              onAction={() => navigate("/work-management")}
            />

            <div className="p-4 sm:p-5">
              {taskLoading ? (
                <TaskSkeleton />
              ) : taskError ? (
                <AlertBar
                  message={taskError}
                  onRetry={() => void loadTasks()}
                />
              ) : visibleTasks.length === 0 ? (
                <EmptyPanel
                  icon={CheckCircle2}
                  title="No active work assigned"
                  description={
                    taskSummary.completed > 0
                      ? "Your current assigned work is complete."
                      : "New operational tasks assigned to you will appear here."
                  }
                  actionLabel="Open Work Management"
                  onAction={() => navigate("/work-management")}
                />
              ) : (
                <div className="space-y-2.5">
                  {visibleTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onOpen={() => navigate("/work-management")}
                    />
                  ))}
                </div>
              )}

              {!taskLoading && !taskError && workTasks.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <MiniStat label="Pending" value={taskSummary.pending} />
                  <MiniStat
                    label="In Progress"
                    value={taskSummary.inProgress}
                  />
                  <MiniStat
                    label="Overdue"
                    value={taskSummary.overdue}
                    alert={taskSummary.overdue > 0}
                  />
                </div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeader
              eyebrow="Patient Registry"
              title="Recent Patients"
              description="Latest patients available in the hospital registry."
              actionLabel="View Patient Registry"
              onAction={() => navigate("/patients")}
            />

            <div className="p-4 sm:p-5">
              {loading ? (
                <PatientSkeleton />
              ) : recentPatients.length === 0 ? (
                <EmptyPanel
                  icon={Users}
                  title="No patients found"
                  description="Registered patients will appear here when available."
                  actionLabel="Open Patient Registry"
                  onAction={() => navigate("/patients")}
                />
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[700px]">
                    <div className="grid grid-cols-[minmax(220px,1.5fr)_120px_120px_minmax(160px,1fr)_80px] gap-4 border-b border-slate-100 px-3 pb-3 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      <span>Patient</span>
                      <span>Patient ID</span>
                      <span>Age / Gender</span>
                      <span>Condition</span>
                      <span />
                    </div>

                    <div className="divide-y divide-slate-100">
                      {recentPatients.map((patient) => (
                        <PatientRow
                          key={patient.id}
                          patient={patient}
                          onOpen={() =>
                            navigate(`/patients/${patient.id}`)
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="flex flex-col gap-2 border-t border-slate-200/70 pt-2 text-[10px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <span>HospitaX · Digital Hospital Operations Platform</span>
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
    <div className="w-full rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm sm:w-[330px]">
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
              In {formatTime(attendance.check_in)}
              {attendance.check_out
                ? ` · Out ${formatTime(attendance.check_out)}`
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
              onClick={() => void onCheckOut()}
              disabled={actionLoading}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[10px] font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <LogOut size={13} />
              )}
              Check out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void onCheckIn()}
              disabled={actionLoading}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[10px] font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 size={13} className="animate-spin" />
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
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => void onRetry()}
            className="font-bold underline"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

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
  const tone = TONE_STYLES[metric.tone];

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
            loading ? "text-slate-300" : tone.value
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
        <p className="mt-1 text-xs text-slate-400">{description}</p>
      </div>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex h-9 items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 sm:self-center"
        >
          {actionLabel}
          <ArrowUpRight size={12} />
        </button>
      )}
    </div>
  );
}

function EncounterRow({
  encounter,
  onOpen,
}: {
  encounter: ClinicalEncounter;
  onOpen: () => void;
}) {
  const status = getEncounterStatusMeta(encounter.status);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition group-hover:bg-white">
          <Stethoscope size={16} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold text-slate-800">
              Consultation #{encounter.id}
            </p>

            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold ring-1 ${status.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              {encounter.status}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-slate-400">
            <span className="font-semibold text-slate-500">
              Patient #{encounter.patient_id}
            </span>
            <span>
              {formatDate(encounter.updated_at || encounter.created_at)}
            </span>
            <span>
              {formatTime(encounter.updated_at || encounter.created_at)}
            </span>
          </div>

          <p className="mt-2 truncate text-[10px] text-slate-500">
            {encounter.chief_complaint ||
              encounter.diagnosis ||
              "Clinical encounter record"}
          </p>
        </div>

        <ArrowUpRight
          size={14}
          className="mt-1 shrink-0 text-slate-300 transition group-hover:text-blue-600"
        />
      </div>
    </button>
  );
}

function TaskRow({
  task,
  onOpen,
}: {
  task: WorkTask;
  onOpen: () => void;
}) {
  const status = getTaskStatusMeta(task.status);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 transition group-hover:bg-white">
          <ClipboardList size={16} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-xs font-bold text-slate-800">
              {task.title}
            </p>

            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold ring-1 ${status.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              {task.status}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-slate-400">
            <span
              className={`font-bold ${getTaskPriorityMeta(task.priority)}`}
            >
              {task.priority} priority
            </span>

            {task.due_at && (
              <span>
                Due {formatDate(task.due_at)} · {formatTime(task.due_at)}
              </span>
            )}

            {task.location && <span>{task.location}</span>}
          </div>
        </div>

        <ArrowUpRight
          size={14}
          className="mt-1 shrink-0 text-slate-300 transition group-hover:text-blue-600"
        />
      </div>
    </button>
  );
}

function QuickAction({
  icon: Icon,
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
  const style = TONE_STYLES[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.icon}`}
      >
        <Icon size={17} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-slate-800">{title}</p>
        <p className="mt-0.5 truncate text-[10px] text-slate-400">
          {description}
        </p>
      </div>

      <ArrowUpRight
        size={14}
        className="shrink-0 text-slate-300 transition group-hover:text-slate-600"
      />
    </button>
  );
}

function PatientRow({
  patient,
  onOpen,
}: {
  patient: Patient;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid w-full grid-cols-[minmax(220px,1.5fr)_120px_120px_minmax(160px,1fr)_80px] items-center gap-4 px-3 py-3.5 text-left transition hover:bg-slate-50"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[10px] font-bold text-blue-600">
          {getInitials(patient.name)}
        </div>

        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-slate-800">
            {patient.name}
          </p>
          <p className="mt-0.5 truncate text-[9px] text-slate-400">
            {patient.village || "Location not specified"}
          </p>
        </div>
      </div>

      <span className="text-[10px] font-semibold text-slate-500">
        #{patient.id}
      </span>

      <span className="text-[10px] font-semibold text-slate-500">
        {patient.age} / {patient.gender}
      </span>

      <span className="truncate text-[10px] font-semibold text-slate-600">
        {patient.disease || "Not specified"}
      </span>

      <span className="inline-flex items-center justify-end gap-1 text-[10px] font-bold text-blue-600">
        Open
        <ArrowUpRight size={12} />
      </span>
    </button>
  );
}

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
      className={`rounded-xl border px-3 py-2.5 ${
        alert
          ? "border-red-200 bg-red-50"
          : "border-slate-100 bg-slate-50"
      }`}
    >
      <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-bold ${
          alert ? "text-red-600" : "text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyPanel({
  icon: Icon,
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
  return (
    <div className="flex min-h-[190px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-5 py-8 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-200">
        <Icon size={19} />
      </div>

      <p className="mt-3 text-xs font-bold text-slate-800">{title}</p>
      <p className="mt-1 max-w-sm text-[10px] leading-5 text-slate-400">
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[10px] font-bold text-white transition hover:bg-blue-700"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function AlertBar({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
      <Hospital size={15} className="mt-0.5 shrink-0" />
      <span className="flex-1 leading-5">{message}</span>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-[10px] font-bold text-red-600 ring-1 ring-red-200 transition hover:bg-red-100"
        >
          Retry
        </button>
      )}
    </div>
  );
}

function TaskSkeleton() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="flex h-[70px] animate-pulse items-center gap-3 rounded-xl bg-slate-50 p-3"
        >
          <div className="h-9 w-9 rounded-lg bg-slate-200" />
          <div className="flex-1">
            <div className="h-3 w-40 rounded bg-slate-200" />
            <div className="mt-2 h-2.5 w-56 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EncounterSkeleton() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="flex h-[70px] animate-pulse items-center gap-3 rounded-xl bg-slate-50 p-3"
        >
          <div className="h-9 w-9 rounded-lg bg-slate-200" />
          <div className="flex-1">
            <div className="h-3 w-44 rounded bg-slate-200" />
            <div className="mt-2 h-2.5 w-60 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PatientSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex h-14 animate-pulse items-center gap-3 rounded-lg bg-slate-50 px-3"
        >
          <div className="h-9 w-9 rounded-lg bg-slate-200" />
          <div className="flex-1">
            <div className="h-3 w-32 rounded bg-slate-200" />
            <div className="mt-2 h-2.5 w-20 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
