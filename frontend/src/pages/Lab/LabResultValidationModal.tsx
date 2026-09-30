import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  FlaskConical,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  getLabResultForOrderItem,
  validateLabResult,
} from "../../services/labApi";

import type {
  LabOrderItem,
  LabResult,
  LabTest,
} from "../../types/lab";

// =====================================================
// PROPS
// =====================================================

interface LabResultValidationModalProps {
  open: boolean;
  item: LabOrderItem | null;
  test: LabTest | null;
  onClose: () => void;
  onSuccess?: () => Promise<void> | void;
}

// =====================================================
// COMPONENT
// =====================================================

export default function LabResultValidationModal({
  open,
  item,
  test,
  onClose,
  onSuccess,
}: LabResultValidationModalProps) {
  const [result, setResult] = useState<LabResult | null>(null);

  const [validationNotes, setValidationNotes] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState(false);

  // ===================================================
  // LOAD RESULT
  // ===================================================

  useEffect(() => {
    if (!open || !item) {
      setResult(null);
      setValidationNotes("");
      setError(null);
      setSuccess(false);
      return;
    }

    let mounted = true;

    const loadResult = async () => {
      setLoading(true);
      setError(null);
      setSuccess(false);

      try {
        const data =
          await getLabResultForOrderItem(
            item.id,
          );

        if (mounted) {
          setResult(data);

          setValidationNotes(
            data.validation_notes ?? "",
          );
        }
      } catch (err: any) {
        if (mounted) {
          setError(
            err?.response?.data?.detail ??
              "Unable to load laboratory result.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadResult();

    return () => {
      mounted = false;
    };
  }, [open, item]);

  // ===================================================
  // VALIDATE
  // ===================================================

  const handleValidate = async () => {
    if (!result) {
      setError(
        "Laboratory result is not available.",
      );
      return;
    }

    if (
      result.status !==
      "RESULT_ENTERED"
    ) {
      setError(
        `This result cannot be technically validated from its current status: ${result.status}.`,
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await validateLabResult(
        result.id,
        {
          validation_notes:
            validationNotes.trim() || null,
        },
      );

      setSuccess(true);

      await onSuccess?.();

      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ??
          "Failed to technically validate the laboratory result.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ===================================================
  // CLOSE
  // ===================================================

  const handleClose = () => {
    if (submitting) return;

    setResult(null);
    setValidationNotes("");
    setError(null);
    setSuccess(false);

    onClose();
  };

  // ===================================================
  // HELPERS
  // ===================================================

  const formatValue = () => {
    if (!result) return "—";

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

  const formatReferenceRange = () => {
    if (!result) return "Not specified";

    if (result.reference_range_text) {
      return result.reference_range_text;
    }

    if (
      result.reference_min !== null &&
      result.reference_max !== null
    ) {
      return `${result.reference_min} – ${result.reference_max}`;
    }

    return "Not specified";
  };

  if (!open || !item) {
    return null;
  }

  // ===================================================
  // UI
  // ===================================================

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <ClipboardCheck
                size={22}
              />
            </div>

            <div>
              <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
                Laboratory
              </div>

              <h2 className="text-xl font-bold tracking-tight text-slate-950">
                Validate Laboratory Result
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {test?.code ?? "LAB"}{" "}
                •{" "}
                {test?.name ??
                  "Laboratory Test"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </div>

        {/* ================================================= */}
        {/* BODY */}
        {/* ================================================= */}

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-6">
          {/* ERROR */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0"
              />

              <div>
                <p className="font-semibold">
                  Validation failed
                </p>

                <p className="mt-0.5 text-red-600">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* SUCCESS */}
          {success && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2
                size={18}
                className="mt-0.5 shrink-0"
              />

              <div>
                <p className="font-semibold">
                  Result technically validated
                </p>

                <p className="mt-0.5 text-emerald-600">
                  The laboratory result has
                  successfully moved to
                  TECHNICALLY_VALIDATED.
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                <Loader2
                  size={20}
                  className="animate-spin"
                />

                Loading laboratory result...
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* ================================================= */}
              {/* TEST SUMMARY */}
              {/* ================================================= */}

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                      <FlaskConical
                        size={20}
                      />
                    </div>

                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Test
                      </p>

                      <h3 className="mt-1 text-lg font-bold text-slate-950">
                        {test?.name ??
                          "Laboratory Test"}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {test?.category ??
                          "Laboratory"}{" "}
                        •{" "}
                        {test?.specimen_type ??
                          "Specimen"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                    {result?.status ??
                      "Loading"}
                  </div>
                </div>

                {/* RESULT INFORMATION */}
                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Result
                    </p>

                    <p className="mt-2 text-base font-bold text-slate-900">
                      {formatValue()}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Reference Range
                    </p>

                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {formatReferenceRange()}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Abnormal Flag
                    </p>

                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {result?.abnormal_flag ??
                        "Normal / Not specified"}
                    </p>
                  </div>
                </div>

                {/* CRITICAL */}
                {result?.is_critical && (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <AlertCircle
                      size={18}
                      className="text-red-600"
                    />

                    <div>
                      <p className="text-sm font-bold text-red-700">
                        Critical Result
                      </p>

                      <p className="text-xs text-red-600">
                        This result has been marked
                        as requiring immediate
                        clinical attention.
                      </p>
                    </div>
                  </div>
                )}

                {/* INTERPRETATION */}
                {result?.interpretation && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Interpretation
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {result.interpretation}
                    </p>
                  </div>
                )}

                {/* RESULT NOTES */}
                {result?.result_notes && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Result Notes
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {result.result_notes}
                    </p>
                  </div>
                )}
              </section>

              {/* ================================================= */}
              {/* VALIDATION */}
              {/* ================================================= */}

              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <ShieldCheck
                        size={18}
                      />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-950">
                        Technical Validation
                      </h3>

                      <p className="mt-0.5 text-xs text-slate-500">
                        Confirm that the entered
                        laboratory result is technically
                        valid.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Validation Notes
                  </label>

                  <textarea
                    value={validationNotes}
                    onChange={(event) =>
                      setValidationNotes(
                        event.target.value,
                      )
                    }
                    rows={4}
                    placeholder="Optional validation notes..."
                    disabled={
                      submitting ||
                      result?.status !==
                        "RESULT_ENTERED"
                    }
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />

                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3">
                    <ShieldCheck
                      size={18}
                      className="mt-0.5 shrink-0 text-blue-600"
                    />

                    <p className="text-xs leading-5 text-blue-700">
                      Technical validation confirms
                      the laboratory result before it
                      proceeds to Doctor Review.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* ================================================= */}
        {/* FOOTER */}
        {/* ================================================= */}

        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-200 bg-white px-6 py-4">
          <div className="text-xs text-slate-500">
            Result will move to{" "}
            <span className="font-semibold text-blue-600">
              TECHNICALLY_VALIDATED
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleValidate}
              disabled={
                loading ||
                submitting ||
                !result ||
                result.status !==
                  "RESULT_ENTERED"
              }
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />

                  Validating...
                </>
              ) : (
                <>
                  <ShieldCheck
                    size={17}
                  />

                  Validate Result
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}