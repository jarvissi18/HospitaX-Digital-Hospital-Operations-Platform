import {
  UsersRound,
  UserCheck,
  UserX,
} from "lucide-react";

interface Props {
  total: number;
  active: number;
  inactive: number;
}

export default function UserStats({
  total,
  active,
  inactive,
}: Props) {
  return (
    <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">

      <StatCard
        title="Total Staff"
        value={total}
        description="Registered hospital staff"
        icon={UsersRound}
        iconStyle="bg-blue-50 text-blue-600"
      />

      <StatCard
        title="Active Staff"
        value={active}
        description="Currently active staff"
        icon={UserCheck}
        iconStyle="bg-emerald-50 text-emerald-600"
      />

      <StatCard
        title="Inactive Staff"
        value={inactive}
        description="Inactive staff records"
        icon={UserX}
        iconStyle="bg-rose-50 text-rose-600"
      />

    </div>
  );
}


// =====================================================
// STAT CARD
// =====================================================

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconStyle,
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof UsersRound;
  iconStyle: string;
}) {
  return (
    <div
      className="
        group
        rounded-2xl
        border
        border-slate-200/80
        bg-white
        p-4
        shadow-sm
        transition-all
        duration-300
        hover:-translate-y-0.5
        hover:shadow-md
      "
    >

      {/* Top Row */}

      <div className="flex items-start justify-between">

        {/* Icon */}

        <div
          className={`
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-xl
            ${iconStyle}
          `}
        >
          <Icon
            size={20}
            strokeWidth={2}
          />
        </div>


        {/* Value */}

        <span className="text-2xl font-bold tracking-tight text-slate-900">
          {value}
        </span>

      </div>


      {/* Title */}

      <h3 className="mt-3 text-sm font-semibold text-slate-800">
        {title}
      </h3>


      {/* Description */}

      <p className="mt-0.5 truncate text-xs text-slate-500">
        {description}
      </p>

    </div>
  );
}