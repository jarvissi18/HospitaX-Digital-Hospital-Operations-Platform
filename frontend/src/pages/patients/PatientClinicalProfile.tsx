import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Edit3,
  FileText,
  FlaskConical,
  HeartPulse,
  Droplets,
  Loader2,
  Plus,
  RefreshCw,
  Scale,
  ShieldAlert,
  Stethoscope,
  Thermometer,
  UserRound,
  Wind,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";

import type { Patient } from "../../types/patient";

import {
  getPatients,
  getActivePatientAssignment,
  type PatientAssignment,
} from "../../services/patientApi";

import {
  cancelClinicalEncounter,
  completeClinicalEncounter,
  createClinicalEncounter,
  getPatientClinicalHistory,
  updateClinicalEncounter,
  type ClinicalEncounter,
  type ClinicalEncounterStatus,
} from "../../services/clinicalEncounterApi";

import {
  getPatientNursingHistory,
  type NursingObservation,
} from "../../services/nursingObservationApi";

import {
  getLabTests,
  getPatientLabOrders,
  getPatientLabResults,
} from "../../services/labApi";

import type {
  LabOrder,
  LabResult,
  LabTest,
} from "../../types/lab";

import { useAuth } from "../../context/AuthContext";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import PatientAssignmentPanel from "./PatientAssignmentPanel";
import LabReportModal from "../../components/laboratory/LabReportModal";
import PrescriptionPanel from "../clinical/PrescriptionPanel";
import ReferralPanel from "../clinical/ReferralPanel";
import TransferPanel from "../clinical/TransferPanel";
import FollowUpPanel from "../clinical/FollowUpPanel";
import DischargePanel from "../clinical/DischargePanel";

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

