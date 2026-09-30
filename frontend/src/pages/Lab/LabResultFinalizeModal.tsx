import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  FlaskConical,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";

import { useEffect, useState } from "react";

import {
  finalizeLabResult,
  getLabResultForOrderItem,
} from "../../services/labApi";

import type {
  LabOrderItem,
  LabResult,
  LabTest,
} from "../../types/lab";

interface LabResultFinalizeModalProps {
  open: boolean;
  item: LabOrderItem | null;
  test: LabTest | null;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const getErrorMessage = (error: unknown): string => {
  const axiosError = error as {
    response?: {
      data?: {
        detail?: unknown;
      };
    };
    message?: string;
  };

  const detail = axiosError?.response?.data?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((entry) => {
        if (
          typeof entry === "object" &&
          entry !== null &&
          "msg" in entry
        ) {
          const msg = (entry as { msg?: unknown }).msg;
          return typeof msg === "string" ? msg : "";
        }

        return typeof entry === "string" ? entry : "";
      })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(", ");
    }
  }

  if (
    typeof detail === "object" &&
    detail !== null
  ) {
    try {
      return JSON.stringify(detail);
    } catch {
      // Fall through to the generic error.
    }
  }

  if (
    typeof axiosError?.message === "string" &&
    axiosError.message.trim()
  ) {
    return axiosError.message;
  }

  return "Something went wrong. Please try again.";
};

const formatStatus = (status?: string | null) => {
  if (!status) return "—";
  return status.replaceAll("_", " ");
};

const getResultDisplayValue = (
  result: LabResult,
): string => {
  if (
    result.numeric_value !== null &&
    result.numeric_value !== undefined
  ) {
    return `${result.numeric_value}${result.unit ? ` ${result.unit}` : ""}`;
  }

  if (result.text_value) {
    return result.unit
      ? `${result.text_value} ${result.unit}`
      : result.text_value;
  }

  return "No result value recorded";
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function LabResultFinalizeModal({
  open,
  item,
  test,
  onClose,
  onSuccess,
}: LabResultFinalizeModalProps) {
  const [result, setResult] =
    useState<LabResult | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState("");

  const [finalizationNotes, setFinalizationNotes] =
    useState("");

  const [confirmed, setConfirmed] =
    useState(false);

  useEffect(() => {
    if (!open || !item || !test) {
      return;
    }

    let cancelled = false;

    const loadResult = async () => {
      try {
        setLoading(true);
        setError("");
        setResult(null);
        setFinalizationNotes("");
        setConfirmed(false);

        const response =
          await getLabResultForOrderItem(item.id);

        if (cancelled) return;

        if (!response) {
          setError(
            "Laboratory result could not be found for this test.",
          );
          return;
        }

        if (response.status !== "DOCTOR_REVIEW") {
          setError(
            `This result is currently ${formatStatus(
              response.status,
            )} and cannot be finalized from this stage.`,
          );
          return;
        }

        setResult(response);
      } catch (err) {
        if (cancelled) return;

        console.error(
          "Failed to load laboratory result for finalization:",
          err,
        );

        setError(getErrorMessage(err));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadResult();

    return () => {
      cancelled = true;
    };
  }, [open, item?.id, test?.id]);

  if (!open || !item || !test) {
    return null;
  }

  const handleSubmit = async () => {
    if (!result) {
      setError(
        "Laboratory result is not available for finalization.",
      );
      return;
    }

    if (result.status !== "DOCTOR_REVIEW") {
      setError(
        `This result is currently ${formatStatus(
          result.status,
        )} and cannot be finalized.`,
      );
      return;
    }

    if (!confirmed) {
      setError(
        "Please confirm that you have reviewed the result before finalizing it.",
      );
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await finalizeLabResult(result.id, {
        review_notes:
          finalizationNotes.trim() || null,
      });

      await onSuccess();
    } catch (err) {
      console.error(
        "Failed to finalize laboratory result:",
        err,
      );

      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="shrink-0 border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600">
                <ClipboardCheck className="h-5 w-5 text-white" />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-600">
                  Laboratory
                </p>

                <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">
                  Finalize Result
                </h2>

                <p className="mt-0.5 truncate text-[11px] text-slate-500">
                  {test.code ? `${test.code} • ` : ""}
                  {test.name}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] p-5 sm:p-6">
          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />

              <p className="flex-1 text-xs font-medium leading-5 text-red-700">
                {error}
              </p>

              <button
                type="button"
                onClick={() => setError("")}
                className="text-red-400 transition hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading laboratory result...
              </div>
            </div>
          ) : !result ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <FlaskConical className="h-5 w-5 text-slate-400" />
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-800">
                Result unavailable
              </p>

              <p className="mt-1 max-w-sm text-[11px] leading-5 text-slate-400">
                The laboratory result could not be loaded for finalization.
              </p>
            </div>
          ) : (
            <>
              {/* Result Summary */}
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50">
                      <FlaskConical className="h-4 w-4 text-violet-600" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Doctor Reviewed Result
                      </p>

                      <h3 className="mt-0.5 truncate text-sm font-bold text-slate-900">
                        {test.name}
                      </h3>
                    </div>
                  </div>

                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                    <CheckCircle2 className="h-3 w-3" />
                    DOCTOR_REVIEW
                  </span>
                </div>

                <div className="grid gap-3 p-5 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Result
                    </p>

                    <p className="mt-2 text-sm font-bold text-slate-900">
                      {getResultDisplayValue(result)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Reference Range
                    </p>

                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {result.reference_range_text || "—"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Abnormal Flag
                    </p>

                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {result.abnormal_flag || "—"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 px-5 pb-5 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Interpretation
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-600">
                      {result.interpretation ||
                        "No interpretation recorded."}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Result Notes
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-600">
                      {result.result_notes ||
                        "No additional result notes."}
                    </p>
                  </div>
                </div>
              </section>

              {/* Finalization */}
              <section className="mt-5 overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
                <div className="border-b border-emerald-100 bg-emerald-50/70 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                      <ShieldCheck className="h-4 w-4 text-emerald-700" />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-emerald-900">
                        Finalize Laboratory Result
                      </h3>

                      <p className="mt-0.5 text-[11px] text-emerald-700/80">
                        Confirm the doctor-reviewed result before permanently finalizing it.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Finalization Notes
                  </label>

                  <textarea
                    value={finalizationNotes}
                    onChange={(event) =>
                      setFinalizationNotes(
                        event.target.value,
                      )
                    }
                    rows={4}
                    placeholder="Optional finalization notes..."
                    disabled={submitting}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />

                  <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(event) =>
                        setConfirmed(
                          event.target.checked,
                        )
                      }
                      disabled={submitting}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />

                    <span className="text-[11px] leading-5 text-slate-600">
                      I confirm that the laboratory result has completed
                      technical validation and doctor review, and is ready
                      to be finalized.
                    </span>
                  </label>

                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

                    <p className="text-[10px] font-medium leading-5 text-emerald-700">
                      Finalization moves this result to{" "}
                      <span className="font-bold">
                        FINALIZED
                      </span>
                      . The result should then be treated as locked.
                    </p>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-white px-5 py-3 sm:px-6">
          <div className="text-[10px] text-slate-400">
            HospitaX Laboratory • Finalization
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={
                loading ||
                !result ||
                submitting ||
                !confirmed
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ClipboardCheck className="h-3.5 w-3.5" />
              )}

              {submitting
                ? "Finalizing..."
                : "Finalize Result"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
