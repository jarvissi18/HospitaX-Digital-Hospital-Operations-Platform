import {
  useEffect,
  useMemo,
  useState,
  type ElementType,
} from "react";

import {
  Activity,
  ArrowUpRight,
  BedDouble,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  DoorOpen,
  Hospital,
  ListTodo,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  UserRound,
  Users,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import {
  getDashboardStats,
  getPatients,
  type DashboardStats,
} from "../../services/patientApi";

import {
  checkInSelf,
  checkOutSelf,
  getMyAttendance,
  type AttendanceRecord,
} from "../../services/attendanceApi";

import { useAuth } from "../../context/AuthContext";

import {
  getMyWorkTasks,
  getWorkTasks,
  type WorkTask,
} from "../../services/workTaskApi";

import type { Patient } from "../../types/patient";


// =====================================================
// TYPES
// =====================================================

type Tone =
  | "blue"
  | "violet"
  | "emerald"
  | "amber";

type OperationalMetric = {
  label: string;
  value: string;
  helper: string;
  icon: ElementType;
  tone: Tone;
  path?: string;
};

type SnapshotItem = {
  label: string;
  helper: string;
  icon: ElementType;
  tone: Tone;
  path: string;
};


// =====================================================
// ATTENDANCE ROLES
// =====================================================

const ATTENDANCE_ROLES = new Set([
  "Doctor",
  "Nurse",
  "Receptionist",
  "Housekeeper",
]);


// =====================================================
// ROLE DASHBOARD CONFIGURATION
// =====================================================

const ROLE_DASHBOARDS = {
  Administrator: {
    title: "Administrator Dashboard",
    subtitle:
      "Hospital-wide operational overview for today.",
    eyebrow: "Hospital Administration",
  },

  Doctor: {
    title: "Doctor Dashboard",
    subtitle:
      "Your clinical workspace and patient activity for today.",
    eyebrow: "Clinical Operations",
  },

  Nurse: {
    title: "Nurse Dashboard",
    subtitle:
      "Your patient-care workspace and daily operational activity.",
    eyebrow: "Patient Care",
  },

  Receptionist: {
    title: "Reception Dashboard",
    subtitle:
      "Your front-desk workspace and today's patient activity.",
    eyebrow: "Front Desk Operations",
  },

  Housekeeper: {
    title: "Housekeeping Dashboard",
    subtitle:
      "Your housekeeping workspace and daily operational activity.",
    eyebrow: "Facility Operations",
  },
} as const;

type SupportedDashboardRole =
  keyof typeof ROLE_DASHBOARDS;


// =====================================================
// DASHBOARD
// =====================================================

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();


  // ===================================================
  // ROLE
  // ===================================================

  const role =
    user?.role || "Administrator";

  const currentDashboard =
    ROLE_DASHBOARDS[
      role as SupportedDashboardRole
    ] ||
    ROLE_DASHBOARDS.Administrator;


  // ===================================================
  // DASHBOARD STATE
  // ===================================================

  const [stats, setStats] =
    useState<DashboardStats | null>(null);

  const [patients, setPatients] =
    useState<Patient[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  // ===================================================
  // WORK MANAGEMENT STATE
  // ===================================================

  const [workTasks, setWorkTasks] =
    useState<WorkTask[]>([]);

  const [workTaskLoading, setWorkTaskLoading] =
    useState(true);

  const [workTaskError, setWorkTaskError] =
    useState("");


  // ===================================================
  // SELF ATTENDANCE STATE
  // ===================================================

  const [myAttendance, setMyAttendance] =
    useState<AttendanceRecord | null>(null);

  const [attendanceLoading, setAttendanceLoading] =
    useState(false);

  const [attendanceActionLoading, setAttendanceActionLoading] =
    useState(false);

  const [attendanceError, setAttendanceError] =
    useState("");


  const canUseAttendance =
    Boolean(
      user &&
      ATTENDANCE_ROLES.has(user.role),
    );


  // ===================================================
  // LOAD MY ATTENDANCE
  // ===================================================

  const loadMyAttendance = async () => {
    if (!canUseAttendance) {
      setMyAttendance(null);
      setAttendanceError("");
      return;
    }

    try {
      setAttendanceLoading(true);
      setAttendanceError("");

      const attendance =
        await getMyAttendance();

      setMyAttendance(attendance);
    } catch (err) {
      console.error(
        "My attendance loading error:",
        err,
      );

      const response = (
        err as {
          response?: {
            status?: number;
          };
        }
      ).response;

      /*
       * 404 is an expected state when the staff member
       * has not checked in yet today.
       */
      if (response?.status === 404) {
        setMyAttendance(null);
        setAttendanceError("");
      } else {
        setAttendanceError(
          "Unable to load your attendance status.",
        );
      }
    } finally {
      setAttendanceLoading(false);
    }
  };


  // ===================================================
  // LOAD WORK MANAGEMENT
  // ===================================================

  const loadWorkTasks = async () => {
    try {
      setWorkTaskLoading(true);
      setWorkTaskError("");

      const tasks =
        user?.role === "Administrator"
          ? await getWorkTasks()
          : await getMyWorkTasks();

      setWorkTasks(
        Array.isArray(tasks) ? tasks : [],
      );
    } catch (err) {
      console.error(
        "Work management loading error:",
        err,
      );

      setWorkTaskError(
        "Unable to load work management data.",
      );
    } finally {
      setWorkTaskLoading(false);
    }
  };


  // ===================================================
  // LOAD DASHBOARD
  // ===================================================

  const loadDashboard = async (
    isRefresh = false,
  ) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [
        dashboardStats,
        patientData,
      ] = await Promise.all([
        getDashboardStats(),
        getPatients(),
      ]);

      setStats(dashboardStats);

      setPatients(
        Array.isArray(patientData)
          ? patientData.slice(0, 5)
          : [],
      );
    } catch (err) {
      console.error(
        "Dashboard loading error:",
        err,
      );

      setError(
        "Unable to load the latest hospital data.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  // ===================================================
  // INITIAL LOAD
  // ===================================================

  useEffect(() => {
    void loadDashboard();
  }, []);


  // ===================================================
  // LOAD WORK MANAGEMENT WHEN USER IS READY
  // ===================================================

  useEffect(() => {
    if (user) {
      void loadWorkTasks();
    }
  }, [user]);


  // ===================================================
  // LOAD ATTENDANCE WHEN USER IS READY
  // ===================================================

  useEffect(() => {
    if (user) {
      void loadMyAttendance();
    }
  }, [user]);


  // ===================================================
  // REFRESH EVERYTHING
  // ===================================================

  const handleRefresh = async () => {
    await Promise.all([
      loadDashboard(true),
      loadWorkTasks(),
      loadMyAttendance(),
    ]);
  };


  // ===================================================
  // SELF CHECK-IN
  // ===================================================

  const handleCheckIn = async () => {
    try {
      setAttendanceActionLoading(true);
      setAttendanceError("");

      const attendance =
        await checkInSelf();

      setMyAttendance(attendance);
    } catch (err) {
      console.error(
        "Self check-in error:",
        err,
      );

      const errorResponse = (
        err as {
          response?: {
            data?: {
              detail?: string;
            };
          };
        }
      ).response;

      setAttendanceError(
        errorResponse?.data?.detail ||
          "Unable to check in. Please try again.",
      );
    } finally {
      setAttendanceActionLoading(false);
    }
  };


  // ===================================================
  // SELF CHECK-OUT
  // ===================================================

  const handleCheckOut = async () => {
    try {
      setAttendanceActionLoading(true);
      setAttendanceError("");

      const attendance =
        await checkOutSelf();

      setMyAttendance(attendance);
    } catch (err) {
      console.error(
        "Self check-out error:",
        err,
      );

      const errorResponse = (
        err as {
          response?: {
            data?: {
              detail?: string;
            };
          };
        }
      ).response;

      setAttendanceError(
        errorResponse?.data?.detail ||
          "Unable to check out. Please try again.",
      );
    } finally {
      setAttendanceActionLoading(false);
    }
  };


  // ===================================================
  // DATE
  // ===================================================

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat(
      "en-IN",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    ).format(new Date());
  }, []);


  // ===================================================
  // ATTENDANCE TIME FORMAT
  // ===================================================

  const formatAttendanceTime = (
    value?: string | null,
  ) => {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return new Intl.DateTimeFormat(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      },
    ).format(date);
  };


  // ===================================================
  // ATTENDANCE DURATION FORMAT
  // ===================================================

  const formatDuration = (
    minutes?: number | null,
  ) => {
    if (
      minutes === null ||
      minutes === undefined
    ) {
      return "—";
    }

    const hours = Math.floor(
      minutes / 60,
    );

    const remainingMinutes =
      minutes % 60;

    if (hours === 0) {
      return `${remainingMinutes}m`;
    }

    return `${hours}h ${remainingMinutes}m`;
  };


  // ===================================================
  // ATTENDANCE STATUS
  // ===================================================

  const isCheckedIn =
    Boolean(
      myAttendance?.check_in &&
      !myAttendance?.check_out,
    );

  const isCheckedOut =
    Boolean(
      myAttendance?.check_in &&
      myAttendance?.check_out,
    );


  // ===================================================
  // WORK MANAGEMENT SUMMARY
  // ===================================================

  const workTaskSummary = useMemo(() => {
    const pending = workTasks.filter(
      (task) => task.status === "Pending",
    ).length;

    const inProgress = workTasks.filter(
      (task) => task.status === "In Progress",
    ).length;

    const completed = workTasks.filter(
      (task) => task.status === "Completed",
    ).length;

    const overdue = workTasks.filter(
      (task) => task.status === "Overdue",
    ).length;

    return {
      pending,
      inProgress,
      completed,
      overdue,
      total: workTasks.length,
    };
  }, [workTasks]);


  // ===================================================
  // METRICS
  // ===================================================

  const metrics: OperationalMetric[] = [
    {
      label: "Total Patients",
      value: loading
        ? "—"
        : String(
            stats?.totalPatients ?? 0,
          ),
      helper: "Registered in system",
      icon: Users,
      tone: "blue",
      path: "/patients",
    },

    {
      label: "Today's Patients",
      value: loading
        ? "—"
        : String(
            stats?.todayPatients ?? 0,
          ),
      helper: "New registrations today",
      icon: UserRound,
      tone: "violet",
      path: "/patients",
    },

    {
      label: "Active Cases",
      value: loading
        ? "—"
        : String(
            stats?.activeCases ?? 0,
          ),
      helper: "Current operational cases",
      icon: Activity,
      tone: "emerald",
    },

    {
      label: "System Status",
      value: loading
        ? "—"
        : "Online",
      helper: "Core services operational",
      icon: Hospital,
      tone: "amber",
    },
  ];


  // ===================================================
  // HOSPITAL SNAPSHOT
  // ===================================================

  const snapshotItems: SnapshotItem[] = [
    {
      label: "Departments",
      helper: "Hospital departments",
      icon: Building2,
      tone: "blue",
      path: "/departments",
    },

    {
      label: "Wards",
      helper: "Clinical units",
      icon: Hospital,
      tone: "violet",
      path: "/wards",
    },

    {
      label: "Rooms",
      helper: "Hospital rooms",
      icon: DoorOpen,
      tone: "amber",
      path: "/rooms",
    },

    {
      label: "Beds",
      helper: "Bed capacity",
      icon: BedDouble,
      tone: "emerald",
      path: "/beds",
    },
  ];


  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div
      className="
        flex
        h-full
        min-h-0
        flex-col
        overflow-hidden
        bg-slate-50
      "
    >

      {/* =================================================
          HEADER
      ================================================= */}

      <header
        className="
          shrink-0
          border-b
          border-slate-200/70
          bg-white
          px-5
          py-5
          sm:px-7
        "
      >

        <div
          className="
            flex
            flex-col
            gap-5
            xl:flex-row
            xl:items-center
            xl:justify-between
          "
        >

          {/* TITLE */}

          <div>

            <div className="mb-2 flex items-center gap-2">

              <span
                className="
                  h-2
                  w-2
                  rounded-full
                  bg-emerald-500
                  shadow-[0_0_0_4px_rgba(16,185,129,0.10)]
                "
              />

              <span
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.2em]
                  text-slate-500
                "
              >
                {currentDashboard.eyebrow}
              </span>

            </div>

            <h1
              className="
                text-3xl
                font-bold
                tracking-tight
                text-slate-950
                sm:text-4xl
              "
            >
              {currentDashboard.title}
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
              {currentDashboard.subtitle}
            </p>

          </div>


          {/* HEADER ACTIONS */}

          <div className="flex items-center gap-3">

            {/* REFRESH */}

            <button
              type="button"
              onClick={() =>
                void handleRefresh()
              }
              disabled={
                refreshing ||
                attendanceActionLoading
              }
              title="Refresh dashboard"
              aria-label="Refresh dashboard"
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-xl
                border
                border-slate-200
                bg-white
                text-slate-500
                shadow-sm
                transition-all
                hover:border-blue-200
                hover:bg-blue-50
                hover:text-blue-600
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {refreshing ? (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <RefreshCw size={17} />
              )}
            </button>


            {/* DATE */}

            <div
              className="
                flex
                items-center
                gap-3
                rounded-xl
                border
                border-slate-200
                bg-white
                px-4
                py-2.5
                shadow-sm
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
                  rounded-lg
                  bg-blue-50
                  text-blue-600
                "
              >
                <CalendarDays size={17} />
              </div>

              <div className="leading-tight">

                <p
                  className="
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-[0.14em]
                    text-slate-400
                  "
                >
                  Today
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    font-bold
                    text-slate-800
                  "
                >
                  {formattedDate}
                </p>

              </div>

            </div>

          </div>

        </div>

      </header>


      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main
        className="
          min-h-0
          flex-1
          overflow-y-auto
        "
      >

        <div
          className="
            mx-auto
            w-full
            max-w-[1600px]
            space-y-6
            p-5
            sm:p-7
          "
        >

          {/* =================================================
              ERROR
          ================================================= */}

          {error && (
            <div
              className="
                flex
                items-center
                gap-3
                rounded-xl
                border
                border-red-200
                bg-red-50
                px-4
                py-3
                text-sm
                text-red-700
              "
            >

              <CircleAlert
                size={17}
                className="shrink-0"
              />

              <span className="flex-1">
                {error}
              </span>

              <button
                type="button"
                onClick={() =>
                  void loadDashboard()
                }
                className="
                  rounded-lg
                  bg-white
                  px-3
                  py-1.5
                  text-xs
                  font-bold
                  text-red-600
                  shadow-sm
                  ring-1
                  ring-red-200
                  transition
                  hover:bg-red-100
                "
              >
                Retry
              </button>

            </div>
          )}


          {/* =================================================
              KPI CARDS
          ================================================= */}

          <section>

            <div
              className="
                grid
                grid-cols-1
                gap-4
                sm:grid-cols-2
                xl:grid-cols-4
              "
            >

              {metrics.map(
                (metric) => (
                  <MetricCard
                    key={metric.label}
                    metric={metric}
                    onClick={
                      metric.path
                        ? () =>
                            navigate(
                              metric.path!,
                            )
                        : undefined
                    }
                  />
                ),
              )}

            </div>

          </section>


          {/* =================================================
              SELF ATTENDANCE
              STAFF ONLY
          ================================================= */}

          {canUseAttendance && (
            <section>
              <MyAttendanceCard
                userName={
                  user?.full_name ||
                  "Staff Member"
                }
                attendance={
                  myAttendance
                }
                loading={
                  attendanceLoading
                }
                actionLoading={
                  attendanceActionLoading
                }
                error={
                  attendanceError
                }
                isCheckedIn={
                  isCheckedIn
                }
                isCheckedOut={
                  isCheckedOut
                }
                onCheckIn={
                  handleCheckIn
                }
                onCheckOut={
                  handleCheckOut
                }
                onRetry={
                  loadMyAttendance
                }
                formatTime={
                  formatAttendanceTime
                }
                formatDuration={
                  formatDuration
                }
              />
            </section>
          )}


          {/* =================================================
              WORK MANAGEMENT
          ================================================= */}

          <section>
            <WorkManagementSummary
              role={role}
              loading={workTaskLoading}
              error={workTaskError}
              summary={workTaskSummary}
              tasks={workTasks}
              onOpen={() =>
                navigate("/work-management")
              }
              onRetry={loadWorkTasks}
            />
          </section>


          {/* =================================================
              MAIN DASHBOARD GRID
          ================================================= */}

          <section
            className="
              grid
              grid-cols-1
              gap-5
              xl:grid-cols-[1.5fr_1fr]
            "
          >

            {/* =================================================
                RECENT PATIENTS
            ================================================= */}

            <div
              className="
                min-h-[390px]
                overflow-hidden
                rounded-2xl
                border
                border-slate-200
                bg-white
                shadow-sm
              "
            >

              {/* HEADER */}

              <div
                className="
                  flex
                  items-center
                  justify-between
                  border-b
                  border-slate-100
                  px-5
                  py-4
                "
              >

                <div>

                  <div className="flex items-center gap-2">

                    <div
                      className="
                        flex
                        h-8
                        w-8
                        items-center
                        justify-center
                        rounded-lg
                        bg-blue-50
                        text-blue-600
                      "
                    >
                      <Users size={16} />
                    </div>

                    <h2
                      className="
                        text-sm
                        font-bold
                        text-slate-900
                      "
                    >
                      Recent Patients
                    </h2>

                  </div>

                  <p
                    className="
                      mt-1
                      pl-10
                      text-xs
                      text-slate-400
                    "
                  >
                    Latest patient registrations
                  </p>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    navigate("/patients")
                  }
                  className="
                    group
                    inline-flex
                    items-center
                    gap-1.5
                    rounded-lg
                    px-2.5
                    py-1.5
                    text-xs
                    font-bold
                    text-blue-600
                    transition
                    hover:bg-blue-50
                  "
                >
                  View all

                  <ArrowUpRight
                    size={13}
                    className="
                      transition-transform
                      group-hover:-translate-y-0.5
                      group-hover:translate-x-0.5
                    "
                  />
                </button>

              </div>


              {/* PATIENT LIST */}

              <div className="p-4">

                {loading ? (
                  <DashboardListSkeleton />
                ) : patients.length === 0 ? (
                  <EmptyPatients />
                ) : (
                  <div className="space-y-1.5">

                    {patients.map(
                      (
                        patient,
                        index,
                      ) => (
                        <RecentPatientRow
                          key={patient.id}
                          patient={patient}
                          index={index}
                        />
                      ),
                    )}

                  </div>
                )}

              </div>

            </div>


            {/* =================================================
                HOSPITAL SNAPSHOT
            ================================================= */}

            <div
              className="
                overflow-hidden
                rounded-2xl
                border
                border-slate-200
                bg-white
                shadow-sm
              "
            >

              {/* HEADER */}

              <div
                className="
                  border-b
                  border-slate-100
                  px-5
                  py-4
                "
              >

                <div className="flex items-center gap-2">

                  <div
                    className="
                      flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      rounded-lg
                      bg-violet-50
                      text-violet-600
                    "
                  >
                    <Building2 size={16} />
                  </div>

                  <h2
                    className="
                      text-sm
                      font-bold
                      text-slate-900
                    "
                  >
                    Hospital Infrastructure
                  </h2>

                </div>

                <p
                  className="
                    mt-1
                    pl-10
                    text-xs
                    text-slate-400
                  "
                >
                  Manage your hospital structure
                </p>

              </div>


              {/* STRUCTURE ITEMS */}

              <div className="divide-y divide-slate-100">

                {snapshotItems.map(
                  (item) => (
                    <SnapshotRow
                      key={item.label}
                      {...item}
                      onClick={() =>
                        navigate(
                          item.path,
                        )
                      }
                    />
                  ),
                )}

              </div>

            </div>

          </section>

        </div>

      </main>

    </div>
  );
}


