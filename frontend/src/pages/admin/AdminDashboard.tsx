import {
  Activity,
  ArrowUpRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Loader2,
  RefreshCw,
  UserRound,
  Users,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
  type ElementType,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  getDashboardStats,
  getPatients,
  type DashboardStats,
} from "../../services/patientApi";

import {
  getAttendanceSummary,
  type AttendanceSummary,
} from "../../services/attendanceApi";

import type { Patient } from "../../types/patient";

// =====================================================
// TYPES
// =====================================================

type Tone =
  | "blue"
  | "violet"
  | "emerald"
  | "amber";

type AdminMetric = {
  label: string;
  value: string;
  helper: string;
  icon: ElementType;
  tone: Tone;
  path?: string;
};

// =====================================================
// ADMIN DASHBOARD
// =====================================================

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] =
    useState<DashboardStats | null>(null);

  const [attendanceSummary, setAttendanceSummary] =
    useState<AttendanceSummary | null>(null);

  const [patients, setPatients] =
    useState<Patient[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  // ===================================================
  // LOAD DASHBOARD
  // ===================================================

  const loadDashboard = async (
    isRefresh = false,
  ) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [
        dashboardStats,
        patientData,
        attendanceData,
      ] = await Promise.all([
        getDashboardStats(),
        getPatients(),
        getAttendanceSummary(),
      ]);

      setStats(dashboardStats);

      setPatients(
        Array.isArray(patientData)
          ? patientData.slice(0, 5)
          : [],
      );

      setAttendanceSummary(
        attendanceData,
      );
    } catch (err) {
      console.error(
        "Administrator dashboard loading error:",
        err,
      );

      setError(
        "Unable to load the latest hospital operations data.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ===================================================
  // INITIAL LOAD
  // ===================================================

  useEffect(() => {
    void loadDashboard();
  }, []);

  // ===================================================
  // DATE
  // ===================================================

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat(
      "en-IN",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    ).format(new Date());
  }, []);

  // ===================================================
  // ADMIN METRICS
  // ===================================================

  const metrics: AdminMetric[] = [
    {
      label: "Total Patients",
      value: loading
        ? "—"
        : String(
            stats?.totalPatients ?? 0,
          ),
      helper: "Registered in system",
      icon: Users,
      tone: "blue",
      path: "/patients",
    },

    {
      label: "Today's Registrations",
      value: loading
        ? "—"
        : String(
            stats?.todayPatients ?? 0,
          ),
      helper: "New patients today",
      icon: UserRound,
      tone: "violet",
      path: "/patients",
    },

    {
      label: "Active Cases",
      value: loading
        ? "—"
        : String(
            stats?.activeCases ?? 0,
          ),
      helper: "Current operational cases",
      icon: Activity,
      tone: "emerald",
    },

    {
      label: "Staff Present",
      value: loading
        ? "—"
        : String(
            attendanceSummary?.present ?? 0,
          ),
      helper: `${attendanceSummary?.total_staff ?? 0} attendance staff`,
      icon: CheckCircle2,
      tone: "amber",
      path: "/attendance",
    },
  ];

  // ===================================================
  // ATTENDANCE
  // ===================================================

  const attendanceItems = [
    {
      label: "Present",
      value: attendanceSummary?.present ?? 0,
      tone: "emerald" as Tone,
    },

    {
      label: "Late",
      value: attendanceSummary?.late ?? 0,
      tone: "amber" as Tone,
    },

    {
      label: "Absent",
      value: attendanceSummary?.absent ?? 0,
      tone: "blue" as Tone,
    },

    {
      label: "Leave",
      value: attendanceSummary?.leave ?? 0,
      tone: "violet" as Tone,
    },
  ];

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f7f9fc]">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="shrink-0 border-b border-slate-200/80 bg-white">

        <div className="flex min-h-[76px] items-center justify-between gap-5 px-5 py-4 sm:px-6">

          {/* TITLE */}

          <div className="min-w-0">

            <div className="mb-1.5 flex items-center gap-2">

              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.10)]" />

              <span className="truncate text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Administrator · Hospital Operations
              </span>

            </div>

            <h1 className="text-2xl font-bold tracking-[-0.03em] text-slate-950 sm:text-3xl">
              Operations Dashboard
            </h1>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Monitor hospital activity, workforce and patient operations.
            </p>

          </div>

          {/* ACTIONS */}

          <div className="flex shrink-0 items-center gap-2.5">

            <button
              type="button"
              onClick={() =>
                void loadDashboard(true)
              }
              disabled={refreshing}
              title="Refresh dashboard"
              aria-label="Refresh dashboard"
              className="
                flex h-10 w-10 items-center justify-center
                rounded-xl border border-slate-200 bg-white
                text-slate-500 shadow-sm
                transition-all
                hover:border-slate-300
                hover:bg-slate-50
                hover:text-slate-800
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {refreshing ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <RefreshCw size={16} />
              )}
            </button>

            <div className="hidden items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm sm:flex">

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-white">
                <CalendarDays size={15} />
              </div>

              <div className="leading-tight">

                <p className="text-[8px] font-bold uppercase tracking-[0.13em] text-slate-400">
                  Today
                </p>

                <p className="mt-0.5 text-[11px] font-bold text-slate-800">
                  {formattedDate}
                </p>

              </div>

            </div>

          </div>

        </div>

      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="min-h-0 flex-1 overflow-y-auto">

        <div className="mx-auto w-full max-w-[1500px] space-y-4 p-4 sm:p-6">

          {/* =================================================
              ERROR
          ================================================= */}

          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">

              <CircleAlert
                size={15}
                className="shrink-0"
              />

              <span className="min-w-0 flex-1">
                {error}
              </span>

              <button
                type="button"
                onClick={() =>
                  void loadDashboard()
                }
                className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-[10px] font-bold text-red-600 shadow-sm ring-1 ring-red-200 transition hover:bg-red-100"
              >
                Retry
              </button>

            </div>
          )}

          {/* =================================================
              KPI
          ================================================= */}

          <section>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

              {metrics.map(
                (metric) => (
                  <AdminMetricCard
                    key={metric.label}
                    metric={metric}
                    onClick={
                      metric.path
                        ? () =>
                            navigate(
                              metric.path!,
                            )
                        : undefined
                    }
                  />
                ),
              )}

            </div>

          </section>

          {/* =================================================
              AI OPERATIONS
          ================================================= */}

          <section>

            <button
              type="button"
              onClick={() =>
                navigate("/ai-assistant")
              }
              className="
                group relative w-full overflow-hidden
                rounded-2xl border border-slate-800
                bg-slate-950 p-4 text-left
                shadow-[0_8px_28px_rgba(15,23,42,0.10)]
                transition-all duration-200
                hover:-translate-y-0.5
                hover:shadow-[0_14px_34px_rgba(15,23,42,0.15)]
              "
            >

              {/* subtle background accent */}

              <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />

              <div className="relative flex items-center justify-between gap-4">

                <div className="flex min-w-0 items-center gap-3.5">

                  {/* =================================================
                      AI ROBOT LOGO
                  ================================================= */}

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white">
                    <Bot
                      size={19}
                      strokeWidth={1.9}
                    />
                  </div>

                  <div className="min-w-0">

                    <div className="flex items-center gap-2">

                      <h2 className="truncate text-sm font-semibold text-white">
                        AI Operations Assistant
                      </h2>

                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-emerald-300">
                        AI
                      </span>

                    </div>

                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      Ask about hospital operations, staff, patients and workload.
                    </p>

                  </div>

                </div>

                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition group-hover:border-white/20 group-hover:bg-white/10 group-hover:text-white">
                  <ArrowUpRight
                    size={15}
                  />
                </div>

              </div>

            </button>

          </section>

          {/* =================================================
              ATTENDANCE + PATIENTS
          ================================================= */}

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.45fr]">

            {/* =================================================
                ATTENDANCE
            ================================================= */}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">

                <div>

                  <div className="flex items-center gap-2">

                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                      <Clock3 size={14} />
                    </div>

                    <h2 className="text-sm font-bold text-slate-900">
                      Staff Attendance
                    </h2>

                  </div>

                  <p className="mt-1 pl-9 text-[10px] text-slate-400">
                    Today's workforce availability
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/attendance")
                  }
                  className="group inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold text-blue-600 transition hover:bg-blue-50"
                >
                  View

                  <ArrowUpRight
                    size={11}
                    className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </button>

              </div>

              <div className="grid grid-cols-2 gap-2.5 p-4">

                {attendanceItems.map(
                  (item) => (
                    <AttendanceOverviewItem
                      key={item.label}
                      label={item.label}
                      value={
                        loading
                          ? "—"
                          : String(
                              item.value,
                            )
                      }
                      tone={item.tone}
                    />
                  ),
                )}

              </div>

              <div className="border-t border-slate-100 px-4 py-3">

                <div className="flex items-center justify-between">

                  <span className="text-[11px] font-semibold text-slate-500">
                    Available for assignment
                  </span>

                  <span className="text-sm font-bold text-slate-900">
                    {loading
                      ? "—"
                      : String(
                          attendanceSummary?.available_for_assignment ??
                            0,
                        )}
                  </span>

                </div>

              </div>

            </div>

            {/* =================================================
                RECENT PATIENTS
            ================================================= */}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">

                <div>

                  <div className="flex items-center gap-2">

                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Users size={14} />
                    </div>

                    <h2 className="text-sm font-bold text-slate-900">
                      Recent Patients
                    </h2>

                  </div>

                  <p className="mt-1 pl-9 text-[10px] text-slate-400">
                    Latest patient registrations
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/patients")
                  }
                  className="group inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold text-blue-600 transition hover:bg-blue-50"
                >
                  View all

                  <ArrowUpRight
                    size={11}
                    className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </button>

              </div>

              <div className="p-3">

                {loading ? (
                  <PatientSkeleton />
                ) : patients.length === 0 ? (
                  <EmptyPatients />
                ) : (
                  <div className="space-y-1">

                    {patients.map(
                      (
                        patient,
                        index,
                      ) => (
                        <RecentPatientRow
                          key={patient.id}
                          patient={patient}
                          index={index}
                        />
                      ),
                    )}

                  </div>
                )}

              </div>

            </div>

          </section>

        </div>

      </main>

    </div>
  );
}

