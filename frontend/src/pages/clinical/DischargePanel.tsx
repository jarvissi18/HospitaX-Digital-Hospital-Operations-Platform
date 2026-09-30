import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock3,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Stethoscope,
  XCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";

import {
  createDischarge,
  getPatientDischarges,
  updateDischarge,
  updateDischargeStatus,
  type Discharge,
  type DischargeCreate,
  type DischargeStatus,
  type DischargeType,
  type DischargeUpdate,
} from "../../services/dischargeApi";

import type { ClinicalEncounter } from "../../services/clinicalEncounterApi";

interface DischargePanelProps {
  patientId: number;
  encounters: ClinicalEncounter[];
  canManage: boolean;
}

const STATUS_META: Record<
  DischargeStatus,
  {
    label: string;
    className: string;
  }
> = {
  PLANNED: {
    label: "Planned",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  READY: {
    label: "Ready",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  DISCHARGED: {
    label: "Discharged",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

const DISCHARGE_TYPES: {
  value: DischargeType;
  label: string;
}[] = [
  { value: "ROUTINE", label: "Routine" },
  { value: "LAMA", label: "LAMA" },
  { value: "REFERRED", label: "Referred" },
  { value: "TRANSFERRED", label: "Transferred" },
  { value: "DECEASED", label: "Deceased" },
];

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          data?: {
            detail?: string | Array<{ msg?: string }>;
          };
        };
      }
    ).response;

    const detail = response?.data?.detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail
        .map((item) => item?.msg)
        .filter(Boolean)
        .join(", ");
    }
  }

  return "Something went wrong. Please try again.";
}

const EMPTY_FORM = {
  encounter_id: "",
  discharge_type: "ROUTINE" as DischargeType,
  final_diagnosis: "",
  clinical_summary: "",
  condition_at_discharge: "",
  treatment_summary: "",
  discharge_medications: "",
  discharge_instructions: "",
  diet_instructions: "",
  activity_restrictions: "",
  warning_signs: "",
  follow_up_required: false,
  follow_up_date: "",
  follow_up_instructions: "",
  notes: "",
};

type FormState = typeof EMPTY_FORM;