// =====================================================
// WORK MANAGEMENT SUMMARY
// =====================================================

function WorkManagementSummary({
  role,
  loading,
  error,
  summary,
  tasks,
  onOpen,
  onRetry,
}: {
  role: string;
  loading: boolean;
  error: string;
  summary: {
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
    total: number;
  };
  tasks: WorkTask[];
  onOpen: () => void;
  onRetry: () => Promise<void>;
}) {
  const recentTasks = tasks
    .filter(
      (task) =>
        task.status !== "Completed" &&
        task.status !== "Cancelled",
    )
    .sort((a, b) => {
      const aTime = a.due_at
        ? new Date(a.due_at).getTime()
        : Number.MAX_SAFE_INTEGER;

      const bTime = b.due_at
        ? new Date(b.due_at).getTime()
        : Number.MAX_SAFE_INTEGER;

      return aTime - bTime;
    })
    .slice(0, 3);

  const roleLabel =
    role === "Administrator"
      ? "Hospital-wide task workload"
      : "Tasks assigned to you";

  return (
    <div
      className="
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
          gap-4
          border-b
          border-slate-100
          px-5
          py-4
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >
        <div>
          <div className="flex items-center gap-2">
            <div
              className="
                flex
                h-8
                w-8
                items-center
                justify-center
                rounded-lg
                bg-blue-50
                text-blue-600
              "
            >
              <ListTodo size={16} />
            </div>

            <h2
              className="
                text-sm
                font-bold
                text-slate-900
              "
            >
              Work Management
            </h2>
          </div>

          <p
            className="
              mt-1
              pl-10
              text-xs
              text-slate-400
            "
          >
            {roleLabel}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="
            group
            inline-flex
            items-center
            gap-1.5
            self-start
            rounded-lg
            px-2.5
            py-1.5
            text-xs
            font-bold
            text-blue-600
            transition
            hover:bg-blue-50
            sm:self-auto
          "
        >
          Open Work Management
          <ArrowUpRight
            size={13}
            className="
              transition-transform
              group-hover:-translate-y-0.5
              group-hover:translate-x-0.5
            "
          />
        </button>
      </div>

      <div className="p-4">
        {loading ? (
          <div
            className="
              grid
              grid-cols-2
              gap-3
              lg:grid-cols-4
            "
          >
            {Array.from({ length: 4 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="
                    h-20
                    animate-pulse
                    rounded-xl
                    bg-slate-100
                  "
                />
              ),
            )}
          </div>
        ) : error ? (
          <div
            className="
              flex
              flex-col
              gap-3
              rounded-xl
              border
              border-red-200
              bg-red-50
              px-4
              py-3
              sm:flex-row
              sm:items-center
            "
          >
            <CircleAlert
              size={17}
              className="shrink-0 text-red-600"
            />

            <p
              className="
                flex-1
                text-xs
                leading-5
                text-red-700
              "
            >
              {error}
            </p>

            <button
              type="button"
              onClick={() => void onRetry()}
              className="
                self-start
                rounded-lg
                bg-white
                px-3
                py-1.5
                text-xs
                font-bold
                text-red-600
                shadow-sm
                ring-1
                ring-red-200
                transition
                hover:bg-red-100
                sm:self-auto
              "
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div
              className="
                grid
                grid-cols-2
                gap-3
                lg:grid-cols-4
              "
            >
              <WorkTaskStatusCard
                label="Pending"
                value={summary.pending}
                helper="Waiting to start"
                tone="amber"
              />

              <WorkTaskStatusCard
                label="In Progress"
                value={summary.inProgress}
                helper="Currently active"
                tone="blue"
              />

              <WorkTaskStatusCard
                label="Completed"
                value={summary.completed}
                helper="Finished tasks"
                tone="emerald"
              />

              <WorkTaskStatusCard
                label="Overdue"
                value={summary.overdue}
                helper="Needs attention"
                tone="rose"
              />
            </div>

            {recentTasks.length > 0 ? (
              <div className="mt-4 space-y-1.5">
                {recentTasks.map((task) => (
                  <WorkTaskPreviewRow
                    key={task.id}
                    task={task}
                  />
                ))}
              </div>
            ) : (
              <div
                className="
                  mt-4
                  rounded-xl
                  border
                  border-dashed
                  border-slate-200
                  bg-slate-50/70
                  px-4
                  py-4
                  text-center
                "
              >
                <p
                  className="
                    text-xs
                    font-semibold
                    text-slate-600
                  "
                >
                  No active work tasks
                </p>

                <p
                  className="
                    mt-1
                    text-[10px]
                    text-slate-400
                  "
                >
                  {summary.total === 0
                    ? role === "Administrator"
                      ? "Create a work task to begin tracking operations."
                      : "Your assigned tasks will appear here."
                    : "All current tasks are completed or cancelled."}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


// =====================================================
// WORK TASK STATUS CARD
// =====================================================

function WorkTaskStatusCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  tone: "amber" | "blue" | "emerald" | "rose";
}) {
  const toneClasses = {
    amber: {
      wrapper:
        "border-amber-100 bg-amber-50/60",
      value: "text-amber-700",
      icon:
        "bg-amber-100 text-amber-700",
    },
    blue: {
      wrapper:
        "border-blue-100 bg-blue-50/60",
      value: "text-blue-700",
      icon:
        "bg-blue-100 text-blue-700",
    },
    emerald: {
      wrapper:
        "border-emerald-100 bg-emerald-50/60",
      value: "text-emerald-700",
      icon:
        "bg-emerald-100 text-emerald-700",
    },
    rose: {
      wrapper:
        "border-rose-100 bg-rose-50/60",
      value: "text-rose-700",
      icon:
        "bg-rose-100 text-rose-700",
    },
  }[tone];

  const Icon =
    tone === "amber"
      ? Clock3
      : tone === "blue"
        ? Activity
        : tone === "emerald"
          ? CheckCircle2
          : CircleAlert;

  return (
    <div
      className={`
        flex
        min-w-0
        items-center
        gap-3
        rounded-xl
        border
        px-3
        py-3
        ${toneClasses.wrapper}
      `}
    >
      <div
        className={`
          flex
          h-9
          w-9
          shrink-0
          items-center
          justify-center
          rounded-lg
          ${toneClasses.icon}
        `}
      >
        <Icon size={16} />
      </div>

      <div className="min-w-0">
        <p
          className="
            text-[10px]
            font-bold
            text-slate-500
          "
        >
          {label}
        </p>

        <p
          className={`
            mt-0.5
            text-xl
            font-bold
            tracking-tight
            ${toneClasses.value}
          `}
        >
          {value}
        </p>

        <p
          className="
            truncate
            text-[9px]
            text-slate-400
          "
        >
          {helper}
        </p>
      </div>
    </div>
  );
}


// =====================================================
// WORK TASK PREVIEW ROW
// =====================================================

function WorkTaskPreviewRow({
  task,
}: {
  task: WorkTask;
}) {
  const dueLabel = task.due_at
    ? formatWorkTaskDueAt(task.due_at)
    : "No due time";

  const statusClass =
    task.status === "Overdue"
      ? "bg-rose-50 text-rose-700"
      : task.status === "In Progress"
        ? "bg-blue-50 text-blue-700"
        : "bg-amber-50 text-amber-700";

  return (
    <div
      className="
        flex
        min-w-0
        items-center
        gap-3
        rounded-xl
        border
        border-transparent
        px-3
        py-2.5
        transition
        hover:border-slate-200
        hover:bg-slate-50
      "
    >
      <div
        className="
          flex
          h-8
          w-8
          shrink-0
          items-center
          justify-center
          rounded-lg
          bg-slate-100
          text-slate-500
        "
      >
        <ListTodo size={15} />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className="
            truncate
            text-xs
            font-bold
            text-slate-800
          "
        >
          {task.title}
        </p>

        <p
          className="
            mt-0.5
            truncate
            text-[10px]
            text-slate-400
          "
        >
          {dueLabel}
          {task.location
            ? ` • ${task.location}`
            : ""}
        </p>
      </div>

      <span
        className={`
          shrink-0
          rounded-full
          px-2.5
          py-1
          text-[9px]
          font-bold
          ${statusClass}
        `}
      >
        {task.status}
      </span>
    </div>
  );
}


// =====================================================
// WORK TASK DUE FORMAT
// =====================================================

function formatWorkTaskDueAt(
  value: string,
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Due time unavailable";
  }

  return `Due ${new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    },
  ).format(date)}`;
}


// =====================================================
// MY ATTENDANCE CARD
// =====================================================

function MyAttendanceCard({
  userName,
  attendance,
  loading,
  actionLoading,
  error,
  isCheckedIn,
  isCheckedOut,
  onCheckIn,
  onCheckOut,
  onRetry,
  formatTime,
  formatDuration,
}: {
  userName: string;
  attendance: AttendanceRecord | null;
  loading: boolean;
  actionLoading: boolean;
  error: string;
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  onCheckIn: () => Promise<void>;
  onCheckOut: () => Promise<void>;
  onRetry: () => Promise<void>;
  formatTime: (
    value?: string | null,
  ) => string;
  formatDuration: (
    minutes?: number | null,
  ) => string;
}) {
  const status = isCheckedOut
    ? "Completed"
    : isCheckedIn
      ? "Checked In"
      : "Not Checked In";

  const statusDescription =
    isCheckedOut
      ? "Your attendance for today is complete."
      : isCheckedIn
        ? "Your shift is currently active."
        : "Start your shift by checking in.";

  return (
    <div
      className="
        relative
        overflow-hidden
        rounded-2xl
        border
        border-slate-200
        bg-white
        shadow-sm
      "
    >

      {/* DECORATIVE BACKGROUND */}

      <div
        className="
          pointer-events-none
          absolute
          -right-20
          -top-20
          h-52
          w-52
          rounded-full
          bg-blue-500/5
          blur-3xl
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          -bottom-24
          left-1/3
          h-44
          w-44
          rounded-full
          bg-emerald-500/5
          blur-3xl
        "
      />


      <div
        className="
          relative
          flex
          flex-col
          gap-6
          p-5
          sm:p-6
          lg:flex-row
          lg:items-center
          lg:justify-between
        "
      >

        {/* LEFT */}

        <div className="min-w-0">

          <div className="flex items-center gap-3">

            <div
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-blue-50
                text-blue-600
              "
            >
              <Clock3 size={20} />
            </div>

            <div>

              <div className="flex items-center gap-2">

                <h2
                  className="
                    text-sm
                    font-bold
                    text-slate-900
                  "
                >
                  My Attendance
                </h2>

                <span
                  className={`
                    inline-flex
                    items-center
                    gap-1.5
                    rounded-full
                    px-2.5
                    py-1
                    text-[9px]
                    font-bold
                    ${
                      isCheckedOut
                        ? "bg-emerald-50 text-emerald-700"
                        : isCheckedIn
                          ? "bg-blue-50 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                    }
                  `}
                >
                  <span
                    className={`
                      h-1.5
                      w-1.5
                      rounded-full
                      ${
                        isCheckedOut
                          ? "bg-emerald-500"
                          : isCheckedIn
                            ? "bg-blue-500"
                            : "bg-slate-400"
                      }
                    `}
                  />

                  {status}
                </span>

              </div>

              <p
                className="
                  mt-1
                  text-xs
                  text-slate-400
                "
              >
                {userName}
              </p>

            </div>

          </div>


          {/* DETAILS */}

          <div
            className="
              mt-5
              grid
              grid-cols-2
              gap-3
              sm:grid-cols-4
            "
          >

            <AttendanceDetail
              label="Check In"
              value={
                formatTime(
                  attendance?.check_in,
                )
              }
            />

            <AttendanceDetail
              label="Check Out"
              value={
                formatTime(
                  attendance?.check_out,
                )
              }
            />

            <AttendanceDetail
              label="Shift"
              value={
                attendance?.shift ||
                "General"
              }
            />

            <AttendanceDetail
              label="Duration"
              value={
                formatDuration(
                  attendance?.work_duration_minutes,
                )
              }
            />

          </div>

        </div>


        {/* RIGHT ACTION */}

        <div
          className="
            flex
            shrink-0
            flex-col
            gap-3
            lg:w-[240px]
          "
        >

          <div
            className="
              rounded-xl
              bg-slate-50
              px-4
              py-3
            "
          >

            <p
              className="
                text-xs
                font-semibold
                text-slate-700
              "
            >
              {status}
            </p>

            <p
              className="
                mt-1
                text-[10px]
                leading-4
                text-slate-400
              "
            >
              {statusDescription}
            </p>

          </div>


          {!isCheckedIn &&
            !isCheckedOut && (
              <button
                type="button"
                onClick={() =>
                  void onCheckIn()
                }
                disabled={
                  loading ||
                  actionLoading
                }
                className="
                  inline-flex
                  h-11
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-blue-600
                  px-5
                  text-xs
                  font-bold
                  text-white
                  shadow-sm
                  shadow-blue-600/20
                  transition-all
                  hover:bg-blue-700
                  hover:shadow-md
                  hover:shadow-blue-600/20
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {actionLoading ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <LogIn size={16} />
                )}

                {actionLoading
                  ? "Checking In..."
                  : "Check In"}
              </button>
            )}


          {isCheckedIn && (
            <button
              type="button"
              onClick={() =>
                void onCheckOut()
              }
              disabled={
                loading ||
                actionLoading
              }
              className="
                inline-flex
                h-11
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-slate-900
                px-5
                text-xs
                font-bold
                text-white
                shadow-sm
                transition-all
                hover:bg-slate-800
                hover:shadow-md
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {actionLoading ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <LogOut size={16} />
              )}

              {actionLoading
                ? "Checking Out..."
                : "Check Out"}
            </button>
          )}


          {isCheckedOut && (
            <div
              className="
                flex
                h-11
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-emerald-200
                bg-emerald-50
                text-xs
                font-bold
                text-emerald-700
              "
            >
              <CheckCircle2 size={16} />
              Attendance Complete
            </div>
          )}


          {error && (
            <div
              className="
                flex
                items-center
                gap-2
                rounded-lg
                border
                border-red-200
                bg-red-50
                px-3
                py-2
                text-[10px]
                leading-4
                text-red-700
              "
            >
              <CircleAlert
                size={13}
                className="shrink-0"
              />

              <span className="min-w-0 flex-1">
                {error}
              </span>

              <button
                type="button"
                onClick={() =>
                  void onRetry()
                }
                className="
                  shrink-0
                  font-bold
                  underline
                  underline-offset-2
                "
              >
                Retry
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}


// =====================================================
// ATTENDANCE DETAIL
// =====================================================

function AttendanceDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-slate-100
        bg-slate-50/70
        px-3
        py-2.5
      "
    >
      <p
        className="
          text-[9px]
          font-bold
          uppercase
          tracking-[0.08em]
          text-slate-400
        "
      >
        {label}
      </p>

      <p
        className="
          mt-1
          truncate
          text-xs
          font-bold
          text-slate-800
        "
      >
        {value}
      </p>
    </div>
  );
}


// =====================================================
// METRIC CARD
// =====================================================

function MetricCard({
  metric,
  onClick,
}: {
  metric: OperationalMetric;
  onClick?: () => void;
}) {
  const Icon = metric.icon;

  const tone =
    getToneClasses(metric.tone);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`
        group
        relative
        overflow-hidden
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-5
        text-left
        shadow-sm
        transition-all
        duration-200

        ${
          onClick
            ? `
              cursor-pointer
              hover:-translate-y-0.5
              hover:border-slate-300
              hover:shadow-md
            `
            : "cursor-default"
        }
      `}
    >

      {/* GLOW */}

      <div
        className={`
          pointer-events-none
          absolute
          -right-10
          -top-10
          h-28
          w-28
          rounded-full
          blur-3xl
          ${tone.glow}
        `}
      />

      <div
        className="
          relative
          flex
          items-start
          justify-between
        "
      >

        <div>

          <p
            className="
              text-xs
              font-semibold
              text-slate-500
            "
          >
            {metric.label}
          </p>

          <p
            className="
              mt-2
              text-3xl
              font-bold
              tracking-tight
              text-slate-950
            "
          >
            {metric.value}
          </p>

          <p
            className="
              mt-2
              text-[11px]
              text-slate-400
            "
          >
            {metric.helper}
          </p>

        </div>


        <div
          className={`
            flex
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-xl
            ${tone.icon}
            transition-transform
            duration-200
            group-hover:scale-105
          `}
        >
          <Icon size={20} />
        </div>

      </div>


      {onClick && (
        <div
          className="
            relative
            mt-4
            flex
            items-center
            gap-1
            text-[10px]
            font-bold
            text-slate-400
            transition
            group-hover:text-blue-600
          "
        >
          Open module

          <ArrowUpRight size={11} />
        </div>
      )}

    </button>
  );
}


