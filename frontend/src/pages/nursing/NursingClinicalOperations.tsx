import {
  Activity,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Edit3,
  FileText,
  HeartPulse,
  Loader2,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Stethoscope,
  Thermometer,
  UserRound,
  Weight,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { getPatients } from "../../services/patientApi";
import {
  createNursingObservation,
  getPatientNursingHistory,
  updateNursingObservation,
  type NursingCareStatus,
  type NursingObservation,
} from "../../services/nursingObservationApi";
import type { Patient } from "../../types/patient";

// =====================================================
// TYPES
// =====================================================

type ObservationForm = {
  blood_pressure: string;
  pulse: string;
  temperature: string;
  oxygen_saturation: string;
  respiratory_rate: string;
  weight: string;
  nursing_notes: string;
  care_status: NursingCareStatus;
};

type FieldName = keyof ObservationForm;

type VitalField = {
  name: FieldName;
  label: string;
  placeholder: string;
  suffix: string;
  min: number;
  max: number;
  step?: string;
  integer?: boolean;
};

type StatusMeta = {
  label: NursingCareStatus;
  description: string;
  badge: string;
  dot: string;
  soft: string;
  border: string;
};

type ApiErrorShape = {
  response?: {
    status?: number;
    data?: {
      detail?: string;
      message?: string;
    };
  };
  message?: string;
};

// =====================================================
// CONSTANTS
// =====================================================

const DEFAULT_FORM: ObservationForm = {
  blood_pressure: "",
  pulse: "",
  temperature: "",
  oxygen_saturation: "",
  respiratory_rate: "",
  weight: "",
  nursing_notes: "",
  care_status: "Stable",
};

const CARE_STATUS_META: Record<NursingCareStatus, StatusMeta> = {
  Stable: {
    label: "Stable",
    description: "No immediate concern recorded",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
    soft: "bg-emerald-50/70",
    border: "border-emerald-200",
  },
  "Under Observation": {
    label: "Under Observation",
    description: "Patient requires continued monitoring",
    badge: "bg-blue-50 text-blue-700 ring-blue-200",
    dot: "bg-blue-500",
    soft: "bg-blue-50/70",
    border: "border-blue-200",
  },
  "Needs Attention": {
    label: "Needs Attention",
    description: "Follow-up nursing attention is required",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
    soft: "bg-amber-50/70",
    border: "border-amber-200",
  },
  Critical: {
    label: "Critical",
    description: "Urgent clinical attention may be required",
    badge: "bg-red-50 text-red-700 ring-red-200",
    dot: "bg-red-500",
    soft: "bg-red-50/70",
    border: "border-red-200",
  },
};

const VITAL_FIELDS: VitalField[] = [
  {
    name: "blood_pressure",
    label: "Blood pressure",
    placeholder: "120/80",
    suffix: "mmHg",
    min: 1,
    max: 400,
  },
  {
    name: "pulse",
    label: "Pulse",
    placeholder: "72",
    suffix: "bpm",
    min: 1,
    max: 300,
    integer: true,
  },
  {
    name: "temperature",
    label: "Temperature",
    placeholder: "98.6",
    suffix: "°F",
    min: 50,
    max: 120,
    step: "0.1",
  },
  {
    name: "oxygen_saturation",
    label: "Oxygen saturation",
    placeholder: "98",
    suffix: "%",
    min: 0,
    max: 100,
    integer: true,
  },
  {
    name: "respiratory_rate",
    label: "Respiratory rate",
    placeholder: "18",
    suffix: "/min",
    min: 1,
    max: 100,
    integer: true,
  },
  {
    name: "weight",
    label: "Weight",
    placeholder: "62.5",
    suffix: "kg",
    min: 0.1,
    max: 500,
    step: "0.1",
  },
];

// =====================================================
// HELPERS
// =====================================================

function getApiErrorMessage(error: unknown, fallback: string) {
  const apiError = error as ApiErrorShape;

  return (
    apiError.response?.data?.detail ||
    apiError.response?.data?.message ||
    apiError.message ||
    fallback
  );
}

function getApiStatus(error: unknown) {
  return (error as ApiErrorShape).response?.status;
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not recorded";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "P"
  );
}

function getStatusMeta(status: NursingCareStatus) {
  return CARE_STATUS_META[status] ?? CARE_STATUS_META.Stable;
}

