import {
  CalendarDays,
  Clock3,
  LogIn,
  LogOut,
  MoreHorizontal,
  UserRound,
} from "lucide-react";
import type { ElementType } from "react";

export type AttendanceStatus =
  | "Present"
  | "Absent"
  | "Late"
  | "Leave"
  | string;

export interface AttendanceRecord {
  id: number;
  user_id: number;
  attendance_date: string;
  shift: string;
  check_in?: string | null;
  check_out?: string | null;
  status: AttendanceStatus;
  work_duration_minutes?: number | null;
  notes?: string | null;
}

export interface AttendanceStaff {
  id: number;
  employee_id?: string | null;
  full_name: string;
  role?: string | null;
}

interface AttendanceTableProps {
  records: AttendanceRecord[];
  staff?: AttendanceStaff[];
  loading?: boolean;
  onEdit?: (record: AttendanceRecord) => void;
  onDelete?: (record: AttendanceRecord) => void;
  onCheckIn?: (record: AttendanceRecord) => void;
  onCheckOut?: (record: AttendanceRecord) => void;
}

interface StatusConfig {
  label: string;
  className: string;
  dotClassName: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  Present: {
    label: "Present",
    className:
      "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
    dotClassName: "bg-emerald-500",
  },
  Absent: {
    label: "Absent",
    className: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
    dotClassName: "bg-red-500",
  },
  Late: {
    label: "Late",
    className:
      "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
    dotClassName: "bg-amber-500",
  },
  Leave: {
    label: "On Leave",
    className:
      "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
    dotClassName: "bg-blue-500",
  },
};

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(minutes?: number | null) {
  if (minutes === null || minutes === undefined) {
    return "—";
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

function getStatusConfig(status: AttendanceStatus): StatusConfig {
  return (
    STATUS_CONFIG[status] ?? {
      label: status || "Unknown",
      className:
        "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200",
      dotClassName: "bg-slate-400",
    }
  );
}

function IconText({
  icon: Icon,
  children,
}: {
  icon: ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <span>{children}</span>
    </div>
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={index} className="border-b border-slate-100">
          <td className="px-5 py-4">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
          </td>

          <td className="px-5 py-4">
            <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
          </td>

          <td className="px-5 py-4">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
          </td>

          <td className="px-5 py-4">
            <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
          </td>

          <td className="px-5 py-4">
            <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
          </td>

          <td className="px-5 py-4">
            <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
          </td>

          <td className="px-5 py-4">
            <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
          </td>

          <td className="px-5 py-4">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100" />
          </td>
        </tr>
      ))}
    </>
  );
}

export default function AttendanceTable({
  records,
  staff = [],
  loading = false,
  onEdit,
  onDelete,
  onCheckIn,
  onCheckOut,
}: AttendanceTableProps) {
  const staffMap = new Map<number, AttendanceStaff>(
    staff.map((member) => [member.id, member]),
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Table header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Attendance Records
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Staff attendance, shifts and working hours
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
          {records.length} {records.length === 1 ? "record" : "records"}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-[1100px] w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70">
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Staff
              </th>

              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Role
              </th>

              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Date
              </th>

              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Shift
              </th>

              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Check In
              </th>

              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Check Out
              </th>

              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Duration
              </th>

              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </th>

              <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <LoadingRows />
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-16 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                      <CalendarDays className="h-6 w-6 text-slate-400" />
                    </div>

                    <h3 className="mt-4 text-sm font-semibold text-slate-900">
                      No attendance records
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Attendance records will appear here once they are
                      created.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              records.map((record) => {
                const member = staffMap.get(record.user_id);
                const status = getStatusConfig(record.status);

                return (
                  <tr
                    key={record.id}
                    className="group transition-colors hover:bg-slate-50/70"
                  >
                    {/* Staff */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          <UserRound className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {member?.full_name ?? `Staff #${record.user_id}`}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {member?.employee_id
                              ? `ID: ${member.employee_id}`
                              : `User ID: ${record.user_id}`}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-5 py-4">
                      <span className="text-sm text-slate-600">
                        {member?.role ?? "—"}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4">
                      <IconText icon={CalendarDays}>
                        {formatDate(record.attendance_date)}
                      </IconText>
                    </td>

                    {/* Shift */}
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {record.shift || "—"}
                      </span>
                    </td>

                    {/* Check in */}
                    <td className="px-5 py-4">
                      <IconText icon={LogIn}>
                        {formatTime(record.check_in)}
                      </IconText>
                    </td>

                    {/* Check out */}
                    <td className="px-5 py-4">
                      <IconText icon={LogOut}>
                        {formatTime(record.check_out)}
                      </IconText>
                    </td>

                    {/* Duration */}
                    <td className="px-5 py-4">
                      <IconText icon={Clock3}>
                        {formatDuration(record.work_duration_minutes)}
                      </IconText>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${status.dotClassName}`}
                        />

                        {status.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                          {onCheckIn &&
                            !record.check_in &&
                            record.status !== "Absent" &&
                            record.status !== "Leave" && (
                              <button
                                type="button"
                                onClick={() => onCheckIn(record)}
                                title="Check in"
                                className="rounded-md p-1.5 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-600"
                              >
                                <LogIn className="h-4 w-4" />
                              </button>
                            )}

                          {onCheckOut &&
                            record.check_in &&
                            !record.check_out && (
                              <button
                                type="button"
                                onClick={() => onCheckOut(record)}
                                title="Check out"
                                className="rounded-md p-1.5 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                              >
                                <LogOut className="h-4 w-4" />
                              </button>
                            )}

                          {onEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit(record)}
                              title="Edit attendance"
                              className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          )}

                          {onDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(record)}
                              title="Delete attendance"
                              className="rounded-md p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <span className="sr-only">Delete</span>
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="h-4 w-4"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M3 6h18"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M8 6V4h8v2"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19 6l-1 14H6L5 6"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M10 11v5M14 11v5"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}