// =====================================================
// ADMIN METRIC CARD
// =====================================================

function AdminMetricCard({
  metric,
  onClick,
}: {
  metric: AdminMetric;
  onClick?: () => void;
}) {
  const Icon = metric.icon;

  const tone =
    getToneClasses(
      metric.tone,
    );

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`
        group relative overflow-hidden
        rounded-2xl border border-slate-200
        bg-white p-4 text-left shadow-sm
        transition-all duration-200
        ${
          onClick
            ? "cursor-pointer hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            : "cursor-default"
        }
      `}
    >

      <div className="flex items-start justify-between gap-3">

        <div className="min-w-0">

          <p className="text-[11px] font-semibold text-slate-500">
            {metric.label}
          </p>

          <p className="mt-1.5 text-2xl font-bold leading-none tracking-tight text-slate-950">
            {metric.value}
          </p>

          <p className="mt-2 truncate text-[10px] text-slate-400">
            {metric.helper}
          </p>

        </div>

        <div
          className={`
            flex h-9 w-9 shrink-0 items-center
            justify-center rounded-lg
            ${tone.icon}
            transition-transform duration-200
            group-hover:scale-105
          `}
        >
          <Icon size={17} />
        </div>

      </div>

      {onClick && (
        <div className="mt-3 flex items-center gap-1 text-[9px] font-bold text-slate-400 transition group-hover:text-blue-600">
          Open module
          <ArrowUpRight size={10} />
        </div>
      )}

    </button>
  );
}

