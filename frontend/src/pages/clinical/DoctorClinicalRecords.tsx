import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileText,
  RefreshCw,
  Search,
  Stethoscope,
  UserRound,
  XCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import { getMyClinicalEncounters, type ClinicalEncounter } from "../../services/clinicalEncounterApi";
import { getPatients } from "../../services/patientApi";
import type { Patient } from "../../types/patient";

// =====================================================
// HELPERS
// =====================================================

type StatusFilter = "All" | "Draft" | "Completed" | "Cancelled";

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function getInitials(name?: string) {
  return (
    (name || "Patient")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "P"
  );
}

function getStatusMeta(status: ClinicalEncounter["status"]) {
  switch (status) {
    case "Completed":
      return {
        icon: CheckCircle2,
        dot: "bg-emerald-500",
        badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      };

    case "Cancelled":
      return {
        icon: XCircle,
        dot: "bg-slate-400",
        badge: "bg-slate-100 text-slate-500 ring-slate-200",
      };

    case "Draft":
      return {
        icon: FileText,
        dot: "bg-amber-500",
        badge: "bg-amber-50 text-amber-700 ring-amber-200",
      };

    default:
      return {
        icon: Clock3,
        dot: "bg-blue-500",
        badge: "bg-blue-50 text-blue-700 ring-blue-200",
      };
  }
}

function getApiError(error: unknown, fallback: string) {
  const response = (
    error as {
      response?: {
        data?: {
          detail?: string;
        };
      };
    }
  )?.response;

  return response?.data?.detail || fallback;
}

// =====================================================
// PAGE
// =====================================================

