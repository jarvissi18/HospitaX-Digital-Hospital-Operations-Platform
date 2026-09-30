import {
  AlertCircle,
  CalendarCheck2,
  Clock3,
  UsersRound,
} from "lucide-react";

import type { ElementType } from "react";

// =====================================================
// TYPES
// =====================================================

export interface AttendanceSummaryData {
  date?: string;
  total_staff?: number;
  present?: number;
  late?: number;
  absent?: number;
  leave?: number;
  available_for_assignment?: number;
}

interface AttendanceSummaryProps {
  summary: AttendanceSummaryData | null;
  loading?: boolean;
}

// =====================================================
// STAT CONFIG
// =====================================================

interface StatConfig {
  key:
    | "total_staff"
    | "present"
    | "absent"
    | "late"
    | "leave";

  label: string;
  description: string;
  icon: ElementType;
  iconClass: string;
}

const STATS: StatConfig[] = [
  {
    key: "total_staff",
    label: "Total Staff",
    description: "Registered hospital staff",
    icon: UsersRound,
    iconClass: "bg-blue-50 text-blue-600",
  },
  {
    key: "present",
    label: "Present",
    description: "Currently present",
    icon: CalendarCheck2,
    iconClass: "bg-emerald-50 text-emerald-600",
  },
  {
    key: "absent",
    label: "Absent",
    description: "Marked absent",
    icon: AlertCircle,
    iconClass: "bg-rose-50 text-rose-600",
  },
  {
    key: "late",
    label: "Late",
    description: "Reported late",
    icon: Clock3,
    iconClass: "bg-amber-50 text-amber-600",
  },
  {
    key: "leave",
    label: "On Leave",
    description: "Currently on leave",
    icon: CalendarCheck2,
    iconClass: "bg-violet-50 text-violet-600",
  },
];

// =====================================================
// SAFE NUMBER
// =====================================================

function getNumber(
  value: unknown,
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  return 0;
}

// =====================================================
// LOADING CARD
// =====================================================

function LoadingCard() {
  return (
    <div
      className="
        animate-pulse
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-4
        shadow-sm
      "
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="h-3 w-24 rounded bg-slate-200" />

          <div className="mt-3 h-8 w-14 rounded bg-slate-200" />

          <div className="mt-2 h-3 w-32 rounded bg-slate-100" />
        </div>

        <div className="h-10 w-10 rounded-xl bg-slate-200" />
      </div>
    </div>
  );
}

// =====================================================
// COMPONENT
// =====================================================

export default function AttendanceSummary({
  summary,
  loading = false,
}: AttendanceSummaryProps) {
  if (loading) {
    return (
      <div
        className="
          grid
          shrink-0
          grid-cols-1
          gap-3
          sm:grid-cols-2
          lg:grid-cols-3
          xl:grid-cols-5
        "
      >
        {STATS.map((stat) => (
          <LoadingCard key={stat.key} />
        ))}
      </div>
    );
  }

  const data = summary ?? {};

  return (
    <div
      className="
        grid
        shrink-0
        grid-cols-1
        gap-3
        sm:grid-cols-2
        lg:grid-cols-3
        xl:grid-cols-5
      "
    >
      {STATS.map((stat) => {
        const Icon = stat.icon;

        const value = getNumber(
          data[stat.key],
        );

        return (
          <div
            key={stat.key}
            className="
              group
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-4
              shadow-sm
              transition-all
              duration-200
              hover:-translate-y-0.5
              hover:border-slate-300
              hover:shadow-md
            "
          >
            <div
              className="
                flex
                items-start
                justify-between
                gap-4
              "
            >
              <div className="min-w-0">
                <p
                  className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.14em]
                    text-slate-400
                  "
                >
                  {stat.label}
                </p>

                <p
                  className="
                    mt-2
                    text-2xl
                    font-bold
                    tracking-tight
                    text-slate-900
                  "
                >
                  {value}
                </p>

                <p
                  className="
                    mt-1
                    text-[11px]
                    text-slate-400
                  "
                >
                  {stat.description}
                </p>
              </div>

              <div
                className={`
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  transition-transform
                  duration-200
                  group-hover:scale-105
                  ${stat.iconClass}
                `}
              >
                <Icon size={18} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}