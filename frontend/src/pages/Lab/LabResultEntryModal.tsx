import {
  AlertCircle,
  CheckCircle2,
  FlaskConical,
  Loader2,
  Save,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  createLabResult,
  getLabResultForOrderItem,
} from "../../services/labApi";

import type {
  CreateLabResultPayload,
  LabAbnormalFlag,
  LabOrderItem,
  LabResult,
  LabTest,
} from "../../types/lab";

/* -------------------------------------------------------------------------- */
/* Props                                                                      */
/* -------------------------------------------------------------------------- */

interface LabResultEntryModalProps {
  open: boolean;
  item: LabOrderItem | null;
  test: LabTest | null;

  onClose: () => void;
  onSuccess?: () => Promise<void> | void;
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const ABNORMAL_FLAGS: LabAbnormalFlag[] = [
  "Normal",
  "Low",
  "High",
  "Critical",
  "Positive",
  "Negative",
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Converts API / Axios / unknown errors into a safe string.
 *
 * Important:
 * FastAPI validation errors can return `detail` as an array/object.
 * Rendering that object directly inside <p> causes a React runtime error.
 */
const getErrorMessage = (error: unknown): string => {
  if (
    typeof error === "object" &&
    error !== null
  ) {
    const errorObject = error as {
      response?: {
        data?: {
          detail?: unknown;
          message?: unknown;
        };
      };
      message?: unknown;
    };

    const detail =
      errorObject.response?.data?.detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => {
          if (
            typeof item === "object" &&
            item !== null
          ) {
            const itemObject = item as {
              msg?: unknown;
              loc?: unknown;
            };

            if (
              typeof itemObject.msg === "string"
            ) {
              const location = Array.isArray(
                itemObject.loc,
              )
                ? itemObject.loc
                    .filter(
                      (value) =>
                        typeof value ===
                        "string" ||
                        typeof value ===
                        "number",
                    )
                    .join(" → ")
                : "";

              return location
                ? `${location}: ${itemObject.msg}`
                : itemObject.msg;
            }
          }

          if (typeof item === "string") {
            return item;
          }

          return null;
        })
        .filter(
          (message): message is string =>
            Boolean(message),
        );

      if (messages.length > 0) {
        return messages.join(" • ");
      }
    }

    if (
      detail !== null &&
      detail !== undefined
    ) {
      try {
        return JSON.stringify(detail);
      } catch {
        // Ignore serialization errors.
      }
    }

    const message =
      errorObject.response?.data?.message;

    if (typeof message === "string") {
      return message;
    }

    if (
      typeof errorObject.message === "string"
    ) {
      return errorObject.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Something went wrong. Please try again.";
};

const resultTypeLabel = (
  resultType?: string,
) => {
  switch (resultType) {
    case "Numeric":
      return "Numeric Result";

    case "Text":
      return "Text Result";

    case "Positive/Negative":
      return "Positive / Negative";

    case "Qualitative":
      return "Qualitative Result";

    default:
      return "Result";
  }
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function LabResultEntryModal({
  open,
  item,
  test,
  onClose,
  onSuccess,
}: LabResultEntryModalProps) {
  const [numericValue, setNumericValue] =
    useState("");

  const [textValue, setTextValue] =
    useState("");

  const [unit, setUnit] =
    useState("");

  const [referenceRangeText, setReferenceRangeText] =
    useState("");

  const [referenceMin, setReferenceMin] =
    useState("");

  const [referenceMax, setReferenceMax] =
    useState("");

  const [abnormalFlag, setAbnormalFlag] =
    useState<LabAbnormalFlag | "">("");

  const [isCritical, setIsCritical] =
    useState(false);

  const [interpretation, setInterpretation] =
    useState("");

  const [resultNotes, setResultNotes] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [checkingExisting, setCheckingExisting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [existingResult, setExistingResult] =
    useState<LabResult | null>(null);

  /* ------------------------------------------------------------------------ */
  /* Test Defaults                                                            */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!open || !test) {
      return;
    }

    setNumericValue("");
    setTextValue("");

    setUnit(test.unit ?? "");

    setReferenceRangeText(
      test.reference_range_text ?? "",
    );

    setReferenceMin(
      test.reference_min !== null &&
        test.reference_min !== undefined
        ? String(test.reference_min)
        : "",
    );

    setReferenceMax(
      test.reference_max !== null &&
        test.reference_max !== undefined
        ? String(test.reference_max)
        : "",
    );

    setAbnormalFlag("");
    setIsCritical(false);
    setInterpretation("");
    setResultNotes("");

    setError("");
    setExistingResult(null);
  }, [open, test?.id]);

  /* ------------------------------------------------------------------------ */
  /* Check Existing Result                                                    */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!open || !item) {
      return;
    }

    let cancelled = false;

