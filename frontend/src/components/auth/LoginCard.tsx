import {
  Building2,
  ShieldCheck,
} from "lucide-react";

import LoginForm from "./LoginForm";

export default function LoginCard() {
  return (
    <div
      className="
        flex
        max-h-[calc(100vh-48px)]
        w-full
        max-w-[510px]
        flex-col
        overflow-hidden
        rounded-[28px]
        border
        border-slate-200/80
        bg-white
        shadow-[0_30px_90px_rgba(15,23,42,0.18)]
      "
    >
      {/* =====================================================
          CARD CONTENT
      ===================================================== */}

      <div className="px-7 py-7 sm:px-9 sm:py-8">
        {/* =================================================
            BRAND ICON
        ================================================= */}

        <div className="flex justify-center">
          <div
            className="
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-2xl
              bg-gradient-to-br
              from-blue-500
              to-indigo-600
              shadow-[0_12px_28px_rgba(37,99,235,0.22)]
            "
          >
            <Building2
              size={26}
              strokeWidth={2}
              className="text-white"
            />
          </div>
        </div>

        {/* =================================================
            HEADING
        ================================================= */}

        <div className="mt-5 text-center">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-[30px] font-bold tracking-[-0.025em] text-slate-950">
              Welcome Back
            </h2>

            
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Sign in to access HospitaX hospital operations.
          </p>
        </div>

        
        {/* =================================================
            FORM
        ================================================= */}

        <div className="mt-6">
          <LoginForm />
        </div>

        
        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck
              size={15}
              className="text-emerald-500"
            />

            <span>
              Protected by secure JWT authentication
            </span>
          </div>

          
        </div>
      </div>
    </div>
  );
}