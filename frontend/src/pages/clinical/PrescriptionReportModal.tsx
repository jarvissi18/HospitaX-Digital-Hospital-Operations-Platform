import { useEffect } from "react";
import {
  CalendarDays,
  FileText,
  Pill,
  Printer,
  X,
} from "lucide-react";

import type { Prescription } from "../../services/prescriptionApi";

interface PrescriptionReportModalProps {
  prescription: Prescription;
  onClose: () => void;
}

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

function getStatusClasses(status: Prescription["status"]) {
  switch (status) {
    case "ACTIVE":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "COMPLETED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "DISCONTINUED":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "CANCELLED":
      return "border-red-200 bg-red-50 text-red-700";

    case "DRAFT":
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function formatDuration(
  value: number | null,
  unit: string | null,
) {
  if (!value) {
    return "Not specified";
  }

  return `${value} ${unit ?? ""}`.trim();
}

export default function PrescriptionReportModal({
  prescription,
  onClose,
}: PrescriptionReportModalProps) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [onClose]);

  const handlePrint = () => {
    const report =
      document.getElementById(
        "prescription-print-report",
      );

    if (!report) {
      return;
    }

    const printWindow = window.open(
      "",
      "_blank",
      "width=900,height=1200",
    );

    if (!printWindow) {
      return;
    }

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
          <title>
            Prescription #${prescription.id} - HOSPITAX
          </title>

          ${styles}

          <style>
            @page {
              size: A4;
              margin: 10mm;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              background: white !important;
            }

            body {
              font-family:
                Inter,
                ui-sans-serif,
                system-ui,
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                sans-serif;
            }

            #prescription-print-report {
              display: block !important;
              width: 128.2% !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
              zoom: 0.78 !important;
              transform-origin: top left !important;
            }

            .print-hidden {
              display: none !important;
            }

            .print-only {
              display: block !important;
            }

            table {
              page-break-inside: auto;
            }

            tr,
            td,
            th {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .print-section {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .medication-row {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            @media print {
              html,
              body {
                width: 210mm;
                min-height: 297mm;
              }

              body {
                overflow: visible !important;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
            }
          </style>
        </head>

        <body>
          ${report.outerHTML}

          <script>
            window.onload = function () {
              setTimeout(function () {
                window.print();
              }, 300);
            };

            window.onafterprint = function () {
              window.close();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* HEADER */}

        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <FileText size={17} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Prescription Report
                </h2>

                <span
                  className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${getStatusClasses(
                    prescription.status,
                  )}`}
                >
                  {prescription.status}
                </span>
              </div>

              <p className="text-[10px] text-slate-400">
                Prescription #
                {prescription.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-950 px-3.5 text-[10px] font-semibold text-white shadow-sm transition hover:bg-violet-600"
            >
              <Printer size={14} />
              Print Prescription
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close prescription report"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* REPORT */}

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 px-4 py-5 sm:px-8">
          <div
            id="prescription-print-report"
            className="mx-auto w-full max-w-[820px] bg-white px-7 py-8 shadow-sm sm:px-10 sm:py-10"
          >
            {/* HOSPITAX HEADER */}

            <div className="print-section border-b-2 border-slate-900 pb-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-violet-600">
                    Digital Hospital Operations
                  </p>

                  <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                    HOSPITAX
                  </h1>

                  <p className="mt-1 text-[10px] text-slate-500">
                    Prescription & Medication Order
                  </p>
                </div>

                <div className="sm:text-right">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Prescription
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-900">
                    #{prescription.id}
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[9px] font-bold ${getStatusClasses(
                      prescription.status,
                    )}`}
                  >
                    {prescription.status}
                  </span>
                </div>
              </div>
            </div>

            {/* PATIENT / ENCOUNTER */}

            <div className="print-section mt-6">
              <div className="mb-3 flex items-center gap-2">
                <FileText
                  size={15}
                  className="text-violet-600"
                />

                <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-800">
                  Prescription Information
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoBlock
                  label="Patient"
                  value={
                    prescription.patient_name?.trim() ||
                    `Patient #${prescription.patient_id}`
                  }
                />

                <InfoBlock
                  label="Encounter"
                  value={`Encounter #${prescription.encounter_id}`}
                />

                <InfoBlock
                  label="Prescribed By"
                  value={
                    prescription.doctor_name?.trim() ||
                    `Doctor/User #${prescription.prescribed_by_id}`
                  }
                />

                <InfoBlock
                  label="Prescription Date"
                  value={formatDateTime(
                    prescription.prescribed_at,
                  )}
                />
              </div>
            </div>

            {/* MEDICATIONS */}

            <div className="print-section mt-7">
              <div className="mb-3 flex items-center gap-2">
                <Pill
                  size={15}
                  className="text-violet-600"
                />

                <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-800">
                  Medications
                </h2>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="hidden grid-cols-[1.5fr_0.9fr_0.9fr_0.9fr_1fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[8px] font-bold uppercase tracking-wide text-slate-500 md:grid">
                  <span>Medication</span>
                  <span>Dose</span>
                  <span>Frequency</span>
                  <span>Duration</span>
                  <span>Quantity</span>
                </div>

                <div className="divide-y divide-slate-200">
                  {prescription.items.map(
                    (item, index) => (
                      <div
                        key={item.id}
                        className="medication-row grid gap-4 px-4 py-4 md:grid-cols-[1.5fr_0.9fr_0.9fr_0.9fr_1fr] md:items-start"
                      >
                        {/* MEDICATION */}

                        <div>
                          <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400 md:hidden">
                            Medication
                          </p>

                          <p className="mt-0.5 text-xs font-bold text-slate-900">
                            {index + 1}.{" "}
                            {item.medication_name}
                          </p>

                          {item.generic_name && (
                            <p className="mt-1 text-[10px] text-slate-500">
                              Generic:{" "}
                              {item.generic_name}
                            </p>
                          )}

                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {item.strength && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-semibold text-slate-600">
                                {item.strength}
                              </span>
                            )}

                            {item.dosage_form && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-semibold text-slate-600">
                                {item.dosage_form}
                              </span>
                            )}

                            {item.route && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-semibold text-slate-600">
                                {item.route}
                              </span>
                            )}

                            {item.is_prn && (
                              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[8px] font-bold text-amber-700">
                                PRN
                              </span>
                            )}
                          </div>
                        </div>

                        {/* DOSE */}

                        <div>
                          <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400 md:hidden">
                            Dose
                          </p>

                          <p className="mt-0.5 text-[10px] font-semibold text-slate-700">
                            {item.dose ||
                              "Not specified"}
                          </p>
                        </div>

                        {/* FREQUENCY */}

                        <div>
                          <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400 md:hidden">
                            Frequency
                          </p>

                          <p className="mt-0.5 text-[10px] font-semibold text-slate-700">
                            {item.frequency ||
                              "Not specified"}
                          </p>
                        </div>

                        {/* DURATION */}

                        <div>
                          <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400 md:hidden">
                            Duration
                          </p>

                          <p className="mt-0.5 text-[10px] font-semibold text-slate-700">
                            {formatDuration(
                              item.duration_value,
                              item.duration_unit,
                            )}
                          </p>
                        </div>

                        {/* QUANTITY */}

                        <div>
                          <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400 md:hidden">
                            Quantity
                          </p>

                          <p className="mt-0.5 text-[10px] font-semibold text-slate-700">
                            {item.quantity ||
                              "Not specified"}
                          </p>
                        </div>

                        {/* INSTRUCTIONS */}

                        {item.instructions && (
                          <div className="md:col-span-5 border-t border-slate-100 pt-3">
                            <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
                              Instructions
                            </p>

                            <p className="mt-1 whitespace-pre-wrap text-[10px] leading-5 text-slate-700">
                              {item.instructions}
                            </p>
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>

            {/* PRESCRIPTION NOTES */}

            {prescription.notes && (
              <div className="print-section mt-6 rounded-xl border border-violet-100 bg-violet-50/50 p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-violet-600">
                  Prescription Notes
                </p>

                <p className="mt-2 whitespace-pre-wrap text-[10px] leading-5 text-slate-700">
                  {prescription.notes}
                </p>
              </div>
            )}

            {/* FOOTER INFORMATION */}

            <div className="print-section mt-8 border-t border-slate-200 pt-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
                    Prescribed By
                  </p>

                  <p className="mt-2 text-xs font-bold text-slate-800">
                    {prescription.doctor_name?.trim() ||
                      `Doctor/User #${prescription.prescribed_by_id}`}
                  </p>

                  <p className="mt-1 text-[9px] text-slate-500">
                    Authorized prescription
                  </p>
                </div>

                <div className="sm:text-right">
                  <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
                    Prescription Date
                  </p>

                  <p className="mt-2 text-xs font-semibold text-slate-800">
                    {formatDateTime(
                      prescription.prescribed_at,
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-8 border-t border-dashed border-slate-300 pt-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[8px] text-slate-400">
                    Generated by HOSPITAX
                  </p>

                  <p className="flex items-center gap-1.5 text-[8px] text-slate-400">
                    <CalendarDays size={10} />

                    {formatDateTime(
                      new Date().toISOString(),
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}

        <div className="flex shrink-0 items-center justify-end border-t border-slate-100 bg-slate-50/70 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// INFO BLOCK
// =====================================================

function InfoBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3.5 py-3">
      <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-[10px] font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}