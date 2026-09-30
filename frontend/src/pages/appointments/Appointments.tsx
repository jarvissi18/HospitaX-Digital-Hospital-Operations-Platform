import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Filter,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Stethoscope,
  UserRound,
  UsersRound,
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
  getDoctors,
  type User,
} from "../../services/staffApi";

import {
  cancelAppointment,
  checkInAppointment,
  completeAppointment,
  createAppointment,
  getAppointments,
  getMyAppointments,
  markAppointmentNoShow,
  queueAppointment,
  type Appointment,
  type AppointmentStatus,
  type AppointmentType,
} from "../../services/appointmentApi";

import LoadingSpinner from "../../components/common/LoadingSpinner";


// =====================================================
// TYPES
// =====================================================

type Department = {
  id: number;
  name: string;
  is_active?: boolean | string;
};

type AppointmentFilterStatus =
  | "All"
  | AppointmentStatus;


// =====================================================
// CONSTANTS
// =====================================================

const APPOINTMENT_TYPES: AppointmentType[] = [
  "Scheduled",
  "Walk-in",
];

const APPOINTMENT_STATUSES: AppointmentFilterStatus[] = [
  "All",
  "Scheduled",
  "Checked-in",
  "In Queue",
  "Completed",
  "Cancelled",
  "No-show",
];


// =====================================================
// HELPERS
// =====================================================