function formatDate(value: string | null) {
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

function getStatusClasses(status: ClinicalEncounterStatus) {
  switch (status) {
    case "Completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "Cancelled":
      return "border-red-200 bg-red-50 text-red-700";

    case "Draft":
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function getDateInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatLabResultValue(result: LabResult) {
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

function formatLabStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getLabFlagClasses(flag: LabResult["abnormal_flag"]) {
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

// =====================================================
// CONSULTATION FORM
// =====================================================

type ConsultationFormState = {
  chief_complaint: string;
  symptoms: string;
  clinical_notes: string;
  diagnosis: string;
  treatment_plan: string;
  prescription: string;
  follow_up_date: string;
};

const INITIAL_FORM: ConsultationFormState = {
  chief_complaint: "",
  symptoms: "",
  clinical_notes: "",
  diagnosis: "",
  treatment_plan: "",
  prescription: "",
  follow_up_date: "",
};

// =====================================================
// PATIENT CLINICAL PROFILE
// =====================================================

export default function PatientClinicalProfile() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const { user } = useAuth();

  const parsedPatientId = Number(patientId);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [encounters, setEncounters] = useState<ClinicalEncounter[]>(
    [],
  );
  const [activeAssignment, setActiveAssignment] =
    useState<PatientAssignment | null>(null);

  const [nursingObservations, setNursingObservations] =
    useState<NursingObservation[]>([]);
  const [nursingHistoryLoading, setNursingHistoryLoading] =
    useState(false);
  const [nursingHistoryError, setNursingHistoryError] =
    useState("");

  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [labHistoryLoading, setLabHistoryLoading] = useState(false);
  const [labHistoryError, setLabHistoryError] = useState("");

  const [selectedLabReportOrder, setSelectedLabReportOrder] =
    useState<LabOrder | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [isConsultationOpen, setIsConsultationOpen] =
    useState(false);

  const [editingEncounterId, setEditingEncounterId] =
    useState<number | null>(null);

  const [form, setForm] =
    useState<ConsultationFormState>(INITIAL_FORM);

  const [submitting, setSubmitting] = useState(false);
  const [processingEncounterId, setProcessingEncounterId] =
    useState<number | null>(null);

  const isDoctor = user?.role === "Doctor";
  const isNurse = user?.role === "Nurse";
  const isAdministrator = user?.role === "Administrator";

  const canViewNursingHistory =
    isDoctor || isNurse;

  const canViewLabResults =
    isDoctor || isNurse;

  const canViewPrescriptions =
    isDoctor ||
    isNurse ||
    isAdministrator;

  const canViewTransfers =
    isDoctor ||
    isNurse ||
    isAdministrator;

  const canViewFollowUps =
    isDoctor ||
    isNurse ||
    isAdministrator;

  const canViewDischarges =
    isDoctor ||
    isNurse ||
    isAdministrator;

  const isEditing =
    editingEncounterId !== null;

  // =====================================================
  // LOAD PATIENT PROFILE
  // =====================================================

  const loadProfile = useCallback(
    async (showRefreshState = false) => {
      if (
        !Number.isInteger(parsedPatientId) ||
        parsedPatientId <= 0
      ) {
        setError("Invalid patient record.");
        setLoading(false);
        return;
      }

      try {
        if (showRefreshState) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        setNursingHistoryError("");
        setNursingHistoryLoading(canViewNursingHistory);
        setLabHistoryError("");
        setLabHistoryLoading(canViewLabResults);

        const [
          patients,
          history,
          assignmentResult,
          nursingHistory,
          finalizedLabResults,
          patientLabHistory,
          labTestCatalog,
        ] = await Promise.all([
          getPatients(),
          isDoctor
            ? getPatientClinicalHistory(parsedPatientId)
            : Promise.resolve(
                [] as ClinicalEncounter[],
              ),
          getActivePatientAssignment(parsedPatientId).catch(
            (assignmentError) => {
              console.warn(
                "Active patient assignment loading error:",
                assignmentError,
              );
              return null;
            },
          ),
          canViewNursingHistory
            ? getPatientNursingHistory(parsedPatientId).catch(
                (nursingError) => {
                  console.warn(
                    "Nursing history loading error:",
                    nursingError,
                  );
                  setNursingHistoryError(
                    "Unable to load nursing care history.",
                  );
                  return [] as NursingObservation[];
                },
              )
            : Promise.resolve([] as NursingObservation[]),
          canViewLabResults
            ? getPatientLabResults(parsedPatientId).catch(
                (labError) => {
                  console.warn(
                    "Laboratory result loading error:",
                    labError,
                  );
                  setLabHistoryError(
                    "Unable to load finalized laboratory results.",
                  );
                  return [] as LabResult[];
                },
              )
            : Promise.resolve([] as LabResult[]),
          canViewLabResults
  ? getPatientLabOrders(parsedPatientId).catch(
      (labError) => {
        console.warn(
          "Laboratory order history loading error:",
          labError,
        );
        return [] as LabOrder[];
      },
    )
  : Promise.resolve([] as LabOrder[]),
          canViewLabResults
            ? getLabTests(true).catch(
                (labError) => {
                  console.warn(
                    "Laboratory test catalog loading error:",
                    labError,
                  );
                  return [] as LabTest[];
                },
              )
            : Promise.resolve([] as LabTest[]),
        ]);

        const currentPatient =
          patients.find(
            (item) => item.id === parsedPatientId,
          ) ?? null;

        if (!currentPatient) {
          setPatient(null);
          setEncounters([]);
          setActiveAssignment(null);
          setNursingObservations([]);
          setLabResults([]);
          setLabOrders([]);
          setLabTests([]);
          setError("Patient record not found.");
          return;
        }

        setPatient(currentPatient);
        setEncounters(
          Array.isArray(history)
            ? history
            : [],
        );
        setActiveAssignment(
          assignmentResult &&
            typeof assignmentResult === "object"
            ? assignmentResult
            : null,
        );

        const sortedNursingHistory = Array.isArray(nursingHistory)
          ? [...nursingHistory].sort(
              (a, b) =>
                new Date(b.recorded_at).getTime() -
                new Date(a.recorded_at).getTime(),
            )
          : [];

        setNursingObservations(sortedNursingHistory);

        const sortedLabResults = Array.isArray(finalizedLabResults)
          ? [...finalizedLabResults].sort(
              (a, b) =>
                new Date(b.finalized_at ?? b.updated_at ?? b.created_at).getTime() -
                new Date(a.finalized_at ?? a.updated_at ?? a.created_at).getTime(),
            )
          : [];

        setLabResults(sortedLabResults);
        setLabOrders(
          Array.isArray(patientLabHistory)
            ? patientLabHistory
            : [],
        );
        setLabTests(
          Array.isArray(labTestCatalog)
            ? labTestCatalog
            : [],
        );
      } catch (err) {
        console.error(
          "Clinical profile loading error:",
          err,
        );

        setError(
          "Unable to load the patient clinical profile.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
        setNursingHistoryLoading(false);
        setLabHistoryLoading(false);
      }
    },
    [
      canViewLabResults,
      canViewNursingHistory,
      isDoctor,
      parsedPatientId,
    ],
  );

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  // =====================================================
  // LAB REPORT
  // =====================================================

  const openLabReport = (order: LabOrder) => {
    setSelectedLabReportOrder(order);
  };

  const closeLabReport = () => {
    setSelectedLabReportOrder(null);
  };

  // =====================================================
  // SUMMARY
  // =====================================================

  const encounterSummary = useMemo(() => {
    return {
      total: encounters.length,
      completed: encounters.filter(
        (item) => item.status === "Completed",
      ).length,
      drafts: encounters.filter(
        (item) => item.status === "Draft",
      ).length,
      cancelled: encounters.filter(
        (item) => item.status === "Cancelled",
      ).length,
    };
  }, [encounters]);

  const latestEncounter =
    encounters[0] ?? null;

  const latestNursingObservation =
    nursingObservations[0] ?? null;

  const nursingHistoryCount = nursingObservations.length;

  const labTestById = useMemo(() => {
    return new Map(
      labTests.map((test) => [test.id, test]),
    );
  }, [labTests]);

  const labOrderItemById = useMemo(() => {
    const map = new Map<number, {
      order: LabOrder;
      test: LabTest | null;
    }>();

    for (const order of labOrders) {
      for (const item of order.items ?? []) {
        map.set(item.id, {
          order,
          test: labTestById.get(item.lab_test_id) ?? null,
        });
      }
    }

    return map;
  }, [labOrders, labTestById]);

  // =====================================================
  // FORM
  // =====================================================

  const updateFormField = (
    field: keyof ConsultationFormState,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const openNewConsultation = () => {
    setEditingEncounterId(null);
    setForm(INITIAL_FORM);
    setIsConsultationOpen(true);
  };

  const openEditConsultation = (
    encounter: ClinicalEncounter,
  ) => {
    if (encounter.status !== "Draft") {
      return;
    }

    setEditingEncounterId(encounter.id);

    setForm({
      chief_complaint:
        encounter.chief_complaint ?? "",
      symptoms:
        encounter.symptoms ?? "",
      clinical_notes:
        encounter.clinical_notes ?? "",
      diagnosis:
        encounter.diagnosis ?? "",
      treatment_plan:
        encounter.treatment_plan ?? "",
      prescription:
        encounter.prescription ?? "",
      follow_up_date:
        getDateInputValue(
          encounter.follow_up_date,
        ),
    });

    setIsConsultationOpen(true);
  };

  const closeConsultation = () => {
    if (submitting) {
      return;
    }

    setIsConsultationOpen(false);
    setEditingEncounterId(null);
    setForm(INITIAL_FORM);
  };

  // =====================================================
  // CREATE CONSULTATION
  // =====================================================

  const handleCreateConsultation = async () => {
    if (!patient) {
      return;
    }

    if (!form.chief_complaint.trim()) {
      toast.error("Chief complaint is required.");
      return;
    }

    try {
      setSubmitting(true);

      const created =
        await createClinicalEncounter({
          patient_id: patient.id,
          status: "Draft",
          chief_complaint:
            form.chief_complaint.trim(),
          symptoms:
            form.symptoms.trim() || undefined,
          clinical_notes:
            form.clinical_notes.trim() || undefined,
          diagnosis:
            form.diagnosis.trim() || undefined,
          treatment_plan:
            form.treatment_plan.trim() || undefined,
          prescription:
            form.prescription.trim() || undefined,
          follow_up_date:
            form.follow_up_date
              ? new Date(
                  `${form.follow_up_date}T00:00:00`,
                ).toISOString()
              : null,
        });

      setEncounters((current) => [
        created,
        ...current,
      ]);

      setIsConsultationOpen(false);
      setEditingEncounterId(null);
      setForm(INITIAL_FORM);

      toast.success(
        "Clinical consultation created successfully.",
      );
    } catch (err) {
      console.error(
        "Clinical consultation creation error:",
        err,
      );

      toast.error(
        "Failed to create clinical consultation.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // UPDATE DRAFT CONSULTATION
  // =====================================================

  const handleUpdateConsultation = async () => {
    if (!editingEncounterId) {
      return;
    }

    if (!form.chief_complaint.trim()) {
      toast.error("Chief complaint is required.");
      return;
    }

    try {
      setSubmitting(true);

      const updated =
        await updateClinicalEncounter(
          editingEncounterId,
          {
            status: "Draft",
            chief_complaint:
              form.chief_complaint.trim(),
            symptoms:
              form.symptoms.trim() || undefined,
            clinical_notes:
              form.clinical_notes.trim() || undefined,
            diagnosis:
              form.diagnosis.trim() || undefined,
            treatment_plan:
              form.treatment_plan.trim() || undefined,
            prescription:
              form.prescription.trim() || undefined,
            follow_up_date:
              form.follow_up_date
                ? new Date(
                    `${form.follow_up_date}T00:00:00`,
                  ).toISOString()
                : null,
          },
        );

      setEncounters((current) =>
        current.map((item) =>
          item.id === editingEncounterId
            ? updated
            : item,
        ),
      );

      setIsConsultationOpen(false);
      setEditingEncounterId(null);
      setForm(INITIAL_FORM);

      toast.success(
        "Clinical consultation updated successfully.",
      );
    } catch (err) {
      console.error(
        "Clinical consultation update error:",
        err,
      );

      toast.error(
        "Failed to update clinical consultation.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // SAVE CONSULTATION
  // =====================================================

  const handleSaveConsultation = async () => {
    if (isEditing) {
      await handleUpdateConsultation();
      return;
    }

    await handleCreateConsultation();
  };

  // =====================================================
  // COMPLETE CONSULTATION
  // =====================================================

  const handleCompleteEncounter = async (
    encounterId: number,
  ) => {
    const confirmed = window.confirm(
      "Complete this clinical consultation?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingEncounterId(
        encounterId,
      );

      const updated =
        await completeClinicalEncounter(
          encounterId,
        );

      setEncounters((current) =>
        current.map((item) =>
          item.id === encounterId
            ? updated
            : item,
        ),
      );

      toast.success(
        "Clinical consultation completed.",
      );
    } catch (err) {
      console.error(
        "Clinical consultation completion error:",
        err,
      );

      toast.error(
        "Failed to complete clinical consultation.",
      );
    } finally {
      setProcessingEncounterId(null);
    }
  };

  // =====================================================
  // CANCEL CONSULTATION
  // =====================================================

  const handleCancelEncounter = async (
    encounterId: number,
  ) => {
    const confirmed = window.confirm(
      "Cancel this clinical consultation? This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingEncounterId(
        encounterId,
      );

      const updated =
        await cancelClinicalEncounter(
          encounterId,
        );

      setEncounters((current) =>
        current.map((item) =>
          item.id === encounterId
            ? updated
            : item,
        ),
      );

      toast.success(
        "Clinical consultation cancelled.",
      );
    } catch (err) {
      console.error(
        "Clinical consultation cancellation error:",
        err,
      );

      toast.error(
        "Failed to cancel clinical consultation.",
      );
    } finally {
      setProcessingEncounterId(null);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-slate-50">
        <LoadingSpinner text="Loading clinical profile..." />
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error || !patient) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-500">
            <ShieldAlert size={23} />
          </div>

          <h2 className="mt-4 text-lg font-bold text-slate-900">
            Unable to load clinical profile
          </h2>

          <p className="mt-1.5 text-sm leading-5 text-slate-500">
            {error || "Patient record not found."}
          </p>

          <div className="mt-5 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() =>
                navigate("/patients")
              }
              className="
                inline-flex
                items-center
                gap-2
                rounded-xl
                border
                border-slate-200
                bg-white
                px-4
                py-2.5
                text-sm
                font-semibold
                text-slate-700
                transition
                hover:bg-slate-50
              "
            >
              <ArrowLeft size={15} />
              Back
            </button>

            <button
              type="button"
              onClick={() =>
                void loadProfile()
              }
              className="
                inline-flex
                items-center
                gap-2
                rounded-xl
                bg-slate-950
                px-4
                py-2.5
                text-sm
                font-semibold
                text-white
                transition
                hover:bg-slate-800
              "
            >
              <RefreshCw size={15} />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f5f7fb]">

      {/* =================================================
          PATIENT PROFILE HEADER
      ================================================= */}

      <header className="shrink-0 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-7">
          <div className="flex min-w-0 items-center gap-3.5">
            <button
              type="button"
              onClick={() => navigate("/patients")}
              title="Back to patients"
              className="
                flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
                border border-slate-200 bg-white text-slate-500 shadow-sm
                transition-all duration-200 hover:border-slate-300 hover:bg-slate-50
                hover:text-slate-900 hover:shadow
                focus:outline-none focus:ring-4 focus:ring-blue-50
              "
            >
              <ArrowLeft size={17} />
            </button>

            <div className="hidden h-8 w-px bg-slate-200 sm:block" />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Stethoscope size={13} className="shrink-0 text-blue-600" />
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-blue-600">
                  Clinical Operations
                </span>
                <span className="hidden text-slate-300 sm:inline">/</span>
                <span className="hidden text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:inline">
                  Patient Profile
                </span>
              </div>

              <div className="mt-0.5 flex min-w-0 items-center gap-2.5">
                <h1 className="truncate text-lg font-bold tracking-tight text-slate-950 sm:text-xl">
                  {patient.name}
                </h1>

                <span className="hidden shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500 sm:inline-flex">
                  Patient #{patient.id}
                </span>
              </div>
            </div>
          </div>

          {isDoctor && (
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => void loadProfile(true)}
                disabled={refreshing}
                title="Refresh clinical profile"
                className="
                  inline-flex h-10 items-center justify-center gap-2 rounded-xl
                  border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700
                  shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50
                  disabled:cursor-not-allowed disabled:opacity-60
                  focus:outline-none focus:ring-4 focus:ring-blue-50
                "
              >
                <RefreshCw
                  size={14}
                  className={refreshing ? "animate-spin" : ""}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                type="button"
                onClick={openNewConsultation}
                className="
                  inline-flex h-10 items-center justify-center gap-2 rounded-xl
                  bg-slate-950 px-3.5 text-xs font-bold text-white shadow-sm
                  transition-all duration-200 hover:bg-blue-600 hover:shadow-md
                  focus:outline-none focus:ring-4 focus:ring-blue-100
                "
              >
                <Plus size={15} />
                <span>New Consultation</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1600px] space-y-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-7">

          {/* =================================================
              PATIENT IDENTITY HERO
          ================================================= */}

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_35px_-22px_rgba(15,23,42,0.28)]">
            <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-5 py-5 sm:px-6 sm:py-6">
              <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
              <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-cyan-400/5 blur-3xl" />

              <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-xl font-bold text-white shadow-lg backdrop-blur">
                    {patient.name
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part.charAt(0).toUpperCase())
                      .join("") || "P"}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-blue-300/20 bg-blue-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-blue-200">
                        Clinical Profile
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-semibold text-slate-300">
                        ID #{patient.id}
                      </span>
                    </div>

                    <h2 className="mt-2 truncate text-xl font-bold tracking-tight text-white sm:text-2xl">
                      {patient.name}
                    </h2>

                    <p className="mt-1 text-xs text-slate-400">
                      Patient record · Clinical care, diagnostics and treatment history
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
                  <ProfileMeta label="Age" value={`${patient.age} years`} />
                  <ProfileMeta label="Gender" value={patient.gender} />
                  <ProfileMeta label="Contact" value={patient.mobile} />
                  <ProfileMeta label="Location" value={patient.village} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="px-5 py-4 sm:px-6">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Registered Medical Condition
                </p>
                <div className="mt-2 flex items-start gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <HeartPulse size={15} />
                  </div>
                  <p className="text-xs font-semibold leading-5 text-slate-700">
                    {patient.disease || "Not specified"}
                  </p>
                </div>
              </div>

              <div className="px-5 py-4 sm:px-6">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Clinical Access
                </p>
                <div className="mt-2 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <ShieldAlert size={15} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Authorized workspace</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {user?.role ?? "User"} · Clinical access
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 sm:px-6">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Care Record
                </p>
                <div className="mt-2 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <ClipboardList size={15} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      {encounters.length} consultation{encounters.length === 1 ? "" : "s"}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {latestEncounter
                        ? `Latest ${formatDate(latestEncounter.created_at)}`
                        : "No consultation history"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              PATIENT ASSIGNMENT
          ================================================= */}

          <section>
            <div className="mb-2.5 flex items-center gap-2 px-1">
              <div className="h-4 w-1 rounded-full bg-blue-600" />
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Care Assignment
              </p>
            </div>

            <PatientAssignmentPanel
              patientId={patient.id}
              activeAssignment={activeAssignment}
              onAssignmentChange={(assignment) => {
                setActiveAssignment(assignment);
              }}
              canManage={
                user?.role === "Administrator" ||
                user?.role === "Receptionist"
              }
            />
          </section>

          {/* =================================================
              CONSULTATION SNAPSHOT
          ================================================= */}

          {isDoctor && (
            <section>
              <div className="mb-2.5 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-1 rounded-full bg-blue-600" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Clinical Snapshot
                  </p>
                </div>

                <span className="text-[10px] font-medium text-slate-400">
                  Consultation overview
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <SummaryMetric
                  label="Total Consultations"
                  value={encounterSummary.total}
                  icon={FileText}
                  tone="blue"
                />
                <SummaryMetric
                  label="Completed"
                  value={encounterSummary.completed}
                  icon={CheckCircle2}
                  tone="emerald"
                />
                <SummaryMetric
                  label="Drafts"
                  value={encounterSummary.drafts}
                  icon={ClipboardList}
                  tone="amber"
                />
                <SummaryMetric
                  label="Last Consultation"
                  value={
                    latestEncounter
                      ? formatDate(latestEncounter.created_at)
                      : "None"
                  }
                  icon={CalendarDays}
                  tone="slate"
                  compact
                />
              </div>
            </section>
          )}

          {/* =================================================
              CLINICAL RECORDS
          ================================================= */}

          <div className="flex items-center gap-3 px-1 pt-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
                Clinical Records
              </p>
              <h2 className="mt-0.5 text-base font-bold tracking-tight text-slate-900">
                Patient Care Timeline
              </h2>
            </div>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* =================================================
              NURSING CARE HISTORY
          ================================================= */}

          {canViewNursingHistory && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_-24px_rgba(15,23,42,0.3)]">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <HeartPulse size={17} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-600">
                      Clinical Record
                    </p>
                    <h2 className="mt-0.5 text-sm font-bold text-slate-900">
                      Nursing Care History
                    </h2>
                  </div>
                </div>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold text-slate-500">
                  {nursingHistoryCount}{" "}
                  {nursingHistoryCount === 1 ? "record" : "records"}
                </span>
              </div>

              <div className="p-5 sm:p-6">
                {nursingHistoryLoading ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-20 animate-pulse rounded-xl bg-slate-100"
                      />
                    ))}
                  </div>
                ) : nursingHistoryError ? (
                  <div className="rounded-xl border border-red-100 bg-red-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <ShieldAlert size={17} className="mt-0.5 shrink-0 text-red-500" />
                      <div>
                        <p className="text-xs font-bold text-red-700">
                          Nursing history unavailable
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-red-600">
                          {nursingHistoryError}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : !latestNursingObservation ? (
                  <EmptyClinicalState
                    icon={HeartPulse}
                    title="No nursing observations yet"
                    description="Vital signs and nursing care observations recorded for this patient will appear here."
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                          Latest Observation
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-700">
                          Recorded {formatDateTime(latestNursingObservation.recorded_at)} · Nurse #
                          {latestNursingObservation.nurse_id}
                        </p>
                      </div>
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-2.5 py-1.5 text-[9px] font-bold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {latestNursingObservation.care_status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-100 bg-slate-100 sm:grid-cols-3 lg:grid-cols-6">
                      <NursingVitalField icon={Activity} label="Blood Pressure" value={latestNursingObservation.blood_pressure} suffix="mmHg" />
                      <NursingVitalField icon={HeartPulse} label="Pulse" value={latestNursingObservation.pulse} suffix="bpm" />
                      <NursingVitalField icon={Thermometer} label="Temperature" value={latestNursingObservation.temperature} suffix="°F" />
                      <NursingVitalField icon={Droplets} label="SpO₂" value={latestNursingObservation.oxygen_saturation} suffix="%" />
                      <NursingVitalField icon={Wind} label="Respiratory Rate" value={latestNursingObservation.respiratory_rate} suffix="/min" />
                      <NursingVitalField icon={Scale} label="Weight" value={latestNursingObservation.weight} suffix="kg" />
                    </div>

                    {latestNursingObservation.nursing_notes?.trim() && (
                      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                          Nursing Notes
                        </p>
                        <p className="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-slate-700">
                          {latestNursingObservation.nursing_notes}
                        </p>
                      </div>
                    )}

                    {nursingObservations.length > 0 && (
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                            Observation History
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {nursingObservations.length} total
                          </span>
                        </div>

                        <div className="space-y-2">
                          {nursingObservations.map((observation) => (
                            <article
                              key={observation.id}
                              className="rounded-xl border border-slate-100 bg-white p-3.5 transition hover:border-slate-200 hover:shadow-sm"
                            >
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-xs font-bold text-slate-800">
                                    Observation #{observation.id}
                                  </p>
                                  <p className="mt-0.5 text-[10px] text-slate-400">
                                    {formatDateTime(observation.recorded_at)} · Nurse #{observation.nurse_id}
                                  </p>
                                </div>
                                <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-600">
                                  {observation.care_status}
                                </span>
                              </div>

                              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                                <NursingHistoryValue label="BP" value={observation.blood_pressure} suffix="mmHg" />
                                <NursingHistoryValue label="Pulse" value={observation.pulse} suffix="bpm" />
                                <NursingHistoryValue label="Temp" value={observation.temperature} suffix="°F" />
                                <NursingHistoryValue label="SpO₂" value={observation.oxygen_saturation} suffix="%" />
                                <NursingHistoryValue label="Resp. Rate" value={observation.respiratory_rate} suffix="/min" />
                                <NursingHistoryValue label="Weight" value={observation.weight} suffix="kg" />
                              </div>

                              {observation.nursing_notes?.trim() && (
                                <p className="mt-3 whitespace-pre-wrap border-t border-slate-100 pt-3 text-[11px] leading-5 text-slate-600">
                                  {observation.nursing_notes}
                                </p>
                              )}
                            </article>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* =================================================
              LABORATORY RESULTS
          ================================================= */}

          {canViewLabResults && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_-24px_rgba(15,23,42,0.3)]">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <FlaskConical size={17} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-violet-600">
                      Diagnostics
                    </p>
                    <h2 className="mt-0.5 text-sm font-bold text-slate-900">
                      Laboratory Results
                    </h2>
                  </div>
                </div>

                <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold text-slate-500">
                  {labResults.length} {labResults.length === 1 ? "result" : "results"}
                </span>
              </div>

              <div className="p-5 sm:p-6">
                {labHistoryLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />
                    ))}
                  </div>
                ) : labHistoryError ? (
                  <div className="rounded-xl border border-red-100 bg-red-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <ShieldAlert size={17} className="mt-0.5 shrink-0 text-red-500" />
                      <div>
                        <p className="text-xs font-bold text-red-700">
                          Laboratory results unavailable
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-red-600">
                          {labHistoryError}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : labResults.length === 0 ? (
                  <EmptyClinicalState
                    icon={FlaskConical}
                    title="No finalized laboratory results"
                    description="Laboratory results will appear here after technical validation, doctor review and finalization."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[900px] overflow-hidden rounded-xl border border-slate-100">
                      <div className="grid grid-cols-[minmax(190px,1.4fr)_160px_minmax(150px,1fr)_150px_150px_110px] gap-4 border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                        <span>Test</span>
                        <span>Result</span>
                        <span>Reference Range</span>
                        <span>Status / Flag</span>
                        <span>Finalized</span>
                        <span>Action</span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {labResults.map((result) => {
                          const linked = labOrderItemById.get(result.lab_order_item_id);
                          const test = linked?.test;
                          const order = linked?.order;
                          const flag = result.abnormal_flag;

                          return (
                            <article
                              key={result.id}
                              className="grid grid-cols-[minmax(190px,1.4fr)_160px_minmax(150px,1fr)_150px_150px_110px] items-center gap-4 px-4 py-3.5 transition hover:bg-slate-50/70"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-slate-800">
                                  {test?.name ?? `Laboratory Test #${result.lab_order_item_id}`}
                                </p>
                                <div className="mt-1 flex items-center gap-2 text-[9px] text-slate-400">
                                  <span>Result #{result.id}</span>
                                  {order && <span>· Order #{order.id}</span>}
                                  {test?.code && <span>· {test.code}</span>}
                                </div>
                              </div>

                              <div>
                                <p className="text-xs font-bold text-slate-900">
                                  {formatLabResultValue(result)}
                                </p>
                                {result.interpretation?.trim() && (
                                  <p className="mt-1 max-w-[150px] truncate text-[9px] text-slate-400" title={result.interpretation}>
                                    {result.interpretation}
                                  </p>
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-slate-700">
                                  {result.reference_range_text ||
                                    (result.reference_min !== null &&
                                    result.reference_max !== null
                                      ? `${result.reference_min} – ${result.reference_max}${result.unit ? ` ${result.unit}` : ""}`
                                      : "Not specified")}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  {formatLabStatus(result.status)}
                                </span>

                                {flag && (
                                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-bold ${getLabFlagClasses(flag)}`}>
                                    {flag}
                                  </span>
                                )}

                                {result.is_critical && (
                                  <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[9px] font-bold text-red-700">
                                    Critical
                                  </span>
                                )}
                              </div>

                              <div>
                                <p className="text-xs font-semibold text-slate-700">
                                  {formatDateTime(result.finalized_at)}
                                </p>
                              </div>

                              <div className="flex items-center">
                                {order && (
                                  <button
                                    type="button"
                                    onClick={() => openLabReport(order)}
                                    className="
                                      inline-flex items-center justify-center gap-1.5 rounded-lg
                                      border border-violet-200 bg-violet-50 px-3 py-2
                                      text-[9px] font-bold text-violet-700 transition
                                      hover:border-violet-300 hover:bg-violet-100
                                      focus:outline-none focus:ring-4 focus:ring-violet-100
                                    "
                                  >
                                    <FileText size={12} />
                                    View Report
                                  </button>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* =================================================
              PRESCRIPTIONS
          ================================================= */}

          {canViewPrescriptions && (
            <section>
              <PrescriptionPanel
                patientId={parsedPatientId}
                encounters={encounters}
                canManage={isDoctor}
              />
            </section>
          )}

          {/* =================================================
              REFERRALS
          ================================================= */}

          {canViewPrescriptions && (
            <section>
              <ReferralPanel
                patientId={parsedPatientId}
                encounters={encounters}
                canManage={isDoctor}
              />
            </section>
          )}

          {/* =================================================
              PATIENT TRANSFERS
          ================================================= */}

          {canViewTransfers && (
            <section>
              <TransferPanel
                patientId={parsedPatientId}
                encounters={encounters}
                canManage={isDoctor}
              />
            </section>
          )}

          {/* =================================================
              FOLLOW-UP MANAGEMENT
          ================================================= */}

          {canViewFollowUps && (
            <section>
              <FollowUpPanel
                patientId={parsedPatientId}
                encounters={encounters}
                canManage={isDoctor}
              />
            </section>
          )}


          {/* =================================================
                  DISCHARGE MANAGEMENT
              ================================================= */}

              {canViewDischarges && (
                <section>
                  <DischargePanel
                    patientId={parsedPatientId}
                    encounters={encounters}
                    canManage={isDoctor}
                  />
                </section>
              )}


          {/* =================================================
              CLINICAL HISTORY
          ================================================= */}

          {isDoctor ? (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_-24px_rgba(15,23,42,0.3)]">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-blue-600">
                      Consultation Records
                    </p>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-600">
                      {encounters.length}
                    </span>
                  </div>
                  <h2 className="mt-1 text-sm font-bold text-slate-900">
                    Clinical History
                  </h2>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Consultation records and clinical decision history
                  </p>
                </div>
              </div>

              {encounters.length === 0 ? (
                <div className="px-5 py-14 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <FileText size={21} />
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-slate-800">
                    No clinical history yet
                  </h3>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
                    No consultation has been recorded for this patient.
                  </p>
                  <button
                    type="button"
                    onClick={openNewConsultation}
                    className="
                      mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950
                      px-4 py-2.5 text-xs font-bold text-white shadow-sm transition
                      hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100
                    "
                  >
                    <Plus size={14} />
                    Start Consultation
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {encounters.map((encounter) => {
                    const isProcessing = processingEncounterId === encounter.id;

                    return (
                      <article
                        key={encounter.id}
                        className="p-5 transition-colors hover:bg-slate-50/30 sm:p-6"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">
                                Consultation #{encounter.id}
                              </span>
                              <span
                                className={`
                                  inline-flex items-center rounded-full border px-2.5 py-1
                                  text-[9px] font-bold ${getStatusClasses(encounter.status)}
                                `}
                              >
                                {encounter.status}
                              </span>
                            </div>
                            <p className="mt-1.5 text-[10px] text-slate-400">
                              Recorded {formatDateTime(encounter.created_at)}
                            </p>
                          </div>

                          {encounter.status === "Draft" && (
                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditConsultation(encounter)}
                                disabled={isProcessing}
                                className="
                                  inline-flex items-center gap-1.5 rounded-lg border border-blue-200
                                  bg-blue-50 px-3 py-2 text-[10px] font-bold text-blue-700
                                  transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50
                                "
                              >
                                <Edit3 size={13} />
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => void handleCompleteEncounter(encounter.id)}
                                disabled={isProcessing}
                                className="
                                  inline-flex items-center gap-1.5 rounded-lg border border-emerald-200
                                  bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700
                                  transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50
                                "
                              >
                                {isProcessing ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <CheckCircle2 size={13} />
                                )}
                                Complete
                              </button>

                              <button
                                type="button"
                                onClick={() => void handleCancelEncounter(encounter.id)}
                                disabled={isProcessing}
                                className="
                                  inline-flex items-center gap-1.5 rounded-lg border border-red-200
                                  bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700
                                  transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50
                                "
                              >
                                <XCircle size={13} />
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                          <ClinicalField label="Chief Complaint" value={encounter.chief_complaint} />
                          <ClinicalField label="Symptoms" value={encounter.symptoms} />
                          <ClinicalField label="Clinical Notes" value={encounter.clinical_notes} wide />
                          <ClinicalField label="Diagnosis" value={encounter.diagnosis} />
                          <ClinicalField label="Treatment Plan" value={encounter.treatment_plan} />
                          <ClinicalField label="Prescription" value={encounter.prescription} />
                          <ClinicalField
                            label="Follow-up"
                            value={
                              encounter.follow_up_date
                                ? formatDate(encounter.follow_up_date)
                                : null
                            }
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_28px_-24px_rgba(15,23,42,0.3)] sm:p-6">
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <ShieldAlert size={18} className="mt-0.5 shrink-0 text-slate-500" />
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Clinical history access
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Clinical consultation records are available to authorized Doctors.
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* =================================================
          NEW / EDIT CONSULTATION MODAL
      ================================================= */}

      {isConsultationOpen && isDoctor && (
        <div
          className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-slate-950/45
            p-4
            backdrop-blur-[2px]
          "
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeConsultation();
            }
          }}
        >
          <div
            className="
              flex
              max-h-[92vh]
              w-full
              max-w-3xl
              flex-col
              overflow-hidden
              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-2xl
            "
          >
            {/* MODAL HEADER */}

            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    {isEditing ? (
                      <Edit3 size={17} />
                    ) : (
                      <Stethoscope size={17} />
                    )}
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      {isEditing
                        ? "Edit Consultation"
                        : "New Consultation"}
                    </h2>

                    <p className="text-[10px] text-slate-400">
                      {patient.name} · Patient #{patient.id}
                      {isEditing &&
                        editingEncounterId && (
                          <>
                            {" "}
                            · Consultation #
                            {editingEncounterId}
                          </>
                        )}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={closeConsultation}
                disabled={submitting}
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-lg
                  text-slate-400
                  transition
                  hover:bg-slate-100
                  hover:text-slate-700
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                <XCircle size={18} />
              </button>
            </div>

            {/* MODAL BODY */}

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <div className="space-y-5">

                {/* PATIENT CONTEXT */}

                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="flex items-center gap-2">
                    <UserRound
                      size={15}
                      className="text-blue-600"
                    />

                    <p className="text-xs font-bold text-slate-800">
                      Patient Context
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        Name
                      </p>

                      <p className="mt-1 font-semibold text-slate-700">
                        {patient.name}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        Age
                      </p>

                      <p className="mt-1 font-semibold text-slate-700">
                        {patient.age}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        Gender
                      </p>

                      <p className="mt-1 font-semibold text-slate-700">
                        {patient.gender}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        Registered Condition
                      </p>

                      <p className="mt-1 truncate font-semibold text-slate-700">
                        {patient.disease}
                      </p>
                    </div>
                  </div>
                </div>

                {/* CHIEF COMPLAINT */}

                <FormField
                  label="Chief Complaint"
                  required
                >
                  <textarea
                    value={form.chief_complaint}
                    onChange={(event) =>
                      updateFormField(
                        "chief_complaint",
                        event.target.value,
                      )
                    }
                    placeholder="Enter the patient's primary complaint..."
                    rows={3}
                    maxLength={1000}
                    className={TEXTAREA_CLASS}
                  />
                </FormField>

                {/* SYMPTOMS */}

                <FormField label="Symptoms">
                  <textarea
                    value={form.symptoms}
                    onChange={(event) =>
                      updateFormField(
                        "symptoms",
                        event.target.value,
                      )
                    }
                    placeholder="Document observed or reported symptoms..."
                    rows={4}
                    maxLength={3000}
                    className={TEXTAREA_CLASS}
                  />
                </FormField>

                {/* CLINICAL NOTES */}

                <FormField label="Clinical Notes">
                  <textarea
                    value={form.clinical_notes}
                    onChange={(event) =>
                      updateFormField(
                        "clinical_notes",
                        event.target.value,
                      )
                    }
                    placeholder="Add examination findings and clinical observations..."
                    rows={5}
                    maxLength={5000}
                    className={TEXTAREA_CLASS}
                  />
                </FormField>

                {/* DIAGNOSIS */}

                <FormField label="Diagnosis">
                  <textarea
                    value={form.diagnosis}
                    onChange={(event) =>
                      updateFormField(
                        "diagnosis",
                        event.target.value,
                      )
                    }
                    placeholder="Enter the clinical diagnosis..."
                    rows={3}
                    maxLength={2000}
                    className={TEXTAREA_CLASS}
                  />
                </FormField>

                {/* TREATMENT PLAN */}

                <FormField label="Treatment Plan">
                  <textarea
                    value={form.treatment_plan}
                    onChange={(event) =>
                      updateFormField(
                        "treatment_plan",
                        event.target.value,
                      )
                    }
                    placeholder="Describe the recommended treatment plan..."
                    rows={4}
                    maxLength={3000}
                    className={TEXTAREA_CLASS}
                  />
                </FormField>

                {/* PRESCRIPTION */}

                <FormField label="Prescription">
                  <textarea
                    value={form.prescription}
                    onChange={(event) =>
                      updateFormField(
                        "prescription",
                        event.target.value,
                      )
                    }
                    placeholder="Enter prescription details..."
                    rows={5}
                    maxLength={5000}
                    className={TEXTAREA_CLASS}
                  />
                </FormField>

                {/* FOLLOW-UP */}

                <FormField label="Follow-up Date">
                  <input
                    type="date"
                    value={form.follow_up_date}
                    onChange={(event) =>
                      updateFormField(
                        "follow_up_date",
                        event.target.value,
                      )
                    }
                    className={INPUT_CLASS}
                  />
                </FormField>
              </div>
            </div>

            {/* MODAL FOOTER */}

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={closeConsultation}
                disabled={submitting}
                className="
                  inline-flex
                  h-10
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-slate-200
                  bg-white
                  px-4
                  text-xs
                  font-semibold
                  text-slate-700
                  transition
                  hover:bg-slate-50
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleSaveConsultation()
                }
                disabled={submitting}
                className="
                  inline-flex
                  h-10
                  items-center
                  justify-center
                  gap-2
                  rounded-lg
                  bg-slate-950
                  px-4
                  text-xs
                  font-semibold
                  text-white
                  transition
                  hover:bg-blue-600
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {submitting ? (
                  <>
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />

                    {isEditing
                      ? "Saving..."
                      : "Creating..."}
                  </>
                ) : (
                  <>
                    {isEditing ? (
                      <Edit3 size={14} />
                    ) : (
                      <Plus size={14} />
                    )}

                    {isEditing
                      ? "Save Changes"
                      : "Create Consultation"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          LABORATORY REPORT MODAL
      ================================================= */}

      <LabReportModal
        open={selectedLabReportOrder !== null}
        patient={patient}
        order={selectedLabReportOrder}
        results={labResults}
        labTests={labTests}
        onClose={closeLabReport}
      />
    </div>
  );
}

// =====================================================
// PROFILE META
// =====================================================

function ProfileMeta({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur">
      <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-[11px] font-bold text-white">
        {value || "Not specified"}
      </p>
    </div>
  );
}

// =====================================================
// SUMMARY METRIC
// =====================================================

function SummaryMetric({
  label,
  value,
  icon: Icon,
  tone,
  compact = false,
}: {
  label: string;
  value: string | number;
  icon: typeof FileText;
  tone: "blue" | "emerald" | "amber" | "slate";
  compact?: boolean;
}) {
  const toneClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_25px_-22px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
          {label}
        </p>
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${toneClasses[tone]}`}
        >
          <Icon size={14} />
        </div>
      </div>

      <p
        className={`mt-3 truncate font-bold tracking-tight text-slate-900 ${
          compact ? "text-sm" : "text-2xl"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

// =====================================================
// EMPTY CLINICAL STATE
// =====================================================

function EmptyClinicalState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FileText;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-11 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
        <Icon size={19} />
      </div>
      <h3 className="mt-3 text-sm font-bold text-slate-800">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

// =====================================================
// NURSING VITAL FIELD
// =====================================================

function NursingVitalField({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: typeof Activity;
  label: string;
  value: string | number | null;
  suffix: string;
}) {
  const displayValue =
    value === null || value === undefined || value === ""
      ? "—"
      : String(value);

  return (
    <div className="bg-white p-3.5">
      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
        <Icon size={12} />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="truncate text-sm font-bold text-slate-900">
          {displayValue}
        </span>
        {displayValue !== "—" && (
          <span className="text-[9px] font-semibold text-slate-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// =====================================================
// NURSING HISTORY VALUE
// =====================================================

function NursingHistoryValue({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string | number | null;
  suffix: string;
}) {
  const displayValue =
    value === null || value === undefined || value === ""
      ? "—"
      : String(value);

  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-[11px] font-bold text-slate-700">
        {displayValue}
        {displayValue !== "—" && (
          <span className="ml-1 text-[9px] font-medium text-slate-400">
            {suffix}
          </span>
        )}
      </p>
    </div>
  );
}

// =====================================================
// CLINICAL FIELD
// =====================================================

function ClinicalField({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string | null;
  wide?: boolean;
}) {
  return (
    <div
      className={`
        rounded-xl
        border
        border-slate-100
        bg-slate-50/70
        p-3.5
        ${wide ? "lg:col-span-2" : ""}
      `}
    >
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-slate-700">
        {value?.trim() || "Not recorded"}
      </p>
    </div>
  );
}

// =====================================================
// FORM FIELD
// =====================================================

function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}

// =====================================================
// SHARED INPUT STYLES
// =====================================================

const INPUT_CLASS = `
  h-10
  w-full
  rounded-lg
  border
  border-slate-200
  bg-white
  px-3
  text-xs
  text-slate-800
  outline-none
  transition
  placeholder:text-slate-400
  focus:border-blue-500
  focus:ring-4
  focus:ring-blue-50
`;

const TEXTAREA_CLASS = `
  w-full
  resize-y
  rounded-lg
  border
  border-slate-200
  bg-white
  px-3
  py-2.5
  text-xs
  leading-5
  text-slate-800
  outline-none
  transition
  placeholder:text-slate-400
  focus:border-blue-500
  focus:ring-4
  focus:ring-blue-50
`;