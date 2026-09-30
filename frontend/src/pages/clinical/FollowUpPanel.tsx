import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  Plus,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { toast } from "react-toastify";

import {
  createFollowUp,
  getPatientFollowUps,
  updateFollowUpStatus,
  type FollowUp,
  type FollowUpCreate,
  type FollowUpPriority,
  type FollowUpStatus,
  type FollowUpType,
} from "../../services/followupApi";

import type { ClinicalEncounter } from "../../services/clinicalEncounterApi";


// =====================================================
// PROPS
// =====================================================

interface FollowUpPanelProps {
  patientId: number;
  encounters: ClinicalEncounter[];
  canManage: boolean;
}


// =====================================================
// FORM
// =====================================================

type FollowUpFormState = {
  encounter_id: number | "";
  discharge_id: number | "";
  follow_up_type: FollowUpType;
  priority: FollowUpPriority;
  scheduled_at: string;
  reason: string;
  clinical_summary: string;
  instructions: string;
  notes: string;
};


// =====================================================
// DEFAULT FORM
// =====================================================

const EMPTY_FORM: FollowUpFormState = {
  encounter_id: "",
  discharge_id: "",
  follow_up_type: "ROUTINE",
  priority: "MEDIUM",
  scheduled_at: "",
  reason: "",
  clinical_summary: "",
  instructions: "",
  notes: "",
};


// =====================================================
// HELPERS
// =====================================================

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not specified";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not specified";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}


function formatStatus(status: FollowUpStatus) {
  return status.replaceAll("_", " ");
}


function formatType(type: FollowUpType) {
  return type.replaceAll("_", " ");
}


