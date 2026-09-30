import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Filter,
  Loader2,
  PhoneCall,
  RefreshCw,
  Search,
  ShieldAlert,
  Stethoscope,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { toast } from "react-toastify";

import { useAuth } from "../../context/AuthContext";

import type { Patient } from "../../types/patient";

import {
  getPatients,
} from "../../services/patientApi";

import {
  getDepartments,
} from "../../services/hospitalStructureApi";

import {
  getAppointments,
  type Appointment,
} from "../../services/appointmentApi";

import {
  callPatient,
  cancelPatientQueue,
  completePatientQueue,
  completePatientTriage,
  createPatientQueue,
  getPatientQueue,
  markPatientNoShow,
  startPatientTriage,
  type PatientQueue as PatientQueueRecord,
  type PatientQueueStatus,
  type TriagePriority,
} from "../../services/patientQueueApi";

import LoadingSpinner from "../../components/common/LoadingSpinner";


// =====================================================
// TYPES
// =====================================================

type Department = {
  id: number;
  name: string;
  is_active?: boolean | string;
};

type QueueFilterStatus =
  | "All"
  | PatientQueueStatus;

type PriorityFilter =
  | "All"
  | TriagePriority;

type TriageModalState = {
  queue: PatientQueueRecord | null;
  priority: TriagePriority;
  notes: string;
};


// =====================================================
// CONSTANTS
// =====================================================

const QUEUE_STATUSES: QueueFilterStatus[] = [
  "All",
  "Waiting",
  "Called",
  "In Triage",
  "Ready",
  "Completed",
  "Cancelled",
  "No-show",
];

const TRIAGE_PRIORITIES: PriorityFilter[] = [
  "All",
  "Normal",
  "Urgent",
  "Emergency",
];


// =====================================================
// HELPERS
// =====================================================

function isActiveRecord(
  value: boolean | string | undefined,
): boolean {
  return (
    value === true ||
    value === "true"
  );
}


function formatDateTime(
  value: string | null | undefined,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}


