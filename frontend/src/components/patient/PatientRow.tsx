import {
  FileText,
  Pencil,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import type { Patient } from "../../types/patient";

type PatientRowProps = {
  patient: Patient;
  onEdit: (patient: Patient) => void;
  onDelete: (id: number) => void;
};

export default function PatientRow({
  patient,
  onEdit,
  onDelete,
}: PatientRowProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const role = user?.role;

  /*
   * Existing Doctor/Nurse behavior:
   * - They can still view/open the patient profile.
   * - They do NOT get patient edit/delete controls.
   *
   * Receptionist:
   * - Can view patient profile.
   * - Can edit patient demographic information.
   *
   * Administrator:
   * - Existing full patient management access.
   */

  const canEdit =
    role === "Administrator" ||
    role === "Receptionist";

  const canDelete =
    role === "Administrator";

  const handleOpenProfile = () => {
    navigate(`/patients/${patient.id}`);
  };

  return (
    <tr
      className="
        group
        border-b
        border-slate-100
        transition-colors
        hover:bg-slate-50/80
        last:border-b-0
      "
    >
      {/* =====================================================
          PATIENT
      ===================================================== */}
      <td className="px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-blue-50
              text-sm
              font-bold
              text-blue-600
            "
          >
            {patient.name?.trim().charAt(0).toUpperCase() ||
              "P"}
          </div>

          <div className="min-w-0">
            <button
              type="button"
              onClick={handleOpenProfile}
              className="
                block
                max-w-[220px]
                truncate
                text-left
                text-sm
                font-bold
                text-slate-800
                transition-colors
                hover:text-blue-600
              "
              title={patient.name}
            >
              {patient.name}
            </button>

            <p
              className="
                mt-0.5
                text-[11px]
                text-slate-400
              "
            >
              Patient #{patient.id}
            </p>
          </div>
        </div>
      </td>

      {/* =====================================================
          LOCATION
      ===================================================== */}
      <td className="px-4 py-4">
        <span
          className="
            block
            max-w-[150px]
            truncate
            text-xs
            font-medium
            text-slate-600
          "
          title={patient.village}
        >
          {patient.village || "—"}
        </span>
      </td>

      {/* =====================================================
          AGE
      ===================================================== */}
      <td className="px-4 py-4">
        <span
          className="
            text-xs
            font-semibold
            text-slate-700
          "
        >
          {patient.age}
        </span>
      </td>

      {/* =====================================================
          GENDER
      ===================================================== */}
      <td className="px-4 py-4">
        <span
          className="
            inline-flex
            rounded-full
            bg-slate-100
            px-2.5
            py-1
            text-[10px]
            font-bold
            text-slate-600
          "
        >
          {patient.gender || "—"}
        </span>
      </td>

      {/* =====================================================
          MEDICAL CONDITION
      ===================================================== */}
      <td className="px-4 py-4">
        <span
          className="
            block
            max-w-[180px]
            truncate
            text-xs
            font-semibold
            text-slate-700
          "
          title={patient.disease}
        >
          {patient.disease || "Not specified"}
        </span>
      </td>

      {/* =====================================================
          CONTACT
      ===================================================== */}
      <td className="px-4 py-4">
        <span
          className="
            whitespace-nowrap
            text-xs
            font-medium
            text-slate-600
          "
        >
          {patient.mobile || "—"}
        </span>
      </td>

      {/* =====================================================
          ACTIONS
      ===================================================== */}
      <td className="px-4 py-4">
        <div className="flex items-center justify-end gap-1.5">

          {/* -------------------------------------------------
              VIEW PATIENT PROFILE

              Available for Doctor, Nurse, Receptionist,
              Administrator and other roles that can reach
              the patient registry.

              Existing Doctor/Nurse profile behavior remains
              unchanged.
          ------------------------------------------------- */}
          <button
            type="button"
            onClick={handleOpenProfile}
            title="View patient profile"
            aria-label={`View ${patient.name} profile`}
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-lg
              border
              border-slate-200
              bg-white
              text-slate-500
              transition-all
              hover:border-blue-200
              hover:bg-blue-50
              hover:text-blue-600
            "
          >
            <FileText size={16} />
          </button>

          {/* -------------------------------------------------
              EDIT PATIENT

              Administrator + Receptionist only.

              Doctor/Nurse do not receive this action.
          ------------------------------------------------- */}
          {canEdit && (
            <button
              type="button"
              onClick={() => onEdit(patient)}
              title="Edit patient"
              aria-label={`Edit ${patient.name}`}
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-lg
                border
                border-slate-200
                bg-white
                text-slate-500
                transition-all
                hover:border-amber-200
                hover:bg-amber-50
                hover:text-amber-600
              "
            >
              <Pencil size={15} />
            </button>
          )}

          {/* -------------------------------------------------
              DELETE PATIENT

              Administrator only.

              Receptionist/Doctor/Nurse do not receive
              delete access.
          ------------------------------------------------- */}
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(patient.id)}
              title="Delete patient"
              aria-label={`Delete ${patient.name}`}
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-lg
                border
                border-slate-200
                bg-white
                text-slate-500
                transition-all
                hover:border-red-200
                hover:bg-red-50
                hover:text-red-600
              "
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}