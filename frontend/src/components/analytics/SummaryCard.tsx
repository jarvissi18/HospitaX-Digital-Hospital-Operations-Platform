import {
  Activity,
  CalendarDays,
  Mars,
  Venus,
  type LucideIcon,
} from "lucide-react";

interface SummaryCardProps {
  title: string;
  value: number;
  color?: "blue" | "green" | "purple" | "pink";
}

interface CardStyle {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  valueColor: string;
  accent: string;
}

const colorStyles: Record<
  NonNullable<SummaryCardProps["color"]>,
  CardStyle
> = {
  blue: {
    icon: Activity,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    valueColor: "text-slate-900",
    accent: "bg-blue-600",
  },
  green: {
    icon: CalendarDays,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    valueColor: "text-slate-900",
    accent: "bg-emerald-600",
  },
  purple: {
    icon: Mars,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    valueColor: "text-slate-900",
    accent: "bg-violet-600",
  },
  pink: {
    icon: Venus,
    iconBg: "bg-pink-50",
    iconColor: "text-pink-600",
    valueColor: "text-slate-900",
    accent: "bg-pink-600",
  },
};

export default function SummaryCard({
  title,
  value,
  color = "blue",
}: SummaryCardProps) {
  const styles = colorStyles[color];
  const Icon = styles.icon;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      {/* Accent line */}
      <div
        className={`absolute inset-x-0 top-0 h-1 ${styles.accent} opacity-90`}
      />

      <div className="flex items-start justify-between gap-4">
        {/* Title */}
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <div className="mt-3 flex items-baseline gap-2">
            <h2
              className={`text-3xl font-bold tracking-tight ${styles.valueColor}`}
            >
              {value.toLocaleString()}
            </h2>
          </div>
        </div>

        {/* Icon */}
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles.iconBg}`}
        >
          <Icon className={`h-5 w-5 ${styles.iconColor}`} strokeWidth={2} />
        </div>
      </div>

      {/* Supporting context */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        <p className="text-xs font-medium text-slate-400">
          Current count
        </p>
      </div>
    </div>
  );
}