// =====================================================
// RECENT PATIENT
// =====================================================

function RecentPatientRow({
  patient,
  index,
}: {
  patient: Patient;
  index: number;
}) {
  const initials =
    patient.name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (part) =>
          part
            .charAt(0)
            .toUpperCase(),
      )
      .join("") || "P";

  const avatarTones = [
    "bg-blue-600",
    "bg-violet-600",
    "bg-emerald-600",
    "bg-amber-600",
    "bg-rose-600",
  ];

  const avatarTone =
    avatarTones[
      index % avatarTones.length
    ];

  return (
    <div
      className="
        group
        flex
        items-center
        gap-3
        rounded-xl
        border
        border-transparent
        px-3
        py-3
        transition-all
        hover:border-slate-200
        hover:bg-slate-50
      "
    >

      {/* AVATAR */}

      <div
        className={`
          flex
          h-10
          w-10
          shrink-0
          items-center
          justify-center
          rounded-xl
          ${avatarTone}
          text-[11px]
          font-bold
          text-white
          shadow-sm
        `}
      >
        {initials}
      </div>


      {/* INFO */}

      <div className="min-w-0 flex-1">

        <p
          className="
            truncate
            text-xs
            font-bold
            text-slate-800
          "
        >
          {patient.name ||
            "Unknown Patient"}
        </p>

        <div
          className="
            mt-1
            flex
            items-center
            gap-2
            text-[10px]
            text-slate-400
          "
        >

          <span>
            Patient #{patient.id}
          </span>

          <span
            className="
              h-1
              w-1
              rounded-full
              bg-slate-300
            "
          />

          <span className="truncate">
            {patient.village ||
              "Location unavailable"}
          </span>

        </div>

      </div>


      {/* DISEASE */}

      <div className="hidden shrink-0 sm:block">

        <span
          className="
            inline-flex
            max-w-[130px]
            truncate
            rounded-full
            bg-rose-50
            px-2.5
            py-1
            text-[10px]
            font-bold
            text-rose-600
          "
        >
          {patient.disease ||
            "Not specified"}
        </span>

      </div>


      <Clock3
        size={14}
        className="
          shrink-0
          text-slate-300
          transition
          group-hover:text-slate-400
        "
      />

    </div>
  );
}


