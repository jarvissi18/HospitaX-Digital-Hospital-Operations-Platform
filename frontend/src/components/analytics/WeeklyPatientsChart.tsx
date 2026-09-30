import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Activity, Info } from "lucide-react";

import type { WeeklyAnalytics } from "../../services/patientApi";

interface WeeklyPatientsChartProps {
  data: WeeklyAnalytics[];
}

interface TooltipPayload {
  value?: number;
  payload?: WeeklyAnalytics;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0]?.payload;

  if (!item) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {item.day}
      </p>

      <p className="mt-1 text-lg font-bold text-slate-900">
        {item.patients.toLocaleString()}
      </p>

      <p className="text-xs text-slate-500">Patient registrations</p>
    </div>
  );
}

export default function WeeklyPatientsChart({
  data,
}: WeeklyPatientsChartProps) {
  const hasData = data.some((item) => item.patients > 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <Activity className="h-4 w-4 text-blue-600" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Weekly Patients
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Patient registrations this week
              </p>
            </div>
          </div>
        </div>

        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50">
          <Info className="h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>

      <div className="mt-6 h-72">
        {!hasData ? (
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 text-center">
            <Activity className="h-8 w-8 text-slate-300" />

            <p className="mt-3 text-sm font-medium text-slate-600">
              No patient registrations this week
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Weekly registration data will appear here.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{
                top: 10,
                right: 12,
                left: -18,
                bottom: 0,
              }}
            >
              <CartesianGrid
                stroke="#E2E8F0"
                strokeDasharray="4 4"
                vertical={false}
              />

              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{
                  fontSize: 12,
                  fill: "#64748B",
                }}
                dy={8}
              />

              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{
                  fontSize: 12,
                  fill: "#64748B",
                }}
                width={42}
              />

              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  stroke: "#CBD5E1",
                  strokeDasharray: "4 4",
                }}
              />

              <Line
                type="monotone"
                dataKey="patients"
                stroke="#2563EB"
                strokeWidth={3}
                dot={{
                  r: 4,
                  fill: "#FFFFFF",
                  stroke: "#2563EB",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 6,
                  fill: "#2563EB",
                  stroke: "#FFFFFF",
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}