function getStatusClasses(
  status: PatientQueueStatus,
): string {
  switch (status) {
    case "Waiting":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "Called":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "In Triage":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "Ready":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";

    case "Completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "Cancelled":
      return "border-slate-200 bg-slate-100 text-slate-600";

    case "No-show":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}


function getPriorityClasses(
  priority: TriagePriority,
): string {
  switch (priority) {
    case "Emergency":
      return "border-red-200 bg-red-50 text-red-700";

    case "Urgent":
      return "border-orange-200 bg-orange-50 text-orange-700";

    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}


function getPatientName(
  patient: Patient | undefined,
): string {
  return patient?.name ?? "Unknown patient";
}


// =====================================================
// STATUS BADGE
// =====================================================

function StatusBadge({
  status,
}: {
  status: PatientQueueStatus;
}) {
  return (
    <span
      className={`
        inline-flex
        items-center
        gap-1.5
        rounded-full
        border
        px-2.5
        py-1
        text-[10px]
        font-bold
        ${getStatusClasses(status)}
      `}
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-current"
      />

      {status}
    </span>
  );
}


// =====================================================
// PRIORITY BADGE
// =====================================================

function PriorityBadge({
  priority,
}: {
  priority: TriagePriority;
}) {
  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        border
        px-2.5
        py-1
        text-[10px]
        font-bold
        ${getPriorityClasses(priority)}
      `}
    >
      {priority}
    </span>
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
}: {
  icon: typeof Users;
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-4
        shadow-sm
        sm:p-5
      "
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className="
              text-[10px]
              font-bold
              uppercase
              tracking-[0.16em]
              text-slate-400
            "
          >
            {label}
          </p>

          <p
            className="
              mt-2
              text-2xl
              font-black
              tracking-tight
              text-slate-900
            "
          >
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {helper}
          </p>
        </div>

        <div
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-slate-100
            text-slate-600
          "
        >
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}


// =====================================================
// MAIN PAGE
// =====================================================

export default function PatientQueue() {
  const { user } = useAuth();

  const role = user?.role;

  const isAdministrator =
    role === "Administrator";

  const isReceptionist =
    role === "Receptionist";

  const isNurse =
    role === "Nurse";

  const isDoctor =
    role === "Doctor";

  const canManageQueue =
    isAdministrator ||
    isReceptionist;

  const canTriage =
    isNurse;

  // ===================================================
  // DATA
  // ===================================================

  const [queue, setQueue] =
    useState<PatientQueueRecord[]>([]);

  const [patients, setPatients] =
    useState<Patient[]>([]);

  const [departments, setDepartments] =
    useState<Department[]>([]);

  const [appointments, setAppointments] =
    useState<Appointment[]>([]);


  // ===================================================
  // PAGE STATE
  // ===================================================

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<QueueFilterStatus>("All");

  const [priorityFilter, setPriorityFilter] =
    useState<PriorityFilter>("All");

  const [departmentFilter, setDepartmentFilter] =
    useState("All");


  // ===================================================
  // ACTION STATE
  // ===================================================

  const [processingId, setProcessingId] =
    useState<number | null>(null);


  // ===================================================
  // TRIAGE MODAL
  // ===================================================

  const [triageModal, setTriageModal] =
    useState<TriageModalState>({
      queue: null,
      priority: "Normal",
      notes: "",
    });

  const [triageSaving, setTriageSaving] =
    useState(false);


  // ===================================================
  // CREATE QUEUE MODAL
  // ===================================================

  const [createModalOpen, setCreateModalOpen] =
    useState(false);

  const [selectedAppointmentId, setSelectedAppointmentId] =
    useState("");

  const [creatingQueue, setCreatingQueue] =
    useState(false);


  // ===================================================
  // LOOKUP MAPS
  // ===================================================

  const patientMap = useMemo(
    () =>
      new Map(
        patients.map(
          (patient) => [
            patient.id,
            patient,
          ],
        ),
      ),
    [patients],
  );


  const departmentMap = useMemo(
    () =>
      new Map(
        departments.map(
          (department) => [
            department.id,
            department,
          ],
        ),
      ),
    [departments],
  );


  const appointmentMap = useMemo(
    () =>
      new Map(
        appointments.map(
          (appointment) => [
            appointment.id,
            appointment,
          ],
        ),
      ),
    [appointments],
  );


  // ===================================================
  // LOAD PAGE
  // ===================================================

  const loadPage = useCallback(
    async (
      showRefreshState = false,
    ) => {
      try {
        if (showRefreshState) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const queuePromise =
          getPatientQueue();

        const patientsPromise =
          getPatients();

        const departmentsPromise =
          getDepartments();

        const results =
          await Promise.allSettled([
            queuePromise,
            patientsPromise,
            departmentsPromise,
          ]);

        const [
          queueResult,
          patientsResult,
          departmentsResult,
        ] = results;

        if (
          queueResult.status ===
          "rejected"
        ) {
          throw queueResult.reason;
        }

        setQueue(
          Array.isArray(
            queueResult.value,
          )
            ? queueResult.value
            : [],
        );

        if (
          patientsResult.status ===
          "fulfilled"
        ) {
          setPatients(
            Array.isArray(
              patientsResult.value,
            )
              ? patientsResult.value
              : [],
          );
        }

        if (
          departmentsResult.status ===
          "fulfilled"
        ) {
          setDepartments(
            Array.isArray(
              departmentsResult.value,
            )
              ? departmentsResult.value.filter(
                  (department) =>
                    isActiveRecord(
                      department.is_active,
                    ),
                )
              : [],
          );
        }

        /*
         * Appointments are required only by
         * Administrator / Receptionist for
         * creating queue entries.
         *
         * Nurse and Doctor should not depend
         * on the appointments endpoint.
         */
        if (
          canManageQueue
        ) {
          try {
            const appointmentData =
              await getAppointments();

            setAppointments(
              Array.isArray(
                appointmentData,
              )
                ? appointmentData
                : [],
            );
          } catch (appointmentError) {
            console.error(
              "Unable to load appointments:",
              appointmentError,
            );

            setAppointments([]);
          }
        } else {
          setAppointments([]);
        }

      } catch (err) {
        console.error(
          "Patient queue loading error:",
          err,
        );

        setError(
          "Unable to load patient queue records.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canManageQueue],
  );


  // ===================================================
  // INITIAL LOAD
  // ===================================================

  useEffect(() => {
    if (!user) {
      return;
    }

    void loadPage();
  }, [
    user,
    loadPage,
  ]);


  // ===================================================
  // FILTERED QUEUE
  // ===================================================

  const filteredQueue =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return queue.filter(
        (item) => {
          if (
            statusFilter !== "All" &&
            item.status !==
              statusFilter
          ) {
            return false;
          }

          if (
            priorityFilter !== "All" &&
            item.triage_priority !==
              priorityFilter
          ) {
            return false;
          }

          if (
            departmentFilter !== "All" &&
            String(
              item.department_id,
            ) !== departmentFilter
          ) {
            return false;
          }

          if (!keyword) {
            return true;
          }

          const patient =
            patientMap.get(
              item.patient_id,
            );

          const department =
            departmentMap.get(
              item.department_id,
            );

          const appointment =
            appointmentMap.get(
              item.appointment_id,
            );

          const patientName =
            patient?.name
              ?.toLowerCase() ?? "";

          const patientMobile =
            patient?.mobile
              ?.toLowerCase() ?? "";

          const patientId =
            String(
              item.patient_id,
            );

          const queueId =
            String(item.id);

          const queueNumber =
            String(
              item.queue_number,
            );

          const departmentName =
            department?.name
              ?.toLowerCase() ?? "";

          const reason =
            appointment?.reason
              ?.toLowerCase() ?? "";

          return (
            patientName.includes(
              keyword,
            ) ||
            patientMobile.includes(
              keyword,
            ) ||
            patientId.includes(
              keyword,
            ) ||
            queueId.includes(
              keyword,
            ) ||
            queueNumber.includes(
              keyword,
            ) ||
            departmentName.includes(
              keyword,
            ) ||
            reason.includes(
              keyword,
            )
          );
        },
      );
    }, [
      queue,
      search,
      statusFilter,
      priorityFilter,
      departmentFilter,
      patientMap,
      departmentMap,
      appointmentMap,
    ]);


  // ===================================================
  // SUMMARY
  // ===================================================

  const summary =
    useMemo(
      () => ({
        total:
          queue.length,

        waiting:
          queue.filter(
            (item) =>
              item.status ===
              "Waiting",
          ).length,

        called:
          queue.filter(
            (item) =>
              item.status ===
              "Called",
          ).length,

        inTriage:
          queue.filter(
            (item) =>
              item.status ===
              "In Triage",
          ).length,

        ready:
          queue.filter(
            (item) =>
              item.status ===
              "Ready",
          ).length,

        completed:
          queue.filter(
            (item) =>
              item.status ===
              "Completed",
          ).length,

        urgent:
          queue.filter(
            (item) =>
              item.triage_priority ===
              "Urgent",
          ).length,

        emergency:
          queue.filter(
            (item) =>
              item.triage_priority ===
              "Emergency",
          ).length,
      }),
      [queue],
    );


  // ===================================================
  // CHECKED-IN APPOINTMENTS AVAILABLE FOR QUEUE
  // ===================================================

  const availableAppointments =
    useMemo(() => {
      const queuedAppointmentIds =
        new Set(
          queue.map(
            (item) =>
              item.appointment_id,
          ),
        );

      return appointments.filter(
        (appointment) =>
          appointment.status ===
            "Checked-in" &&
          !queuedAppointmentIds.has(
            appointment.id,
          ),
      );
    }, [
      appointments,
      queue,
    ]);


  // ===================================================
  // REFRESH
  // ===================================================

  const handleRefresh = async () => {
    if (refreshing) {
      return;
    }

    await loadPage(true);
  };


  // ===================================================
  // CREATE QUEUE
  // ===================================================

  const handleCreateQueue =
    async (
      event: React.FormEvent,
    ) => {
      event.preventDefault();

      if (
        !selectedAppointmentId
      ) {
        toast.error(
          "Please select a checked-in appointment.",
        );

        return;
      }

      try {
        setCreatingQueue(true);

        await createPatientQueue({
          appointment_id:
            Number(
              selectedAppointmentId,
            ),
        });

        toast.success(
          "Patient added to queue successfully.",
        );

        setCreateModalOpen(false);
        setSelectedAppointmentId("");

        await loadPage(true);

      } catch (err) {
        console.error(
          "Create queue error:",
          err,
        );

        const response =
          (
            err as {
              response?: {
                data?: {
                  detail?: string;
                };
              };
            }
          )?.response;

        toast.error(
          response?.data?.detail ??
            "Unable to add patient to queue.",
        );
      } finally {
        setCreatingQueue(false);
      }
    };


  // ===================================================
  // CALL PATIENT
  // ===================================================

  const handleCallPatient =
    async (
      item: PatientQueueRecord,
    ) => {
      if (
        processingId !== null
      ) {
        return;
      }

      try {
        setProcessingId(item.id);

        await callPatient(
          item.id,
        );

        toast.success(
          "Patient called successfully.",
        );

        await loadPage(true);

      } catch (err) {
        console.error(
          "Call patient error:",
          err,
        );

        const response =
          (
            err as {
              response?: {
                data?: {
                  detail?: string;
                };
              };
            }
          )?.response;

        toast.error(
          response?.data?.detail ??
            "Unable to call patient.",
        );
      } finally {
        setProcessingId(null);
      }
    };


  // ===================================================
  // START TRIAGE
  // ===================================================

  const handleStartTriage =
    async (
      item: PatientQueueRecord,
    ) => {
      if (
        processingId !== null
      ) {
        return;
      }

      try {
        setProcessingId(item.id);

        await startPatientTriage(
          item.id,
        );

        toast.success(
          "Triage started successfully.",
        );

        await loadPage(true);

      } catch (err) {
        console.error(
          "Start triage error:",
          err,
        );

        const response =
          (
            err as {
              response?: {
                data?: {
                  detail?: string;
                };
              };
            }
          )?.response;

        toast.error(
          response?.data?.detail ??
            "Unable to start triage.",
        );
      } finally {
        setProcessingId(null);
      }
    };


  // ===================================================
  // OPEN TRIAGE COMPLETION
  // ===================================================

  const openTriageModal =
    (
      item: PatientQueueRecord,
    ) => {
      setTriageModal({
        queue: item,
        priority:
          item.triage_priority ??
          "Normal",
        notes:
          item.triage_notes ??
          "",
      });
    };


  // ===================================================
  // CLOSE TRIAGE MODAL
  // ===================================================

  const closeTriageModal =
    () => {
      if (triageSaving) {
        return;
      }

      setTriageModal({
        queue: null,
        priority: "Normal",
        notes: "",
      });
    };


  // ===================================================
  // COMPLETE TRIAGE
  // ===================================================

  const handleCompleteTriage =
    async (
      event: React.FormEvent,
    ) => {
      event.preventDefault();

      const item =
        triageModal.queue;

      if (!item) {
        return;
      }

      try {
        setTriageSaving(true);

        await completePatientTriage(
          item.id,
          {
            triage_priority:
              triageModal.priority,

            triage_status:
              "Completed",

            triage_notes:
              triageModal.notes.trim() ||
              undefined,
          },
        );

        toast.success(
          "Triage completed successfully.",
        );

        closeTriageModal();

        await loadPage(true);

      } catch (err) {
        console.error(
          "Complete triage error:",
          err,
        );

        const response =
          (
            err as {
              response?: {
                data?: {
                  detail?: string;
                };
              };
            }
          )?.response;

        toast.error(
          response?.data?.detail ??
            "Unable to complete triage.",
        );
      } finally {
        setTriageSaving(false);
      }
    };


  // ===================================================
  // COMPLETE QUEUE
  // ===================================================

  const handleCompleteQueue =
    async (
      item: PatientQueueRecord,
    ) => {
      if (
        processingId !== null
      ) {
        return;
      }

      try {
        setProcessingId(item.id);

        await completePatientQueue(
          item.id,
        );

        toast.success(
          "Queue visit completed successfully.",
        );

        await loadPage(true);

      } catch (err) {
        console.error(
          "Complete queue error:",
          err,
        );

        const response =
          (
            err as {
              response?: {
                data?: {
                  detail?: string;
                };
              };
            }
          )?.response;

        toast.error(
          response?.data?.detail ??
            "Unable to complete queue.",
        );
      } finally {
        setProcessingId(null);
      }
    };


  // ===================================================
  // CANCEL QUEUE
  // ===================================================

  const handleCancelQueue =
    async (
      item: PatientQueueRecord,
    ) => {
      if (
        processingId !== null
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "Are you sure you want to cancel this queue entry?",
        );

      if (!confirmed) {
        return;
      }

      try {
        setProcessingId(item.id);

        await cancelPatientQueue(
          item.id,
        );

        toast.success(
          "Queue entry cancelled successfully.",
        );

        await loadPage(true);

      } catch (err) {
        console.error(
          "Cancel queue error:",
          err,
        );

        const response =
          (
            err as {
              response?: {
                data?: {
                  detail?: string;
                };
              };
            }
          )?.response;

        toast.error(
          response?.data?.detail ??
            "Unable to cancel queue entry.",
        );
      } finally {
        setProcessingId(null);
      }
    };


  // ===================================================
  // NO-SHOW
  // ===================================================

  const handleNoShow =
    async (
      item: PatientQueueRecord,
    ) => {
      if (
        processingId !== null
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "Mark this patient as no-show?",
        );

      if (!confirmed) {
        return;
      }

      try {
        setProcessingId(item.id);

        await markPatientNoShow(
          item.id,
        );

        toast.success(
          "Patient marked as no-show.",
        );

        await loadPage(true);

      } catch (err) {
        console.error(
          "No-show error:",
          err,
        );

        const response =
          (
            err as {
              response?: {
                data?: {
                  detail?: string;
                };
              };
            }
          )?.response;

        toast.error(
          response?.data?.detail ??
            "Unable to mark patient as no-show.",
        );
      } finally {
        setProcessingId(null);
      }
    };


  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <div
        className="
          flex
          h-full
          min-h-0
          items-center
          justify-center
          bg-slate-50
        "
      >
        <LoadingSpinner
          text="Loading patient queue..."
        />
      </div>
    );
  }


  // ===================================================
  // ERROR
  // ===================================================

  if (error) {
    return (
      <div
        className="
          flex
          h-full
          min-h-0
          items-center
          justify-center
          bg-slate-50
          px-6
        "
      >
        <div
          className="
            w-full
            max-w-md
            rounded-2xl
            border
            border-slate-200
            bg-white
            p-8
            text-center
            shadow-sm
          "
        >
          <div
            className="
              mx-auto
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-xl
              bg-red-50
              text-red-500
            "
          >
            <ShieldAlert size={23} />
          </div>

          <h2
            className="
              mt-4
              text-lg
              font-bold
              text-slate-900
            "
          >
            Unable to load queue
          </h2>

          <p
            className="
              mt-1.5
              text-sm
              leading-5
              text-slate-500
            "
          >
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadPage()
            }
            className="
              mt-5
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
    );
  }


  // ===================================================
  // PAGE
  // ===================================================

  return (
    <div
      className="
        h-full
        min-h-0
        overflow-y-auto
        overflow-x-hidden
        bg-slate-50
      "
    >
      <div
        className="
          min-h-full
          p-3
          sm:p-5
          lg:p-6
          xl:p-8
        "
      >
        <div
          className="
            mx-auto
            w-full
            max-w-[1600px]
          "
        >

          {/* =================================================
              HEADER
          ================================================= */}

          <div
            className="
              mb-5
              flex
              flex-col
              gap-4
              lg:flex-row
              lg:items-center
              lg:justify-between
            "
          >
            <div>
              <div
                className="
                  flex
                  items-center
                  gap-2
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.18em]
                  text-blue-600
                "
              >
                <Stethoscope size={13} />
                Patient Flow
              </div>

              <h1
                className="
                  mt-1
                  text-2xl
                  font-black
                  tracking-tight
                  text-slate-950
                  sm:text-3xl
                "
              >
                Queue & Triage
              </h1>

              <p
                className="
                  mt-1.5
                  max-w-2xl
                  text-sm
                  leading-6
                  text-slate-500
                "
              >
                Manage checked-in patients,
                queue progression and clinical
                triage before doctor workflow.
              </p>
            </div>

            <div
              className="
                flex
                flex-wrap
                items-center
                gap-2
              "
            >
              <button
                type="button"
                onClick={() =>
                  void handleRefresh()
                }
                disabled={refreshing}
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-3.5
                  py-2.5
                  text-sm
                  font-semibold
                  text-slate-700
                  shadow-sm
                  transition
                  hover:border-slate-300
                  hover:bg-slate-50
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                <RefreshCw
                  size={15}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />
                Refresh
              </button>

              {canManageQueue && (
                <button
                  type="button"
                  onClick={() =>
                    setCreateModalOpen(true)
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
                    font-bold
                    text-white
                    shadow-sm
                    transition
                    hover:bg-slate-800
                  "
                >
                  <Users size={16} />
                  Add to Queue
                </button>
              )}
            </div>
          </div>


          {/* =================================================
              SUMMARY
          ================================================= */}

          <div
            className="
              grid
              grid-cols-2
              gap-3
              xl:grid-cols-5
            "
          >
            <SummaryCard
              icon={Users}
              label="Total"
              value={summary.total}
              helper="Queue records"
            />

            <SummaryCard
              icon={Clock3}
              label="Waiting"
              value={summary.waiting}
              helper="Awaiting call"
            />

            <SummaryCard
              icon={PhoneCall}
              label="Called"
              value={summary.called}
              helper="Patient called"
            />

            <SummaryCard
              icon={Stethoscope}
              label="In Triage"
              value={summary.inTriage}
              helper="Nurse assessment"
            />

            <SummaryCard
              icon={CheckCircle2}
              label="Ready"
              value={summary.ready}
              helper="Ready for doctor"
            />
          </div>


          {/* =================================================
              PRIORITY ALERT
          ================================================= */}

          {(summary.urgent > 0 ||
            summary.emergency > 0) && (
            <div
              className="
                mt-4
                flex
                flex-col
                gap-3
                rounded-2xl
                border
                border-orange-200
                bg-orange-50
                px-4
                py-3.5
                sm:flex-row
                sm:items-center
                sm:justify-between
              "
            >
              <div className="flex items-center gap-3">
                <div
                  className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-white
                    text-orange-600
                    shadow-sm
                  "
                >
                  <AlertCircle size={18} />
                </div>

                <div>
                  <p
                    className="
                      text-sm
                      font-bold
                      text-orange-900
                    "
                  >
                    Priority patients require attention
                  </p>

                  <p
                    className="
                      mt-0.5
                      text-xs
                      text-orange-700
                    "
                  >
                    {summary.emergency} emergency ·{" "}
                    {summary.urgent} urgent
                  </p>
                </div>
              </div>
            </div>
          )}


          {/* =================================================
              FILTER BAR
          ================================================= */}

          <section
            className="
              mt-5
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-3
              shadow-sm
            "
          >
            <div
              className="
                flex
                flex-col
                gap-3
                lg:flex-row
                lg:items-center
              "
            >
              <div
                className="
                  relative
                  min-w-0
                  flex-1
                "
              >
                <Search
                  size={16}
                  className="
                    absolute
                    left-3.5
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="
                    Search patient, mobile, queue,
                    department or reason...
                  "
                  className="
                    h-11
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50
                    pl-10
                    pr-4
                    text-sm
                    font-medium
                    text-slate-800
                    outline-none
                    transition
                    placeholder:text-slate-400
                    focus:border-blue-400
                    focus:bg-white
                    focus:ring-4
                    focus:ring-blue-500/10
                  "
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <div
                  className="
                    relative
                    min-w-[145px]
                  "
                >
                  <Filter
                    size={14}
                    className="
                      pointer-events-none
                      absolute
                      left-3
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                    "
                  />

                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(
                        event.target
                          .value as QueueFilterStatus,
                      )
                    }
                    className="
                      h-11
                      w-full
                      appearance-none
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      pl-9
                      pr-8
                      text-xs
                      font-bold
                      text-slate-700
                      outline-none
                      focus:border-blue-400
                      focus:ring-4
                      focus:ring-blue-500/10
                    "
                  >
                    {QUEUE_STATUSES.map(
                      (status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status ===
                          "All"
                            ? "All Statuses"
                            : status}
                        </option>
                      ),
                    )}
                  </select>

                  <ChevronDown
                    size={14}
                    className="
                      pointer-events-none
                      absolute
                      right-3
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                    "
                  />
                </div>

                <div
                  className="
                    relative
                    min-w-[145px]
                  "
                >
                  <select
                    value={priorityFilter}
                    onChange={(event) =>
                      setPriorityFilter(
                        event.target
                          .value as PriorityFilter,
                      )
                    }
                    className="
                      h-11
                      w-full
                      appearance-none
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      px-3
                      pr-8
                      text-xs
                      font-bold
                      text-slate-700
                      outline-none
                      focus:border-blue-400
                      focus:ring-4
                      focus:ring-blue-500/10
                    "
                  >
                    {TRIAGE_PRIORITIES.map(
                      (priority) => (
                        <option
                          key={priority}
                          value={priority}
                        >
                          {priority ===
                          "All"
                            ? "All Priorities"
                            : priority}
                        </option>
                      ),
                    )}
                  </select>

                  <ChevronDown
                    size={14}
                    className="
                      pointer-events-none
                      absolute
                      right-3
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                    "
                  />
                </div>

                <div
                  className="
                    relative
                    min-w-[160px]
                  "
                >
                  <select
                    value={departmentFilter}
                    onChange={(event) =>
                      setDepartmentFilter(
                        event.target.value,
                      )
                    }
                    className="
                      h-11
                      w-full
                      appearance-none
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      px-3
                      pr-8
                      text-xs
                      font-bold
                      text-slate-700
                      outline-none
                      focus:border-blue-400
                      focus:ring-4
                      focus:ring-blue-500/10
                    "
                  >
                    <option value="All">
                      All Departments
                    </option>

                    {departments.map(
                      (department) => (
                        <option
                          key={department.id}
                          value={
                            department.id
                          }
                        >
                          {department.name}
                        </option>
                      ),
                    )}
                  </select>

                  <ChevronDown
                    size={14}
                    className="
                      pointer-events-none
                      absolute
                      right-3
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                    "
                  />
                </div>
              </div>
            </div>
          </section>


          {/* =================================================
              QUEUE TABLE
          ================================================= */}

          <section
            className="
              mt-5
              overflow-hidden
              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-sm
            "
          >
            <div
              className="
                flex
                flex-col
                gap-2
                border-b
                border-slate-100
                px-5
                py-4
                sm:flex-row
                sm:items-center
                sm:justify-between
                sm:px-6
              "
            >
              <div>
                <p
                  className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.17em]
                    text-slate-400
                  "
                >
                  Live Queue
                </p>

                <h2
                  className="
                    mt-1
                    text-base
                    font-bold
                    text-slate-900
                  "
                >
                  Patient Queue
                </h2>
              </div>

              <span
                className="
                  w-fit
                  rounded-full
                  bg-slate-100
                  px-2.5
                  py-1.5
                  text-[10px]
                  font-bold
                  text-slate-500
                "
              >
                {filteredQueue.length}{" "}
                {filteredQueue.length === 1
                  ? "record"
                  : "records"}
              </span>
            </div>

            {filteredQueue.length === 0 ? (
              <div
                className="
                  flex
                  min-h-[300px]
                  flex-col
                  items-center
                  justify-center
                  px-6
                  py-12
                  text-center
                "
              >
                <div
                  className="
                    flex
                    h-14
                    w-14
                    items-center
                    justify-center
                    rounded-2xl
                    bg-slate-100
                    text-slate-400
                  "
                >
                  <Users size={24} />
                </div>

                <h3
                  className="
                    mt-4
                    text-base
                    font-bold
                    text-slate-900
                  "
                >
                  No queue records found
                </h3>

                <p
                  className="
                    mt-1.5
                    max-w-md
                    text-sm
                    leading-6
                    text-slate-500
                  "
                >
                  {queue.length === 0
                    ? "Checked-in patients will appear here when they are added to the patient queue."
                    : "Try changing your search or filters."}
                </p>

                {canManageQueue &&
                  availableAppointments.length >
                    0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setCreateModalOpen(
                          true,
                        )
                      }
                      className="
                        mt-5
                        inline-flex
                        items-center
                        gap-2
                        rounded-xl
                        bg-slate-950
                        px-4
                        py-2.5
                        text-sm
                        font-bold
                        text-white
                        transition
                        hover:bg-slate-800
                      "
                    >
                      <Users size={15} />
                      Add Checked-in Patient
                    </button>
                  )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] w-full">
                  <thead>
                    <tr
                      className="
                        border-b
                        border-slate-100
                        bg-slate-50/80
                      "
                    >
                      <th
                        className="
                          px-5
                          py-3.5
                          text-left
                          text-[10px]
                          font-bold
                          uppercase
                          tracking-[0.12em]
                          text-slate-400
                        "
                      >
                        Queue
                      </th>

                      <th
                        className="
                          px-4
                          py-3.5
                          text-left
                          text-[10px]
                          font-bold
                          uppercase
                          tracking-[0.12em]
                          text-slate-400
                        "
                      >
                        Patient
                      </th>

                      <th
                        className="
                          px-4
                          py-3.5
                          text-left
                          text-[10px]
                          font-bold
                          uppercase
                          tracking-[0.12em]
                          text-slate-400
                        "
                      >
                        Department
                      </th>

                      <th
                        className="
                          px-4
                          py-3.5
                          text-left
                          text-[10px]
                          font-bold
                          uppercase
                          tracking-[0.12em]
                          text-slate-400
                        "
                      >
                        Priority
                      </th>

                      <th
                        className="
                          px-4
                          py-3.5
                          text-left
                          text-[10px]
                          font-bold
                          uppercase
                          tracking-[0.12em]
                          text-slate-400
                        "
                      >
                        Status
                      </th>

                      <th
                        className="
                          px-4
                          py-3.5
                          text-left
                          text-[10px]
                          font-bold
                          uppercase
                          tracking-[0.12em]
                          text-slate-400
                        "
                      >
                        Queued
                      </th>

                      <th
                        className="
                          px-5
                          py-3.5
                          text-right
                          text-[10px]
                          font-bold
                          uppercase
                          tracking-[0.12em]
                          text-slate-400
                        "
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredQueue.map(
                      (item) => {
                        const patient =
                          patientMap.get(
                            item.patient_id,
                          );

                        const department =
                          departmentMap.get(
                            item.department_id,
                          );

                        const processing =
                          processingId ===
                          item.id;

                        return (
                          <tr
                            key={item.id}
                            className="
                              border-b
                              border-slate-100
                              last:border-b-0
                              hover:bg-slate-50/70
                            "
                          >
                            {/* QUEUE */}

                            <td className="px-5 py-4">
                              <div
                                className="
                                  flex
                                  items-center
                                  gap-3
                                "
                              >
                                <div
                                  className="
                                    flex
                                    h-10
                                    w-10
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-xl
                                    bg-slate-950
                                    text-sm
                                    font-black
                                    text-white
                                  "
                                >
                                  #
                                  {
                                    item.queue_number
                                  }
                                </div>

                                <div>
                                  <p
                                    className="
                                      text-xs
                                      font-bold
                                      text-slate-900
                                    "
                                  >
                                    Queue #
                                    {
                                      item.queue_number
                                    }
                                  </p>

                                  <p
                                    className="
                                      mt-0.5
                                      text-[10px]
                                      text-slate-400
                                    "
                                  >
                                    ID {item.id}
                                  </p>
                                </div>
                              </div>
                            </td>


                            {/* PATIENT */}

                            <td className="px-4 py-4">
                              <div
                                className="
                                  flex
                                  items-center
                                  gap-3
                                "
                              >
                                <div
                                  className="
                                    flex
                                    h-9
                                    w-9
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-full
                                    bg-blue-50
                                    text-blue-600
                                  "
                                >
                                  <UserRound
                                    size={16}
                                  />
                                </div>

                                <div>
                                  <p
                                    className="
                                      text-sm
                                      font-bold
                                      text-slate-900
                                    "
                                  >
                                    {getPatientName(
                                      patient,
                                    )}
                                  </p>

                                  <p
                                    className="
                                      mt-0.5
                                      text-[10px]
                                      text-slate-400
                                    "
                                  >
                                    Patient #
                                    {
                                      item.patient_id
                                    }

                                    {patient?.mobile
                                      ? ` · ${patient.mobile}`
                                      : ""}
                                  </p>
                                </div>
                              </div>
                            </td>


                            {/* DEPARTMENT */}

                            <td className="px-4 py-4">
                              <p
                                className="
                                  text-xs
                                  font-semibold
                                  text-slate-700
                                "
                              >
                                {department?.name ??
                                  `Department #${item.department_id}`}
                              </p>

                              <p
                                className="
                                  mt-1
                                  text-[10px]
                                  text-slate-400
                                "
                              >
                                Appointment #
                                {
                                  item.appointment_id
                                }
                              </p>
                            </td>


                            {/* PRIORITY */}

                            <td className="px-4 py-4">
                              <div className="space-y-1.5">
                                <PriorityBadge
                                  priority={
                                    item.triage_priority
                                  }
                                />

                                <p
                                  className="
                                    text-[10px]
                                    font-medium
                                    text-slate-400
                                  "
                                >
                                  Triage:{" "}
                                  {
                                    item.triage_status
                                  }
                                </p>
                              </div>
                            </td>


                            {/* STATUS */}

                            <td className="px-4 py-4">
                              <StatusBadge
                                status={
                                  item.status
                                }
                              />
                            </td>


                            {/* QUEUED */}

                            <td className="px-4 py-4">
                              <div
                                className="
                                  flex
                                  items-center
                                  gap-2
                                  text-xs
                                  text-slate-600
                                "
                              >
                                <Clock3
                                  size={14}
                                  className="text-slate-400"
                                />

                                {formatDateTime(
                                  item.queued_at,
                                )}
                              </div>
                            </td>


                            {/* ACTIONS */}

                            <td className="px-5 py-4">
                              <div
                                className="
                                  flex
                                  flex-wrap
                                  justify-end
                                  gap-2
                                "
                              >

                                {/* RECEPTION / ADMIN:
                                    WAITING → CALLED */}

                                {canManageQueue &&
                                  item.status ===
                                    "Waiting" && (
                                    <>
                                      <button
                                        type="button"
                                        disabled={
                                          processing
                                        }
                                        onClick={() =>
                                          void handleCallPatient(
                                            item,
                                          )
                                        }
                                        className="
                                          inline-flex
                                          items-center
                                          gap-1.5
                                          rounded-lg
                                          bg-blue-600
                                          px-3
                                          py-2
                                          text-[11px]
                                          font-bold
                                          text-white
                                          transition
                                          hover:bg-blue-700
                                          disabled:cursor-not-allowed
                                          disabled:opacity-50
                                        "
                                      >
                                        {processing ? (
                                          <Loader2
                                            size={13}
                                            className="animate-spin"
                                          />
                                        ) : (
                                          <PhoneCall
                                            size={13}
                                          />
                                        )}

                                        Call
                                      </button>

                                      <button
                                        type="button"
                                        disabled={
                                          processing
                                        }
                                        onClick={() =>
                                          void handleNoShow(
                                            item,
                                          )
                                        }
                                        className="
                                          inline-flex
                                          items-center
                                          gap-1.5
                                          rounded-lg
                                          border
                                          border-red-200
                                          bg-white
                                          px-3
                                          py-2
                                          text-[11px]
                                          font-bold
                                          text-red-600
                                          transition
                                          hover:bg-red-50
                                          disabled:opacity-50
                                        "
                                      >
                                        <XCircle
                                          size={13}
                                        />
                                        No-show
                                      </button>
                                    </>
                                  )}


                                {/* NURSE:
                                    CALLED → TRIAGE */}

                                {canTriage &&
                                  item.status ===
                                    "Called" && (
                                    <button
                                      type="button"
                                      disabled={
                                        processing
                                      }
                                      onClick={() =>
                                        void handleStartTriage(
                                          item,
                                        )
                                      }
                                      className="
                                        inline-flex
                                        items-center
                                        gap-1.5
                                        rounded-lg
                                        bg-violet-600
                                        px-3
                                        py-2
                                        text-[11px]
                                        font-bold
                                        text-white
                                        transition
                                        hover:bg-violet-700
                                        disabled:opacity-50
                                      "
                                    >
                                      {processing ? (
                                        <Loader2
                                          size={13}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <Stethoscope
                                          size={13}
                                        />
                                      )}

                                      Start Triage
                                    </button>
                                  )}


                                {/* NURSE:
                                    COMPLETE TRIAGE */}

                                {canTriage &&
                                  item.status ===
                                    "In Triage" && (
                                    <button
                                      type="button"
                                      disabled={
                                        processing
                                      }
                                      onClick={() =>
                                        openTriageModal(
                                          item,
                                        )
                                      }
                                      className="
                                        inline-flex
                                        items-center
                                        gap-1.5
                                        rounded-lg
                                        bg-emerald-600
                                        px-3
                                        py-2
                                        text-[11px]
                                        font-bold
                                        text-white
                                        transition
                                        hover:bg-emerald-700
                                        disabled:opacity-50
                                      "
                                    >
                                      <CheckCircle2
                                        size={13}
                                      />
                                      Complete Triage
                                    </button>
                                  )}


                                {/* READY → COMPLETE
                                    Administrator / Doctor */}

                                {(isAdministrator ||
                                  isDoctor) &&
                                  item.status ===
                                    "Ready" && (
                                    <button
                                      type="button"
                                      disabled={
                                        processing
                                      }
                                      onClick={() =>
                                        void handleCompleteQueue(
                                          item,
                                        )
                                      }
                                      className="
                                        inline-flex
                                        items-center
                                        gap-1.5
                                        rounded-lg
                                        bg-emerald-600
                                        px-3
                                        py-2
                                        text-[11px]
                                        font-bold
                                        text-white
                                        transition
                                        hover:bg-emerald-700
                                        disabled:opacity-50
                                      "
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
                                  )}


                                {/* ADMIN / RECEPTION:
                                    CANCEL */}

                                {canManageQueue &&
                                  ![
                                    "Completed",
                                    "Cancelled",
                                    "No-show",
                                  ].includes(
                                    item.status,
                                  ) && (
                                    <button
                                      type="button"
                                      disabled={
                                        processing
                                      }
                                      onClick={() =>
                                        void handleCancelQueue(
                                          item,
                                        )
                                      }
                                      className="
                                        inline-flex
                                        items-center
                                        gap-1.5
                                        rounded-lg
                                        border
                                        border-slate-200
                                        bg-white
                                        px-3
                                        py-2
                                        text-[11px]
                                        font-bold
                                        text-slate-600
                                        transition
                                        hover:border-red-200
                                        hover:bg-red-50
                                        hover:text-red-600
                                        disabled:opacity-50
                                      "
                                    >
                                      <X
                                        size={13}
                                      />
                                      Cancel
                                    </button>
                                  )}

                              </div>
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>


          {/* =================================================
              FOOTER INFO
          ================================================= */}

          <div
            className="
              mt-4
              flex
              items-center
              gap-2
              px-1
              text-[10px]
              font-medium
              text-slate-400
            "
          >
            <ShieldAlert size={12} />

            Queue status and triage records are
            maintained from the hospital operations
            backend.
          </div>

        </div>
      </div>


      {/* =================================================
          CREATE QUEUE MODAL
      ================================================= */}

      {createModalOpen && (
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
            backdrop-blur-sm
          "
          onMouseDown={() => {
            if (!creatingQueue) {
              setCreateModalOpen(false);
            }
          }}
        >
          <div
            className="
              w-full
              max-w-lg
              overflow-hidden
              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-2xl
            "
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div
              className="
                flex
                items-start
                justify-between
                border-b
                border-slate-100
                px-5
                py-4
                sm:px-6
              "
            >
              <div>
                <p
                  className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.17em]
                    text-blue-600
                  "
                >
                  Patient Flow
                </p>

                <h2
                  className="
                    mt-1
                    text-lg
                    font-bold
                    text-slate-900
                  "
                >
                  Add Patient to Queue
                </h2>

                <p
                  className="
                    mt-1
                    text-xs
                    leading-5
                    text-slate-500
                  "
                >
                  Only checked-in appointments can
                  enter the patient queue.
                </p>
              </div>

              <button
                type="button"
                disabled={creatingQueue}
                onClick={() =>
                  setCreateModalOpen(false)
                }
                className="
                  rounded-lg
                  p-2
                  text-slate-400
                  transition
                  hover:bg-slate-100
                  hover:text-slate-700
                  disabled:opacity-50
                "
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={
                handleCreateQueue
              }
              className="p-5 sm:p-6"
            >
              <label
                className="
                  block
                  text-xs
                  font-bold
                  text-slate-700
                "
              >
                Checked-in Appointment
              </label>

              <select
                value={
                  selectedAppointmentId
                }
                onChange={(event) =>
                  setSelectedAppointmentId(
                    event.target.value,
                  )
                }
                disabled={
                  creatingQueue
                }
                className="
                  mt-2
                  h-12
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-3.5
                  text-sm
                  font-medium
                  text-slate-800
                  outline-none
                  focus:border-blue-400
                  focus:ring-4
                  focus:ring-blue-500/10
                "
              >
                <option value="">
                  Select checked-in appointment
                </option>

                {availableAppointments.map(
                  (appointment) => {
                    const patient =
                      patientMap.get(
                        appointment.patient_id,
                      );

                    const department =
                      departmentMap.get(
                        appointment.department_id,
                      );

                    return (
                      <option
                        key={
                          appointment.id
                        }
                        value={
                          appointment.id
                        }
                      >
                        #{appointment.id} ·{" "}
                        {getPatientName(
                          patient,
                        )}{" "}
                        ·{" "}
                        {department?.name ??
                          `Department ${appointment.department_id}`}
                      </option>
                    );
                  },
                )}
              </select>

              {availableAppointments.length ===
                0 && (
                <div
                  className="
                    mt-3
                    rounded-xl
                    border
                    border-amber-200
                    bg-amber-50
                    px-3.5
                    py-3
                    text-xs
                    leading-5
                    text-amber-800
                  "
                >
                  There are currently no checked-in
                  appointments available for queue
                  creation.
                </div>
              )}

              <div
                className="
                  mt-5
                  flex
                  justify-end
                  gap-2
                "
              >
                <button
                  type="button"
                  disabled={
                    creatingQueue
                  }
                  onClick={() =>
                    setCreateModalOpen(
                      false,
                    )
                  }
                  className="
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
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    creatingQueue ||
                    !selectedAppointmentId
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
                    font-bold
                    text-white
                    transition
                    hover:bg-slate-800
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {creatingQueue && (
                    <Loader2
                      size={15}
                      className="animate-spin"
                    />
                  )}

                  Add to Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* =================================================
          TRIAGE MODAL
      ================================================= */}

      {triageModal.queue && (
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
            backdrop-blur-sm
          "
          onMouseDown={() => {
            if (!triageSaving) {
              closeTriageModal();
            }
          }}
        >
          <div
            className="
              max-h-[90vh]
              w-full
              max-w-xl
              overflow-y-auto
              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-2xl
            "
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div
              className="
                sticky
                top-0
                z-10
                flex
                items-start
                justify-between
                border-b
                border-slate-100
                bg-white
                px-5
                py-4
                sm:px-6
              "
            >
              <div>
                <p
                  className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.17em]
                    text-violet-600
                  "
                >
                  Nursing Triage
                </p>

                <h2
                  className="
                    mt-1
                    text-lg
                    font-bold
                    text-slate-900
                  "
                >
                  Complete Patient Triage
                </h2>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-500
                  "
                >
                  Queue #
                  {
                    triageModal.queue
                      .queue_number
                  }{" "}
                  · Patient #
                  {
                    triageModal.queue
                      .patient_id
                  }
                </p>
              </div>

              <button
                type="button"
                disabled={triageSaving}
                onClick={
                  closeTriageModal
                }
                className="
                  rounded-lg
                  p-2
                  text-slate-400
                  transition
                  hover:bg-slate-100
                  hover:text-slate-700
                  disabled:opacity-50
                "
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={
                handleCompleteTriage
              }
              className="space-y-5 p-5 sm:p-6"
            >
              <div
                className="
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  p-4
                "
              >
                <div className="flex items-center gap-3">
                  <div
                    className="
                      flex
                      h-10
                      w-10
                      items-center
                      justify-center
                      rounded-xl
                      bg-white
                      text-violet-600
                      shadow-sm
                    "
                  >
                    <UserRound size={18} />
                  </div>

                  <div>
                    <p
                      className="
                        text-sm
                        font-bold
                        text-slate-900
                      "
                    >
                      {getPatientName(
                        patientMap.get(
                          triageModal.queue
                            .patient_id,
                        ),
                      )}
                    </p>

                    <p
                      className="
                        mt-0.5
                        text-[10px]
                        text-slate-400
                      "
                    >
                      Department:{" "}
                      {
                        departmentMap.get(
                          triageModal.queue
                            .department_id,
                        )?.name
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label
                  className="
                    text-xs
                    font-bold
                    text-slate-700
                  "
                >
                  Triage Priority
                </label>

                <div
                  className="
                    mt-2
                    grid
                    grid-cols-3
                    gap-2
                  "
                >
                  {(
                    [
                      "Normal",
                      "Urgent",
                      "Emergency",
                    ] as TriagePriority[]
                  ).map(
                    (priority) => {
                      const active =
                        triageModal.priority ===
                        priority;

                      return (
                        <button
                          key={priority}
                          type="button"
                          disabled={
                            triageSaving
                          }
                          onClick={() =>
                            setTriageModal(
                              (
                                current,
                              ) => ({
                                ...current,
                                priority,
                              }),
                            )
                          }
                          className={`
                            rounded-xl
                            border
                            px-3
                            py-3
                            text-xs
                            font-bold
                            transition
                            ${
                              active
                                ? getPriorityClasses(
                                    priority,
                                  )
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }
                          `}
                        >
                          {priority}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              <div>
                <label
                  className="
                    text-xs
                    font-bold
                    text-slate-700
                  "
                >
                  Triage Notes
                </label>

                <textarea
                  value={
                    triageModal.notes
                  }
                  onChange={(event) =>
                    setTriageModal(
                      (current) => ({
                        ...current,
                        notes:
                          event.target.value,
                      }),
                    )
                  }
                  disabled={
                    triageSaving
                  }
                  maxLength={3000}
                  rows={6}
                  placeholder="
                    Record relevant triage observations,
                    concerns or instructions...
                  "
                  className="
                    mt-2
                    w-full
                    resize-y
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-3.5
                    py-3
                    text-sm
                    font-medium
                    leading-6
                    text-slate-800
                    outline-none
                    transition
                    placeholder:text-slate-400
                    focus:border-violet-400
                    focus:ring-4
                    focus:ring-violet-500/10
                  "
                />

                <div
                  className="
                    mt-1
                    text-right
                    text-[10px]
                    text-slate-400
                  "
                >
                  {triageModal.notes.length}/3000
                </div>
              </div>

              <div
                className="
                  flex
                  justify-end
                  gap-2
                  border-t
                  border-slate-100
                  pt-4
                "
              >
                <button
                  type="button"
                  disabled={
                    triageSaving
                  }
                  onClick={
                    closeTriageModal
                  }
                  className="
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
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    triageSaving
                  }
                  className="
                    inline-flex
                    items-center
                    gap-2
                    rounded-xl
                    bg-violet-600
                    px-4
                    py-2.5
                    text-sm
                    font-bold
                    text-white
                    transition
                    hover:bg-violet-700
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {triageSaving && (
                    <Loader2
                      size={15}
                      className="animate-spin"
                    />
                  )}

                  Complete Triage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}