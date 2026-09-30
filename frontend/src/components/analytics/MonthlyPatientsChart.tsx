import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { CalendarDays, Info } from "lucide-react";

import type { MonthlyPatient } from "../../services/patientApi";

interface MonthlyPatientsChartProps {
  data: MonthlyPatient[];
}

interface TooltipPayload {
  payload?: MonthlyPatient;
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
        {item.month}
      </p>

      <p className="mt-1 text-lg font-bold text-slate-900">
        {item.patients.toLocaleString()}
      </p>

      <p className="text-xs text-slate-500">Patient registrations</p>
    </div>
  );
}

export default function MonthlyPatientsChart({
  data,
}: MonthlyPatientsChartProps) {
  const hasData = data.some((item) => item.patients > 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
              <CalendarDays className="h-4 w-4 text-violet-600" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Monthly Patients
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Patient registrations month-wise
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
            <CalendarDays className="h-8 w-8 text-slate-300" />

            <p className="mt-3 text-sm font-medium text-slate-600">
              No monthly registration data
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Monthly patient data will appear here.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 10,
                right: 12,
                left: -18,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient
                  id="monthlyPatientsGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="#7C3AED"
                    stopOpacity={0.22}
                  />

                  <stop
                    offset="95%"
                    stopColor="#7C3AED"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke="#E2E8F0"
                strokeDasharray="4 4"
                vertical={false}
              />

              <XAxis
                dataKey="month"
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

              <Area
                type="monotone"
                dataKey="patients"
                stroke="#7C3AED"
                fill="url(#monthlyPatientsGradient)"
                strokeWidth={3}
                dot={{
                  r: 3,
                  fill: "#FFFFFF",
                  stroke: "#7C3AED",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 5,
                  fill: "#7C3AED",
                  stroke: "#FFFFFF",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}