function formatDateTime(
  value: string | null,
): string {
  if (!value) {
    return "Not scheduled";
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
  status: AppointmentStatus,
): string {
  switch (status) {
    case "Completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "Checked-in":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "In Queue":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "Cancelled":
      return "border-slate-200 bg-slate-100 text-slate-600";

    case "No-show":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}


function getTypeClasses(
  type: AppointmentType,
): string {
  if (type === "Walk-in") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  return "border-blue-200 bg-blue-50 text-blue-700";
}


function isActiveRecord(
  value: boolean | string | undefined,
): boolean {
  return (
    value === true ||
    value === "true"
  );
}


// =====================================================
// FORM TYPE
// =====================================================

interface AppointmentForm {
  patient_id: string;
  department_id: string;
  doctor_id: string;
  scheduled_at: string;
  appointment_type: AppointmentType;
  reason: string;
  notes: string;
}


// =====================================================
// INITIAL FORM
// =====================================================

const initialForm: AppointmentForm = {
  patient_id: "",
  department_id: "",
  doctor_id: "",
  scheduled_at: "",
  appointment_type: "Scheduled",
  reason: "",
  notes: "",
};


// =====================================================
// PAGE
// =====================================================

export default function Appointments() {
  const { user } = useAuth();

  const role = user?.role;

  const isAdministrator =
    role === "Administrator";

  const isReceptionist =
    role === "Receptionist";

  const isDoctor =
    role === "Doctor";

  const canManageAppointments =
    isAdministrator ||
    isReceptionist;


  // ===================================================
  // DATA
  // ===================================================

  const [appointments, setAppointments] =
    useState<Appointment[]>([]);

  const [patients, setPatients] =
    useState<Patient[]>([]);

  const [departments, setDepartments] =
    useState<Department[]>([]);

  const [doctors, setDoctors] =
    useState<User[]>([]);


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
    useState<AppointmentFilterStatus>("All");


  // ===================================================
  // MODAL STATE
  // ===================================================

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [form, setForm] =
    useState<AppointmentForm>(
      initialForm,
    );

  const [saving, setSaving] =
    useState(false);


  // ===================================================
  // ACTION STATE
  // ===================================================

  const [processingId, setProcessingId] =
    useState<number | null>(null);


  // ===================================================
  // LOOKUP HELPERS
  // ===================================================

  const patientMap = useMemo(() => {
    return new Map(
      patients.map(
        (patient) => [
          patient.id,
          patient,
        ],
      ),
    );
  }, [patients]);


  const departmentMap = useMemo(() => {
    return new Map(
      departments.map(
        (department) => [
          department.id,
          department,
        ],
      ),
    );
  }, [departments]);


  const doctorMap = useMemo(() => {
    return new Map(
      doctors.map(
        (doctor) => [
          doctor.id,
          doctor,
        ],
      ),
    );
  }, [doctors]);


  // ===================================================
  // LOAD DATA
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

        const [
          appointmentData,
          patientData,
          departmentData,
          staffData,
        ] = await Promise.all([
          isDoctor
            ? getMyAppointments()
            : getAppointments(),

          getPatients(),

          getDepartments(),

          getDoctors(),
        ]);


        setAppointments(
          Array.isArray(
            appointmentData,
          )
            ? appointmentData
            : [],
        );


        setPatients(
          Array.isArray(patientData)
            ? patientData
            : [],
        );


        setDepartments(
          Array.isArray(
            departmentData,
          )
            ? departmentData
                .filter(
                  (department) =>
                    isActiveRecord(
                      department.is_active,
                    ),
                )
            : [],
        );


        setDoctors(
          Array.isArray(staffData)
            ? staffData.filter(
                (staff) =>
                  staff.role === "Doctor" &&
                  staff.is_active === "true",
              )
            : [],
        );

      } catch (err) {
        console.error(
          "Appointment page loading error:",
          err,
        );

        setError(
          "Unable to load appointment records.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isDoctor],
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
  // FILTERED APPOINTMENTS
  // ===================================================

  const filteredAppointments =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return appointments.filter(
        (appointment) => {
          if (
            statusFilter !== "All" &&
            appointment.status !==
              statusFilter
          ) {
            return false;
          }

          if (!keyword) {
            return true;
          }

          const patient =
            patientMap.get(
              appointment.patient_id,
            );

          const department =
            departmentMap.get(
              appointment.department_id,
            );

          const doctor =
            appointment.doctor_id
              ? doctorMap.get(
                  appointment.doctor_id,
                )
              : null;


          const patientName =
            patient?.name
              ?.toLowerCase() ?? "";

          const patientMobile =
            patient?.mobile
              ?.toLowerCase() ?? "";

          const patientId =
            String(
              appointment.patient_id,
            );

          const departmentName =
            department?.name
              ?.toLowerCase() ?? "";

          const doctorName =
            doctor?.full_name
              ?.toLowerCase() ?? "";

          const reason =
            appointment.reason
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
            departmentName.includes(
              keyword,
            ) ||
            doctorName.includes(
              keyword,
            ) ||
            reason.includes(
              keyword,
            )
          );
        },
      );
    }, [
      appointments,
      search,
      statusFilter,
      patientMap,
      departmentMap,
      doctorMap,
    ]);


  // ===================================================
  // SUMMARY
  // ===================================================

  const summary = useMemo(() => {
    return {
      total: appointments.length,

      scheduled:
        appointments.filter(
          (item) =>
            item.status ===
            "Scheduled",
        ).length,

      checkedIn:
        appointments.filter(
          (item) =>
            item.status ===
            "Checked-in",
        ).length,

      inQueue:
        appointments.filter(
          (item) =>
            item.status ===
            "In Queue",
        ).length,

      completed:
        appointments.filter(
          (item) =>
            item.status ===
            "Completed",
        ).length,
    };
  }, [appointments]);


  // ===================================================
  // OPEN CREATE MODAL
  // ===================================================

  const openCreateModal = () => {
    if (!canManageAppointments) {
      toast.info(
        "You do not have permission to create appointments.",
      );

      return;
    }

    setForm(
      initialForm,
    );

    setIsModalOpen(true);
  };


  // ===================================================
  // CLOSE MODAL
  // ===================================================

  const closeModal = () => {
    if (saving) {
      return;
    }

    setIsModalOpen(false);

    setForm(
      initialForm,
    );
  };


  // ===================================================
  // FORM CHANGE
  // ===================================================

  const updateForm = (
    field: keyof AppointmentForm,
    value: string,
  ) => {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );
  };


  // ===================================================
  // CREATE APPOINTMENT
  // ===================================================

  const handleCreateAppointment =
    async (
      event: React.FormEvent,
    ) => {
      event.preventDefault();

      if (
        !form.patient_id ||
        !form.department_id ||
        !form.scheduled_at
      ) {
        toast.error(
          "Patient, department and appointment date/time are required.",
        );

        return;
      }


      const selectedDate =
        new Date(
          form.scheduled_at,
        );


      if (
        Number.isNaN(
          selectedDate.getTime(),
        )
      ) {
        toast.error(
          "Please select a valid appointment date and time.",
        );

        return;
      }


      if (
        selectedDate.getTime() <
        Date.now() &&
        form.appointment_type ===
          "Scheduled"
      ) {
        toast.error(
          "Scheduled appointments cannot be created in the past.",
        );

        return;
      }


      try {
        setSaving(true);

        await createAppointment({
          patient_id:
            Number(
              form.patient_id,
            ),

          department_id:
            Number(
              form.department_id,
            ),

          doctor_id:
            form.doctor_id
              ? Number(
                  form.doctor_id,
                )
              : null,

          scheduled_at:
            selectedDate.toISOString(),

          appointment_type:
            form.appointment_type,

          reason:
            form.reason.trim() ||
            null,

          notes:
            form.notes.trim() ||
            null,
        });


        toast.success(
          "Appointment created successfully.",
        );

        closeModal();

        await loadPage(
          true,
        );

      } catch (err) {
        console.error(
          "Appointment creation error:",
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
            "Failed to create appointment.",
        );
      } finally {
        setSaving(false);
      }
    };


  // ===================================================
  // LIFECYCLE ACTION
  // ===================================================

  const runAppointmentAction =
    async (
      appointment: Appointment,
      action:
        | "check-in"
        | "queue"
        | "complete"
        | "cancel"
        | "no-show",
    ) => {
      if (!canManageAppointments) {
        return;
      }

      if (
        processingId !== null
      ) {
        return;
      }


      if (
        action === "cancel"
      ) {
        const confirmed =
          window.confirm(
            "Are you sure you want to cancel this appointment?",
          );

        if (!confirmed) {
          return;
        }
      }


      try {
        setProcessingId(
          appointment.id,
        );


        switch (action) {
          case "check-in":
            await checkInAppointment(
              appointment.id,
            );
            break;

          case "queue":
            await queueAppointment(
              appointment.id,
            );
            break;

          case "complete":
            await completeAppointment(
              appointment.id,
            );
            break;

          case "cancel":
            await cancelAppointment(
              appointment.id,
            );
            break;

          case "no-show":
            await markAppointmentNoShow(
              appointment.id,
            );
            break;
        }


        const messages: Record<
          typeof action,
          string
        > = {
          "check-in":
            "Patient checked in successfully.",

          queue:
            "Appointment moved to queue.",

          complete:
            "Appointment completed successfully.",

          cancel:
            "Appointment cancelled successfully.",

          "no-show":
            "Appointment marked as no-show.",
        };


        toast.success(
          messages[action],
        );


        await loadPage(
          true,
        );

      } catch (err) {
        console.error(
          "Appointment action error:",
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
            "Unable to update appointment status.",
        );
      } finally {
        setProcessingId(
          null,
        );
      }
    };


  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-slate-50">
        <LoadingSpinner
          text="Loading appointments..."
        />
      </div>
    );
  }


  // ===================================================
  // ERROR
  // ===================================================

  if (error) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-500">
            <ShieldAlert
              size={23}
            />
          </div>


          <h2 className="mt-4 text-lg font-bold text-slate-900">
            Unable to load appointments
          </h2>


          <p className="mt-1.5 text-sm leading-5 text-slate-500">
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
              focus:outline-none
              focus:ring-4
              focus:ring-slate-200
            "
          >
            <RefreshCw
              size={15}
            />
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50">

      {/* =================================================
          HEADER
      ================================================= */}

      <header
        className="
          shrink-0
          border-b
          border-slate-200/80
          bg-white
        "
      >

        <div
          className="
            flex
            flex-col
            gap-3
            px-5
            py-4
            sm:px-6
            lg:flex-row
            lg:items-center
            lg:justify-between
          "
        >

          {/* TITLE */}

          <div className="min-w-0">

            <div className="mb-1 flex items-center gap-2">

              <CalendarDays
                size={14}
                className="text-blue-600"
              />

              <span
                className="
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-[0.16em]
                  text-blue-600
                "
              >
                Patient Operations
              </span>

            </div>


            <h1
              className="
                text-2xl
                font-bold
                tracking-tight
                text-slate-950
              "
            >
              Appointments
            </h1>


            <p
              className="
                mt-0.5
                text-xs
                text-slate-500
              "
            >
              {isDoctor
                ? "View and manage your assigned clinical appointments."
                : "Schedule, track and manage patient appointments."}
            </p>

          </div>


          {/* ACTIONS */}

          <div className="flex shrink-0 items-center gap-2">

            <button
              type="button"
              onClick={() =>
                void loadPage(true)
              }
              disabled={refreshing}
              className="
                inline-flex
                h-9
                items-center
                gap-2
                rounded-lg
                border
                border-slate-200
                bg-white
                px-3
                text-xs
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
                size={14}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              <span className="hidden sm:inline">
                {refreshing
                  ? "Refreshing..."
                  : "Refresh"}
              </span>

            </button>


            {canManageAppointments && (
              <button
                type="button"
                onClick={
                  openCreateModal
                }
                className="
                  inline-flex
                  h-9
                  items-center
                  gap-2
                  rounded-lg
                  bg-slate-950
                  px-3.5
                  text-xs
                  font-semibold
                  text-white
                  shadow-sm
                  transition
                  hover:bg-blue-600
                  focus:outline-none
                  focus:ring-4
                  focus:ring-blue-100
                "
              >
                <Plus
                  size={15}
                />
                New Appointment
              </button>
            )}

          </div>

        </div>

      </header>


      {/* =================================================
          MAIN
      ================================================= */}

      <main
        className="
          min-h-0
          flex-1
          overflow-y-auto
          overflow-x-hidden
        "
      >

        <div
          className="
            mx-auto
            w-full
            max-w-[1600px]
            space-y-4
            p-4
            sm:p-5
            lg:p-6
          "
        >

          {/* =================================================
              SUMMARY
          ================================================= */}

          <section
            className="
              grid
              grid-cols-2
              gap-3
              lg:grid-cols-5
            "
          >

            <SummaryCard
              label="Total"
              value={summary.total}
              icon={CalendarDays}
              tone="blue"
            />

            <SummaryCard
              label="Scheduled"
              value={summary.scheduled}
              icon={Clock3}
              tone="amber"
            />

            <SummaryCard
              label="Checked-in"
              value={summary.checkedIn}
              icon={CheckCircle2}
              tone="blue"
            />

            <SummaryCard
              label="In Queue"
              value={summary.inQueue}
              icon={UsersRound}
              tone="violet"
            />

            <SummaryCard
              label="Completed"
              value={summary.completed}
              icon={CheckCircle2}
              tone="emerald"
            />

          </section>


          {/* =================================================
              REGISTRY
          ================================================= */}

          <section
            className="
              overflow-hidden
              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-sm
            "
          >

            {/* TOOLBAR */}

            <div
              className="
                flex
                flex-col
                gap-3
                border-b
                border-slate-100
                px-4
                py-3
                sm:px-5
                lg:flex-row
                lg:items-center
                lg:justify-between
              "
            >

              <div className="min-w-0">

                <div className="flex items-center gap-2">

                  <h2
                    className="
                      text-sm
                      font-bold
                      text-slate-900
                    "
                  >
                    Appointment Registry
                  </h2>

                  <span
                    className="
                      rounded-full
                      bg-emerald-50
                      px-2
                      py-0.5
                      text-[9px]
                      font-bold
                      uppercase
                      tracking-wide
                      text-emerald-600
                    "
                  >
                    Live
                  </span>

                </div>


                <p
                  className="
                    mt-0.5
                    text-[11px]
                    text-slate-400
                  "
                >
                  {filteredAppointments.length}{" "}
                  {filteredAppointments.length === 1
                    ? "appointment"
                    : "appointments"}{" "}
                  displayed
                </p>

              </div>


              <div
                className="
                  flex
                  w-full
                  flex-col
                  gap-2
                  sm:flex-row
                  lg:w-auto
                "
              >

                {/* SEARCH */}

                <div className="relative">

                  <Search
                    size={15}
                    className="
                      pointer-events-none
                      absolute
                      left-3
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                    "
                  />

                  <input
                    type="text"
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value,
                      )
                    }
                    placeholder="Search patient, doctor..."
                    className="
                      h-9
                      w-full
                      rounded-lg
                      border
                      border-slate-200
                      bg-white
                      pl-9
                      pr-3
                      text-xs
                      text-slate-800
                      outline-none
                      transition
                      placeholder:text-slate-400
                      focus:border-blue-400
                      focus:ring-4
                      focus:ring-blue-50
                      sm:w-64
                    "
                  />

                </div>


                {/* STATUS FILTER */}

                <div className="relative">

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
                          .value as AppointmentFilterStatus,
                      )
                    }
                    className="
                      h-9
                      w-full
                      appearance-none
                      rounded-lg
                      border
                      border-slate-200
                      bg-white
                      pl-9
                      pr-8
                      text-xs
                      font-medium
                      text-slate-700
                      outline-none
                      focus:border-blue-400
                      focus:ring-4
                      focus:ring-blue-50
                      sm:w-40
                    "
                  >

                    {APPOINTMENT_STATUSES.map(
                      (status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status}
                        </option>
                      ),
                    )}

                  </select>

                </div>

              </div>

            </div>


            {/* TABLE */}

            {filteredAppointments.length === 0 ? (
              <EmptyState
                search={
                  Boolean(
                    search.trim(),
                  )
                }
                statusFiltered={
                  statusFilter !== "All"
                }
              />
            ) : (
              <AppointmentTable
                appointments={
                  filteredAppointments
                }
                patientMap={
                  patientMap
                }
                departmentMap={
                  departmentMap
                }
                doctorMap={
                  doctorMap
                }
                canManage={
                  canManageAppointments
                }
                processingId={
                  processingId
                }
                onAction={
                  runAppointmentAction
                }
              />
            )}

          </section>

        </div>

      </main>


      {/* =================================================
          CREATE MODAL
      ================================================= */}

      {isModalOpen && (
        <CreateAppointmentModal
          form={form}
          patients={patients}
          departments={departments}
          doctors={doctors}
          saving={saving}
          onChange={
            updateForm
          }
          onClose={
            closeModal
          }
          onSubmit={
            handleCreateAppointment
          }
        />
      )}

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
  tone,
}: {
  label: string;
  value: number;
  icon: typeof CalendarDays;
  tone:
    | "blue"
    | "amber"
    | "violet"
    | "emerald";
}) {
  const toneClasses = {
    blue: {
      icon: "bg-blue-50 text-blue-600",
      value: "text-blue-700",
    },

    amber: {
      icon: "bg-amber-50 text-amber-600",
      value: "text-amber-700",
    },

    violet: {
      icon: "bg-violet-50 text-violet-600",
      value: "text-violet-700",
    },

    emerald: {
      icon: "bg-emerald-50 text-emerald-600",
      value: "text-emerald-700",
    },
  }[tone];


  return (
    <div
      className="
        rounded-xl
        border
        border-slate-200
        bg-white
        p-4
        shadow-sm
      "
    >

      <div className="flex items-center justify-between">

        <div
          className={`
            flex
            h-9
            w-9
            items-center
            justify-center
            rounded-lg
            ${toneClasses.icon}
          `}
        >
          <Icon
            size={17}
          />
        </div>

        <span
          className={`
            text-2xl
            font-bold
            tracking-tight
            ${toneClasses.value}
          `}
        >
          {value}
        </span>

      </div>


      <p
        className="
          mt-3
          text-[10px]
          font-bold
          uppercase
          tracking-[0.12em]
          text-slate-400
        "
      >
        {label}
      </p>

    </div>
  );
}