// =====================================================
// ATTENDANCE ITEM
// =====================================================

function AttendanceOverviewItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: Tone;
}) {
  const toneClasses =
    getToneClasses(tone);

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">

      <div className="flex items-center gap-1.5">

        <span
          className={`
            h-1.5 w-1.5 rounded-full
            ${toneClasses.dot}
          `}
        />

        <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-slate-400">
          {label}
        </p>

      </div>

      <p className="mt-1.5 text-xl font-bold leading-none tracking-tight text-slate-900">
        {value}
      </p>

    </div>
  );
}

// =====================================================
// RECENT PATIENT
// =====================================================

function RecentPatientRow({
  patient,
  index,
}: {
  patient: Patient;
  index: number;
}) {
  const initials =
    patient.name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (part) =>
          part.charAt(0).toUpperCase(),
      )
      .join("") || "P";

  const avatarTones = [
    "bg-blue-600",
    "bg-violet-600",
    "bg-emerald-600",
    "bg-amber-600",
    "bg-rose-600",
  ];

  const avatarTone =
    avatarTones[
      index % avatarTones.length
    ];

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-transparent px-2.5 py-2.5 transition-all hover:border-slate-200 hover:bg-slate-50">

      <div
        className={`
          flex h-9 w-9 shrink-0
          items-center justify-center
          rounded-lg ${avatarTone}
          text-[10px] font-bold text-white
          shadow-sm
        `}
      >
        {initials}
      </div>

      <div className="min-w-0 flex-1">

        <p className="truncate text-[11px] font-bold text-slate-800">
          {patient.name ||
            "Unknown Patient"}
        </p>

        <div className="mt-0.5 flex items-center gap-1.5 text-[9px] text-slate-400">

          <span>
            Patient #{patient.id}
          </span>

          <span className="h-0.5 w-0.5 rounded-full bg-slate-300" />

          <span className="truncate">
            {patient.village ||
              "Location unavailable"}
          </span>

        </div>

      </div>

      <div className="hidden shrink-0 sm:block">

        <span className="inline-flex max-w-[120px] truncate rounded-full bg-rose-50 px-2 py-1 text-[9px] font-bold text-rose-600">
          {patient.disease ||
            "Not specified"}
        </span>

      </div>

    </div>
  );
}

