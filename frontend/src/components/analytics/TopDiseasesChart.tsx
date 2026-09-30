import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Activity, Info } from "lucide-react";

import type { TopDisease } from "../../services/patientApi";

interface TopDiseasesChartProps {
  data: TopDisease[];
}

interface TooltipPayload {
  payload?: TopDisease;
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
      <p className="max-w-48 truncate text-xs font-medium uppercase tracking-wide text-slate-400">
        {item.disease}
      </p>

      <p className="mt-1 text-lg font-bold text-slate-900">
        {item.patients.toLocaleString()}
      </p>

      <p className="text-xs text-slate-500">Patients</p>
    </div>
  );
}

export default function TopDiseasesChart({
  data,
}: TopDiseasesChartProps) {
  const hasData = data.length > 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
              <Activity className="h-4 w-4 text-amber-600" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Top Diseases
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Most common recorded diseases
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
              No disease data available
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Recorded disease statistics will appear here.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
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
                dataKey="disease"
                axisLine={false}
                tickLine={false}
                tick={{
                  fontSize: 11,
                  fill: "#64748B",
                }}
                tickFormatter={(value: string) =>
                  value.length > 12
                    ? `${value.slice(0, 12)}…`
                    : value
                }
                interval={0}
                angle={-20}
                textAnchor="end"
                height={55}
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
                  fill: "#F8FAFC",
                }}
              />

              <Bar
                dataKey="patients"
                fill="#F59E0B"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}