    const checkExistingResult =
      async () => {
        try {
          setCheckingExisting(true);

          const result =
            await getLabResultForOrderItem(
              item.id,
            );

          if (!cancelled) {
            setExistingResult(result);
          }
        } catch {
          /*
           * A 404 means no result exists yet.
           * We intentionally do not show an error here.
           */
          if (!cancelled) {
            setExistingResult(null);
          }
        } finally {
          if (!cancelled) {
            setCheckingExisting(false);
          }
        }
      };

    void checkExistingResult();

    return () => {
      cancelled = true;
    };
  }, [open, item?.id]);

  /* ------------------------------------------------------------------------ */
  /* Derived                                                                  */
  /* ------------------------------------------------------------------------ */

  const resultType =
    test?.result_type;

  const isNumeric =
    resultType === "Numeric";

  const isPositiveNegative =
    resultType ===
    "Positive/Negative";

  const isTextLike =
    resultType === "Text" ||
    resultType === "Qualitative";

  const canSubmit =
    Boolean(item && test) &&
    !existingResult &&
    !checkingExisting &&
    !loading;

  const displayedReference =
    useMemo(() => {
      if (!test) {
        return "—";
      }

      if (test.reference_range_text) {
        return test.reference_range_text;
      }

      if (
        test.reference_min !== null &&
        test.reference_max !== null
      ) {
        return `${test.reference_min} – ${test.reference_max}`;
      }

      return "Not specified";
    }, [test]);

  /* ------------------------------------------------------------------------ */
  /* Submit                                                                   */
  /* ------------------------------------------------------------------------ */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!item || !test) {
      return;
    }

    setError("");

    /* Numeric validation */
    if (isNumeric) {
      if (
        numericValue.trim() === ""
      ) {
        setError(
          "Numeric result is required.",
        );
        return;
      }

      const parsedNumber =
        Number(numericValue);

      if (
        !Number.isFinite(
          parsedNumber,
        )
      ) {
        setError(
          "Please enter a valid numeric result.",
        );
        return;
      }
    }

    /* Text validation */
    if (
      (isTextLike ||
        isPositiveNegative) &&
      !textValue.trim()
    ) {
      setError(
        "Result value is required.",
      );
      return;
    }

    /* Positive / Negative validation */
    if (
      isPositiveNegative &&
      ![
        "Positive",
        "Negative",
      ].includes(
        textValue.trim(),
      )
    ) {
      setError(
        "Please select Positive or Negative.",
      );
      return;
    }

    /* Reference range validation */
    if (
      referenceMin.trim() !== "" &&
      !Number.isFinite(
        Number(referenceMin),
      )
    ) {
      setError(
        "Reference minimum must be a valid number.",
      );
      return;
    }

    if (
      referenceMax.trim() !== "" &&
      !Number.isFinite(
        Number(referenceMax),
      )
    ) {
      setError(
        "Reference maximum must be a valid number.",
      );
      return;
    }

    if (
      referenceMin.trim() !== "" &&
      referenceMax.trim() !== "" &&
      Number(referenceMin) >
        Number(referenceMax)
    ) {
      setError(
        "Reference minimum cannot be greater than reference maximum.",
      );
      return;
    }

    /* ---------------------------------------------------------------------- */
    /* Result Payload                                                          */
    /* ---------------------------------------------------------------------- */

    const payload: CreateLabResultPayload = {
      /*
       * Required by the current backend validation contract.
       *
       * The same item ID is also used in the API URL by:
       * createLabResult(item.id, payload)
       */
      lab_order_item_id: item.id,

      numeric_value: isNumeric
        ? Number(numericValue)
        : null,

      text_value:
        isTextLike ||
        isPositiveNegative
          ? textValue.trim()
          : null,

      unit:
        unit.trim() || null,

      reference_range_text:
        referenceRangeText.trim() ||
        null,

      reference_min:
        referenceMin.trim() !== ""
          ? Number(referenceMin)
          : null,

      reference_max:
        referenceMax.trim() !== ""
          ? Number(referenceMax)
          : null,

      abnormal_flag:
        abnormalFlag || null,

      is_critical:
        isCritical,

      interpretation:
        interpretation.trim() ||
        null,

      result_notes:
        resultNotes.trim() ||
        null,
    };

    try {
      setLoading(true);

      await createLabResult(
        item.id,
        payload,
      );

      await onSuccess?.();

      onClose();
    } catch (err) {
      console.error(
        "Failed to create lab result:",
        err,
      );

      /*
       * Always store a STRING in error state.
       *
       * This prevents React from crashing when FastAPI
       * returns validation errors as an object/array.
       */
      setError(
        getErrorMessage(err),
      );
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Early Return                                                             */
  /* ------------------------------------------------------------------------ */

  if (!open || !item || !test) {
    return null;
  }

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

        {/* ================================================================ */}
        {/* Header                                                           */}
        {/* ================================================================ */}

        <div className="shrink-0 border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">

            <div className="flex min-w-0 items-center gap-3">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950">
                <FlaskConical className="h-5 w-5 text-white" />
              </div>

              <div className="min-w-0">

                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">
                  Laboratory
                </p>

                <h2 className="mt-1 truncate text-lg font-bold tracking-tight text-slate-900">
                  Enter Laboratory Result
                </h2>

                <p className="mt-0.5 text-[11px] text-slate-500">
                  {test.code} • {test.name}
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>

          </div>
        </div>

        {/* ================================================================ */}
        {/* Body                                                             */}
        {/* ================================================================ */}

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 overflow-y-auto"
        >

          <div className="space-y-5 p-5 sm:p-6">

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">

                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />

                <p className="flex-1 text-xs font-medium leading-5 text-red-700">
                  {error}
                </p>

              </div>
            )}

            {/* Existing Result */}
            {checkingExisting && (
              <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-700">

                <Loader2 className="h-4 w-4 animate-spin" />

                Checking existing result...

              </div>
            )}

            {existingResult && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">

                <div className="flex items-start gap-3">

                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

                  <div>

                    <p className="text-xs font-bold text-amber-800">
                      Result already exists
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-amber-700">
                      This test already has a laboratory result. A second result cannot be created for the same order item.
                    </p>

                    <div className="mt-3 rounded-lg border border-amber-200 bg-white/70 px-3 py-2">

                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                        Current Status
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-800">
                        {existingResult.status}
                      </p>

                    </div>

                  </div>

                </div>

              </div>
            )}

            {/* Test Summary */}
            <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Test
                  </p>

                  <h3 className="mt-1 text-sm font-bold text-slate-900">
                    {test.name}
                  </h3>

                  <p className="mt-1 text-[11px] text-slate-500">
                    {test.category} •{" "}
                    {test.specimen_type}
                  </p>

                </div>

                <span className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold text-blue-700">
                  {resultTypeLabel(
                    resultType,
                  )}
                </span>

              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">

                <div className="rounded-lg border border-slate-200 bg-white p-3">

                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Unit
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-700">
                    {test.unit ||
                      "Not specified"}
                  </p>

                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-3 sm:col-span-2">

                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Reference Range
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-700">
                    {displayedReference}
                  </p>

                </div>

              </div>

            </section>

            {/* Result Value */}
            {!existingResult && (
              <section className="rounded-2xl border border-slate-200 bg-white">

                <div className="border-b border-slate-100 px-4 py-3">

                  <h3 className="text-sm font-bold text-slate-900">
                    Result Value
                  </h3>

                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Enter the result according to the configured test type.
                  </p>

                </div>

                <div className="space-y-4 p-4">

                  {/* Numeric */}
                  {isNumeric && (
                    <div>

                      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Numeric Result
                        <span className="ml-1 text-red-500">
                          *
                        </span>
                      </label>

                      <div className="flex gap-2">

                        <input
                          type="number"
                          step="any"
                          value={numericValue}
                          onChange={(
                            event,
                          ) =>
                            setNumericValue(
                              event.target.value,
                            )
                          }
                          placeholder="Enter result value"
                          className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                        />

                        <div className="flex h-11 min-w-[90px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600">
                          {unit ||
                            test.unit ||
                            "Unit"}
                        </div>

                      </div>

                    </div>
                  )}

                  {/* Positive / Negative */}
                  {isPositiveNegative && (
                    <div>

                      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Result
                        <span className="ml-1 text-red-500">
                          *
                        </span>
                      </label>

                      <div className="grid grid-cols-2 gap-3">

                        {[
                          "Positive",
                          "Negative",
                        ].map(
                          (value) => {
                            const active =
                              textValue ===
                              value;

                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() =>
                                  setTextValue(
                                    value,
                                  )
                                }
                                className={[
                                  "h-11 rounded-lg border text-xs font-bold transition",
                                  active
                                    ? value ===
                                      "Positive"
                                      ? "border-red-300 bg-red-50 text-red-700"
                                      : "border-emerald-300 bg-emerald-50 text-emerald-700"
                                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                                ].join(
                                  " ",
                                )}
                              >
                                {value}
                              </button>
                            );
                          },
                        )}

                      </div>

                    </div>
                  )}

                  {/* Text / Qualitative */}
                  {isTextLike && (
                    <div>

                      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Result
                        <span className="ml-1 text-red-500">
                          *
                        </span>
                      </label>

                      <textarea
                        value={textValue}
                        onChange={(
                          event,
                        ) =>
                          setTextValue(
                            event.target.value,
                          )
                        }
                        rows={4}
                        maxLength={2000}
                        placeholder={
                          resultType ===
                          "Qualitative"
                            ? "Enter qualitative observation..."
                            : "Enter laboratory result..."
                        }
                        className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                      />

                      <p className="mt-1 text-right text-[9px] text-slate-400">
                        {textValue.length}{" "}
                        / 2000
                      </p>

                    </div>
                  )}

                  {/* Unit */}
                  <div>

                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Unit
                    </label>

                    <input
                      value={unit}
                      onChange={(
                        event,
                      ) =>
                        setUnit(
                          event.target.value,
                        )
                      }
                      maxLength={50}
                      placeholder="e.g. mg/dL"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                    />

                  </div>

                </div>

              </section>
            )}

            {/* Reference Range */}
            {!existingResult && (
              <section className="rounded-2xl border border-slate-200 bg-white">

                <div className="border-b border-slate-100 px-4 py-3">

                  <h3 className="text-sm font-bold text-slate-900">
                    Reference & Interpretation
                  </h3>

                </div>

                <div className="grid gap-4 p-4 lg:grid-cols-3">

                  <div className="lg:col-span-3">

                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Reference Range Text
                    </label>

                    <input
                      value={referenceRangeText}
                      onChange={(
                        event,
                      ) =>
                        setReferenceRangeText(
                          event.target.value,
                        )
                      }
                      maxLength={255}
                      placeholder="e.g. 70 - 100 mg/dL"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                    />

                  </div>

                  {isNumeric && (
                    <>
                      <div>

                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Reference Minimum
                        </label>

                        <input
                          type="number"
                          step="any"
                          value={referenceMin}
                          onChange={(
                            event,
                          ) =>
                            setReferenceMin(
                              event.target.value,
                            )
                          }
                          placeholder="Minimum"
                          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                        />

                      </div>

                      <div>

                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Reference Maximum
                        </label>

                        <input
                          type="number"
                          step="any"
                          value={referenceMax}
                          onChange={(
                            event,
                          ) =>
                            setReferenceMax(
                              event.target.value,
                            )
                          }
                          placeholder="Maximum"
                          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                        />

                      </div>
                    </>
                  )}

                  <div>

                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Abnormal Flag
                    </label>

                    <select
                      value={abnormalFlag}
                      onChange={(
                        event,
                      ) =>
                        setAbnormalFlag(
                          event.target
                            .value as
                            | LabAbnormalFlag
                            | "",
                        )
                      }
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                    >

                      <option value="">
                        Select flag
                      </option>

                      {ABNORMAL_FLAGS.map(
                        (flag) => (
                          <option
                            key={flag}
                            value={flag}
                          >
                            {flag}
                          </option>
                        ),
                      )}

                    </select>

                  </div>

                </div>

              </section>
            )}

            {/* Critical */}
            {!existingResult && (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-red-100 bg-red-50/60 p-4">

                <input
                  type="checkbox"
                  checked={isCritical}
                  onChange={(
                    event,
                  ) =>
                    setIsCritical(
                      event.target.checked,
                    )
                  }
                  className="mt-0.5 h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                />

                <div>

                  <p className="text-xs font-bold text-red-800">
                    Critical Result
                  </p>

                  <p className="mt-0.5 text-[10px] leading-5 text-red-700/80">
                    Mark this result as critical when it requires immediate clinical attention.
                  </p>

                </div>

              </label>
            )}

            {/* Interpretation */}
            {!existingResult && (
              <section className="rounded-2xl border border-slate-200 bg-white p-4">

                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Interpretation
                </label>

                <textarea
                  value={interpretation}
                  onChange={(
                    event,
                  ) =>
                    setInterpretation(
                      event.target.value,
                    )
                  }
                  maxLength={2000}
                  rows={3}
                  placeholder="Optional clinical interpretation..."
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                />

              </section>
            )}

            {/* Notes */}
            {!existingResult && (
              <section className="rounded-2xl border border-slate-200 bg-white p-4">

                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Result Notes
                </label>

                <textarea
                  value={resultNotes}
                  onChange={(
                    event,
                  ) =>
                    setResultNotes(
                      event.target.value,
                    )
                  }
                  maxLength={2000}
                  rows={3}
                  placeholder="Optional laboratory notes..."
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                />

              </section>
            )}

          </div>

          {/* ================================================================ */}
          {/* Footer                                                           */}
          {/* ================================================================ */}

          <div className="sticky bottom-0 border-t border-slate-100 bg-white/95 px-5 py-3 backdrop-blur sm:px-6">

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">

              <p className="text-[10px] text-slate-400">
                Result will be created with status{" "}
                <span className="font-bold text-blue-600">
                  RESULT_ENTERED
                </span>
              </p>

              <div className="flex gap-2">

                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}

                  Save Result

                </button>

              </div>

            </div>

          </div>

        </form>

      </div>
    </div>
  );
}