// =====================================================
// APPOINTMENT TABLE
// =====================================================

function AppointmentTable({
  appointments,
  patientMap,
  departmentMap,
  doctorMap,
  canManage,
  processingId,
  onAction,
}: {
  appointments: Appointment[];
  patientMap: Map<
    number,
    Patient
  >;
  departmentMap: Map<
    number,
    Department
  >;
  doctorMap: Map<
    number,
    User
  >;
  canManage: boolean;
  processingId: number | null;
  onAction: (
    appointment: Appointment,
    action:
      | "check-in"
      | "queue"
      | "complete"
      | "cancel"
      | "no-show",
  ) => Promise<void>;
}) {
  return (
    <div className="overflow-x-auto">

      <table
        className="
          w-full
          min-w-[1050px]
          border-collapse
        "
      >

        <thead>

          <tr
            className="
              border-b
              border-slate-100
              bg-slate-50/80
            "
          >

            <th className="px-5 py-3 text-left text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Patient
            </th>

            <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Schedule
            </th>

            <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Department
            </th>

            <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Doctor
            </th>

            <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Status
            </th>

            <th className="px-4 py-3 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Actions
            </th>

          </tr>

        </thead>


        <tbody>

          {appointments.map(
            (appointment) => {
              const patient =
                patientMap.get(
                  appointment.patient_id,
                );

              const department =
                departmentMap.get(
                  appointment.department_id,
                );

              const doctor =
                appointment.doctor_id
                  ? doctorMap.get(
                      appointment.doctor_id,
                    )
                  : null;

              const isProcessing =
                processingId ===
                appointment.id;


              return (
                <tr
                  key={
                    appointment.id
                  }
                  className="
                    border-b
                    border-slate-100
                    transition
                    last:border-b-0
                    hover:bg-slate-50/70
                  "
                >

                  {/* PATIENT */}

                  <td className="px-5 py-4">

                    <div className="flex items-center gap-3">

                      <div
                        className="
                          flex
                          h-9
                          w-9
                          shrink-0
                          items-center
                          justify-center
                          rounded-lg
                          bg-blue-50
                          text-blue-600
                        "
                      >
                        <UserRound
                          size={16}
                        />
                      </div>


                      <div className="min-w-0">

                        <p
                          className="
                            truncate
                            text-sm
                            font-semibold
                            text-slate-800
                          "
                        >
                          {patient?.name ??
                            `Patient #${appointment.patient_id}`}
                        </p>


                        <p
                          className="
                            mt-0.5
                            text-[10px]
                            text-slate-400
                          "
                        >
                          ID #{appointment.patient_id}
                          {patient?.mobile
                            ? ` • ${patient.mobile}`
                            : ""}
                        </p>

                      </div>

                    </div>

                  </td>


                  {/* SCHEDULE */}

                  <td className="px-4 py-4">

                    <div>

                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">

                        <CalendarDays
                          size={13}
                          className="text-slate-400"
                        />

                        {formatDateTime(
                          appointment.scheduled_at,
                        )}

                      </div>


                      <span
                        className={`
                          mt-1.5
                          inline-flex
                          rounded-full
                          border
                          px-2
                          py-0.5
                          text-[9px]
                          font-bold
                          ${getTypeClasses(
                            appointment.appointment_type,
                          )}
                        `}
                      >
                        {appointment.appointment_type}
                      </span>

                    </div>

                  </td>


                  {/* DEPARTMENT */}

                  <td className="px-4 py-4">

                    <div className="flex items-center gap-2">

                      <MapPin
                        size={14}
                        className="shrink-0 text-slate-400"
                      />

                      <span
                        className="
                          text-xs
                          font-medium
                          text-slate-700
                        "
                      >
                        {department?.name ??
                          `Department #${appointment.department_id}`}
                      </span>

                    </div>

                  </td>


                  {/* DOCTOR */}

                  <td className="px-4 py-4">

                    {doctor ? (
                      <div className="flex items-center gap-2">

                        <div
                          className="
                            flex
                            h-7
                            w-7
                            items-center
                            justify-center
                            rounded-md
                            bg-violet-50
                            text-violet-600
                          "
                        >
                          <Stethoscope
                            size={13}
                          />
                        </div>

                        <span
                          className="
                            text-xs
                            font-semibold
                            text-slate-700
                          "
                        >
                          {doctor.full_name}
                        </span>

                      </div>
                    ) : (
                      <span
                        className="
                          text-xs
                          text-slate-400
                        "
                      >
                        Unassigned
                      </span>
                    )}

                  </td>


                  {/* STATUS */}

                  <td className="px-4 py-4">

                    <span
                      className={`
                        inline-flex
                        items-center
                        rounded-full
                        border
                        px-2.5
                        py-1
                        text-[9px]
                        font-bold
                        ${getStatusClasses(
                          appointment.status,
                        )}
                      `}
                    >
                      {appointment.status}
                    </span>

                  </td>


                  {/* ACTIONS */}

                  <td className="px-4 py-4">

                    <AppointmentActions
                      appointment={
                        appointment
                      }
                      canManage={
                        canManage
                      }
                      processing={
                        isProcessing
                      }
                      onAction={
                        onAction
                      }
                    />

                  </td>

                </tr>
              );
            },
          )}

        </tbody>

      </table>

    </div>
  );
}