export default function DischargePanel({
  patientId,
  encounters,
  canManage,
}: DischargePanelProps) {
  const [discharges, setDischarges] = useState<Discharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const activeDischarge = useMemo(
    () =>
      discharges.find(
        (item) =>
          item.status === "PLANNED" || item.status === "READY"
      ),
    [discharges]
  );

  const dischargedCount = useMemo(
    () =>
      discharges.filter((item) => item.status === "DISCHARGED").length,
    [discharges]
  );

  const loadDischarges = async () => {
    try {
      setLoading(true);

      const data = await getPatientDischarges(patientId);

      setDischarges(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load discharges:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDischarges();
  }, [patientId]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    setEditingId(null);

    setForm({
      ...EMPTY_FORM,
      encounter_id:
        activeDischarge?.encounter_id?.toString() ||
        encounters[0]?.id?.toString() ||
        "",
    });

    setShowForm(true);
  };

  const openEditForm = (discharge: Discharge) => {
    setEditingId(discharge.id);

    setForm({
      encounter_id: discharge.encounter_id?.toString() || "",
      discharge_type: discharge.discharge_type,
      final_diagnosis: discharge.final_diagnosis || "",
      clinical_summary: discharge.clinical_summary || "",
      condition_at_discharge: discharge.condition_at_discharge || "",
      treatment_summary: discharge.treatment_summary || "",
      discharge_medications: discharge.discharge_medications || "",
      discharge_instructions: discharge.discharge_instructions || "",
      diet_instructions: discharge.diet_instructions || "",
      activity_restrictions: discharge.activity_restrictions || "",
      warning_signs: discharge.warning_signs || "",
      follow_up_required: Boolean(discharge.follow_up_required),
      follow_up_date: toDateTimeLocal(discharge.follow_up_date),
      follow_up_instructions: discharge.follow_up_instructions || "",
      notes: discharge.notes || "",
    });

    setShowForm(true);
  };

  const updateField = <K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canManage) {
      toast.error("You do not have permission to manage discharge.");
      return;
    }

    if (!form.encounter_id) {
      toast.error("Please select an encounter.");
      return;
    }

    if (!form.final_diagnosis.trim()) {
      toast.error("Final diagnosis is required.");
      return;
    }

    try {
      setSaving(true);

      if (editingId !== null) {
        const payload: DischargeUpdate = {
          discharge_type: form.discharge_type,
          final_diagnosis: form.final_diagnosis.trim(),
          clinical_summary: form.clinical_summary.trim() || null,
          condition_at_discharge:
            form.condition_at_discharge.trim() || null,
          treatment_summary: form.treatment_summary.trim() || null,
          discharge_medications:
            form.discharge_medications.trim() || null,
          discharge_instructions:
            form.discharge_instructions.trim() || null,
          diet_instructions:
            form.diet_instructions.trim() || null,
          activity_restrictions:
            form.activity_restrictions.trim() || null,
          warning_signs: form.warning_signs.trim() || null,
          follow_up_required: form.follow_up_required,
          follow_up_date: form.follow_up_required
            ? fromDateTimeLocal(form.follow_up_date)
            : null,
          follow_up_instructions:
            form.follow_up_instructions.trim() || null,
          notes: form.notes.trim() || null,
        };

        await updateDischarge(editingId, payload);

        toast.success("Discharge updated successfully.");
      } else {
        const payload: DischargeCreate = {
          patient_id: patientId,
          encounter_id: Number(form.encounter_id),
          discharge_type: form.discharge_type,
          final_diagnosis: form.final_diagnosis.trim(),
          clinical_summary: form.clinical_summary.trim() || null,
          condition_at_discharge:
            form.condition_at_discharge.trim() || null,
          treatment_summary: form.treatment_summary.trim() || null,
          discharge_medications:
            form.discharge_medications.trim() || null,
          discharge_instructions:
            form.discharge_instructions.trim() || null,
          diet_instructions:
            form.diet_instructions.trim() || null,
          activity_restrictions:
            form.activity_restrictions.trim() || null,
          warning_signs: form.warning_signs.trim() || null,
          follow_up_required: form.follow_up_required,
          follow_up_date: form.follow_up_required
            ? fromDateTimeLocal(form.follow_up_date)
            : null,
          follow_up_instructions:
            form.follow_up_instructions.trim() || null,
          notes: form.notes.trim() || null,
        };

        await createDischarge(payload);

        toast.success("Discharge created successfully.");
      }

      resetForm();
      await loadDischarges();
    } catch (error) {
      console.error("Failed to save discharge:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (
    discharge: Discharge,
    status: DischargeStatus
  ) => {
    if (!canManage) {
      toast.error("You do not have permission to change discharge status.");
      return;
    }

    let confirmation = true;

    if (status === "READY") {
      confirmation = window.confirm(
        "Mark this discharge as READY?"
      );
    }

    if (status === "DISCHARGED") {
      confirmation = window.confirm(
        "Confirm final discharge of this patient?"
      );
    }

    if (status === "CANCELLED") {
      confirmation = window.confirm(
        "Cancel this discharge plan?"
      );
    }

    if (!confirmation) return;

    try {
      setSaving(true);

      await updateDischargeStatus(discharge.id, {
        status,
      });

      toast.success(
        `Discharge marked as ${STATUS_META[status].label}.`
      );

      await loadDischarges();
    } catch (error) {
      console.error("Failed to update discharge status:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const renderStatusActions = (discharge: Discharge) => {
    if (!canManage) return null;

    if (discharge.status === "PLANNED") {
      return (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleStatusChange(discharge, "READY")}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ClipboardCheck size={16} />
            Mark Ready
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              handleStatusChange(discharge, "CANCELLED")
            }
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <XCircle size={16} />
            Cancel
          </button>
        </div>
      );
    }

    if (discharge.status === "READY") {
      return (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              handleStatusChange(discharge, "DISCHARGED")
            }
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            Complete Discharge
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              handleStatusChange(discharge, "CANCELLED")
            }
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <XCircle size={16} />
            Cancel
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <FileText size={20} />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Discharge Management
                </h2>

                <p className="text-sm text-slate-500">
                  Prepare, review and complete patient discharge.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              Total:{" "}
              <span className="font-semibold text-slate-900">
                {discharges.length}
              </span>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Completed:{" "}
              <span className="font-semibold">
                {dischargedCount}
              </span>
            </div>

            <button
              type="button"
              onClick={loadDischarges}
              disabled={loading || saving}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            {canManage && !activeDischarge && (
              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <Plus size={17} />
                New Discharge
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          ACTIVE DISCHARGE NOTICE
      ===================================================== */}

      {activeDischarge && (
        <div className="border-b border-amber-200 bg-amber-50/60 px-5 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-amber-600">
                <Clock3 size={18} />
              </div>

              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Active discharge process
                </p>

                <p className="mt-0.5 text-sm text-amber-800">
                  This patient currently has a{" "}
                  <span className="font-semibold">
                    {STATUS_META[activeDischarge.status].label.toLowerCase()}
                  </span>{" "}
                  discharge for encounter #
                  {activeDischarge.encounter_id}.
                </p>
              </div>
            </div>

            {canManage && (
              <button
                type="button"
                onClick={() => openEditForm(activeDischarge)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
              >
                <FileText size={16} />
                Edit Discharge
              </button>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          FORM
      ===================================================== */}

      {showForm && canManage && (
        <form
          onSubmit={handleSubmit}
          className="border-b border-slate-200 bg-slate-50/70 p-5"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {editingId !== null
                  ? "Edit Discharge"
                  : "Create Discharge"}
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Complete the clinical discharge information before
                marking the discharge ready.
              </p>
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-slate-800"
            >
              <XCircle size={19} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Encounter */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Encounter
              </label>

              <select
                value={form.encounter_id}
                onChange={(event) =>
                  updateField("encounter_id", event.target.value)
                }
                disabled={editingId !== null}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
              >
                <option value="">Select encounter</option>

                {encounters.map((encounter) => (
                  <option
                    key={encounter.id}
                    value={encounter.id}
                    >
                    Encounter #{encounter.id}
                    {encounter.status
                        ? ` • ${encounter.status}`
                        : ""}
                    </option>
                ))}
              </select>
            </div>

            {/* Discharge type */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Discharge Type
              </label>

              <select
                value={form.discharge_type}
                onChange={(event) =>
                  updateField(
                    "discharge_type",
                    event.target.value as DischargeType
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              >
                {DISCHARGE_TYPES.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Final diagnosis */}
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Final Diagnosis <span className="text-red-500">*</span>
              </label>

              <textarea
                value={form.final_diagnosis}
                onChange={(event) =>
                  updateField("final_diagnosis", event.target.value)
                }
                rows={3}
                placeholder="Enter final diagnosis..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Clinical summary */}
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Clinical Summary
              </label>

              <textarea
                value={form.clinical_summary}
                onChange={(event) =>
                  updateField("clinical_summary", event.target.value)
                }
                rows={4}
                placeholder="Summarize the patient's clinical course..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Condition */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Condition at Discharge
              </label>

              <textarea
                value={form.condition_at_discharge}
                onChange={(event) =>
                  updateField(
                    "condition_at_discharge",
                    event.target.value
                  )
                }
                rows={3}
                placeholder="Stable / improved / other clinical condition..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Treatment */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Treatment Summary
              </label>

              <textarea
                value={form.treatment_summary}
                onChange={(event) =>
                  updateField(
                    "treatment_summary",
                    event.target.value
                  )
                }
                rows={3}
                placeholder="Treatment provided during admission..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Medications */}
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Discharge Medications
              </label>

              <textarea
                value={form.discharge_medications}
                onChange={(event) =>
                  updateField(
                    "discharge_medications",
                    event.target.value
                  )
                }
                rows={4}
                placeholder="Medication name, dose, frequency and duration..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Instructions */}
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Discharge Instructions
              </label>

              <textarea
                value={form.discharge_instructions}
                onChange={(event) =>
                  updateField(
                    "discharge_instructions",
                    event.target.value
                  )
                }
                rows={4}
                placeholder="General instructions for the patient..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Diet */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Diet Instructions
              </label>

              <textarea
                value={form.diet_instructions}
                onChange={(event) =>
                  updateField(
                    "diet_instructions",
                    event.target.value
                  )
                }
                rows={3}
                placeholder="Dietary recommendations..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Activity */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Activity Restrictions
              </label>

              <textarea
                value={form.activity_restrictions}
                onChange={(event) =>
                  updateField(
                    "activity_restrictions",
                    event.target.value
                  )
                }
                rows={3}
                placeholder="Activity restrictions or recommendations..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Warning signs */}
            <div className="md:col-span-2">
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                <AlertTriangle size={15} className="text-amber-500" />
                Warning Signs
              </label>

              <textarea
                value={form.warning_signs}
                onChange={(event) =>
                  updateField("warning_signs", event.target.value)
                }
                rows={3}
                placeholder="Symptoms/signs requiring urgent medical attention..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Follow-up */}
            <div className="md:col-span-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.follow_up_required}
                    onChange={(event) =>
                      updateField(
                        "follow_up_required",
                        event.target.checked
                      )
                    }
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Follow-up required
                    </p>

                    <p className="text-xs text-slate-500">
                      Add the recommended follow-up date and
                      instructions.
                    </p>
                  </div>
                </label>

                {form.follow_up_required && (
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Follow-up Date
                      </label>

                      <input
                        type="datetime-local"
                        value={form.follow_up_date}
                        onChange={(event) =>
                          updateField(
                            "follow_up_date",
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Follow-up Instructions
                      </label>

                      <textarea
                        value={form.follow_up_instructions}
                        onChange={(event) =>
                          updateField(
                            "follow_up_instructions",
                            event.target.value
                          )
                        }
                        rows={2}
                        placeholder="When and why the patient should follow up..."
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Internal Notes
              </label>

              <textarea
                value={form.notes}
                onChange={(event) =>
                  updateField("notes", event.target.value)
                }
                rows={3}
                placeholder="Additional clinical/internal notes..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Form actions */}
          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <CheckCircle2 size={17} />
              )}

              {editingId !== null
                ? "Save Changes"
                : "Create Discharge"}
            </button>
          </div>
        </form>
      )}

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="p-5">
        {loading ? (
          <div className="flex min-h-[180px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Loader2
                size={20}
                className="animate-spin"
              />
              Loading discharge records...
            </div>
          </div>
        ) : discharges.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 px-5 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <FileText size={22} />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-800">
              No discharge records
            </h3>

            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              No discharge process has been started for this
              patient yet.
            </p>

            {canManage && (
              <button
                type="button"
                onClick={openCreateForm}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <Plus size={17} />
                Create Discharge
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {discharges.map((discharge) => {
              const expanded =
                expandedId === discharge.id;

              const statusMeta =
                STATUS_META[discharge.status];

              return (
                <div
                  key={discharge.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  {/* Record header */}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(
                        expanded ? null : discharge.id
                      )
                    }
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          Discharge #{discharge.id}
                        </span>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusMeta.className}`}
                        >
                          {statusMeta.label}
                        </span>

                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {discharge.discharge_type}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Stethoscope size={13} />
                          Encounter #
                          {discharge.encounter_id}
                        </span>

                        <span className="inline-flex items-center gap-1.5">
                          <Calendar size={13} />
                          Created{" "}
                          {formatDateTime(discharge.planned_at)}
                        </span>

                        {discharge.discharged_at && (
                          <span className="inline-flex items-center gap-1.5">
                            <CheckCircle2 size={13} />
                            Discharged{" "}
                            {formatDateTime(
                              discharge.discharged_at
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-slate-400">
                      {expanded ? (
                        <ChevronUp size={20} />
                      ) : (
                        <ChevronDown size={20} />
                      )}
                    </div>
                  </button>

                  {/* Expanded details */}
                  {expanded && (
                    <div className="border-t border-slate-200 bg-slate-50/50 px-4 py-5">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <DetailBlock
                          label="Final Diagnosis"
                          value={
                            discharge.final_diagnosis
                          }
                        />

                        <DetailBlock
                          label="Condition at Discharge"
                          value={
                            discharge.condition_at_discharge
                          }
                        />

                        <DetailBlock
                          label="Clinical Summary"
                          value={
                            discharge.clinical_summary
                          }
                          fullWidth
                        />

                        <DetailBlock
                          label="Treatment Summary"
                          value={
                            discharge.treatment_summary
                          }
                        />

                        <DetailBlock
                          label="Discharge Medications"
                          value={
                            discharge.discharge_medications
                          }
                        />

                        <DetailBlock
                          label="Discharge Instructions"
                          value={
                            discharge.discharge_instructions
                          }
                          fullWidth
                        />

                        <DetailBlock
                          label="Diet Instructions"
                          value={
                            discharge.diet_instructions
                          }
                        />

                        <DetailBlock
                          label="Activity Restrictions"
                          value={
                            discharge.activity_restrictions
                          }
                        />

                        <DetailBlock
                          label="Warning Signs"
                          value={discharge.warning_signs}
                          fullWidth
                          warning
                        />

                        <DetailBlock
                          label="Follow-up"
                          value={
                            discharge.follow_up_required
                              ? discharge.follow_up_date
                                ? formatDateTime(
                                    discharge.follow_up_date
                                  )
                                : "Required"
                              : "Not required"
                          }
                        />

                        <DetailBlock
                          label="Follow-up Instructions"
                          value={
                            discharge.follow_up_instructions
                          }
                        />

                        <DetailBlock
                          label="Notes"
                          value={discharge.notes}
                          fullWidth
                        />
                      </div>

                      {/* Doctor / timestamps */}
                      <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <InfoItem
                          label="Prepared By"
                          value={
                            discharge.doctor_name || "—"
                          }
                        />

                        <InfoItem
                          label="Planned At"
                          value={formatDateTime(
                            discharge.planned_at
                          )}
                        />

                        <InfoItem
                          label="Ready At"
                          value={formatDateTime(
                            discharge.ready_at
                          )}
                        />

                        <InfoItem
                          label="Discharged At"
                          value={formatDateTime(
                            discharge.discharged_at
                          )}
                        />
                      </div>

                      {/* Actions */}
                      {canManage && (
                        <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-wrap gap-2">
                            {discharge.status !== "DISCHARGED" &&
                              discharge.status !== "CANCELLED" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditForm(discharge)
                                  }
                                  disabled={saving}
                                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                                >
                                  <FileText size={16} />
                                  Edit
                                </button>
                              )}
                          </div>

                          {renderStatusActions(discharge)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ============================================================
   SMALL PRESENTATION COMPONENTS
============================================================ */

function DetailBlock({
  label,
  value,
  fullWidth = false,
  warning = false,
}: {
  label: string;
  value?: string | null;
  fullWidth?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`${fullWidth ? "md:col-span-2 " : ""}rounded-xl border ${
        warning
          ? "border-amber-200 bg-amber-50/60"
          : "border-slate-200 bg-white"
      } p-4`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wide ${
          warning ? "text-amber-700" : "text-slate-500"
        }`}
      >
        {label}
      </p>

      <p
        className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${
          value
            ? warning
              ? "text-amber-900"
              : "text-slate-700"
            : "text-slate-400"
        }`}
      >
        {value || "Not provided"}
      </p>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-800">
        {value}
      </p>
    </div>
  );
}