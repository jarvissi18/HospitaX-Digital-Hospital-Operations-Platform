import {
  Building2,
  User,
  ArrowRight,
  Settings as SettingsIcon,
  ShieldCheck,
  Activity,
  ChevronRight,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

// =====================================================
// TYPES
// =====================================================

interface SettingsCard {
  title: string;
  description: string;
  icon: React.ElementType;
  iconWrapper: string;
  iconColor: string;
  accent: string;
  route: string;
  category: string;
}

// =====================================================
// SETTINGS CONFIGURATION
// =====================================================

const settingsCards: SettingsCard[] = [
  {
    title: "Hospital Information",
    description:
      "Manage hospital identity, address, contact information and operational details.",
    icon: Building2,
    iconWrapper: "bg-blue-50",
    iconColor: "text-blue-600",
    accent: "group-hover:border-blue-200",
    route: "/settings/hospital",
    category: "Organization",
  },

  {
    title: "Admin Profile",
    description:
      "Manage administrator identity, contact information and system account details.",
    icon: User,
    iconWrapper: "bg-emerald-50",
    iconColor: "text-emerald-600",
    accent: "group-hover:border-emerald-200",
    route: "/settings/admin",
    category: "Administration",
  },
];

// =====================================================
// PAGE
// =====================================================

export default function Settings() {
  const navigate = useNavigate();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <header className="shrink-0 border-b border-slate-200/70 pb-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {/* LEFT */}

          <div>
            {/* Breadcrumb */}

            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-400">
              <SettingsIcon size={14} />

              <span>System Administration</span>

              <ChevronRight size={13} />

              <span className="text-slate-600">Settings</span>
            </div>

            {/* TITLE */}

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Settings
            </h1>

            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
              Configure and manage HospitaX system settings,
              administration and infrastructure.
            </p>
          </div>

          {/* =================================================
              SYSTEM STATUS
          ================================================= */}

          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
              <Activity
                size={19}
                className="text-emerald-600"
              />
            </div>

            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                System Status
              </p>

              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                <span className="text-sm font-bold text-emerald-700">
                  All Systems Operational
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* =================================================
          CONTENT
      ================================================= */}

      <main className="min-h-0 flex-1 overflow-y-auto py-6 pr-1">
        <div className="space-y-6">
          {/* =================================================
              CONFIGURATION
          ================================================= */}

          <section>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Configuration
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Manage the core configuration areas of
                  your HospitaX platform.
                </p>
              </div>

              <div className="hidden items-center gap-2 text-xs font-medium text-slate-400 sm:flex">
                <ShieldCheck size={15} />

                Administrator access
              </div>
            </div>

            {/* SETTINGS GRID */}

            <div className="grid gap-5 md:grid-cols-2">
              {settingsCards.map((card) => {
                return (
                  <SettingsCard
                    key={card.title}
                    card={card}
                    onClick={() => navigate(card.route)}
                  />
                );
              })}
            </div>
          </section>

          {/* =================================================
              SECURITY NOTICE
          ================================================= */}

          <section className="rounded-2xl border border-slate-200/80 bg-slate-50/70 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                <ShieldCheck
                  size={17}
                  className="text-slate-500"
                />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Administrative Controls
                </h3>

                <p className="mt-0.5 text-xs leading-5 text-slate-500">
                  Settings access is restricted to authorized
                  administrators. Changes made here may affect
                  hospital operations and system behavior.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// =====================================================
// SETTINGS CARD
// =====================================================

function SettingsCard({
  card,
  onClick,
}: {
  card: SettingsCard;
  onClick: () => void;
}) {
  const Icon = card.icon;

  return (
    <article
      onClick={onClick}
      className={`
        group
        relative
        flex
        min-h-[215px]
        cursor-pointer
        flex-col
        overflow-hidden
        rounded-3xl
        border
        border-slate-200/80
        bg-white
        p-6
        shadow-sm
        transition-all
        duration-300
        hover:-translate-y-1
        hover:shadow-xl
        ${card.accent}
      `}
    >
      {/* =================================================
          TOP
      ================================================= */}

      <div className="flex items-start justify-between">
        <div
          className={`
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-2xl
            ${card.iconWrapper}
          `}
        >
          <Icon
            size={23}
            className={card.iconColor}
            strokeWidth={2}
          />
        </div>

        {/* CATEGORY */}

        <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {card.category}
        </span>
      </div>

      {/* =================================================
          CONTENT
      ================================================= */}

      <div className="mt-5">
        <h3 className="text-lg font-bold tracking-tight text-slate-900">
          {card.title}
        </h3>

        <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
          {card.description}
        </p>
      </div>

      {/* =================================================
          ACTION
      ================================================= */}

      <div className="mt-auto flex items-center justify-between pt-5">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
          className="
            inline-flex
            items-center
            gap-2
            rounded-xl
            bg-slate-900
            px-4
            py-2.5
            text-sm
            font-semibold
            text-white
            shadow-sm
            transition
            hover:bg-blue-600
            focus:outline-none
            focus:ring-4
            focus:ring-blue-100
          "
        >
          Configure

          <ArrowRight
            size={15}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </button>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-300 transition group-hover:bg-blue-50 group-hover:text-blue-500">
          <ArrowRight size={16} />
        </div>
      </div>
    </article>
  );
}