// =====================================================
// APPOINTMENT ACTIONS
// =====================================================

function AppointmentActions({
  appointment,
  canManage,
  processing,
  onAction,
}: {
  appointment: Appointment;
  canManage: boolean;
  processing: boolean;
  onAction: (
    appointment: Appointment,
    action:
      | "check-in"
      | "queue"
      | "complete"
      | "cancel"
      | "no-show",
  ) => Promise<void>;
}) {
  if (!canManage) {
    return (
      <div className="text-right text-[10px] text-slate-400">
        View only
      </div>
    );
  }


  if (
    appointment.status ===
      "Completed" ||
    appointment.status ===
      "Cancelled" ||
    appointment.status ===
      "No-show"
  ) {
    return (
      <span
        className="
          block
          text-right
          text-[10px]
          font-medium
          text-slate-400
        "
      >
        No actions
      </span>
    );
  }


  return (
    <div className="flex flex-wrap justify-end gap-1.5">

      {appointment.status ===
        "Scheduled" && (
        <ActionButton
          label="Check-in"
          icon={
            CheckCircle2
          }
          onClick={() =>
            void onAction(
              appointment,
              "check-in",
            )
          }
          disabled={
            processing
          }
          tone="blue"
        />
      )}


      {appointment.status ===
        "Checked-in" && (
        <ActionButton
          label="Queue"
          icon={UsersRound}
          onClick={() =>
            void onAction(
              appointment,
              "queue",
            )
          }
          disabled={
            processing
          }
          tone="violet"
        />
      )}


      {appointment.status ===
        "In Queue" && (
        <ActionButton
          label="Complete"
          icon={
            CheckCircle2
          }
          onClick={() =>
            void onAction(
              appointment,
              "complete",
            )
          }
          disabled={
            processing
          }
          tone="emerald"
        />
      )}


      {(appointment.status ===
        "Scheduled" ||
        appointment.status ===
          "Checked-in" ||
        appointment.status ===
          "In Queue") && (
        <>
          <ActionButton
            label="No-show"
            icon={
              XCircle
            }
            onClick={() =>
              void onAction(
                appointment,
                "no-show",
              )
            }
            disabled={
              processing
            }
            tone="amber"
          />

          <ActionButton
            label="Cancel"
            icon={X}
            onClick={() =>
              void onAction(
                appointment,
                "cancel",
              )
            }
            disabled={
              processing
            }
            tone="red"
          />
        </>
      )}


      {processing && (
        <Loader2
          size={14}
          className="
            ml-1
            animate-spin
            self-center
            text-slate-400
          "
        />
      )}

    </div>
  );
}