// =====================================================
// PATIENT SKELETON
// =====================================================

function PatientSkeleton() {
  return (
    <div className="space-y-1">

      {Array.from({
        length: 5,
      }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-xl px-2.5 py-2.5"
        >

          <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-100" />

          <div className="flex-1">

            <div className="h-2.5 w-28 animate-pulse rounded bg-slate-100" />

            <div className="mt-1.5 h-2 w-20 animate-pulse rounded bg-slate-100" />

          </div>

          <div className="hidden h-4 w-16 animate-pulse rounded-full bg-slate-100 sm:block" />

        </div>
      ))}

    </div>
  );
}

// =====================================================
// EMPTY PATIENTS
// =====================================================

function EmptyPatients() {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center text-center">

      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <UserRound size={20} />
      </div>

      <p className="mt-3 text-xs font-bold text-slate-700">
        No patient records yet
      </p>

      <p className="mt-1 max-w-xs text-[10px] leading-4 text-slate-400">
        Newly registered patients will appear here automatically.
      </p>

    </div>
  );
}

// =====================================================
// COLOR SYSTEM
// =====================================================

function getToneClasses(
  tone: Tone,
) {
  const tones: Record<
    Tone,
    {
      icon: string;
      glow: string;
      dot: string;
    }
  > = {
    blue: {
      icon:
        "bg-blue-50 text-blue-600",
      glow:
        "bg-blue-500/10",
      dot:
        "bg-blue-500",
    },

    violet: {
      icon:
        "bg-violet-50 text-violet-600",
      glow:
        "bg-violet-500/10",
      dot:
        "bg-violet-500",
    },

    emerald: {
      icon:
        "bg-emerald-50 text-emerald-600",
      glow:
        "bg-emerald-500/10",
      dot:
        "bg-emerald-500",
    },

    amber: {
      icon:
        "bg-amber-50 text-amber-600",
      glow:
        "bg-amber-500/10",
      dot:
        "bg-amber-500",
    },
  };

  return tones[tone];
}