import type { ReactNode } from "react";
import { X, UsersRound } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export default function UserModal({
  open,
  title,
  children,
  onClose,
}: Props) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-slate-950/50
        p-4
        backdrop-blur-sm
      "
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >

      {/* =================================================
          MODAL
      ================================================= */}

      <div
        className="
          w-full
          max-w-xl
          overflow-hidden
          rounded-3xl
          border
          border-slate-200
          bg-white
          shadow-2xl
        "
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">

          <div className="flex items-center gap-3">

            {/* Icon */}

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UsersRound
                size={19}
                strokeWidth={2}
              />
            </div>


            {/* Title */}

            <div className="min-w-0">

              <h2 className="truncate text-lg font-bold tracking-tight text-slate-900">
                {title}
              </h2>

              <p className="mt-0.5 text-xs text-slate-400">
                HospitaX staff management
              </p>

            </div>

          </div>


          {/* Close */}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            title="Close"
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-xl
              text-slate-400
              transition
              hover:bg-slate-100
              hover:text-slate-700
            "
          >
            <X size={18} />
          </button>

        </div>


        {/* =================================================
            CONTENT
        ================================================= */}

        <div className="max-h-[calc(100vh-180px)] overflow-y-auto p-6">

          {children}

        </div>

      </div>

    </div>
  );
}