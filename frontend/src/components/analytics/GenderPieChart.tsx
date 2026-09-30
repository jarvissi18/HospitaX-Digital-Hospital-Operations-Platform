import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Users, Info } from "lucide-react";

interface GenderPieChartProps {
  male: number;
  female: number;
}

interface GenderData {
  name: string;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: GenderData;
  }>;
}

const COLORS = {
  Male: "#2563EB",
  Female: "#DB2777",
};

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
        {item.name}
      </p>

      <p className="mt-1 text-lg font-bold text-slate-900">
        {item.value.toLocaleString()}
      </p>

      <p className="text-xs text-slate-500">Patients</p>
    </div>
  );
}

export default function GenderPieChart({
  male,
  female,
}: GenderPieChartProps) {
  const data: GenderData[] = [
    {
      name: "Male",
      value: male,
    },
    {
      name: "Female",
      value: female,
    },
  ];

  const total = male + female;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-50">
              <Users className="h-4 w-4 text-pink-600" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Gender Distribution
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Male and female patient counts
              </p>
            </div>
          </div>
        </div>

        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50">
          <Info className="h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>

      <div className="mt-4 h-72">
        {total === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 text-center">
            <Users className="h-8 w-8 text-slate-300" />

            <p className="mt-3 text-sm font-medium text-slate-600">
              No gender data available
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Patient distribution will appear here.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                innerRadius={62}
                outerRadius={92}
                paddingAngle={3}
                stroke="#FFFFFF"
                strokeWidth={3}
              >
                {data.map((item) => (
                  <Cell
                    key={item.name}
                    fill={COLORS[item.name as keyof typeof COLORS]}
                  />
                ))}
              </Pie>

              <Tooltip content={<CustomTooltip />} />

              <Legend
                verticalAlign="bottom"
                height={28}
                iconType="circle"
                formatter={(value) => (
                  <span className="text-xs font-medium text-slate-600">
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}