function getPatientSearchText(patient: Patient) {
  return [
    patient.name,
    patient.id,
    patient.mobile,
    patient.village,
    patient.gender,
    patient.disease,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isSameDay(value?: string | null) {
  if (!value) return false;

  const date = new Date(value);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function validateBloodPressure(value: string) {
  const match = value.trim().match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/);

  if (!match) {
    return "Use blood pressure format such as 120/80.";
  }

  const systolic = Number(match[1]);
  const diastolic = Number(match[2]);

  if (
    !Number.isFinite(systolic) ||
    !Number.isFinite(diastolic) ||
    systolic < 40 ||
    systolic > 300 ||
    diastolic < 20 ||
    diastolic > 200
  ) {
    return "Enter a valid blood pressure reading.";
  }

  if (diastolic >= systolic) {
    return "Diastolic pressure should be lower than systolic pressure.";
  }

  return "";
}

// =====================================================
// PAGE
// =====================================================

export default function NursingClinicalOperations() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] =
    useState<number | null>(null);
  const [observations, setObservations] =
    useState<NursingObservation[]>([]);

  const [patientSearch, setPatientSearch] = useState("");
  const [patientsLoading, setPatientsLoading] =
    useState(true);
  const [historyLoading, setHistoryLoading] =
    useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [pageError, setPageError] = useState("");
  const [historyError, setHistoryError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingObservation, setEditingObservation] =
    useState<NursingObservation | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] =
    useState<ObservationForm>(DEFAULT_FORM);

  const historyRequestId = useRef(0);

  const currentUserId = Number(
    (user as { id?: number | string } | null)?.id,
  );

  const selectedPatient = useMemo(
    () =>
      patients.find(
        (patient) => patient.id === selectedPatientId,
      ) ?? null,
    [patients, selectedPatientId],
  );

  const filteredPatients = useMemo(() => {
    const query = patientSearch.trim().toLowerCase();

    if (!query) {
      return patients;
    }

    return patients.filter((patient) =>
      getPatientSearchText(patient).includes(query),
    );
  }, [patients, patientSearch]);

  const latestObservation =
    observations.length > 0 ? observations[0] : null;

  const todayObservationCount = useMemo(
    () =>
      observations.filter((observation) =>
        isSameDay(observation.recorded_at),
      ).length,
    [observations],
  );

  const currentStatus = latestObservation
    ? getStatusMeta(latestObservation.care_status)
    : null;

  const canEditObservation = useCallback(
    (observation: NursingObservation) =>
      Number.isFinite(currentUserId) &&
      observation.nurse_id === currentUserId,
    [currentUserId],
  );

  // ===================================================
  // LOAD PATIENTS
  // ===================================================

  const loadPatients = useCallback(
    async (preserveSelection = true) => {
      try {
        setPatientsLoading(true);
        setPageError("");

        const response = await getPatients();
        const patientList = Array.isArray(response)
          ? response
          : [];

        setPatients(patientList);

        if (patientList.length === 0) {
          setSelectedPatientId(null);
          return;
        }

        if (
          preserveSelection &&
          selectedPatientId !== null &&
          patientList.some(
            (patient) => patient.id === selectedPatientId,
          )
        ) {
          return;
        }

        setSelectedPatientId(patientList[0].id);
      } catch (error) {
        console.error("Nursing patient loading error:", error);
        setPageError(
          getApiErrorMessage(
            error,
            "Unable to load patient records.",
          ),
        );
      } finally {
        setPatientsLoading(false);
      }
    },
    [selectedPatientId],
  );

  // ===================================================
  // LOAD HISTORY
  // ===================================================

  const loadPatientHistory = useCallback(
    async (patientId: number) => {
      const requestId = ++historyRequestId.current;

      try {
        setHistoryLoading(true);
        setHistoryError("");

        const response =
          await getPatientNursingHistory(patientId);

        if (requestId !== historyRequestId.current) {
          return;
        }

        const history = Array.isArray(response)
          ? [...response]
          : [];

        history.sort((a, b) => {
          const aTime = new Date(
            a.recorded_at,
          ).getTime();
          const bTime = new Date(
            b.recorded_at,
          ).getTime();

          return bTime - aTime;
        });

        setObservations(history);
      } catch (error) {
        if (requestId !== historyRequestId.current) {
          return;
        }

        console.error(
          "Nursing history loading error:",
          error,
        );

        setObservations([]);
        setHistoryError(
          getApiErrorMessage(
            error,
            "Unable to load this patient's nursing history.",
          ),
        );
      } finally {
        if (requestId === historyRequestId.current) {
          setHistoryLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadPatients(false);
  }, []);

  useEffect(() => {
    if (selectedPatientId === null) {
      setObservations([]);
      setHistoryError("");
      return;
    }

    void loadPatientHistory(selectedPatientId);
  }, [selectedPatientId, loadPatientHistory]);

  // ===================================================
  // REFRESH
  // ===================================================

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setPageError("");

      await loadPatients(true);

      if (selectedPatientId !== null) {
        await loadPatientHistory(selectedPatientId);
      }
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "Unable to refresh clinical data.",
        ),
      );
    } finally {
      setRefreshing(false);
    }
  };

  // ===================================================
  // PATIENT SELECTION
  // ===================================================

  const selectPatient = (patientId: number) => {
    setSelectedPatientId(patientId);
    setPatientSearch("");
    setFormError("");
  };

  // ===================================================
  // FORM
  // ===================================================

  const resetForm = () => {
    setForm({ ...DEFAULT_FORM });
    setFormError("");
    setEditingObservation(null);
  };

  const openCreateModal = () => {
    if (!selectedPatient) return;

    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (
    observation: NursingObservation,
  ) => {
    if (!canEditObservation(observation)) {
      setFormError(
        "You can edit only observations recorded by your account.",
      );
      return;
    }

    setEditingObservation(observation);

    setForm({
      blood_pressure:
        observation.blood_pressure ?? "",
      pulse:
        observation.pulse !== null
          ? String(observation.pulse)
          : "",
      temperature:
        observation.temperature !== null
          ? String(observation.temperature)
          : "",
      oxygen_saturation:
        observation.oxygen_saturation !== null
          ? String(observation.oxygen_saturation)
          : "",
      respiratory_rate:
        observation.respiratory_rate !== null
          ? String(observation.respiratory_rate)
          : "",
      weight:
        observation.weight !== null
          ? String(observation.weight)
          : "",
      nursing_notes:
        observation.nursing_notes ?? "",
      care_status:
        observation.care_status,
    });

    setFormError("");
    setModalOpen(true);
  };

  const updateField = (
    field: FieldName,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (formError) {
      setFormError("");
    }
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    resetForm();
  };

  // ===================================================
  // VALIDATION
  // ===================================================

  const validateForm = () => {
    if (!selectedPatient) {
      return "Please select a patient.";
    }

    if (form.blood_pressure.trim()) {
      const bpError = validateBloodPressure(
        form.blood_pressure,
      );

      if (bpError) return bpError;
    }

    for (const field of VITAL_FIELDS) {
      const rawValue =
        form[field.name].trim();

      if (!rawValue || field.name === "blood_pressure") {
        continue;
      }

      const numericValue = Number(rawValue);

      if (
        !Number.isFinite(numericValue) ||
        numericValue < field.min ||
        numericValue > field.max
      ) {
        return `${field.label} must be between ${field.min} and ${field.max}.`;
      }

      if (
        field.integer &&
        !Number.isInteger(numericValue)
      ) {
        return `${field.label} must be a whole number.`;
      }
    }

    if (form.nursing_notes.length > 5000) {
      return "Nursing notes cannot exceed 5000 characters.";
    }

    return "";
  };

  // ===================================================
  // SAVE
  // ===================================================

  const handleSave = async () => {
    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    if (!selectedPatient) return;

    if (
      editingObservation &&
      !canEditObservation(editingObservation)
    ) {
      setFormError(
        "You are not authorized to update this observation.",
      );
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const payload = {
        blood_pressure:
          form.blood_pressure.trim() || undefined,
        pulse: form.pulse.trim()
          ? Number(form.pulse)
          : undefined,
        temperature: form.temperature.trim()
          ? Number(form.temperature)
          : undefined,
        oxygen_saturation:
          form.oxygen_saturation.trim()
            ? Number(form.oxygen_saturation)
            : undefined,
        respiratory_rate:
          form.respiratory_rate.trim()
            ? Number(form.respiratory_rate)
            : undefined,
        weight: form.weight.trim()
          ? Number(form.weight)
          : undefined,
        nursing_notes:
          form.nursing_notes.trim() || undefined,
        care_status: form.care_status,
      };

      if (editingObservation) {
        await updateNursingObservation(
          editingObservation.id,
          payload,
        );
      } else {
        await createNursingObservation({
          patient_id: selectedPatient.id,
          ...payload,
        });
      }

      setModalOpen(false);
      resetForm();

      await loadPatientHistory(
        selectedPatient.id,
      );
    } catch (error) {
      console.error(
        "Nursing observation save error:",
        error,
      );

      if (getApiStatus(error) === 403) {
        setFormError(
          "This observation cannot be modified by your account.",
        );
      } else {
        setFormError(
          getApiErrorMessage(
            error,
            "Unable to save the nursing observation.",
          ),
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f5f7fb]">
      {/* =================================================
          HEADER
      ================================================= */}

      <header className="shrink-0 border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex w-full max-w-[1680px] items-center justify-between gap-4 px-5 py-5 sm:px-7 lg:px-8">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Stethoscope size={15} />
              </span>

              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
                Clinical Operations
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-[30px]">
              Nursing Workspace
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Record vital signs, document nursing observations
              and maintain patient care history.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={
              refreshing ||
              patientsLoading ||
              historyLoading
            }
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
          >
            {refreshing ? (
              <Loader2
                size={15}
                className="animate-spin"
              />
            ) : (
              <RefreshCw size={15} />
            )}
            <span className="hidden sm:inline">
              Refresh
            </span>
          </button>
        </div>
      </header>

      {/* =================================================
          CONTENT
      ================================================= */}

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6 lg:p-8">
          {pageError && (
            <InlineError
              message={pageError}
              onRetry={() =>
                void loadPatients(false)
              }
            />
          )}

          <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
            {/* =================================================
                PATIENT DIRECTORY
            ================================================= */}

            <aside className="h-fit overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-5">
              <div className="border-b border-slate-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-slate-400">
                      Patient Registry
                    </p>
                    <h2 className="mt-1 text-base font-bold text-slate-900">
                      Patient Workspace
                    </h2>
                  </div>

                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                    {patients.length}
                  </span>
                </div>

                <div className="relative mt-4">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={patientSearch}
                    onChange={(event) =>
                      setPatientSearch(
                        event.target.value,
                      )
                    }
                    placeholder="Search patient, ID, mobile..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>
              </div>

              {patientsLoading ? (
                <PatientListSkeleton />
              ) : patients.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    icon={UserRound}
                    title="No patients available"
                    description="Registered patients will appear here."
                  />
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    icon={Search}
                    title="No matching patient"
                    description="Try a different name, patient ID or mobile number."
                  />
                </div>
              ) : (
                <div className="max-h-[620px] overflow-y-auto p-2">
                  {filteredPatients.map((patient) => {
                    const active =
                      patient.id ===
                      selectedPatientId;

                    return (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() =>
                          selectPatient(patient.id)
                        }
                        className={`mb-1 w-full rounded-xl p-3 text-left transition ${
                          active
                            ? "bg-emerald-50 ring-1 ring-emerald-200"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                              active
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {getInitials(
                              patient.name,
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-xs font-bold text-slate-900">
                                {patient.name}
                              </p>

                              {active && (
                                <CheckCircle2
                                  size={13}
                                  className="shrink-0 text-emerald-600"
                                />
                              )}
                            </div>

                            <p className="mt-0.5 text-[10px] text-slate-400">
                              Patient #{patient.id}
                              {" · "}
                              {patient.age} yrs
                            </p>
                          </div>

                          <ChevronDown
                            size={14}
                            className="rotate-[-90deg] shrink-0 text-slate-300"
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3">
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <ShieldCheck
                    size={13}
                    className="text-emerald-500"
                  />
                  Nursing records are protected by
                  authenticated access.
                </div>
              </div>
            </aside>

            {/* =================================================
                CLINICAL WORKSPACE
            ================================================= */}

            <section className="min-w-0">
              {!selectedPatient ? (
                <EmptyState
                  icon={UserRound}
                  title="Select a patient"
                  description="Choose a patient from the registry to open the nursing workspace."
                  className="min-h-[420px]"
                />
              ) : (
                <div className="space-y-5">
                  {/* PATIENT HEADER */}

                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-lg shadow-emerald-600/15">
                          {getInitials(
                            selectedPatient.name,
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-xl font-bold tracking-tight text-slate-950">
                              {selectedPatient.name}
                            </h2>

                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                              Patient #{selectedPatient.id}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                              <UserRound size={13} />
                              {selectedPatient.age} years
                            </span>

                            <span className="inline-flex items-center gap-1.5">
                              <Activity size={13} />
                              {selectedPatient.gender}
                            </span>

                            <span className="inline-flex items-center gap-1.5">
                              <MapPin size={13} />
                              {selectedPatient.village}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/patients/${selectedPatient.id}`,
                            )
                          }
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <FileText size={15} />
                          Patient Profile
                        </button>

                        <button
                          type="button"
                          onClick={openCreateModal}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 hover:shadow-md"
                        >
                          <Plus size={15} />
                          Record Observation
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 border-t border-slate-100 md:grid-cols-4">
                      <PatientMeta
                        icon={HeartPulse}
                        label="Condition"
                        value={
                          selectedPatient.disease ||
                          "Not specified"
                        }
                      />

                      <PatientMeta
                        icon={Phone}
                        label="Mobile"
                        value={
                          selectedPatient.mobile ||
                          "Not available"
                        }
                      />

                      <PatientMeta
                        icon={MapPin}
                        label="Location"
                        value={
                          selectedPatient.village ||
                          "Not specified"
                        }
                      />

                      <PatientMeta
                        icon={CalendarDays}
                        label="Registered"
                        value={formatDate(
                          selectedPatient.created_at,
                        )}
                      />
                    </div>
                  </section>

                  {/* OPERATIONAL SUMMARY */}

                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <SummaryCard
                      icon={ClipboardList}
                      label="History"
                      value={
                        historyLoading
                          ? "—"
                          : String(
                              observations.length,
                            )
                      }
                      helper="Total nursing records"
                      tone="blue"
                    />

                    <SummaryCard
                      icon={CalendarDays}
                      label="Today"
                      value={
                        historyLoading
                          ? "—"
                          : String(
                              todayObservationCount,
                            )
                      }
                      helper="Recorded today"
                      tone="emerald"
                    />

                    <SummaryCard
                      icon={Activity}
                      label="Latest"
                      value={
                        latestObservation
                          ? "Recorded"
                          : "None"
                      }
                      helper={
                        latestObservation
                          ? formatDateTime(
                              latestObservation.recorded_at,
                            )
                          : "No observation yet"
                      }
                      tone="violet"
                    />

                    <SummaryCard
                      icon={ShieldCheck}
                      label="Care status"
                      value={
                        latestObservation?.care_status ??
                        "Not set"
                      }
                      helper="Latest clinical status"
                      tone="amber"
                    />
                  </div>

                  {/* CURRENT SNAPSHOT */}

                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-slate-400">
                          Current Clinical Snapshot
                        </p>
                        <h2 className="mt-1 text-base font-bold text-slate-900">
                          Latest Nursing Observation
                        </h2>
                      </div>

                      {currentStatus && (
                        <StatusBadge
                          status={
                            currentStatus.label
                          }
                        />
                      )}
                    </div>

                    {historyLoading ? (
                      <SnapshotSkeleton />
                    ) : historyError ? (
                      <div className="p-5 sm:p-6">
                        <InlineError
                          message={historyError}
                          onRetry={() =>
                            void loadPatientHistory(
                              selectedPatient.id,
                            )
                          }
                        />
                      </div>
                    ) : latestObservation ? (
                      <LatestObservation
                        observation={
                          latestObservation
                        }
                        canEdit={canEditObservation(
                          latestObservation,
                        )}
                        onEdit={() =>
                          openEditModal(
                            latestObservation,
                          )
                        }
                      />
                    ) : (
                      <div className="p-5 sm:p-6">
                        <EmptyState
                          icon={ClipboardList}
                          title="No observation recorded"
                          description="Start the patient's nursing record by entering the latest measured vital signs and care status."
                          actionLabel="Record First Observation"
                          onAction={
                            openCreateModal
                          }
                        />
                      </div>
                    )}
                  </section>

                  {/* HISTORY */}

                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-slate-400">
                          Clinical Record
                        </p>
                        <h2 className="mt-1 text-base font-bold text-slate-900">
                          Nursing History
                        </h2>
                      </div>

                      <span className="rounded-full bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold text-slate-500">
                        {observations.length}{" "}
                        {observations.length === 1
                          ? "record"
                          : "records"}
                      </span>
                    </div>

                    <div className="p-4 sm:p-5">
                      {historyLoading ? (
                        <HistorySkeleton />
                      ) : historyError ? (
                        <InlineError
                          message={historyError}
                          onRetry={() =>
                            void loadPatientHistory(
                              selectedPatient.id,
                            )
                          }
                        />
                      ) : observations.length ===
                        0 ? (
                        <EmptyState
                          icon={FileText}
                          title="No nursing history"
                          description="Recorded nursing observations will remain available here as part of the patient's care record."
                          actionLabel="Record Observation"
                          onAction={
                            openCreateModal
                          }
                        />
                      ) : (
                        <div className="space-y-3">
                          {observations.map(
                            (observation, index) => (
                              <HistoryItem
                                key={
                                  observation.id
                                }
                                observation={
                                  observation
                                }
                                isLatest={
                                  index === 0
                                }
                                canEdit={canEditObservation(
                                  observation,
                                )}
                                onEdit={() =>
                                  openEditModal(
                                    observation,
                                  )
                                }
                              />
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {modalOpen && selectedPatient && (
        <ObservationModal
          patient={selectedPatient}
          form={form}
          editingObservation={
            editingObservation
          }
          saving={saving}
          error={formError}
          onChange={updateField}
          onClose={closeModal}
          onSave={() => void handleSave()}
        />
      )}
    </div>
  );
}

// =====================================================
// PATIENT META
// =====================================================

function PatientMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 border-r border-slate-100 p-4 last:border-r-0 sm:p-5">
      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
        <Icon size={12} />
        {label}
      </div>

      <p className="mt-1.5 truncate text-xs font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

// =====================================================
// SUMMARY CARD
// =====================================================

function SummaryCard({
  icon: Icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  helper: string;
  tone: "blue" | "emerald" | "violet" | "amber";
}) {
  const toneMap = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneMap[tone]}`}
      >
        <Icon size={17} />
      </div>

      <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-base font-bold text-slate-950">
        {value}
      </p>

      <p className="mt-1 truncate text-[10px] text-slate-400">
        {helper}
      </p>
    </div>
  );
}

// =====================================================
// STATUS BADGE
// =====================================================

function StatusBadge({
  status,
}: {
  status: NursingCareStatus;
}) {
  const meta = getStatusMeta(status);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold ring-1 ${meta.badge}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${meta.dot}`}
      />
      {meta.label}
    </span>
  );
}

// =====================================================
// LATEST OBSERVATION
// =====================================================

function LatestObservation({
  observation,
  canEdit,
  onEdit,
}: {
  observation: NursingObservation;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const meta = getStatusMeta(
    observation.care_status,
  );

  return (
    <div>
      <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-3 xl:grid-cols-6">
        <VitalDisplay
          icon={HeartPulse}
          label="Blood Pressure"
          value={
            observation.blood_pressure || "—"
          }
          suffix="mmHg"
        />

        <VitalDisplay
          icon={Activity}
          label="Pulse"
          value={
            observation.pulse !== null
              ? String(observation.pulse)
              : "—"
          }
          suffix="bpm"
        />

        <VitalDisplay
          icon={Thermometer}
          label="Temperature"
          value={
            observation.temperature !== null
              ? String(observation.temperature)
              : "—"
          }
          suffix="°F"
        />

        <VitalDisplay
          icon={Activity}
          label="SpO₂"
          value={
            observation.oxygen_saturation !==
            null
              ? String(
                  observation.oxygen_saturation,
                )
              : "—"
          }
          suffix="%"
        />

        <VitalDisplay
          icon={Activity}
          label="Respiratory Rate"
          value={
            observation.respiratory_rate !== null
              ? String(
                  observation.respiratory_rate,
                )
              : "—"
          }
          suffix="/min"
        />

        <VitalDisplay
          icon={Weight}
          label="Weight"
          value={
            observation.weight !== null
              ? String(observation.weight)
              : "—"
          }
          suffix="kg"
        />
      </div>

      <div className="border-t border-slate-100">
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.soft} ${meta.border} border`}
              >
                <FileText
                  size={14}
                  className="text-slate-500"
                />
              </span>

              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800">
                  Nursing notes
                </p>

                <p className="mt-0.5 text-[10px] text-slate-400">
                  Recorded{" "}
                  {formatDateTime(
                    observation.recorded_at,
                  )}
                </p>
              </div>
            </div>

            {observation.nursing_notes ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {observation.nursing_notes}
              </p>
            ) : (
              <p className="mt-3 text-xs italic text-slate-400">
                No nursing notes were added to this
                observation.
              </p>
            )}
          </div>

          {canEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 sm:self-center"
            >
              <Edit3 size={13} />
              Edit
            </button>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-400 sm:self-center">
              <ShieldCheck size={13} />
              Read only
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-[10px] text-slate-400 sm:px-6">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2
            size={12}
            className="text-emerald-500"
          />
          Observation #{observation.id}
        </span>

        <span>
          Recorded by Nurse #{observation.nurse_id}
        </span>
      </div>
    </div>
  );
}

// =====================================================
// VITAL DISPLAY
// =====================================================

function VitalDisplay({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  suffix: string;
}) {
  return (
    <div className="min-w-0 bg-white px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.09em] text-slate-400">
        <Icon size={12} />
        <span className="truncate">
          {label}
        </span>
      </div>

      <div className="mt-2 flex min-w-0 items-baseline gap-1.5">
        <span className="truncate text-sm font-bold text-slate-950 sm:text-base">
          {value}
        </span>

        {value !== "—" && (
          <span className="shrink-0 text-[9px] font-semibold text-slate-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// =====================================================
// HISTORY ITEM
// =====================================================

function HistoryItem({
  observation,
  isLatest,
  canEdit,
  onEdit,
}: {
  observation: NursingObservation;
  isLatest: boolean;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const meta = getStatusMeta(
    observation.care_status,
  );

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white transition ${
        isLatest
          ? "border-emerald-200 shadow-sm"
          : "border-slate-200"
      }`}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="flex min-w-0 gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.soft} ${meta.border} border`}
          >
            <ClipboardList
              size={17}
              className="text-slate-600"
            />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold text-slate-900">
                Observation #{observation.id}
              </p>

              {isLatest && (
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                  Latest
                </span>
              )}

              <StatusBadge
                status={observation.care_status}
              />
            </div>

            <p className="mt-1.5 text-[10px] text-slate-400">
              {formatDateTime(
                observation.recorded_at,
              )}
            </p>

            <p className="mt-1 text-[10px] font-medium text-slate-400">
              Recorded by Nurse #{observation.nurse_id}
            </p>
          </div>
        </div>

        {canEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
          >
            <Edit3 size={13} />
            Edit
          </button>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-400">
            <ShieldCheck size={13} />
            Read only
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50/40 p-4 sm:grid-cols-3 lg:grid-cols-6">
        <CompactVital
          label="BP"
          value={
            observation.blood_pressure ||
            "—"
          }
        />

        <CompactVital
          label="Pulse"
          value={
            observation.pulse !== null
              ? `${observation.pulse} bpm`
              : "—"
          }
        />

        <CompactVital
          label="Temp."
          value={
            observation.temperature !== null
              ? `${observation.temperature} °F`
              : "—"
          }
        />

        <CompactVital
          label="SpO₂"
          value={
            observation.oxygen_saturation !==
            null
              ? `${observation.oxygen_saturation}%`
              : "—"
          }
        />

        <CompactVital
          label="Resp. Rate"
          value={
            observation.respiratory_rate !==
            null
              ? `${observation.respiratory_rate}/min`
              : "—"
          }
        />

        <CompactVital
          label="Weight"
          value={
            observation.weight !== null
              ? `${observation.weight} kg`
              : "—"
          }
        />
      </div>

      {observation.nursing_notes && (
        <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
            Nursing notes
          </p>

          <p className="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-slate-500">
            {observation.nursing_notes}
          </p>
        </div>
      )}
    </article>
  );
}

function CompactVital({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
      <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

// =====================================================
// OBSERVATION MODAL
// =====================================================

function ObservationModal({
  patient,
  form,
  editingObservation,
  saving,
  error,
  onChange,
  onClose,
  onSave,
}: {
  patient: Patient;
  form: ObservationForm;
  editingObservation: NursingObservation | null;
  saving: boolean;
  error: string;
  onChange: (
    field: FieldName,
    value: string,
  ) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const title = editingObservation
    ? "Update Nursing Observation"
    : "Record Nursing Observation";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !saving
        ) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="nursing-observation-title"
        className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* MODAL HEADER */}

        <div className="shrink-0 border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <HeartPulse size={18} />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-emerald-600">
                  Nursing Record
                </p>

                <h2
                  id="nursing-observation-title"
                  className="mt-0.5 truncate text-base font-bold text-slate-950"
                >
                  {title}
                </h2>

                <p className="mt-0.5 truncate text-[10px] text-slate-400">
                  {patient.name} · Patient #
                  {patient.id}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close observation form"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#fbfcfe] p-5 sm:p-6">
          {error && (
            <div className="mb-5">
              <InlineError message={error} />
            </div>
          )}

          <div className="space-y-6">
            {/* VITALS */}

            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Activity size={16} />
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Vital Signs
                  </p>

                  <p className="mt-0.5 text-[10px] leading-5 text-slate-400">
                    Enter the latest measured values.
                    Leave a field blank when a value was
                    not measured.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <ObservationField
                  label="Blood pressure"
                  value={form.blood_pressure}
                  onChange={(value) =>
                    onChange(
                      "blood_pressure",
                      value,
                    )
                  }
                  placeholder="120/80"
                  suffix="mmHg"
                />

                <ObservationField
                  label="Pulse"
                  value={form.pulse}
                  onChange={(value) =>
                    onChange("pulse", value)
                  }
                  placeholder="72"
                  type="number"
                  min="1"
                  max="300"
                  step="1"
                  suffix="bpm"
                />

                <ObservationField
                  label="Temperature"
                  value={form.temperature}
                  onChange={(value) =>
                    onChange(
                      "temperature",
                      value,
                    )
                  }
                  placeholder="98.6"
                  type="number"
                  min="50"
                  max="120"
                  step="0.1"
                  suffix="°F"
                />

                <ObservationField
                  label="Oxygen saturation"
                  value={
                    form.oxygen_saturation
                  }
                  onChange={(value) =>
                    onChange(
                      "oxygen_saturation",
                      value,
                    )
                  }
                  placeholder="98"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  suffix="%"
                />

                <ObservationField
                  label="Respiratory rate"
                  value={
                    form.respiratory_rate
                  }
                  onChange={(value) =>
                    onChange(
                      "respiratory_rate",
                      value,
                    )
                  }
                  placeholder="18"
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  suffix="/min"
                />

                <ObservationField
                  label="Weight"
                  value={form.weight}
                  onChange={(value) =>
                    onChange(
                      "weight",
                      value,
                    )
                  }
                  placeholder="62.5"
                  type="number"
                  min="0.1"
                  max="500"
                  step="0.1"
                  suffix="kg"
                />
              </div>
            </section>

            {/* CARE STATUS */}

            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <ShieldCheck size={16} />
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Patient Care Status
                  </p>

                  <p className="mt-0.5 text-[10px] leading-5 text-slate-400">
                    Select the current nursing care state.
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  Object.keys(
                    CARE_STATUS_META,
                  ) as NursingCareStatus[]
                ).map((status) => {
                  const meta =
                    CARE_STATUS_META[status];
                  const active =
                    form.care_status === status;

                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() =>
                        onChange(
                          "care_status",
                          status,
                        )
                      }
                      className={`rounded-xl border p-3 text-left transition ${
                        active
                          ? `${meta.soft} ${meta.border} ring-2 ring-emerald-500/10`
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${meta.dot}`}
                        />

                        <span className="text-[11px] font-bold text-slate-800">
                          {status}
                        </span>

                        {active && (
                          <CheckCircle2
                            size={13}
                            className="ml-auto text-emerald-600"
                          />
                        )}
                      </div>

                      <p className="mt-1.5 text-[9px] leading-4 text-slate-400">
                        {meta.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* NOTES */}

            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                  <FileText size={16} />
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Nursing Notes
                  </p>

                  <p className="mt-0.5 text-[10px] leading-5 text-slate-400">
                    Document relevant observations, care
                    provided and patient response.
                  </p>
                </div>
              </div>

              <textarea
                value={form.nursing_notes}
                onChange={(event) =>
                  onChange(
                    "nursing_notes",
                    event.target.value,
                  )
                }
                rows={6}
                maxLength={5000}
                placeholder="Enter clear, objective nursing documentation..."
                className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
              />

              <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                <span>
                  Keep documentation concise and factual.
                </span>

                <span>
                  {form.nursing_notes.length}/5000
                </span>
              </div>
            </section>
          </div>
        </div>

        {/* MODAL FOOTER */}

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-white p-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <Loader2
                size={15}
                className="animate-spin"
              />
            ) : (
              <CheckCircle2 size={15} />
            )}

            {saving
              ? "Saving..."
              : editingObservation
                ? "Update Observation"
                : "Save Observation"}
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// FORM FIELD
// =====================================================

function ObservationField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  suffix,
  min,
  max,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  suffix?: string;
  min?: string;
  max?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-slate-700">
        {label}
      </span>

      <div className="relative">
        <input
          type={type}
          inputMode={
            type === "number"
              ? "decimal"
              : "text"
          }
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          className={`h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 ${
            suffix ? "pr-16" : ""
          }`}
        />

        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

// =====================================================
// INLINE ERROR
// =====================================================

function InlineError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
      <AlertCircle
        size={15}
        className="mt-0.5 shrink-0"
      />

      <p className="min-w-0 flex-1 leading-5">
        {message}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-[10px] font-bold text-red-600 ring-1 ring-red-200 transition hover:bg-red-100"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// =====================================================
// EMPTY STATE
// =====================================================

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: {
  icon: typeof ClipboardList;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon size={21} />
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-800">
        {title}
      </h3>

      <p className="mt-1.5 max-w-md text-xs leading-5 text-slate-400">
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-[11px] font-bold text-white transition hover:bg-emerald-700"
        >
          <Plus size={13} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// =====================================================
// SKELETONS
// =====================================================

function PatientListSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 6 }).map(
        (_, index) => (
          <div
            key={index}
            className="flex h-[66px] animate-pulse items-center gap-3 rounded-xl bg-slate-50 p-3"
          >
            <div className="h-10 w-10 rounded-xl bg-slate-200" />
            <div className="flex-1">
              <div className="h-3 w-28 rounded bg-slate-200" />
              <div className="mt-2 h-2.5 w-20 rounded bg-slate-100" />
            </div>
          </div>
        ),
      )}
    </div>
  );
}

function SnapshotSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map(
        (_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse bg-white"
          />
        ),
      )}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map(
        (_, index) => (
          <div
            key={index}
            className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
          />
        ),
      )}
    </div>
  );
}
