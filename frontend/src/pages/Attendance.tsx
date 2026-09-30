import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import toast from "react-hot-toast";

import AttendanceSummary from "../components/staff/attendance/AttendanceSummary";
import AttendanceTable from "../components/staff/attendance/AttendanceTable";
import type {
  AttendanceRecord,
  AttendanceStaff,
} from "../components/staff/attendance/AttendanceTable";

import {
  getAttendance,
  getAttendanceSummary,
  getMyAttendance,
  getMyAttendanceHistory,
} from "../services/attendanceApi";
import type {
  AttendanceSummary as AttendanceSummaryData,
} from "../services/attendanceApi";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

// =====================================================
// TYPES
// =====================================================

interface BackendUser {
  id: number;
  employee_id?: string | null;
  full_name: string;
  email?: string | null;
  role?: string | null;
  mobile?: string | null;
  shift?: string | null;
  is_active?: string | boolean;
}

type StatusFilter =
  | "All"
  | "Present"
  | "Late"
  | "Absent"
  | "Leave";

const STAFF_ATTENDANCE_ROLES = new Set([
  "Doctor",
  "Nurse",
  "Receptionist",
  "Housekeeper",
]);

// =====================================================
// HELPERS
// =====================================================

function formatToday(): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function formatDate(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatTime(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(minutes?: number | null): string {
  if (minutes === null || minutes === undefined) {
    return "—";
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  return remaining > 0
    ? `${hours}h ${remaining}m`
    : `${hours}h`;
}

function isNotFoundError(error: unknown): boolean {
  const response = (
    error as {
      response?: {
        status?: number;
      };
    }
  )?.response;

  return response?.status === 404;
}

function getStatusLabel(status?: string | null): string {
  if (!status) return "Unknown";
  return status === "Leave" ? "On Leave" : status;
}

function getStatusClasses(status?: string | null): string {
  switch (status) {
    case "Present":
      return "border-emerald-100 bg-emerald-50 text-emerald-700";
    case "Late":
      return "border-amber-100 bg-amber-50 text-amber-700";
    case "Absent":
      return "border-rose-100 bg-rose-50 text-rose-700";
    case "Leave":
      return "border-violet-100 bg-violet-50 text-violet-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}


// =====================================================
// PAGE
// =====================================================

export default function Attendance() {
  const { user } = useAuth();

  const isAdministrator = user?.role === "Administrator";
  const isStaff = STAFF_ATTENDANCE_ROLES.has(
    user?.role ?? "",
  );

  const [records, setRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [staff, setStaff] = useState<
    AttendanceStaff[]
  >([]);
  const [summary, setSummary] =
    useState<AttendanceSummaryData | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("All");

  // ===================================================
  // LOAD ATTENDANCE
  // ===================================================

  const loadAttendance = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        if (isStaff && user) {
          let todayAttendance: AttendanceRecord | null = null;
          let attendanceHistory: AttendanceRecord[] = [];

          // -------------------------------------------------
          // TODAY'S ATTENDANCE
          // -------------------------------------------------

          try {
            todayAttendance = await getMyAttendance();
          } catch (error) {
            if (!isNotFoundError(error)) {
              throw error;
            }
          }

          // -------------------------------------------------
          // ATTENDANCE HISTORY
          // -------------------------------------------------

          try {
            const historyResponse =
              await getMyAttendanceHistory();

            attendanceHistory = Array.isArray(
              historyResponse,
            )
              ? historyResponse
              : [];
          } catch (error) {
            console.error(
              "Failed to load attendance history:",
              error,
            );
          }

          /*
           * Keep the full personal history in records so previous
           * attendance days are visible to the staff member.
           *
           * Today's endpoint is still used separately because
           * the personal command card depends on the current
           * day's record.
           */
          const mergedRecords = [
            ...(todayAttendance
              ? [todayAttendance]
              : []),
            ...attendanceHistory.filter(
              (record) =>
                !todayAttendance ||
                record.id !==
                  todayAttendance.id,
            ),
          ];

          setRecords(mergedRecords);
          setSummary(null);

          setStaff([
            {
              id: user.id,
              employee_id:
                user.employee_id ?? null,
              full_name:
                user.full_name ??
                "Staff Member",
              role: user.role ?? null,
            },
          ]);

          return;
        }

        // =================================================
        // ADMINISTRATOR
        // =================================================

        if (isAdministrator) {
          const [
            attendanceData,
            summaryData,
            usersResponse,
          ] = await Promise.all([
            getAttendance(),
            getAttendanceSummary(),
            api.get<BackendUser[]>("/users"),
          ]);

          setRecords(
            Array.isArray(attendanceData)
              ? attendanceData
              : [],
          );

          setSummary(summaryData);

          const staffData: AttendanceStaff[] =
            Array.isArray(usersResponse.data)
              ? usersResponse.data
                  .filter(
                    (member) =>
                      member.role !==
                      "Administrator",
                  )
                  .map((member) => ({
                    id: member.id,
                    employee_id:
                      member.employee_id ??
                      null,
                    full_name:
                      member.full_name,
                    role:
                      member.role ?? null,
                  }))
              : [];

          setStaff(staffData);

          return;
        }

        // =================================================
        // UNKNOWN / UNAUTHORIZED ROLE
        // =================================================

        setRecords([]);
        setSummary(null);
        setStaff([]);
      } catch (error) {
        console.error(
          "Failed to load attendance:",
          error,
        );

        toast.error(
          "Failed to load attendance data.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAdministrator, isStaff, user],
  );

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  // ===================================================
  // FILTERS
  // ===================================================

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      const member = staff.find(
        (person) =>
          person.id === record.user_id,
      );

      const matchesSearch =
        !query ||
        member?.full_name
          ?.toLowerCase()
          .includes(query) ||
        member?.employee_id
          ?.toLowerCase()
          .includes(query) ||
        member?.role
          ?.toLowerCase()
          .includes(query) ||
        record.shift
          ?.toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        record.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    records,
    staff,
    search,
    statusFilter,
  ]);

  const statusFilters: StatusFilter[] = [
    "All",
    "Present",
    "Late",
    "Absent",
    "Leave",
  ];

  const todayKey =
    new Date().toDateString();

  const myAttendance =
    records.find(
      (record) =>
        new Date(
          record.attendance_date,
        ).toDateString() === todayKey,
    ) ?? null;

  const attendanceHistory = useMemo(
    () =>
      records.filter(
        (record) =>
          new Date(
            record.attendance_date,
          ).toDateString() !== todayKey,
      ),
    [records, todayKey],
  );

  const shiftCompleted = Boolean(
    myAttendance?.check_out,
  );

  // ===================================================
  // ADMIN LIVE METRICS
  // ===================================================

  const adminMetrics = useMemo(() => {
    const total = records.length;

    const present = records.filter(
      (record) =>
        record.status === "Present",
    ).length;

    const late = records.filter(
      (record) =>
        record.status === "Late",
    ).length;

    const absent = records.filter(
      (record) =>
        record.status === "Absent",
    ).length;

    const leave = records.filter(
      (record) =>
        record.status === "Leave",
    ).length;

    return {
      total,
      present,
      late,
      absent,
      leave,
    };
  }, [records]);

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div
      className="
        h-full
        min-h-0
        overflow-y-auto
        overflow-x-hidden
        overscroll-contain
        bg-slate-50
      "
    >
      <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-7 xl:p-8">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2 text-xs">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                {isAdministrator ? (
                  <UsersRound size={14} />
                ) : (
                  <UserRound size={14} />
                )}
              </div>

              <span className="font-medium text-slate-400">
                Workforce Operations
              </span>

              <ChevronRight
                size={13}
                className="text-slate-300"
              />

              <span className="font-semibold text-slate-700">
                Attendance
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.10)]" />

              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Daily workforce control
              </span>
            </div>

            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {isAdministrator
                ? "Staff Attendance"
                : "My Attendance"}
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              {isAdministrator
                ? "Monitor today's workforce presence, shifts, check-in activity and working hours from one operational view."
                : "Track your daily attendance, shift timing, check-in activity and working hours."}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadAttendance(true)
            }
            disabled={refreshing}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={15}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </header>

        {/* =================================================
            DATE / SYSTEM CONTEXT
        ================================================= */}

        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="absolute inset-y-0 left-0 w-1 bg-blue-600" />

          <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <CalendarDays size={19} />
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  Operational date
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900">
                  {formatToday()}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
                <Clock3
                  size={14}
                  className="text-slate-400"
                />
                Today's attendance cycle
              </div>

              <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live data
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            ADMIN KPI STRIP
        ================================================= */}

        {isAdministrator && (
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <KpiCard
              label="Attendance Records"
              value={adminMetrics.total}
              icon={UsersRound}
              tone="blue"
              loading={loading}
            />

            <KpiCard
              label="Present"
              value={adminMetrics.present}
              icon={CheckCircle2}
              tone="emerald"
              loading={loading}
            />

            <KpiCard
              label="Late"
              value={adminMetrics.late}
              icon={Clock3}
              tone="amber"
              loading={loading}
            />

            <KpiCard
              label="Absent"
              value={adminMetrics.absent}
              icon={LogOut}
              tone="rose"
              loading={loading}
            />

            <KpiCard
              label="On Leave"
              value={adminMetrics.leave}
              icon={CalendarDays}
              tone="violet"
              loading={loading}
            />
          </section>
        )}

        {/* =================================================
            ADMIN SUMMARY
        ================================================= */}

        {isAdministrator && (
          <section>
            <AttendanceSummary
              summary={summary}
              loading={loading}
            />
          </section>
        )}

        {/* =================================================
            STAFF PERSONAL COMMAND CARD
        ================================================= */}

        {isStaff && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 ring-1 ring-blue-100">
                  <UserRound size={20} />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-bold text-slate-950">
                      {user?.full_name ??
                        "Staff Member"}
                    </h2>

                    {myAttendance && (
                      <StatusBadge
                        status={
                          myAttendance.status
                        }
                      />
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium">
                      {user?.role ??
                        "Staff Member"}
                    </span>

                    {user?.employee_id && (
                      <>
                        <span className="text-slate-300">
                          •
                        </span>

                        <span>
                          {user.employee_id}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {myAttendance && (
                <div
                  className={`inline-flex w-fit items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${
                    shiftCompleted
                      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                      : "border-blue-100 bg-blue-50 text-blue-700"
                  }`}
                >
                  {shiftCompleted ? (
                    <CheckCircle2 size={15} />
                  ) : (
                    <Clock3 size={15} />
                  )}

                  {shiftCompleted
                    ? "Shift completed"
                    : "Currently on shift"}
                </div>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-2 divide-x divide-slate-100 sm:grid-cols-4">
                {[1, 2, 3, 4].map(
                  (item) => (
                    <div
                      key={item}
                      className="p-5"
                    >
                      <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
                      <div className="mt-3 h-7 w-24 animate-pulse rounded bg-slate-100" />
                      <div className="mt-2 h-3 w-20 animate-pulse rounded bg-slate-100" />
                    </div>
                  ),
                )}
              </div>
            ) : myAttendance ? (
              <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
                <AttendanceMetric
                  label="Check In"
                  value={formatTime(
                    myAttendance.check_in,
                  )}
                  caption="Arrival time"
                  icon={LogIn}
                  tone="emerald"
                />

                <AttendanceMetric
                  label="Check Out"
                  value={formatTime(
                    myAttendance.check_out,
                  )}
                  caption={
                    myAttendance.check_out
                      ? "Departure time"
                      : "Not checked out"
                  }
                  icon={LogOut}
                  tone="blue"
                />

                <AttendanceMetric
                  label="Shift"
                  value={
                    myAttendance.shift ||
                    "—"
                  }
                  caption="Assigned shift"
                  icon={CalendarDays}
                  tone="violet"
                />

                <AttendanceMetric
                  label="Duration"
                  value={formatDuration(
                    myAttendance.work_duration_minutes,
                  )}
                  caption="Working time"
                  icon={Clock3}
                  tone="amber"
                />
              </div>
            ) : (
              <EmptyAttendance />
            )}
          </section>
        )}

        {/* =================================================
            ADMIN FILTER TOOLBAR
        ================================================= */}

        {isAdministrator && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Attendance directory
                </p>

                <h2 className="mt-1 text-sm font-bold text-slate-900">
                  Find and filter staff
                </h2>
              </div>

              <div className="hidden items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-500 sm:flex">
                <ShieldCheck
                  size={13}
                  className="text-slate-400"
                />

                Administrator view
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full xl:max-w-[460px]">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Search staff, employee ID or shift..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/5"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {statusFilters.map(
                  (status) => {
                    const active =
                      statusFilter === status;

                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() =>
                          setStatusFilter(
                            status,
                          )
                        }
                        className={`rounded-lg border px-3 py-2 text-[11px] font-bold transition-all ${
                          active
                            ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                        }`}
                      >
                        {getStatusLabel(
                          status,
                        )}
                      </button>
                    );
                  },
                )}
              </div>
            </div>
          </section>
        )}

        {/* =================================================
            ADMIN ATTENDANCE TABLE
        ================================================= */}

        {isAdministrator && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-100">
                  <UsersRound size={17} />
                </div>

                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Attendance Records
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Today's staff presence,
                    shifts and working hours.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(search ||
                  statusFilter !== "All") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter(
                        "All",
                      );
                    }}
                    className="rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  >
                    Clear filters
                  </button>
                )}

                <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600">
                  {filteredRecords.length}{" "}
                  {filteredRecords.length === 1
                    ? "record"
                    : "records"}
                </div>
              </div>
            </div>

            {!loading &&
              filteredRecords.length ===
                0 && (
                <div className="border-b border-slate-100 px-5 py-3">
                  <div className="flex items-center justify-between rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm">
                        <Search size={15} />
                      </div>

                      <div>
                        <p className="text-xs font-bold text-slate-700">
                          No matching records
                        </p>

                        <p className="text-[11px] text-slate-500">
                          Try another staff name or
                          attendance status.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setStatusFilter(
                          "All",
                        );
                      }}
                      className="rounded-lg bg-white px-3 py-2 text-[10px] font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}

            <AttendanceTable
              records={filteredRecords}
              staff={staff}
              loading={loading}
            />
          </section>
        )}

        {/* =================================================
            STAFF TODAY DETAIL
        ================================================= */}

        {isStaff && myAttendance && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Today's Attendance
                  </h2>

                  <StatusBadge
                    status={
                      myAttendance.status
                    }
                  />
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Your attendance record for{" "}
                  {formatDate(
                    myAttendance.attendance_date,
                  )}
                  .
                </p>
              </div>

              <div className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600">
                <CalendarDays size={13} />
                Daily record
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
              <DetailCell
                label="Attendance Date"
                value={formatDate(
                  myAttendance.attendance_date,
                )}
              />

              <DetailCell
                label="Shift"
                value={
                  myAttendance.shift ||
                  "—"
                }
              />

              <DetailCell
                label="Working Hours"
                value={formatDuration(
                  myAttendance.work_duration_minutes,
                )}
              />

              <div className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Attendance Status
                </p>

                <div className="mt-2">
                  <StatusBadge
                    status={
                      myAttendance.status
                    }
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =================================================
            STAFF ATTENDANCE HISTORY
        ================================================= */}

        {isStaff && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-100">
                  <CalendarDays size={17} />
                </div>

                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Attendance History
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Your previous attendance records and
                    working hours.
                  </p>
                </div>
              </div>

              <div className="inline-flex w-fit items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600">
                {attendanceHistory.length}{" "}
                {attendanceHistory.length === 1
                  ? "record"
                  : "records"}
              </div>
            </div>

            {loading ? (
              <div className="divide-y divide-slate-100">
                {[1, 2, 3].map(
                  (item) => (
                    <div
                      key={item}
                      className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-5"
                    >
                      {[1, 2, 3, 4, 5].map(
                        (cell) => (
                          <div
                            key={cell}
                            className="animate-pulse"
                          >
                            <div className="h-2.5 w-20 rounded bg-slate-100" />
                            <div className="mt-2 h-4 w-24 rounded bg-slate-100" />
                          </div>
                        ),
                      )}
                    </div>
                  ),
                )}
              </div>
            ) : attendanceHistory.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {attendanceHistory.map(
                  (record) => (
                    <div
                      key={record.id}
                      className="grid grid-cols-2 gap-4 p-5 transition-colors hover:bg-slate-50/70 sm:grid-cols-5 sm:items-center"
                    >
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-slate-400">
                          Date
                        </p>

                        <p className="mt-1.5 text-sm font-bold text-slate-900">
                          {formatDate(
                            record.attendance_date,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-slate-400">
                          Shift
                        </p>

                        <p className="mt-1.5 text-sm font-semibold text-slate-700">
                          {record.shift ||
                            "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-slate-400">
                          Check In
                        </p>

                        <p className="mt-1.5 text-sm font-semibold text-slate-700">
                          {formatTime(
                            record.check_in,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-slate-400">
                          Check Out
                        </p>

                        <p className="mt-1.5 text-sm font-semibold text-slate-700">
                          {formatTime(
                            record.check_out,
                          )}
                        </p>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <div className="flex flex-wrap items-center justify-between gap-2 sm:block">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-slate-400">
                              Status
                            </p>

                            <div className="mt-1.5">
                              <StatusBadge
                                status={
                                  record.status
                                }
                              />
                            </div>
                          </div>

                          <div className="sm:mt-2">
                            <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-slate-400">
                              Duration
                            </p>

                            <p className="mt-1 text-xs font-bold text-slate-700">
                              {formatDuration(
                                record.work_duration_minutes,
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100">
                  <CalendarDays size={21} />
                </div>

                <h3 className="mt-4 text-sm font-bold text-slate-900">
                  No previous attendance records
                </h3>

                <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
                  Previous attendance days will appear here
                  once attendance records are available.
                </p>
              </div>
            )}
          </section>
        )}

        {isStaff &&
          !loading &&
          !myAttendance &&
          attendanceHistory.length === 0 && (
            <EmptyAttendance />
          )}
      </div>
    </div>
  );
}

// =====================================================
// KPI CARD
// =====================================================

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
  loading,
}: {
  label: string;
  value: number;
  icon: typeof UsersRound;
  tone:
    | "blue"
    | "emerald"
    | "amber"
    | "rose"
    | "violet";
  loading: boolean;
}) {
  const tones = {
    blue: {
      icon: "bg-blue-50 text-blue-600",
      value: "text-slate-950",
      line: "bg-blue-500",
    },
    emerald: {
      icon: "bg-emerald-50 text-emerald-600",
      value: "text-emerald-700",
      line: "bg-emerald-500",
    },
    amber: {
      icon: "bg-amber-50 text-amber-600",
      value: "text-amber-700",
      line: "bg-amber-500",
    },
    rose: {
      icon: "bg-rose-50 text-rose-600",
      value: "text-rose-700",
      line: "bg-rose-500",
    },
    violet: {
      icon: "bg-violet-50 text-violet-600",
      value: "text-violet-700",
      line: "bg-violet-500",
    },
  };

  const selected = tones[tone];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span
        className={`absolute inset-x-0 top-0 h-0.5 ${selected.line}`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[9px] font-bold uppercase tracking-[0.13em] text-slate-400">
            {label}
          </p>

          {loading ? (
            <div className="mt-2 h-7 w-12 animate-pulse rounded bg-slate-100" />
          ) : (
            <p
              className={`mt-2 text-xl font-bold tracking-tight ${selected.value}`}
            >
              {value}
            </p>
          )}
        </div>

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${selected.icon}`}
        >
          <Icon size={16} />
        </div>
      </div>
    </div>
  );
}

// =====================================================
// ATTENDANCE METRIC
// =====================================================

function AttendanceMetric({
  label,
  value,
  caption,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  caption: string;
  icon: typeof LogIn;
  tone:
    | "emerald"
    | "blue"
    | "violet"
    | "amber";
}) {
  const toneClasses = {
    emerald:
      "bg-emerald-50 text-emerald-600",
    blue:
      "bg-blue-50 text-blue-600",
    violet:
      "bg-violet-50 text-violet-600",
    amber:
      "bg-amber-50 text-amber-600",
  };

  return (
    <div className="p-5">
      <div className="flex items-center gap-2">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${toneClasses[tone]}`}
        >
          <Icon size={14} />
        </div>

        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
      </div>

      <p className="mt-3 truncate text-lg font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-slate-400">
        {caption}
      </p>
    </div>
  );
}

// =====================================================
// STATUS BADGE
// =====================================================

function StatusBadge({
  status,
}: {
  status?: string | null;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${getStatusClasses(status)}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />

      {getStatusLabel(status)}
    </span>
  );
}

// =====================================================
// DETAIL CELL
// =====================================================

function DetailCell({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="p-5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-2 truncate text-sm font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

// =====================================================
// EMPTY ATTENDANCE
// =====================================================

function EmptyAttendance() {
  return (
    <div className="flex flex-col items-center justify-center border-t border-slate-100 px-5 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100">
        <CalendarDays size={24} />
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-900">
        No attendance record today
      </h3>

      <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
        Your attendance information will appear
        here after today's attendance record is
        created.
      </p>
    </div>
  );
}