// =====================================================
// ACTION BUTTON
// =====================================================

function ActionButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  tone,
}: {
  label: string;
  icon: typeof CheckCircle2;
  onClick: () => void;
  disabled: boolean;
  tone:
    | "blue"
    | "violet"
    | "emerald"
    | "amber"
    | "red";
}) {
  const classes = {
    blue:
      "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",

    violet:
      "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100",

    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",

    amber:
      "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",

    red:
      "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  }[tone];


  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex
        h-7
        items-center
        gap-1
        rounded-md
        border
        px-2
        text-[9px]
        font-bold
        transition
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${classes}
      `}
    >
      <Icon
        size={12}
      />
      <span className="hidden xl:inline">
        {label}
      </span>
    </button>
  );
}


// =====================================================
// EMPTY STATE
// =====================================================

function EmptyState({
  search,
  statusFiltered,
}: {
  search: boolean;
  statusFiltered: boolean;
}) {
  let title =
    "No appointments found";

  let description =
    "There are no appointment records to display.";

  if (search) {
    title =
      "No matching appointments";

    description =
      "Try a different patient, doctor or department search.";
  } else if (statusFiltered) {
    title =
      "No appointments for this status";

    description =
      "Try another appointment status filter.";
  }


  return (
    <div className="flex min-h-[320px] items-center justify-center px-6">

      <div className="max-w-sm text-center">

        <div
          className="
            mx-auto
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-xl
            bg-slate-100
            text-slate-400
          "
        >
          <CalendarDays
            size={22}
          />
        </div>


        <h3
          className="
            mt-4
            text-sm
            font-bold
            text-slate-800
          "
        >
          {title}
        </h3>


        <p
          className="
            mt-1
            text-xs
            leading-5
            text-slate-400
          "
        >
          {description}
        </p>

      </div>

    </div>
  );
}


// =====================================================
// CREATE APPOINTMENT MODAL
// =====================================================

function CreateAppointmentModal({
  form,
  patients,
  departments,
  doctors,
  saving,
  onChange,
  onClose,
  onSubmit,
}: {
  form: AppointmentForm;
  patients: Patient[];
  departments: Department[];
  doctors: User[];
  saving: boolean;
  onChange: (
    field: keyof AppointmentForm,
    value: string,
  ) => void;
  onClose: () => void;
  onSubmit: (
    event: React.FormEvent,
  ) => Promise<void>;
}) {
  return (
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
      onMouseDown={(
        event,
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >

      <div
        className="
          flex
          max-h-[92vh]
          w-full
          max-w-2xl
          flex-col
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-2xl
        "
      >

        {/* HEADER */}

        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            border-b
            border-slate-100
            px-5
            py-4
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
                bg-blue-50
                text-blue-600
              "
            >
              <CalendarDays
                size={19}
              />
            </div>


            <div>

              <h2
                className="
                  text-base
                  font-bold
                  text-slate-900
                "
              >
                New Appointment
              </h2>

              <p
                className="
                  mt-0.5
                  text-[11px]
                  text-slate-400
                "
              >
                Schedule a patient visit.
              </p>

            </div>

          </div>


          <button
            type="button"
            onClick={onClose}
            disabled={saving}
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
              disabled:opacity-50
            "
          >
            <X
              size={17}
            />
          </button>

        </div>


        {/* FORM */}

        <form
          onSubmit={onSubmit}
          className="
            min-h-0
            flex-1
            overflow-y-auto
            p-5
          "
        >

          <div className="grid gap-5 md:grid-cols-2">

            {/* PATIENT */}

            <FormField
              label="Patient"
              required
              icon={UserRound}
            >

              <select
                value={
                  form.patient_id
                }
                onChange={(
                  event,
                ) =>
                  onChange(
                    "patient_id",
                    event.target
                      .value,
                  )
                }
                required
                className="form-select"
              >

                <option value="">
                  Select patient
                </option>

                {patients.map(
                  (patient) => (
                    <option
                      key={
                        patient.id
                      }
                      value={
                        patient.id
                      }
                    >
                      {patient.name} — ID #
                      {patient.id}
                    </option>
                  ),
                )}

              </select>

            </FormField>


            {/* DEPARTMENT */}

            <FormField
              label="Department"
              required
              icon={MapPin}
            >

              <select
                value={
                  form.department_id
                }
                onChange={(
                  event,
                ) =>
                  onChange(
                    "department_id",
                    event.target
                      .value,
                  )
                }
                required
                className="form-select"
              >

                <option value="">
                  Select department
                </option>

                {departments.map(
                  (
                    department,
                  ) => (
                    <option
                      key={
                        department.id
                      }
                      value={
                        department.id
                      }
                    >
                      {
                        department.name
                      }
                    </option>
                  ),
                )}

              </select>

            </FormField>


            {/* DOCTOR */}

            <FormField
              label="Doctor"
              icon={
                Stethoscope
              }
              hint="Optional"
            >

              <select
                value={
                  form.doctor_id
                }
                onChange={(
                  event,
                ) =>
                  onChange(
                    "doctor_id",
                    event.target
                      .value,
                  )
                }
                className="form-select"
              >

                <option value="">
                  No doctor assigned
                </option>

                {doctors.map(
                  (doctor) => (
                    <option
                      key={
                        doctor.id
                      }
                      value={
                        doctor.id
                      }
                    >
                      {
                        doctor.full_name
                      }
                    </option>
                  ),
                )}

              </select>

            </FormField>


            {/* TYPE */}

            <FormField
              label="Appointment Type"
              required
              icon={
                CalendarDays
              }
            >

              <select
                value={
                  form.appointment_type
                }
                onChange={(
                  event,
                ) =>
                  onChange(
                    "appointment_type",
                    event.target
                      .value,
                  )
                }
                required
                className="form-select"
              >

                {APPOINTMENT_TYPES.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  ),
                )}

              </select>

            </FormField>


            {/* DATE TIME */}

            <div className="md:col-span-2">

              <FormField
                label="Date & Time"
                required
                icon={Clock3}
              >

                <input
                  type="datetime-local"
                  value={
                    form.scheduled_at
                  }
                  onChange={(
                    event,
                  ) =>
                    onChange(
                      "scheduled_at",
                      event.target
                        .value,
                    )
                  }
                  required
                  className="form-input"
                />

              </FormField>

            </div>


            {/* REASON */}

            <div className="md:col-span-2">

              <FormField
                label="Reason for Visit"
                icon={Stethoscope}
                hint="Optional"
              >

                <textarea
                  value={
                    form.reason
                  }
                  onChange={(
                    event,
                  ) =>
                    onChange(
                      "reason",
                      event.target
                        .value,
                    )
                  }
                  rows={3}
                  maxLength={1000}
                  placeholder="Enter the reason for the appointment..."
                  className="form-textarea"
                />

              </FormField>

            </div>


            {/* NOTES */}

            <div className="md:col-span-2">

              <FormField
                label="Notes"
                icon={Clock3}
                hint="Optional"
              >

                <textarea
                  value={
                    form.notes
                  }
                  onChange={(
                    event,
                  ) =>
                    onChange(
                      "notes",
                      event.target
                        .value,
                    )
                  }
                  rows={3}
                  maxLength={2000}
                  placeholder="Add any additional appointment notes..."
                  className="form-textarea"
                />

              </FormField>

            </div>

          </div>


          {/* FOOTER */}

          <div
            className="
              mt-6
              flex
              items-center
              justify-end
              gap-2
              border-t
              border-slate-100
              pt-4
            "
          >

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="
                rounded-lg
                border
                border-slate-200
                bg-white
                px-4
                py-2.5
                text-xs
                font-semibold
                text-slate-700
                transition
                hover:bg-slate-50
                disabled:opacity-50
              "
            >
              Cancel
            </button>


            <button
              type="submit"
              disabled={saving}
              className="
                inline-flex
                items-center
                gap-2
                rounded-lg
                bg-slate-950
                px-4
                py-2.5
                text-xs
                font-semibold
                text-white
                transition
                hover:bg-blue-600
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >

              {saving ? (
                <>
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                  Creating...
                </>
              ) : (
                <>
                  <Plus
                    size={14}
                  />
                  Create Appointment
                </>
              )}

            </button>

          </div>

        </form>

      </div>

    </div>
  );
}


// =====================================================
// FORM FIELD
// =====================================================

function FormField({
  label,
  required,
  icon: Icon,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  icon: typeof UserRound;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>

      <div
        className="
          mb-1.5
          flex
          items-center
          justify-between
        "
      >

        <label
          className="
            flex
            items-center
            gap-1.5
            text-[10px]
            font-bold
            uppercase
            tracking-[0.1em]
            text-slate-500
          "
        >

          <Icon
            size={12}
            className="text-slate-400"
          />

          {label}

          {required && (
            <span className="text-red-500">
              *
            </span>
          )}

        </label>


        {hint && (
          <span
            className="
              text-[9px]
              font-medium
              text-slate-400
            "
          >
            {hint}
          </span>
        )}

      </div>


      {children}

    </div>
  );
}