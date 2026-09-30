import {
  Activity,
  HeartPulse,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";

import type { Patient } from "../../types/patient";
import PatientRow from "./PatientRow";

interface Props {
  patients: Patient[];
  onEdit: (patient: Patient) => void;
  onDelete: (id: number) => void;
}

export default function PatientTable({
  patients,
  onEdit,
  onDelete,
}: Props) {
  // =====================================================
  // EMPTY STATE
  // =====================================================

  if (patients.length === 0) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center px-6">

        <div className="max-w-sm text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <UserRound size={28} />
          </div>

          <h3 className="mt-5 text-sm font-bold text-slate-800">
            No patients found
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            There are no patient records matching
            your current search.
          </p>

        </div>

      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">

      {/* =================================================
          SCROLLABLE TABLE AREA
      ================================================= */}

      <div
      className="
        patient-table-scroll
        min-h-0
        flex-1
        overflow-x-auto
        overflow-y-auto
        overscroll-contain
        scroll-smooth
      "
    >

        <table className="w-full min-w-[1100px] border-collapse">

          {/* =================================================
              HEADER
          ================================================= */}

          <thead className="sticky top-0 z-20">
            <tr>

              <TableHeader
                icon={UserRound}
                color="blue"
              >
                Patient
              </TableHeader>

              <TableHeader
                icon={MapPin}
                color="indigo"
              >
                Location
              </TableHeader>

              <TableHeader
                icon={Activity}
                color="violet"
              >
                Age
              </TableHeader>

              <TableHeader
                color="pink"
              >
                Gender
              </TableHeader>

              <TableHeader
                icon={HeartPulse}
                color="rose"
              >
                Medical Condition
              </TableHeader>

              <TableHeader
                icon={Phone}
                color="emerald"
              >
                Contact
              </TableHeader>

              <TableHeader
                align="right"
                color="blue"
              >
                Actions
              </TableHeader>

            </tr>
          </thead>

          {/* =================================================
              BODY
          ================================================= */}

          <tbody className="divide-y divide-slate-100 bg-white">

            {patients.map(
              (patient) => (
                <PatientRow
                  key={patient.id}
                  patient={patient}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              )
            )}

          </tbody>

        </table>

      </div>


      {/* =================================================
          TABLE FOOTER
      ================================================= */}

      <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50/60 px-6 py-3">

        <p className="text-xs text-slate-500">

          Showing{" "}

          <span className="font-bold text-slate-700">
            {patients.length}
          </span>{" "}

          {patients.length === 1
            ? "patient"
            : "patients"}

        </p>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">

          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

          Registry active

        </div>

      </div>

    </div>
  );
}


// =====================================================
// TABLE HEADER
// =====================================================

function TableHeader({
  children,
  icon: Icon,
  color = "blue",
  align = "left",
}: {
  children: React.ReactNode;
  icon?: React.ElementType;
  color?: "blue" | "indigo" | "violet" | "pink" | "rose" | "emerald";
  align?: "left" | "right";
}) {
  const colorStyles = {
    blue: {
      wrapper: "bg-blue-50 text-blue-600",
      text: "text-blue-700",
    },
    indigo: {
      wrapper: "bg-indigo-50 text-indigo-600",
      text: "text-indigo-700",
    },
    violet: {
      wrapper: "bg-violet-50 text-violet-600",
      text: "text-violet-700",
    },
    pink: {
      wrapper: "bg-pink-50 text-pink-600",
      text: "text-pink-700",
    },
    rose: {
      wrapper: "bg-rose-50 text-rose-600",
      text: "text-rose-700",
    },
    emerald: {
      wrapper: "bg-emerald-50 text-emerald-600",
      text: "text-emerald-700",
    },
  };

  const styles = colorStyles[color];

  return (
    <th
      className={`
        whitespace-nowrap
        border-b
        border-slate-200
        bg-slate-50/80
        px-6
        py-3.5
        text-[10px]
        font-bold
        uppercase
        tracking-[0.12em]
        ${styles.text}
        ${
          align === "right"
            ? "text-right"
            : "text-left"
        }
      `}
    >
      <div
        className={`
          inline-flex
          items-center
          gap-2
          ${
            align === "right"
              ? "justify-end"
            : ""
          }
        `}
      >
        {Icon && (
          <span
            className={`
              flex
              h-7
              w-7
              items-center
              justify-center
              rounded-lg
              ${styles.wrapper}
            `}
          >
            <Icon size={14} strokeWidth={2.2} />
          </span>
        )}

        <span>
          {children}
        </span>
      </div>
    </th>
  );
}