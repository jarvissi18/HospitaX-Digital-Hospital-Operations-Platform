import {
  Building2,
  CheckCircle2,
  ClipboardCheck,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

export default function LoginBanner() {
  return (
    <div className="relative flex h-full min-h-0 w-full overflow-hidden">
      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div className="absolute inset-0 bg-[#071A3A]" />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage:
            "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />

      {/* Gradient Glow */}
      <div className="absolute -left-32 top-10 h-[420px] w-[420px] rounded-full bg-blue-500/10 blur-[120px]" />

      <div className="absolute bottom-[-160px] right-[-100px] h-[480px] w-[480px] rounded-full bg-cyan-400/10 blur-[130px]" />

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div
        className="
          relative
          z-10
          flex
          h-full
          min-h-0
          w-full
          flex-col
          justify-between
          px-8
          py-7
          lg:px-9
          xl:px-12
          xl:py-8
          2xl:px-14
        "
      >
        {/* =================================================
            BRAND
        ================================================= */}

        <div>
          <div className="flex items-center gap-3.5">
            {/* Logo */}
            <div
              className="
                flex
                h-12
                w-12
                shrink-0
                items-center
                justify-center
                rounded-2xl
                bg-gradient-to-br
                from-blue-500
                to-indigo-600
                shadow-[0_12px_30px_rgba(37,99,235,0.28)]
              "
            >
              <Building2
                size={24}
                strokeWidth={2}
                className="text-white"
              />
            </div>

            {/* Brand Text */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-[23px] font-bold tracking-tight text-white xl:text-[25px]">
                  HospitaX
                </h2>

                <span
                  className="
                    rounded-md
                    border
                    border-blue-400/30
                    bg-blue-400/10
                    px-1.5
                    py-0.5
                    text-[7px]
                    font-bold
                    uppercase
                    tracking-[0.14em]
                    text-blue-200
                  "
                >
                  HMS
                </span>
              </div>

              <p className="mt-0.5 text-[11px] font-medium text-blue-200/90 xl:text-xs">
                Digital Hospital Operations Platform
              </p>
            </div>
          </div>

          {/* Operations Badge */}
          <div
            className="
              mt-5
              inline-flex
              items-center
              gap-2
              rounded-full
              border
              border-white/10
              bg-white/[0.055]
              px-3.5
              py-1.5
              backdrop-blur-sm
            "
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />

            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-blue-100">
              Hospital Operations
            </span>
          </div>
        </div>

        {/* =================================================
            HERO
        ================================================= */}

        <div className="my-5 max-w-[610px] xl:my-6">
          <h1
            className="
              text-[38px]
              font-extrabold
              leading-[1.04]
              tracking-[-0.035em]
              text-white
              lg:text-[40px]
              xl:text-[46px]
              2xl:text-[50px]
            "
          >
            One Platform.
            <br />
            Smarter Hospital
            <br />
            Operations.
          </h1>

          <p
            className="
              mt-4
              max-w-[570px]
              text-[13px]
              leading-6
              text-blue-100/80
              xl:text-[14px]
              xl:leading-6
            "
          >
            A connected platform for managing hospital staff,
            attendance, patients and everyday operational
            workflows from one secure environment.
          </p>

          {/* =================================================
              FEATURE GRID
          ================================================= */}

          <div className="mt-5 grid max-w-[620px] grid-cols-2 gap-2.5">
            <FeatureCard
              icon={UsersRound}
              title="Staff Management"
              description="Role-based workforce control"
            />

            <FeatureCard
              icon={ClipboardCheck}
              title="Attendance"
              description="Check-in, check-out & tracking"
            />

            <FeatureCard
              icon={ShieldCheck}
              title="Secure Access"
              description="Protected staff authentication"
            />

            <FeatureCard
              icon={Building2}
              title="Hospital Operations"
              description="Connected operational workflows"
            />
          </div>
        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="border-t border-white/10 pt-3.5">
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-blue-100">
                Secure Staff Access
              </p>

              <p className="mt-0.5 text-[10px] text-blue-300/80">
                HospitaX Hospital Management System
              </p>
            </div>

            <div className="hidden items-center gap-2 text-[10px] font-medium text-blue-200/70 xl:flex">
              <ShieldCheck size={14} />
              Protected Environment
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// FEATURE CARD
// =========================================================

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof UsersRound;
  title: string;
  description: string;
}) {
  return (
    <div
      className="
        group
        flex
        min-h-[64px]
        items-center
        gap-2.5
        rounded-xl
        border
        border-white/[0.08]
        bg-white/[0.045]
        px-3
        py-2.5
        backdrop-blur-sm
        transition-all
        duration-300
        hover:border-white/[0.14]
        hover:bg-white/[0.07]
      "
    >
      <div
        className="
          flex
          h-9
          w-9
          shrink-0
          items-center
          justify-center
          rounded-lg
          border
          border-blue-300/10
          bg-blue-400/[0.09]
        "
      >
        <Icon
          size={17}
          strokeWidth={1.8}
          className="text-blue-300"
        />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <CheckCircle2
            size={11}
            className="shrink-0 text-emerald-400"
          />

          <p className="truncate text-[12px] font-semibold text-white xl:text-[13px]">
            {title}
          </p>
        </div>

        <p className="mt-0.5 truncate text-[9px] text-blue-200/65 xl:text-[10px]">
          {description}
        </p>
      </div>
    </div>
  );
}