// =====================================================
// SNAPSHOT ROW
// =====================================================

function SnapshotRow({
  icon: Icon,
  label,
  helper,
  tone,
  onClick,
}: {
  icon: ElementType;
  label: string;
  helper: string;
  tone: Tone;
  onClick: () => void;
}) {
  const toneClasses =
    getToneClasses(tone);

  return (
    <button
      type="button"
      onClick={onClick}
      className="
        group
        flex
        w-full
        items-center
        gap-3
        px-5
        py-5
        text-left
        transition-all
        hover:bg-slate-50
      "
    >

      <div
        className={`
          flex
          h-10
          w-10
          shrink-0
          items-center
          justify-center
          rounded-xl
          ${toneClasses.icon}
        `}
      >
        <Icon size={17} />
      </div>


      <div className="min-w-0 flex-1">

        <p
          className="
            text-xs
            font-bold
            text-slate-800
          "
        >
          {label}
        </p>

        <p
          className="
            mt-1
            text-[10px]
            text-slate-400
          "
        >
          {helper}
        </p>

      </div>


      <ChevronRight
        size={16}
        className="
          shrink-0
          text-slate-300
          transition-all
          group-hover:translate-x-0.5
          group-hover:text-blue-500
        "
      />

    </button>
  );
}


// =====================================================
// LOADING SKELETON
// =====================================================

