import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileText,
  FlaskConical,
  Printer,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import type { Patient } from "../../types/patient";
import type {
  LabOrder,
  LabResult,
  LabTest,
} from "../../types/lab";

interface LabReportModalProps {
  open: boolean;
  patient: Patient | null;
  order: LabOrder | null;
  results: LabResult[];
  labTests: LabTest[];
  onClose: () => void;
}

/* ============================================================
   HELPERS
============================================================ */

function formatDateTime(value: string | null | undefined) {
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

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not specified";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not specified";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatResultValue(result: LabResult) {
  if (
    result.numeric_value !== null &&
    result.numeric_value !== undefined
  ) {
    return `${result.numeric_value}${
      result.unit ? ` ${result.unit}` : ""
    }`;
  }

  if (result.text_value?.trim()) {
    return result.text_value;
  }

  return "Not recorded";
}

function getFlagClass(
  flag: LabResult["abnormal_flag"],
) {
  switch (flag) {
    case "Critical":
      return "border-red-200 bg-red-50 text-red-700";

    case "High":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "Low":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "Positive":
      return "border-rose-200 bg-rose-50 text-rose-700";

    case "Negative":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "Normal":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function getResultValueClass(
  result: LabResult,
) {
  if (result.is_critical || result.abnormal_flag === "Critical") {
    return "text-red-700";
  }

  if (
    result.abnormal_flag === "High" ||
    result.abnormal_flag === "Low" ||
    result.abnormal_flag === "Positive"
  ) {
    return "text-orange-700";
  }

  return "text-slate-900";
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function LabReportModal({
  open,
  patient,
  order,
  results,
  labTests,
  onClose,
}: LabReportModalProps) {
  if (!open || !patient || !order) {
    return null;
  }

  const testMap = new Map<number, LabTest>();

  labTests.forEach((test) => {
    testMap.set(test.id, test);
  });

  /*
   * Only show results belonging to the selected order.
   * The Patient Clinical Profile already loads finalized
   * results, so this report remains aligned with that flow.
   */
  const reportResults = results.filter((result) => {
    return order.items?.some(
      (item) =>
        item.id === result.lab_order_item_id,
    );
  });

  const sortedResults = [...reportResults].sort(
    (a, b) => a.id - b.id,
  );

  const abnormalResults = sortedResults.filter(
    (result) =>
      result.is_critical ||
      result.abnormal_flag === "Critical" ||
      result.abnormal_flag === "High" ||
      result.abnormal_flag === "Low" ||
      result.abnormal_flag === "Positive",
  );

  const criticalResults = sortedResults.filter(
    (result) =>
      result.is_critical ||
      result.abnormal_flag === "Critical",
  );

  const finalizedAt =
    sortedResults.find(
      (result) => result.finalized_at,
    )?.finalized_at ??
    order.finalized_at ??
    order.updated_at;

  const handlePrint = () => {
  const report = document.getElementById(
    "lab-report-print",
  );

  if (!report) {
    return;
  }

  const printWindow = window.open(
    "",
    "_blank",
    "width=1200,height=900",
  );

  if (!printWindow) {
    window.alert(
      "Unable to open print preview. Please allow pop-ups for this site.",
    );
    return;
  }

  const reportHtml = report.outerHTML;

  const styles = Array.from(
    document.querySelectorAll(
      'link[rel="stylesheet"], style',
    ),
  )
    .map((element) => element.outerHTML)
    .join("\n");

  printWindow.document.open();

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />

        <title>
          Laboratory Report - LAB-${String(order.id).padStart(5, "0")}
        </title>

        ${styles}

        <style>
  @page {
    size: A4 portrait;
    margin: 7mm;
  }

  html,
  body {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    min-height: 100% !important;
    background: #ffffff !important;
  }

  body {
    overflow: visible !important;
  }

  /*
   * Compact print layout.
   *
   * The screen report remains unchanged.
   * Only the isolated print document is compressed
   * so the complete laboratory report fits on A4.
   */
  #lab-report-print {
    position: static !important;

    /*
     * Chrome/Edge print layout uses CSS zoom here rather
     * than transform, so page-flow height is reduced too.
     */
    zoom: 0.88;

    width: 113.6% !important;
    max-width: none !important;

    margin: 0 !important;
    padding: 0 !important;

    min-height: 0 !important;

    background: #ffffff !important;

    border-radius: 0 !important;
    box-shadow: none !important;

    overflow: visible !important;
  }

  /*
   * Reduce vertical spacing only for print.
   */
  #lab-report-print header {
    padding-top: 18px !important;
    padding-bottom: 18px !important;
  }

  #lab-report-print section {
    padding-top: 14px !important;
    padding-bottom: 14px !important;
  }

  #lab-report-print footer {
    padding-top: 14px !important;
    padding-bottom: 12px !important;
  }

  /*
   * Keep result rows together.
   */
  #lab-report-print article {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }

  /*
   * Avoid unnecessary page breaks.
   */
  #lab-report-print header,
  #lab-report-print section,
  #lab-report-print footer {
    break-inside: avoid !important;
  }

  /*
   * Keep report colours/borders/icons when exporting.
   */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
</style>
      </head>

      <body>
        ${reportHtml}

        <script>
          window.addEventListener("load", function () {
            setTimeout(function () {
              window.focus();
              window.print();
            }, 500);
          });

          window.addEventListener("afterprint", function () {
            window.close();
          });
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
};

  return (
    <div
      className="
        fixed
        inset-0
        z-[100]
        flex
        items-center
        justify-center
        bg-slate-950/60
        p-3
        backdrop-blur-sm
        print:static
        print:block
        print:bg-white
        print:p-0
      "
    >
      {/* ============================================================
          MODAL
      ============================================================ */}

      <div
        className="
          flex
          max-h-[94vh]
          w-full
          max-w-5xl
          flex-col
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-2xl
          print:max-h-none
          print:max-w-none
          print:overflow-visible
          print:rounded-none
          print:border-0
          print:shadow-none
        "
      >
        {/* ========================================================
            TOP BAR
        ======================================================== */}

        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            border-b
            border-slate-200
            bg-white
            px-5
            py-3.5
            print:hidden
          "
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-violet-50
                text-violet-600
              "
            >
              <FileText size={17} />
            </div>

            <div className="min-w-0">
              <p
                className="
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-[0.16em]
                  text-violet-600
                "
              >
                Laboratory
              </p>

              <h2 className="truncate text-sm font-bold text-slate-900">
                Laboratory Report
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="
                inline-flex
                items-center
                gap-2
                rounded-lg
                bg-slate-950
                px-3.5
                py-2
                text-xs
                font-semibold
                text-white
                transition
                hover:bg-slate-800
              "
            >
              <Printer size={14} />
              Print Report
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Close report"
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
                transition
                hover:border-slate-300
                hover:bg-slate-50
                hover:text-slate-900
              "
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ========================================================
            REPORT CONTENT
        ======================================================== */}

        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            bg-slate-100
            p-4
            sm:p-6
            print:overflow-visible
            print:bg-white
            print:p-0
          "
        >
          {/* ======================================================
              REPORT PAPER
          ====================================================== */}

          <div
            id="lab-report-print"
            className="
              mx-auto
              w-full
              max-w-[900px]
              bg-white
              shadow-sm
              print:max-w-none
              print:shadow-none
            "
          >
            {/* ====================================================
                HOSPITAL HEADER
            ==================================================== */}

            <header className="border-b-2 border-slate-900 px-6 py-6 sm:px-9 sm:py-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3.5">
                  <div
                    className="
                      flex
                      h-12
                      w-12
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-slate-950
                      text-white
                    "
                  >
                    <FlaskConical size={23} />
                  </div>

                  <div>
                    <p
                      className="
                        text-[9px]
                        font-bold
                        uppercase
                        tracking-[0.22em]
                        text-violet-600
                      "
                    >
                      Digital Hospital Operations
                    </p>

                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                      HospitaX
                    </h1>

                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Laboratory Diagnostic Report
                    </p>
                  </div>
                </div>

                <div className="sm:text-right">
                  <div
                    className="
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-full
                      border
                      border-emerald-200
                      bg-emerald-50
                      px-3
                      py-1.5
                      text-[9px]
                      font-bold
                      text-emerald-700
                    "
                  >
                    <CheckCircle2 size={12} />
                    FINALIZED
                  </div>

                  <p className="mt-2 text-[10px] text-slate-400">
                    Report finalized
                  </p>

                  <p className="mt-0.5 text-xs font-semibold text-slate-700">
                    {formatDateTime(finalizedAt)}
                  </p>
                </div>
              </div>
            </header>

            {/* ====================================================
                PATIENT + ORDER INFORMATION
            ==================================================== */}

            <section className="border-b border-slate-200 px-6 py-5 sm:px-9">
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Patient */}
                <div
                  className="
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50/60
                    p-4
                  "
                >
                  <div className="flex items-center gap-2">
                    <UserRound
                      size={15}
                      className="text-blue-600"
                    />

                    <p
                      className="
                        text-[9px]
                        font-bold
                        uppercase
                        tracking-[0.15em]
                        text-slate-400
                      "
                    >
                      Patient Information
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3">
                    <ReportField
                      label="Patient Name"
                      value={patient.name}
                    />

                    <ReportField
                      label="Patient ID"
                      value={`#${patient.id}`}
                    />

                    <ReportField
                      label="Age / Gender"
                      value={`${patient.age} years · ${patient.gender}`}
                    />

                    <ReportField
                      label="Contact"
                      value={patient.mobile}
                    />

                    <ReportField
                      label="Location"
                      value={patient.village}
                    />

                    <ReportField
                      label="Registered Condition"
                      value={patient.disease}
                    />
                  </div>
                </div>

                {/* Order */}
                <div
                  className="
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50/60
                    p-4
                  "
                >
                  <div className="flex items-center gap-2">
                    <ClipboardList
                      size={15}
                      className="text-violet-600"
                    />

                    <p
                      className="
                        text-[9px]
                        font-bold
                        uppercase
                        tracking-[0.15em]
                        text-slate-400
                      "
                    >
                      Laboratory Order
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3">
                    <ReportField
                      label="Order ID"
                      value={`#${order.id}`}
                    />

                    <ReportField
                      label="Priority"
                      value={order.priority}
                    />

                    <ReportField
                      label="Ordered On"
                      value={formatDateTime(order.ordered_at)}
                    />

                    <ReportField
                      label="Status"
                      value={order.status.replaceAll("_", " ")}
                    />

                    <ReportField
                      label="Tests"
                      value={String(order.items?.length ?? 0)}
                    />

                    <ReportField
                      label="Finalized"
                      value={formatDate(finalizedAt)}
                    />
                  </div>
                </div>
              </div>

              {(order.clinical_indication?.trim() ||
                order.notes?.trim()) && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {order.clinical_indication?.trim() && (
                    <ReportTextBlock
                      label="Clinical Indication"
                      value={order.clinical_indication}
                    />
                  )}

                  {order.notes?.trim() && (
                    <ReportTextBlock
                      label="Order Notes"
                      value={order.notes}
                    />
                  )}
                </div>
              )}
            </section>

            {/* ====================================================
                RESULT SUMMARY
            ==================================================== */}

            <section className="px-6 py-5 sm:px-9">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p
                    className="
                      text-[9px]
                      font-bold
                      uppercase
                      tracking-[0.16em]
                      text-violet-600
                    "
                  >
                    Diagnostic Findings
                  </p>

                  <h2 className="mt-1 text-base font-bold text-slate-900">
                    Laboratory Results
                  </h2>
                </div>

                <span className="text-[10px] font-medium text-slate-400">
                  {sortedResults.length}{" "}
                  {sortedResults.length === 1
                    ? "test"
                    : "tests"}
                </span>
              </div>

              {/* Result table */}

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div
                  className="
                    hidden
                    grid-cols-[1.6fr_1.15fr_1.2fr_0.8fr_0.9fr]
                    gap-3
                    border-b
                    border-slate-200
                    bg-slate-50
                    px-4
                    py-3
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-[0.1em]
                    text-slate-400
                    sm:grid
                  "
                >
                  <span>Test</span>
                  <span>Result</span>
                  <span>Reference Range</span>
                  <span>Flag</span>
                  <span>Status</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {sortedResults.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                      <FlaskConical
                        size={20}
                        className="mx-auto text-slate-300"
                      />

                      <p className="mt-2 text-xs font-semibold text-slate-600">
                        No finalized results found
                      </p>
                    </div>
                  ) : (
                    sortedResults.map((result) => {
                      const item = order.items?.find(
                        (orderItem) =>
                          orderItem.id ===
                          result.lab_order_item_id,
                      );

                      const test = item
                        ? testMap.get(item.lab_test_id)
                        : undefined;

                      const flag = result.abnormal_flag;

                      const referenceRange =
                        result.reference_range_text ||
                        (result.reference_min !== null &&
                        result.reference_max !== null
                          ? `${result.reference_min} – ${result.reference_max}${
                              result.unit
                                ? ` ${result.unit}`
                                : ""
                            }`
                          : "Not specified");

                      return (
                        <article
                          key={result.id}
                          className="
                            px-4
                            py-4
                            sm:grid
                            sm:grid-cols-[1.6fr_1.15fr_1.2fr_0.8fr_0.9fr]
                            sm:gap-3
                            sm:items-center
                          "
                        >
                          {/* Test */}
                          <div>
                            <p className="text-xs font-bold text-slate-900">
                              {test?.name ??
                                `Laboratory Test #${result.lab_order_item_id}`}
                            </p>

                            <div className="mt-1 flex flex-wrap gap-2 text-[9px] text-slate-400">
                              {test?.code && (
                                <span>
                                  {test.code}
                                </span>
                              )}

                              {test?.specimen_type && (
                                <span>
                                  · {test.specimen_type}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Result */}
                          <div className="mt-3 sm:mt-0">
                            <p className="mb-1 text-[8px] font-bold uppercase tracking-wide text-slate-400 sm:hidden">
                              Result
                            </p>

                            <p
                              className={`text-sm font-bold ${getResultValueClass(
                                result,
                              )}`}
                            >
                              {formatResultValue(result)}
                            </p>
                          </div>

                          {/* Reference */}
                          <div className="mt-3 sm:mt-0">
                            <p className="mb-1 text-[8px] font-bold uppercase tracking-wide text-slate-400 sm:hidden">
                              Reference Range
                            </p>

                            <p className="text-xs font-medium text-slate-600">
                              {referenceRange}
                            </p>
                          </div>

                          {/* Flag */}
                          <div className="mt-3 sm:mt-0">
                            <p className="mb-1 text-[8px] font-bold uppercase tracking-wide text-slate-400 sm:hidden">
                              Flag
                            </p>

                            {flag ? (
                              <span
                                className={`
                                  inline-flex
                                  items-center
                                  rounded-full
                                  border
                                  px-2
                                  py-1
                                  text-[9px]
                                  font-bold
                                  ${getFlagClass(flag)}
                                `}
                              >
                                {flag}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">
                                —
                              </span>
                            )}

                            {result.is_critical && (
                              <span
                                className="
                                  mt-1
                                  inline-flex
                                  items-center
                                  gap-1
                                  rounded-full
                                  border
                                  border-red-200
                                  bg-red-50
                                  px-2
                                  py-1
                                  text-[8px]
                                  font-bold
                                  text-red-700
                                "
                              >
                                <AlertTriangle size={10} />
                                Critical
                              </span>
                            )}
                          </div>

                          {/* Status */}
                          <div className="mt-3 sm:mt-0">
                            <p className="mb-1 text-[8px] font-bold uppercase tracking-wide text-slate-400 sm:hidden">
                              Status
                            </p>

                            <span
                              className="
                                inline-flex
                                items-center
                                gap-1.5
                                rounded-full
                                border
                                border-emerald-200
                                bg-emerald-50
                                px-2
                                py-1
                                text-[9px]
                                font-bold
                                text-emerald-700
                              "
                            >
                              <CheckCircle2 size={10} />
                              Finalized
                            </span>
                          </div>

                          {/* Interpretation */}
                          {(result.interpretation?.trim() ||
                            result.result_notes?.trim()) && (
                            <div className="mt-3 border-t border-slate-100 pt-3 sm:col-span-5">
                              {result.interpretation?.trim() && (
                                <p className="text-[10px] leading-5 text-slate-600">
                                  <span className="font-bold text-slate-700">
                                    Interpretation:
                                  </span>{" "}
                                  {result.interpretation}
                                </p>
                              )}

                              {result.result_notes?.trim() && (
                                <p className="mt-1 text-[10px] leading-5 text-slate-500">
                                  <span className="font-bold text-slate-600">
                                    Notes:
                                  </span>{" "}
                                  {result.result_notes}
                                </p>
                              )}
                            </div>
                          )}
                        </article>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ==================================================
                  ABNORMAL FINDINGS NOTICE
              ================================================== */}

              {abnormalResults.length > 0 && (
                <div
                  className="
                    mt-4
                    rounded-xl
                    border
                    border-amber-200
                    bg-amber-50/70
                    p-4
                  "
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="
                        flex
                        h-8
                        w-8
                        shrink-0
                        items-center
                        justify-center
                        rounded-lg
                        bg-white
                        text-amber-600
                        shadow-sm
                      "
                    >
                      <AlertTriangle size={15} />
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                        Result Attention
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-amber-800">
                        {abnormalResults.length}{" "}
                        {abnormalResults.length === 1
                          ? "result requires"
                          : "results require"}{" "}
                        clinical attention based on the recorded
                        laboratory flag.
                      </p>

                      {criticalResults.length > 0 && (
                        <p className="mt-1 text-[10px] font-bold text-red-700">
                          {criticalResults.length} critical{" "}
                          {criticalResults.length === 1
                            ? "result"
                            : "results"}{" "}
                          recorded.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* ====================================================
                VALIDATION / FINALIZATION INFORMATION
            ==================================================== */}

            <section className="border-t border-slate-200 px-6 py-5 sm:px-9">
              <div className="grid gap-3 sm:grid-cols-3">
                <AuditCard
                  label="Result Entry"
                  value={
                    sortedResults[0]?.entered_at
                      ? formatDateTime(
                          sortedResults[0].entered_at,
                        )
                      : "Recorded"
                  }
                  icon={FileText}
                />

                <AuditCard
                  label="Technical Validation"
                  value={
                    sortedResults[0]?.validated_at
                      ? formatDateTime(
                          sortedResults[0].validated_at,
                        )
                      : "Validated"
                  }
                  icon={ShieldCheck}
                />

                <AuditCard
                  label="Final Review"
                  value={
                    finalizedAt
                      ? formatDateTime(finalizedAt)
                      : "Finalized"
                  }
                  icon={CheckCircle2}
                />
              </div>
            </section>

            {/* ====================================================
                REPORT FOOTER
            ==================================================== */}

            <footer className="border-t-2 border-slate-900 px-6 py-5 sm:px-9">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-xl">
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Laboratory Report Notice
                  </p>

                  <p className="mt-1.5 text-[9px] leading-4 text-slate-500">
                    This report contains laboratory information recorded
                    and finalized within the HospitaX hospital operations
                    platform. Clinical interpretation and treatment
                    decisions remain the responsibility of the authorized
                    treating clinician.
                  </p>
                </div>

                <div className="shrink-0 text-left sm:text-right">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                    Report ID
                  </p>

                  <p className="mt-1 text-xs font-bold text-slate-800">
                    LAB-{String(order.id).padStart(5, "0")}
                  </p>

                  <p className="mt-1 text-[9px] text-slate-400">
                    Generated {formatDateTime(new Date().toISOString())}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                <p className="text-[9px] font-semibold text-slate-400">
                  HospitaX · Digital Hospital Operations Platform
                </p>

                <p className="text-[9px] font-semibold text-slate-400">
                  Laboratory Services
                </p>
              </div>
            </footer>
          </div>
        </div>
      </div>

      
    </div>
  );
}

/* ============================================================
   REPORT FIELD
============================================================ */

function ReportField({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-[11px] font-semibold text-slate-800">
        {value || "Not specified"}
      </p>
    </div>
  );
}

/* ============================================================
   REPORT TEXT BLOCK
============================================================ */

function ReportTextBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
      <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1.5 whitespace-pre-wrap text-[10px] leading-5 text-slate-600">
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   AUDIT CARD
============================================================ */

function AuditCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof CheckCircle2;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
      <div className="flex items-center gap-2">
        <Icon
          size={13}
          className="text-slate-500"
        />

        <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>
      </div>

      <p className="mt-2 text-[10px] font-semibold leading-4 text-slate-700">
        {value}
      </p>
    </div>
  );
}