function getStatusClasses(
  status: FollowUpStatus,
) {
  switch (status) {
    case "SCHEDULED":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "COMPLETED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "CANCELLED":
      return "border-red-200 bg-red-50 text-red-700";

    case "MISSED":
      return "border-orange-200 bg-orange-50 text-orange-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}


function getPriorityClasses(
  priority: FollowUpPriority,
) {
  switch (priority) {
    case "URGENT":
      return "border-red-200 bg-red-50 text-red-700";

    case "HIGH":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "MEDIUM":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "LOW":
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}


function toIsoDateTime(
  value: string,
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString();
}


// =====================================================
// INPUT STYLES
// =====================================================

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10";

const selectClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10";

const textareaClass =
  "w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-medium leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10";


// =====================================================
// COMPONENT
// =====================================================

export default function FollowUpPanel({
  patientId,
  encounters,
  canManage,
}: FollowUpPanelProps) {
  const [followUps, setFollowUps] = useState<
    FollowUp[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  const [isCreateOpen, setIsCreateOpen] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [processingId, setProcessingId] =
    useState<number | null>(null);

  const [expandedId, setExpandedId] =
    useState<number | null>(null);

  const [form, setForm] =
    useState<FollowUpFormState>(
      EMPTY_FORM,
    );


  // ===================================================
  // ENCOUNTER MAP
  // ===================================================

  const encounterMap = useMemo(
    () =>
      new Map(
        encounters.map((encounter) => [
          encounter.id,
          encounter,
        ]),
      ),
    [encounters],
  );


  // ===================================================
  // SUMMARY
  // ===================================================

  const summary = useMemo(() => {
    return {
      total: followUps.length,

      scheduled: followUps.filter(
        (item) =>
          item.status === "SCHEDULED",
      ).length,

      completed: followUps.filter(
        (item) =>
          item.status === "COMPLETED",
      ).length,

      missed: followUps.filter(
        (item) =>
          item.status === "MISSED",
      ).length,
    };
  }, [followUps]);


  // ===================================================
  // LOAD
  // ===================================================

  async function loadFollowUps(
    showRefresh = false,
  ) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const result =
        await getPatientFollowUps(
          patientId,
        );

      const sorted = [
        ...(Array.isArray(result)
          ? result
          : []),
      ].sort(
        (a, b) =>
          new Date(
            b.scheduled_at,
          ).getTime() -
          new Date(
            a.scheduled_at,
          ).getTime(),
      );

      setFollowUps(sorted);
    } catch (err) {
      console.error(
        "Follow-up loading error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load follow-up history.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }


  useEffect(() => {
    void loadFollowUps();
  }, [patientId]);


  // ===================================================
  // FORM RESET
  // ===================================================

  function resetForm() {
    setForm({
      ...EMPTY_FORM,
    });
  }


  // ===================================================
  // CREATE
  // ===================================================

  async function handleCreate() {
    if (
      !form.encounter_id ||
      !form.scheduled_at ||
      !form.reason.trim()
    ) {
      toast.error(
        "Encounter, date/time and reason are required.",
      );

      return;
    }

    try {
      setSubmitting(true);

      const payload: FollowUpCreate = {
        patient_id: patientId,

        encounter_id:
          Number(form.encounter_id),

        discharge_id:
          form.discharge_id
            ? Number(form.discharge_id)
            : null,

        follow_up_type:
          form.follow_up_type,

        priority:
          form.priority,

        scheduled_at:
          toIsoDateTime(
            form.scheduled_at,
          ),

        reason:
          form.reason.trim(),

        clinical_summary:
          form.clinical_summary.trim() ||
          null,

        instructions:
          form.instructions.trim() ||
          null,

        notes:
          form.notes.trim() ||
          null,
      };

      await createFollowUp(
        payload,
      );

      toast.success(
        "Follow-up scheduled successfully.",
      );

      setIsCreateOpen(false);

      resetForm();

      await loadFollowUps(true);
    } catch (err) {
      console.error(
        "Follow-up creation error:",
        err,
      );

      toast.error(
        err instanceof Error
          ? err.message
          : "Unable to schedule follow-up.",
      );
    } finally {
      setSubmitting(false);
    }
  }


  // ===================================================
  // STATUS UPDATE
  // ===================================================

  async function handleStatusChange(
    followUp: FollowUp,
    status: FollowUpStatus,
  ) {
    if (
      followUp.status === status
    ) {
      return;
    }

    try {
      setProcessingId(
        followUp.id,
      );

      await updateFollowUpStatus(
        followUp.id,
        {
          status,
        },
      );

      toast.success(
        `Follow-up marked as ${formatStatus(
          status,
        )}.`,
      );

      await loadFollowUps(true);
    } catch (err) {
      console.error(
        "Follow-up status update error:",
        err,
      );

      toast.error(
        err instanceof Error
          ? err.message
          : "Unable to update follow-up status.",
      );
    } finally {
      setProcessingId(null);
    }
  }


  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_-24px_rgba(15,23,42,0.3)]">
        <div className="flex items-center justify-center px-5 py-14">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Loader2
              size={16}
              className="animate-spin"
            />
            Loading follow-up history...
          </div>
        </div>
      </section>
    );
  }


  // ===================================================
  // UI
  // ===================================================

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_-24px_rgba(15,23,42,0.3)]">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <CalendarClock size={18} />
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-violet-600">
                  Continuity of Care
                </p>

                <h2 className="text-sm font-bold text-slate-900">
                  Follow-up Management
                </h2>
              </div>

              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600">
                {summary.total}
              </span>
            </div>

            <p className="mt-2 max-w-xl text-[11px] leading-5 text-slate-500">
              Schedule and manage post-consultation
              patient follow-ups.
            </p>
          </div>


          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={() =>
                void loadFollowUps(true)
              }
              disabled={refreshing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[11px] font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={14}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>


            {canManage && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsCreateOpen(true);
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-[11px] font-bold text-white shadow-sm transition hover:bg-slate-800"
              >
                <Plus size={15} />
                Schedule Follow-up
              </button>
            )}
          </div>
        </div>


        {/* =================================================
            SUMMARY
        ================================================= */}

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">

          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Total
            </p>

            <p className="mt-1 text-lg font-bold text-slate-900">
              {summary.total}
            </p>
          </div>


          <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-blue-500">
              Scheduled
            </p>

            <p className="mt-1 text-lg font-bold text-blue-700">
              {summary.scheduled}
            </p>
          </div>


          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-500">
              Completed
            </p>

            <p className="mt-1 text-lg font-bold text-emerald-700">
              {summary.completed}
            </p>
          </div>


          <div className="rounded-xl border border-orange-100 bg-orange-50/60 px-3 py-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-orange-500">
              Missed
            </p>

            <p className="mt-1 text-lg font-bold text-orange-700">
              {summary.missed}
            </p>
          </div>
        </div>
      </div>


      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700 sm:mx-6">
          {error}
        </div>
      )}


      {/* =================================================
          EMPTY
      ================================================= */}

      {followUps.length === 0 ? (
        <div className="px-5 py-14 text-center sm:px-6">

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <CalendarClock size={21} />
          </div>

          <h3 className="mt-4 text-sm font-bold text-slate-800">
            No follow-ups recorded
          </h3>

          <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
            Schedule a follow-up appointment to
            continue this patient's care.
          </p>

          {canManage && (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsCreateOpen(true);
              }}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-[11px] font-bold text-white hover:bg-slate-800"
            >
              <Plus size={14} />
              Schedule Follow-up
            </button>
          )}
        </div>
      ) : (

        /* =================================================
           LIST
        ================================================= */

        <div className="divide-y divide-slate-100">

          {followUps.map((followUp) => {

            const encounter =
              encounterMap.get(
                followUp.encounter_id,
              );

            const expanded =
              expandedId ===
              followUp.id;

            const processing =
              processingId ===
              followUp.id;

            return (
              <article
                key={followUp.id}
                className="px-5 py-5 transition hover:bg-slate-50/50 sm:px-6"
              >

                {/* TOP */}

                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">

                  <div className="min-w-0 flex-1">

                    <div className="flex flex-wrap items-center gap-2">

                      <span
                        className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ${getStatusClasses(
                          followUp.status,
                        )}`}
                      >
                        {formatStatus(
                          followUp.status,
                        )}
                      </span>


                      <span
                        className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ${getPriorityClasses(
                          followUp.priority,
                        )}`}
                      >
                        {followUp.priority}
                      </span>


                      <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-violet-700">
                        {formatType(
                          followUp.follow_up_type,
                        )}
                      </span>
                    </div>


                    <div className="mt-3 flex flex-col gap-1">

                      <h3 className="text-sm font-bold text-slate-900">
                        {followUp.reason ||
                          "Follow-up appointment"}
                      </h3>

                      <p className="text-[11px] text-slate-500">
                        Scheduled for{" "}
                        <span className="font-semibold text-slate-700">
                          {formatDateTime(
                            followUp.scheduled_at,
                          )}
                        </span>
                      </p>

                      <p className="text-[10px] text-slate-400">
                        Encounter #
                        {followUp.encounter_id}
                        {encounter
                          ? " · Clinical encounter"
                          : ""}
                      </p>
                    </div>
                  </div>


                  {/* ACTIONS */}

                  <div className="flex flex-wrap items-center gap-2">

                    {canManage &&
                      followUp.status ===
                        "SCHEDULED" && (
                        <>
                          <button
                            type="button"
                            disabled={processing}
                            onClick={() =>
                              void handleStatusChange(
                                followUp,
                                "COMPLETED",
                              )
                            }
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            {processing ? (
                              <Loader2
                                size={13}
                                className="animate-spin"
                              />
                            ) : (
                              <CheckCircle2
                                size={13}
                              />
                            )}

                            Complete
                          </button>


                          <button
                            type="button"
                            disabled={processing}
                            onClick={() =>
                              void handleStatusChange(
                                followUp,
                                "MISSED",
                              )
                            }
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 text-[10px] font-bold text-orange-700 hover:bg-orange-100 disabled:opacity-50"
                          >
                            <Clock3 size={13} />

                            Missed
                          </button>


                          <button
                            type="button"
                            disabled={processing}
                            onClick={() =>
                              void handleStatusChange(
                                followUp,
                                "CANCELLED",
                              )
                            }
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-[10px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            <XCircle size={13} />

                            Cancel
                          </button>
                        </>
                      )}


                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(
                          expanded
                            ? null
                            : followUp.id,
                        )
                      }
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                    >
                      {expanded
                        ? "Hide details"
                        : "View details"}
                    </button>
                  </div>
                </div>


                {/* EXPANDED */}

                {expanded && (
                  <div className="mt-5 grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 md:grid-cols-2">

                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Clinical Summary
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-700">
                        {followUp.clinical_summary ||
                          "Not specified"}
                      </p>
                    </div>


                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Instructions
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-700">
                        {followUp.instructions ||
                          "Not specified"}
                      </p>
                    </div>


                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Doctor
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-700">
                        {followUp.doctor_name ||
                          `Doctor #${followUp.doctor_id ?? "—"}`}
                      </p>
                    </div>


                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Encounter
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-700">
                        #{followUp.encounter_id}
                      </p>
                    </div>


                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Completed
                      </p>

                      <p className="mt-1 text-xs text-slate-700">
                        {formatDateTime(
                          followUp.completed_at,
                        )}
                      </p>
                    </div>


                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Notes
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-700">
                        {followUp.notes ||
                          "No notes"}
                      </p>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}


      {/* =================================================
          CREATE MODAL
      ================================================= */}

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">

          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">

            {/* MODAL HEADER */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-6">

              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-violet-600">
                  Patient Care
                </p>

                <h3 className="mt-1 text-sm font-bold text-slate-900">
                  Schedule Follow-up
                </h3>

                <p className="mt-0.5 text-[10px] text-slate-400">
                  Create a new follow-up appointment.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsCreateOpen(false)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <XCircle size={17} />
              </button>
            </div>


            {/* FORM */}

            <div className="space-y-5 px-5 py-5 sm:px-6">

              {/* ENCOUNTER */}

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Clinical Encounter
                </label>

                <select
                  value={form.encounter_id}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      encounter_id:
                        event.target.value
                          ? Number(
                              event.target.value,
                            )
                          : "",
                    }))
                  }
                  className={selectClass}
                >
                  <option value="">
                    Select encounter
                  </option>

                  {encounters.map(
                    (encounter) => (
                      <option
                        key={encounter.id}
                        value={encounter.id}
                      >
                        Encounter #
                        {encounter.id} ·{" "}
                        {encounter.status}
                      </option>
                    ),
                  )}
                </select>
              </div>


              {/* DATE + TYPE + PRIORITY */}

              <div className="grid gap-4 md:grid-cols-3">

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Scheduled Date & Time
                  </label>

                  <input
                    type="datetime-local"
                    value={
                      form.scheduled_at
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          scheduled_at:
                            event.target
                              .value,
                        }),
                      )
                    }
                    className={inputClass}
                  />
                </div>


                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Follow-up Type
                  </label>

                  <select
                    value={
                      form.follow_up_type
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          follow_up_type:
                            event.target
                              .value as FollowUpType,
                        }),
                      )
                    }
                    className={selectClass}
                  >
                    <option value="ROUTINE">
                      Routine
                    </option>

                    <option value="SPECIALIST">
                      Specialist
                    </option>

                    <option value="POST_DISCHARGE">
                      Post-discharge
                    </option>

                    <option value="MEDICATION_REVIEW">
                      Medication review
                    </option>

                    <option value="DIAGNOSTIC_REVIEW">
                      Diagnostic review
                    </option>

                    <option value="OTHER">
                      Other
                    </option>
                  </select>
                </div>


                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Priority
                  </label>

                  <select
                    value={
                      form.priority
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          priority:
                            event.target
                              .value as FollowUpPriority,
                        }),
                      )
                    }
                    className={selectClass}
                  >
                    <option value="LOW">
                      Low
                    </option>

                    <option value="MEDIUM">
                      Medium
                    </option>

                    <option value="HIGH">
                      High
                    </option>

                    <option value="URGENT">
                      Urgent
                    </option>
                  </select>
                </div>
              </div>


              {/* REASON */}

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Reason
                </label>

                <input
                  value={form.reason}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        reason:
                          event.target.value,
                      }),
                    )
                  }
                  placeholder="e.g. Post-discharge clinical review"
                  className={inputClass}
                />
              </div>


              {/* CLINICAL SUMMARY */}

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Clinical Summary
                </label>

                <textarea
                  rows={3}
                  value={
                    form.clinical_summary
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        clinical_summary:
                          event.target
                            .value,
                      }),
                    )
                  }
                  placeholder="Relevant clinical context..."
                  className={textareaClass}
                />
              </div>


              {/* INSTRUCTIONS */}

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Instructions
                </label>

                <textarea
                  rows={3}
                  value={
                    form.instructions
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        instructions:
                          event.target
                            .value,
                      }),
                    )
                  }
                  placeholder="Instructions for the patient..."
                  className={textareaClass}
                />
              </div>


              {/* NOTES */}

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Notes
                </label>

                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        notes:
                          event.target.value,
                      }),
                    )
                  }
                  placeholder="Internal notes..."
                  className={textareaClass}
                />
              </div>
            </div>


            {/* FOOTER */}

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">

              <button
                type="button"
                onClick={() =>
                  setIsCreateOpen(false)
                }
                disabled={submitting}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>


              <button
                type="button"
                onClick={() =>
                  void handleCreate()
                }
                disabled={submitting}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-5 text-[11px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <CalendarClock
                      size={14}
                    />
                    Schedule Follow-up
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}