function DashboardListSkeleton() {
  return (
    <div className="space-y-2">

      {Array.from({
        length: 5,
      }).map((_, index) => (
        <div
          key={index}
          className="
            flex
            items-center
            gap-3
            rounded-xl
            px-3
            py-3
          "
        >

          <div
            className="
              h-10
              w-10
              animate-pulse
              rounded-xl
              bg-slate-100
            "
          />

          <div className="flex-1">

            <div
              className="
                h-3
                w-32
                animate-pulse
                rounded
                bg-slate-100
              "
            />

            <div
              className="
                mt-2
                h-2
                w-20
                animate-pulse
                rounded
                bg-slate-100
              "
            />

          </div>

          <div
            className="
              hidden
              h-5
              w-20
              animate-pulse
              rounded-full
              bg-slate-100
              sm:block
            "
          />

        </div>
      ))}

    </div>
  );
}


// =====================================================
// EMPTY PATIENT STATE
// =====================================================

function EmptyPatients() {
  return (
    <div
      className="
        flex
        min-h-[280px]
        flex-col
        items-center
        justify-center
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
        <UserRound size={24} />
      </div>

      <p
        className="
          mt-4
          text-sm
          font-bold
          text-slate-700
        "
      >
        No patient records yet
      </p>

      <p
        className="
          mt-1
          max-w-xs
          text-xs
          leading-5
          text-slate-400
        "
      >
        Newly registered patients
        will appear here automatically.
      </p>

    </div>
  );
}


// =====================================================
// COLOR SYSTEM
// =====================================================

function getToneClasses(
  tone: Tone,
) {
  const tones: Record<
    Tone,
    {
      icon: string;
      glow: string;
    }
  > = {
    blue: {
      icon:
        "bg-blue-50 text-blue-600",
      glow:
        "bg-blue-500/10",
    },

    violet: {
      icon:
        "bg-violet-50 text-violet-600",
      glow:
        "bg-violet-500/10",
    },

    emerald: {
      icon:
        "bg-emerald-50 text-emerald-600",
      glow:
        "bg-emerald-500/10",
    },

    amber: {
      icon:
        "bg-amber-50 text-amber-600",
      glow:
        "bg-amber-500/10",
    },
  };

  return tones[tone];
}