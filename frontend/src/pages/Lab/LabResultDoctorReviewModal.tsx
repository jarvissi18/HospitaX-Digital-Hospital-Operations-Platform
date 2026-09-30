import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  getLabResultForOrderItem,
  reviewLabResult,
} from "../../services/labApi";

import type {
  LabOrderItem,
  LabResult,
  LabTest,
} from "../../types/lab";

/* -------------------------------------------------------------------------- */
/* Props                                                                      */
/* -------------------------------------------------------------------------- */

interface LabResultDoctorReviewModalProps {
  open: boolean;
  item: LabOrderItem | null;
  test: LabTest | null;

  onClose: () => void;
  onSuccess?: () => Promise<void> | void;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const getErrorMessage = (
  error: unknown,
): string => {
  const axiosError = error as {
    response?: {
      data?: {
        detail?: unknown;
      };
    };
    message?: string;
  };

  const detail =
    axiosError?.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((entry) => {
        if (
          typeof entry === "string"
        ) {
          return entry;
        }

        if (
          entry &&
          typeof entry === "object" &&
          "msg" in entry
        ) {
          const message =
            (entry as {
              msg?: unknown;
            }).msg;

          return typeof message ===
            "string"
            ? message
            : JSON.stringify(entry);
        }

        return JSON.stringify(entry);
      })
      .join(", ");
  }

  if (
    detail &&
    typeof detail === "object"
  ) {
    try {
      return JSON.stringify(detail);
    } catch {
      return "The server returned an invalid error response.";
    }
  }

  return (
    axiosError?.message ||
    "Something went wrong. Please try again."
  );
};

const formatValue = (
  result: LabResult,
): string => {
  if (
    result.numeric_value !== null &&
    result.numeric_value !== undefined
  ) {
    return `${result.numeric_value}${
      result.unit
        ? ` ${result.unit}`
        : ""
    }`;
  }

  if (result.text_value) {
    return result.text_value;
  }

  return "—";
};

const formatStatus = (
  status: string,
) =>
  status.replaceAll(
    "_",
    " ",
  );

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function LabResultDoctorReviewModal({
  open,
  item,
  test,
  onClose,
  onSuccess,
}: LabResultDoctorReviewModalProps) {
  const [result, setResult] =
    useState<LabResult | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [reviewNotes, setReviewNotes] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  useEffect(() => {
    if (!open || !item) {
      return;
    }

    setResult(null);
    setReviewNotes("");
    setError("");
    setSuccess(false);

    const loadResult = async () => {
      try {
        setLoading(true);

        const response =
          await getLabResultForOrderItem(
            item.id,
          );

        if (!response) {
          setError(
            "Laboratory result could not be found for this test.",
          );
          return;
        }

        if (
          response.status !==
          "TECHNICALLY_VALIDATED"
        ) {
          setError(
            `This result is currently ${formatStatus(
              response.status,
            )} and is not ready for doctor review.`,
          );
          return;
        }

        setResult(response);
      } catch (err) {
        console.error(
          "Failed to load laboratory result for doctor review:",
          err,
        );

        setError(
          getErrorMessage(err),
        );
      } finally {
        setLoading(false);
      }
    };

    void loadResult();
  }, [open, item?.id]);

  const handleSubmit = async () => {
    if (!result) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await reviewLabResult(
        result.id,
        {
          review_notes:
            reviewNotes.trim() ||
            null,
        },
      );

      setSuccess(true);

      await onSuccess?.();

      window.setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      console.error(
        "Failed to review laboratory result:",
        err,
      );

      setError(
        getErrorMessage(err),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !item || !test) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="shrink-0 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                <ClipboardCheck className="h-5 w-5 text-amber-600" />
              </div>

              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-600">
                  Laboratory
                </span>

                <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">
                  Doctor Review
                </h2>

                <p className="mt-0.5 truncate text-[11px] text-slate-500">
                  {test.code
                    ? `${test.code} • `
                    : ""}
                  {test.name}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
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
                onClick={() =>
                  setError("")
                }
                className="text-red-400 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading laboratory result...
              </div>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* Result Summary */}
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Technically Validated Result
                    </p>

                    <h3 className="mt-1 text-sm font-bold text-slate-900">
                      {test.name}
                    </h3>
                  </div>

                  <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">
                    <CheckCircle2 className="h-3 w-3" />
                    TECHNICALLY VALIDATED
                  </span>
                </div>

                <div className="grid gap-3 p-5 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Result
                    </p>

                    <p className="mt-2 text-base font-bold text-slate-900">
                      {formatValue(result)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Reference Range
                    </p>

                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {result.reference_range_text ||
                        "—"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Abnormal Flag
                    </p>

                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {result.abnormal_flag ||
                        "—"}
                      {result.is_critical && (
                        <span className="ml-2 rounded-md bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">
                          CRITICAL
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Interpretation
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-700">
                      {result.interpretation ||
                        "No interpretation provided."}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Result Notes
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-700">
                      {result.result_notes ||
                        "No additional result notes."}
                    </p>
                  </div>
                </div>
              </section>

              {/* Review */}
              <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
                <div className="border-b border-amber-100 bg-amber-50/60 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                      <ClipboardCheck className="h-4 w-4 text-amber-700" />
                    </div>

                    <div>
                      <p className="text-xs font-bold text-amber-900">
                        Doctor Review
                      </p>

                      <p className="mt-0.5 text-[10px] text-amber-700/80">
                        Review the technically validated result before moving it to doctor review.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Review Notes
                  </label>

                  <textarea
                    value={reviewNotes}
                    onChange={(event) =>
                      setReviewNotes(
                        event.target.value,
                      )
                    }
                    rows={5}
                    placeholder="Enter your clinical review notes..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-50"
                  />

                  <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-[10px] leading-5 text-slate-500">
                    Submitting this review will move the result from{" "}
                    <span className="font-bold text-violet-700">
                      TECHNICALLY VALIDATED
                    </span>{" "}
                    to{" "}
                    <span className="font-bold text-amber-700">
                      DOCTOR REVIEW
                    </span>
                    .
                  </div>
                </div>
              </section>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-3 sm:px-6">
          <div className="text-[10px] text-slate-400">
            HospitaX Laboratory • Doctor Review
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() =>
                void handleSubmit()
              }
              disabled={
                submitting ||
                loading ||
                !result ||
                success ||
                Boolean(error)
              }
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ClipboardCheck className="h-3.5 w-3.5" />
              )}

              {success
                ? "Reviewed"
                : "Submit Review"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