export default function DoctorClinicalRecords() {
  const navigate = useNavigate();

  const [encounters, setEncounters] = useState<ClinicalEncounter[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("All");

  // ===================================================
  // LOAD DATA
  // ===================================================

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [encounterResponse, patientResponse] =
        await Promise.all([
          getMyClinicalEncounters(),
          getPatients(),
        ]);

      setEncounters(
        Array.isArray(encounterResponse)
          ? encounterResponse
          : [],
      );

      setPatients(
        Array.isArray(patientResponse)
          ? patientResponse
          : [],
      );
    } catch (err) {
      console.error(
        "Doctor clinical records loading error:",
        err,
      );

      setError(
        getApiError(
          err,
          "Unable to load your clinical records. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadRecords();
    } finally {
      setRefreshing(false);
    }
  };

  // ===================================================
  // PATIENT LOOKUP
  // ===================================================

  const patientMap = useMemo(() => {
    const map = new Map<number, Patient>();

    patients.forEach((patient) => {
      map.set(patient.id, patient);
    });

    return map;
  }, [patients]);

  // ===================================================
  // SUMMARY
  // ===================================================

  const summary = useMemo(() => {
    const completed = encounters.filter(
      (item) => item.status === "Completed",
    ).length;

    const drafts = encounters.filter(
      (item) => item.status === "Draft",
    ).length;

    const cancelled = encounters.filter(
      (item) => item.status === "Cancelled",
    ).length;

    return {
      total: encounters.length,
      completed,
      drafts,
      cancelled,
    };
  }, [encounters]);

  // ===================================================
  // FILTERED RECORDS
  // ===================================================

  const filteredEncounters = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...encounters]
      .filter((encounter) => {
        if (
          statusFilter !== "All" &&
          encounter.status !== statusFilter
        ) {
          return false;
        }

        if (!query) return true;

        const patient = patientMap.get(
          encounter.patient_id,
        );

        const searchableText = [
          patient?.name,
          patient?.mobile,
          patient?.disease,
          patient?.village,
          String(encounter.id),
          String(encounter.patient_id),
          encounter.chief_complaint,
          encounter.symptoms,
          encounter.diagnosis,
          encounter.treatment_plan,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(query);
      })
      .sort((a, b) => {
        const aDate = new Date(
          a.updated_at || a.created_at,
        ).getTime();

        const bDate = new Date(
          b.updated_at || b.created_at,
        ).getTime();

        return bDate - aDate;
      });
  }, [
    encounters,
    patientMap,
    search,
    statusFilter,
  ]);

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f5f7fb]">
      {/* =================================================
          HEADER
      ================================================= */}

      <header className="shrink-0 border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-5 px-5 py-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Stethoscope size={15} />
              </span>

              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-700">
                Doctor · Clinical Care
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-[30px]">
                Clinical Records
              </h1>

              <span className="text-sm font-semibold text-slate-400">
                My Consultations
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Review your clinical encounters, consultation
              status and patient medical records.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 lg:self-center"
          >
            <RefreshCw
              size={16}
              className={
                refreshing ? "animate-spin" : ""
              }
            />
            Refresh
          </button>
        </div>
      </header>

      {/* =================================================
          CONTENT
      ================================================= */}

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1680px] space-y-5 p-4 sm:p-6 lg:p-8">
          {error && (
            <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <CircleAlert
                  size={17}
                  className="mt-0.5 shrink-0"
                />

                <div>
                  <p className="font-semibold">
                    Clinical records unavailable
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-600">
                    {error}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void loadRecords()}
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-white px-3 text-xs font-bold text-red-600 ring-1 ring-red-200 transition hover:bg-red-100"
              >
                Retry
              </button>
            </div>
          )}

          {/* =================================================
              INTRO
          ================================================= */}

          <section className="relative overflow-hidden rounded-2xl border border-blue-200/70 bg-gradient-to-r from-blue-50 via-white to-violet-50 shadow-sm">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-400/10 blur-3xl" />

            <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-violet-400/10 blur-3xl" />

            <div className="relative flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                  <Stethoscope size={24} />
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
                    Clinical Workspace
                  </p>

                  <h2 className="mt-1 text-lg font-bold text-slate-950">
                    My Clinical Records
                  </h2>

                  <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                    Access consultations created by you and
                    open the associated patient clinical profile.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 rounded-xl border border-white/80 bg-white/80 px-3.5 py-2.5 shadow-sm">
                <CalendarDays
                  size={15}
                  className="text-blue-600"
                />

                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Total consultations
                  </p>

                  <p className="mt-0.5 text-sm font-bold text-slate-800">
                    {loading ? "—" : summary.total}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              SUMMARY
          ================================================= */}

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard
              label="All Records"
              value={summary.total}
              icon={FileText}
              active={statusFilter === "All"}
              onClick={() => setStatusFilter("All")}
            />

            <SummaryCard
              label="Completed"
              value={summary.completed}
              icon={CheckCircle2}
              active={statusFilter === "Completed"}
              onClick={() =>
                setStatusFilter("Completed")
              }
            />

            <SummaryCard
              label="Draft"
              value={summary.drafts}
              icon={Clock3}
              active={statusFilter === "Draft"}
              onClick={() => setStatusFilter("Draft")}
            />

            <SummaryCard
              label="Cancelled"
              value={summary.cancelled}
              icon={XCircle}
              active={statusFilter === "Cancelled"}
              onClick={() =>
                setStatusFilter("Cancelled")
              }
            />
          </section>

          {/* =================================================
              RECORDS
          ================================================= */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-slate-400">
                    Consultation Registry
                  </p>

                  <h2 className="mt-1 text-base font-bold text-slate-900">
                    My Clinical Encounters
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    Search and review clinical records associated
                    with your consultations.
                  </p>
                </div>

                <div className="relative w-full lg:max-w-[390px]">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="search"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search patient, diagnosis, consultation..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {(
                  [
                    "All",
                    "Draft",
                    "Completed",
                    "Cancelled",
                  ] as StatusFilter[]
                ).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() =>
                      setStatusFilter(status)
                    }
                    className={`
                      inline-flex h-8 items-center rounded-lg px-3 text-[10px] font-bold transition
                      ${
                        statusFilter === status
                          ? "bg-blue-600 text-white shadow-sm"
                          : "border border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      }
                    `}
                  >
                    {status}
                  </button>
                ))}

                <span className="ml-auto text-[10px] font-medium text-slate-400">
                  {loading
                    ? "Loading records..."
                    : `${filteredEncounters.length} record${
                        filteredEncounters.length === 1
                          ? ""
                          : "s"
                      }`}
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              {loading ? (
                <RecordsSkeleton />
              ) : filteredEncounters.length === 0 ? (
                <EmptyRecords
                  search={search}
                  statusFilter={statusFilter}
                  onClear={() => {
                    setSearch("");
                    setStatusFilter("All");
                  }}
                  onPatients={() =>
                    navigate("/patients")
                  }
                />
              ) : (
                <div className="space-y-2.5">
                  {filteredEncounters.map((encounter) => {
                    const patient = patientMap.get(
                      encounter.patient_id,
                    );

                    return (
                      <ClinicalRecordRow
                        key={encounter.id}
                        encounter={encounter}
                        patient={patient}
                        onOpen={() =>
                          navigate(
                            `/patients/${encounter.patient_id}`,
                          )
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="flex flex-col gap-2 border-t border-slate-200/70 pt-2 text-[10px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <span>
              HospitaX · Digital Hospital Operations Platform
            </span>

            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live clinical data
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

// =====================================================
// SUMMARY CARD
// =====================================================

function SummaryCard({
  label,
  value,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: typeof FileText;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group relative overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-sm transition
        ${
          active
            ? "border-blue-200 ring-2 ring-blue-500/10"
            : "border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
        }
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon size={18} />
        </div>

        <ArrowUpRight
          size={14}
          className="text-slate-300 transition group-hover:text-blue-500"
        />
      </div>

      <p className="mt-4 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </button>
  );
}

// =====================================================
// CLINICAL RECORD ROW
// =====================================================

function ClinicalRecordRow({
  encounter,
  patient,
  onOpen,
}: {
  encounter: ClinicalEncounter;
  patient?: Patient;
  onOpen: () => void;
}) {
  const status = getStatusMeta(encounter.status);
  const StatusIcon = status.icon;

  const displayTitle =
    patient?.name || `Patient #${encounter.patient_id}`;

  const clinicalSummary =
    encounter.chief_complaint ||
    encounter.diagnosis ||
    encounter.symptoms ||
    encounter.treatment_plan ||
    "Clinical encounter record";

  const recordDate =
    encounter.updated_at || encounter.created_at;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/20 hover:shadow-sm"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
        {/* PATIENT */}

        <div className="flex min-w-0 flex-1 items-center gap-3 xl:min-w-[280px]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm">
            {getInitials(patient?.name)}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-bold text-slate-900">
                {displayTitle}
              </p>

              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold text-slate-500">
                #{encounter.patient_id}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-slate-400">
              {patient?.disease && (
                <span>{patient.disease}</span>
              )}

              {patient?.village && (
                <span>{patient.village}</span>
              )}
            </div>
          </div>
        </div>

        {/* CONSULTATION */}

        <div className="min-w-0 flex-[1.3]">
          <div className="flex items-center gap-2">
            <Stethoscope
              size={14}
              className="shrink-0 text-blue-500"
            />

            <p className="text-xs font-bold text-slate-800">
              Consultation #{encounter.id}
            </p>
          </div>

          <p className="mt-1 truncate text-[10px] text-slate-500">
            {clinicalSummary}
          </p>
        </div>

        {/* STATUS */}

        <div className="flex items-center gap-2 xl:w-[125px]">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[9px] font-bold ring-1 ${status.badge}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
            />

            <StatusIcon size={11} />

            {encounter.status}
          </span>
        </div>

        {/* DATE */}

        <div className="flex items-center gap-2 text-slate-400 xl:w-[145px]">
          <CalendarDays size={14} />

          <div>
            <p className="text-[10px] font-semibold text-slate-600">
              {formatDate(recordDate)}
            </p>

            <p className="mt-0.5 text-[9px]">
              {formatTime(recordDate)}
            </p>
          </div>
        </div>

        {/* OPEN */}

        <div className="flex shrink-0 items-center justify-end">
          <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-bold text-blue-600 transition group-hover:border-blue-200 group-hover:bg-blue-50">
            Open
            <ArrowUpRight size={13} />
          </span>
        </div>
      </div>
    </button>
  );
}

// =====================================================
// EMPTY STATE
// =====================================================

function EmptyRecords({
  search,
  statusFilter,
  onClear,
  onPatients,
}: {
  search: string;
  statusFilter: StatusFilter;
  onClear: () => void;
  onPatients: () => void;
}) {
  const hasFilter =
    Boolean(search.trim()) ||
    statusFilter !== "All";

  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-5 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-200">
        {hasFilter ? (
          <Search size={20} />
        ) : (
          <FileText size={20} />
        )}
      </div>

      <p className="mt-3 text-sm font-bold text-slate-800">
        {hasFilter
          ? "No matching clinical records"
          : "No clinical records yet"}
      </p>

      <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
        {hasFilter
          ? "Try a different search term or status filter."
          : "Clinical consultations created by you will appear here."}
      </p>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {hasFilter && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            Clear filters
          </button>
        )}

        <button
          type="button"
          onClick={onPatients}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[10px] font-bold text-white transition hover:bg-blue-700"
        >
          <UserRound size={13} />
          Open Patients
        </button>
      </div>
    </div>
  );
}

// =====================================================
// LOADING
// =====================================================

function RecordsSkeleton() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex min-h-[92px] animate-pulse items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4"
        >
          <div className="h-11 w-11 shrink-0 rounded-xl bg-slate-200" />

          <div className="flex-1">
            <div className="h-3 w-40 rounded bg-slate-200" />
            <div className="mt-2 h-2.5 w-28 rounded bg-slate-100" />
          </div>

          <div className="hidden h-8 w-28 rounded-lg bg-slate-200 sm:block" />

          <div className="hidden h-8 w-24 rounded-lg bg-slate-100 sm:block" />
        </div>
      ))}
    </div>
  );
}
