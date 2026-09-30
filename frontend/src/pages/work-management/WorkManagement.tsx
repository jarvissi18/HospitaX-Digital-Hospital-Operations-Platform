import {
  AlertCircle,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  UserRound,
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

import {
  cancelWorkTask,
  completeWorkTask,
  createWorkTask,
  getMyWorkTasks,
  getWorkTasks,
  startWorkTask,
  type CreateWorkTaskPayload,
  type WorkTask,
  type WorkTaskPriority,
  type WorkTaskStatus,
} from "../../services/workTaskApi";

import {
  getUsers,
  type User,
} from "../../services/staffApi";

// =====================================================
// CONSTANTS
// =====================================================

const OPERATIONAL_ROLES = [
  "Doctor",
  "Nurse",
  "Receptionist",
  "Housekeeper",
] as const;

const PRIORITIES: WorkTaskPriority[] = [
  "Low",
  "Medium",
  "High",
  "Urgent",
];

const STATUSES: Array<WorkTaskStatus | "All"> = [
  "All",
  "Pending",
  "In Progress",
  "Completed",
  "Cancelled",
  "Overdue",
];

// =====================================================
// FORM TYPE
// =====================================================

interface CreateTaskForm {
  title: string;
  description: string;
  assigned_to_id: string;
  priority: WorkTaskPriority;
  due_at: string;
  location: string;
  instructions: string;
}

// =====================================================
// INITIAL FORM
// =====================================================

const initialForm: CreateTaskForm = {
  title: "",
  description: "",
  assigned_to_id: "",
  priority: "Medium",
  due_at: "",
  location: "",
  instructions: "",
};

// =====================================================
// HELPERS
// =====================================================

function formatDateTime(value: string | null) {
  if (!value) {
    return "No due date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatCreatedDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusClass(status: WorkTaskStatus) {
  switch (status) {
    case "Completed":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

    case "In Progress":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";

    case "Cancelled":
      return "bg-slate-500/10 text-slate-400 border-slate-500/20";

    case "Overdue":
      return "bg-red-500/10 text-red-400 border-red-500/20";

    default:
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  }
}

function getPriorityClass(priority: WorkTaskPriority) {
  switch (priority) {
    case "Urgent":
      return "bg-red-500/10 text-red-400";

    case "High":
      return "bg-orange-500/10 text-orange-400";

    case "Medium":
      return "bg-blue-500/10 text-blue-400";

    default:
      return "bg-slate-500/10 text-slate-400";
  }
}

function getStatusIcon(status: WorkTaskStatus) {
  switch (status) {
    case "Completed":
      return CheckCircle2;

    case "In Progress":
      return Clock3;

    case "Cancelled":
      return XCircle;

    case "Overdue":
      return AlertCircle;

    default:
      return ClipboardList;
  }
}

function getErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function isUserActive(user: User) {
  return (
    user.is_active === "true" ||
    user.is_active === "True" ||
    user.is_active === "1"
  );
}

// =====================================================
// PAGE
// =====================================================

export default function WorkManagement() {
  const { user } = useAuth();

  const role = user?.role ?? "";

  const isAdministrator =
    role === "Administrator";

  const isOperationalStaff =
    OPERATIONAL_ROLES.includes(
      role as (typeof OPERATIONAL_ROLES)[number],
    );

  // ===================================================
  // TASK STATE
  // ===================================================

  const [tasks, setTasks] =
    useState<WorkTask[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  // ===================================================
  // FILTER STATE
  // ===================================================

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<WorkTaskStatus | "All">("All");

  const [priorityFilter, setPriorityFilter] =
    useState<WorkTaskPriority | "All">("All");

  // ===================================================
  // CREATE MODAL STATE
  // ===================================================

  const [createModalOpen, setCreateModalOpen] =
    useState(false);

  const [staff, setStaff] =
    useState<User[]>([]);

  const [staffLoading, setStaffLoading] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [form, setForm] =
    useState<CreateTaskForm>(initialForm);

  // ===================================================
  // LOAD TASKS
  // ===================================================

  const loadTasks = useCallback(
    async (showRefreshState = false) => {
      try {
        setError("");

        if (showRefreshState) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const data =
          isAdministrator
            ? await getWorkTasks()
            : await getMyWorkTasks();

        setTasks(data);
      } catch (err) {
        const message = getErrorMessage(
          err,
          "Unable to load work tasks.",
        );

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAdministrator],
  );

  useEffect(() => {
    if (
      isAdministrator ||
      isOperationalStaff
    ) {
      loadTasks();
    } else {
      setLoading(false);
    }
  }, [
    isAdministrator,
    isOperationalStaff,
    loadTasks,
  ]);

  // ===================================================
  // LOAD STAFF
  // ===================================================

  const loadStaff = useCallback(
    async () => {
      if (!isAdministrator) {
        return;
      }

      try {
        setStaffLoading(true);

        const users =
          await getUsers();

        const availableStaff =
          users.filter(
            (item) =>
              OPERATIONAL_ROLES.includes(
                item.role as (typeof OPERATIONAL_ROLES)[number],
              ) &&
              isUserActive(item),
          );

        setStaff(availableStaff);
      } catch (err) {
        toast.error(
          getErrorMessage(
            err,
            "Unable to load staff.",
          ),
        );
      } finally {
        setStaffLoading(false);
      }
    },
    [isAdministrator],
  );

  // ===================================================
  // OPEN CREATE MODAL
  // ===================================================

  const openCreateModal = async () => {
    setForm(initialForm);
    setCreateModalOpen(true);

    if (staff.length === 0) {
      await loadStaff();
    }
  };

  // ===================================================
  // CLOSE CREATE MODAL
  // ===================================================

  const closeCreateModal = () => {
    if (creating) {
      return;
    }

    setCreateModalOpen(false);
    setForm(initialForm);
  };

  // ===================================================
  // FORM UPDATE
  // ===================================================

  const updateForm = (
    field: keyof CreateTaskForm,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  // ===================================================
  // CREATE TASK
  // ===================================================

  const handleCreateTask = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const title =
      form.title.trim();

    const description =
      form.description.trim();

    const location =
      form.location.trim();

    const instructions =
      form.instructions.trim();

    if (!title) {
      toast.error(
        "Task title is required.",
      );
      return;
    }

    if (!form.assigned_to_id) {
      toast.error(
        "Please select a staff member.",
      );
      return;
    }

    const assignedToId =
      Number(form.assigned_to_id);

    if (
      !Number.isInteger(
        assignedToId,
      ) ||
      assignedToId <= 0
    ) {
      toast.error(
        "Please select a valid staff member.",
      );
      return;
    }

    try {
      setCreating(true);

      const payload: CreateWorkTaskPayload = {
        title,
        assigned_to_id:
          assignedToId,
        priority:
          form.priority,
      };

      if (description) {
        payload.description =
          description;
      }

      if (form.due_at) {
        payload.due_at =
          new Date(
            form.due_at,
          ).toISOString();
      }

      if (location) {
        payload.location =
          location;
      }

      if (instructions) {
        payload.instructions =
          instructions;
      }

      await createWorkTask(
        payload,
      );

      toast.success(
        "Work task created successfully.",
      );

      setCreateModalOpen(false);
      setForm(initialForm);

      await loadTasks(true);
    } catch (err) {
      toast.error(
        getErrorMessage(
          err,
          "Unable to create work task.",
        ),
      );
    } finally {
      setCreating(false);
    }
  };

  // ===================================================
  // START TASK
  // ===================================================

  const handleStart = async (
    taskId: number,
  ) => {
    try {
      await startWorkTask(
        taskId,
      );

      toast.success(
        "Task started successfully.",
      );

      await loadTasks(true);
    } catch (err) {
      toast.error(
        getErrorMessage(
          err,
          "Unable to start task.",
        ),
      );
    }
  };

  // ===================================================
  // COMPLETE TASK
  // ===================================================

  const handleComplete = async (
    taskId: number,
  ) => {
    try {
      await completeWorkTask(
        taskId,
      );

      toast.success(
        "Task completed successfully.",
      );

      await loadTasks(true);
    } catch (err) {
      toast.error(
        getErrorMessage(
          err,
          "Unable to complete task.",
        ),
      );
    }
  };

  // ===================================================
  // CANCEL TASK
  // ===================================================

  const handleCancel = async (
    taskId: number,
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to cancel this task?",
      );

    if (!confirmed) {
      return;
    }

    try {
      await cancelWorkTask(
        taskId,
      );

      toast.success(
        "Task cancelled successfully.",
      );

      await loadTasks(true);
    } catch (err) {
      toast.error(
        getErrorMessage(
          err,
          "Unable to cancel task.",
        ),
      );
    }
  };

  // ===================================================
  // FILTERED TASKS
  // ===================================================

  const filteredTasks =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return tasks.filter(
        (task) => {
          const matchesSearch =
            !query ||
            task.title
              .toLowerCase()
              .includes(query) ||
            task.description
              ?.toLowerCase()
              .includes(query) ||
            task.location
              ?.toLowerCase()
              .includes(query) ||
            task.instructions
              ?.toLowerCase()
              .includes(query);

          const matchesStatus =
            statusFilter ===
              "All" ||
            task.status ===
              statusFilter;

          const matchesPriority =
            priorityFilter ===
              "All" ||
            task.priority ===
              priorityFilter;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesPriority
          );
        },
      );
    }, [
      tasks,
      search,
      statusFilter,
      priorityFilter,
    ]);

  // ===================================================
  // SUMMARY
  // ===================================================

  const summary = useMemo(
    () => ({
      total: tasks.length,

      pending:
        tasks.filter(
          (task) =>
            task.status ===
            "Pending",
        ).length,

      inProgress:
        tasks.filter(
          (task) =>
            task.status ===
            "In Progress",
        ).length,

      completed:
        tasks.filter(
          (task) =>
            task.status ===
            "Completed",
        ).length,

      overdue:
        tasks.filter(
          (task) =>
            task.status ===
            "Overdue",
        ).length,
    }),
    [tasks],
  );

  // ===================================================
  // ACCESS FALLBACK
  // ===================================================

  if (
    !isAdministrator &&
    !isOperationalStaff
  ) {
    return (
      <div className="p-8">
        <div
          className="
            rounded-2xl
            border
            border-red-500/20
            bg-red-500/5
            p-8
            text-center
          "
        >
          <AlertCircle
            className="
              mx-auto
              mb-3
              text-red-400
            "
            size={32}
          />

          <h2
            className="
              text-lg
              font-bold
              text-white
            "
          >
            Access Restricted
          </h2>

          <p
            className="
              mt-2
              text-sm
              text-slate-400
            "
          >
            You do not have access to
            Work Management.
          </p>
        </div>
      </div>
    );
  }

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div
      className="
        h-full
        min-h-0
        overflow-y-auto
        overflow-x-hidden
        overscroll-contain
        bg-transparent
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
        <div className="mx-auto w-full max-w-[1600px]">

        {/* =================================================
            HEADER
        ================================================= */}

        <div
          className="
            relative
            mb-7
            flex
            flex-col
            gap-5
            overflow-hidden
            rounded-3xl
            border
            border-slate-200
            bg-white
            p-5
            shadow-sm
            sm:p-6
            xl:flex-row
            xl:items-center
            xl:justify-between
          "
        >
          <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-blue-50 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 right-24 h-40 w-40 rounded-full bg-indigo-50 blur-2xl" />

          <div className="relative">
            <div
              className="
                mb-2
                flex
                items-center
                gap-2
              "
            >
              <div
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  bg-blue-600
                  text-white
                  shadow-lg
                  shadow-blue-600/20
                "
              >
                <ClipboardList
                  size={20}
                />
              </div>

              <span
                className="
                  text-xs
                  font-bold
                  uppercase
                  tracking-[0.16em]
                  text-blue-600
                "
              >
                Hospital Operations
              </span>
            </div>

            <h1
              className="
                text-2xl
                font-bold
                tracking-tight
                text-slate-900
                sm:text-3xl
              "
            >
              Work Management
            </h1>

            <p
              className="
                mt-1
                max-w-2xl
                text-sm
                text-slate-500
              "
            >
              {isAdministrator
                ? "Create, assign and manage operational work across the hospital."
                : "View and manage the work tasks assigned to you."}
            </p>
          </div>

          <div
            className="
              relative
              flex
              flex-wrap
              items-center
              gap-3
            "
          >
            <button
              type="button"
              onClick={() =>
                loadTasks(true)
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
                px-4
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
                size={16}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>

            {isAdministrator && (
              <button
                type="button"
                onClick={
                  openCreateModal
                }
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  bg-blue-600
                  px-4
                  py-2.5
                  text-sm
                  font-semibold
                  text-white
                  shadow-lg
                  shadow-blue-600/20
                  transition
                  hover:bg-blue-700
                "
              >
                <Plus size={17} />

                Create Task
              </button>
            )}
          </div>
        </div>

        {/* =================================================
            SUMMARY CARDS
        ================================================= */}

        <div
          className="
            mb-7
            grid
            grid-cols-2
            gap-3
            sm:grid-cols-3
            xl:grid-cols-5
          "
        >
          <SummaryCard
            label="Total Tasks"
            value={summary.total}
            icon={ClipboardList}
          />

          <SummaryCard
            label="Pending"
            value={summary.pending}
            icon={Clock3}
          />

          <SummaryCard
            label="In Progress"
            value={
              summary.inProgress
            }
            icon={Clock3}
          />

          <SummaryCard
            label="Completed"
            value={
              summary.completed
            }
            icon={CheckCircle2}
          />

          <SummaryCard
            label="Overdue"
            value={
              summary.overdue
            }
            icon={AlertCircle}
          />
        </div>

        {/* =================================================
            FILTERS
        ================================================= */}

        <div
          className="
            sticky
            top-0
            z-20
            mb-6
            rounded-2xl
            border
            border-slate-200/90
            bg-white/95
            p-4
            shadow-[0_8px_30px_rgba(15,23,42,0.05)]
            backdrop-blur-xl
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
                size={17}
                className="
                  absolute
                  left-3
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
                placeholder="Search tasks..."
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
                  text-slate-800
                  outline-none
                  transition
                  focus:border-blue-500
                  focus:bg-white
                  focus:ring-4
                  focus:ring-blue-500/10
                "
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as
                    | WorkTaskStatus
                    | "All",
                )
              }
              className="
                h-11
                rounded-xl
                border
                border-slate-200
                bg-white
                px-3
                text-sm
                font-medium
                text-slate-700
                outline-none
                focus:border-blue-500
                focus:ring-4
                focus:ring-blue-500/10
              "
            >
              {STATUSES.map(
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

            <select
              value={priorityFilter}
              onChange={(event) =>
                setPriorityFilter(
                  event.target
                    .value as
                    | WorkTaskPriority
                    | "All",
                )
              }
              className="
                h-11
                rounded-xl
                border
                border-slate-200
                bg-white
                px-3
                text-sm
                font-medium
                text-slate-700
                outline-none
                focus:border-blue-500
                focus:ring-4
                focus:ring-blue-500/10
              "
            >
              <option value="All">
                All Priorities
              </option>

              {PRIORITIES.map(
                (priority) => (
                  <option
                    key={priority}
                    value={priority}
                  >
                    {priority}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div
            className="
              mb-6
              flex
              items-start
              gap-3
              rounded-2xl
              border
              border-red-200
              bg-red-50
              p-4
              text-red-700
            "
          >
            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="text-sm font-semibold">
                Unable to load tasks
              </p>

              <p className="mt-1 text-xs">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (
          <TaskSkeleton />
        ) : filteredTasks.length ===
          0 ? (
          <EmptyState
            hasFilters={
              Boolean(
                search ||
                  statusFilter !==
                    "All" ||
                  priorityFilter !==
                    "All",
              )
            }
            isAdministrator={
              isAdministrator
            }
            onCreate={
              openCreateModal
            }
          />
        ) : (
          <div
            className="
              grid
              gap-4
              lg:grid-cols-2
              2xl:grid-cols-3
            "
          >
            {filteredTasks.map(
              (task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isAdministrator={
                    isAdministrator
                  }
                  onStart={
                    handleStart
                  }
                  onComplete={
                    handleComplete
                  }
                  onCancel={
                    handleCancel
                  }
                />
              ),
            )}
          </div>
        )}
        </div>
      </div>

      {/* =================================================
          CREATE TASK MODAL
      ================================================= */}

      {createModalOpen && (
        <CreateTaskModal
          form={form}
          staff={staff}
          staffLoading={
            staffLoading
          }
          creating={creating}
          onClose={
            closeCreateModal
          }
          onChange={
            updateForm
          }
          onSubmit={
            handleCreateTask
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
}: {
  label: string;
  value: number;
  icon: typeof ClipboardList;
}) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-4
        shadow-[0_8px_30px_rgba(15,23,42,0.04)]
        transition
        hover:-translate-y-0.5
        hover:border-slate-300
        hover:shadow-[0_12px_35px_rgba(15,23,42,0.07)]
      "
    >
      <div
        className="
          mb-3
          flex
          items-center
          justify-between
        "
      >
        <span
          className="
            text-[11px]
            font-bold
            uppercase
            tracking-wider
            text-slate-400
          "
        >
          {label}
        </span>

        <div
          className="
            flex
            h-8
            w-8
            items-center
            justify-center
            rounded-lg
            bg-slate-100
            text-slate-500
          "
        >
          <Icon size={16} />
        </div>
      </div>

      <p
        className="
          text-2xl
          font-bold
          tracking-tight
          text-slate-900
          sm:text-[28px]
        "
      >
        {value}
      </p>
    </div>
  );
}

// =====================================================
// TASK CARD
// =====================================================

function TaskCard({
  task,
  isAdministrator,
  onStart,
  onComplete,
  onCancel,
}: {
  task: WorkTask;
  isAdministrator: boolean;
  onStart: (id: number) => void;
  onComplete: (id: number) => void;
  onCancel: (id: number) => void;
}) {
  const StatusIcon =
    getStatusIcon(task.status);

  const canStart =
    !isAdministrator &&
    (task.status ===
      "Pending" ||
      task.status ===
        "Overdue");

  const canComplete =
    !isAdministrator &&
    task.status ===
      "In Progress";

  const canCancel =
    isAdministrator &&
    task.status !==
      "Completed" &&
    task.status !==
      "Cancelled";

  return (
    <div
      className="
        flex
        h-full
        flex-col
        overflow-hidden
        rounded-2xl
        border
        border-slate-200
        bg-white
        shadow-[0_8px_30px_rgba(15,23,42,0.045)]
        transition
        hover:-translate-y-0.5
        hover:shadow-md
      "
    >
      <div
        className={`h-1 w-full ${
          task.priority === "Urgent"
            ? "bg-red-500"
            : task.priority === "High"
              ? "bg-orange-500"
              : task.priority === "Medium"
                ? "bg-blue-500"
                : "bg-slate-300"
        }`}
      />

      {/* TOP */}

      <div className="p-5">

        <div
          className="
            mb-4
            flex
            items-start
            justify-between
            gap-3
          "
        >
          <div
            className="
              flex
              min-w-0
              items-center
              gap-2
            "
          >
            <span
              className={`
                inline-flex
                shrink-0
                items-center
                gap-1.5
                rounded-full
                border
                px-2.5
                py-1
                text-[10px]
                font-bold
                ${getStatusClass(
                  task.status,
                )}
              `}
            >
              <StatusIcon size={12} />

              {task.status}
            </span>

            <span
              className={`
                rounded-full
                px-2.5
                py-1
                text-[10px]
                font-bold
                ${getPriorityClass(
                  task.priority,
                )}
              `}
            >
              {task.priority}
            </span>
          </div>

          <span
            className="
              shrink-0
              text-[10px]
              font-medium
              text-slate-400
            "
          >
            #{task.id}
          </span>
        </div>

        <h3
          className="
            text-base
            font-bold
            leading-6
            text-slate-900
          "
        >
          {task.title}
        </h3>

        {task.description && (
          <p
            className="
              mt-2
              line-clamp-3
              text-sm
              leading-5
              text-slate-500
            "
          >
            {task.description}
          </p>
        )}

        {/* DETAILS */}

        <div
          className="
            mt-5
            space-y-2.5
          "
        >
          <DetailRow
            icon={UserRound}
            label="Assigned Staff"
            value={`Staff ID #${task.assigned_to_id}`}
          />

          {task.due_at && (
            <DetailRow
              icon={CalendarClock}
              label="Due"
              value={formatDateTime(
                task.due_at,
              )}
            />
          )}

          {task.location && (
            <DetailRow
              icon={MapPin}
              label="Location"
              value={task.location}
            />
          )}

          <DetailRow
            icon={Clock3}
            label="Created"
            value={formatCreatedDate(
              task.created_at,
            )}
          />
        </div>

        {task.instructions && (
          <div
            className="
              mt-5
              rounded-xl
              bg-slate-50
              p-3
            "
          >
            <p
              className="
                mb-1
                text-[10px]
                font-bold
                uppercase
                tracking-wider
                text-slate-400
              "
            >
              Instructions
            </p>

            <p
              className="
                text-xs
                leading-5
                text-slate-600
              "
            >
              {task.instructions}
            </p>
          </div>
        )}
      </div>

      {/* ACTIONS */}

      {(canStart ||
        canComplete ||
        canCancel) && (
        <div
          className="
            mt-auto
            border-t
            border-slate-100
            bg-slate-50/70
            p-4
          "
        >
          {canStart && (
            <button
              type="button"
              onClick={() =>
                onStart(task.id)
              }
              className="
                flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-blue-600
                px-4
                py-2.5
                text-xs
                font-bold
                text-white
                transition
                hover:bg-blue-700
              "
            >
              <Clock3 size={15} />

              Start Task
            </button>
          )}

          {canComplete && (
            <button
              type="button"
              onClick={() =>
                onComplete(task.id)
              }
              className="
                flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-emerald-600
                px-4
                py-2.5
                text-xs
                font-bold
                text-white
                transition
                hover:bg-emerald-700
              "
            >
              <Check size={15} />

              Mark Completed
            </button>
          )}

          {canCancel && (
            <button
              type="button"
              onClick={() =>
                onCancel(task.id)
              }
              className="
                flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-red-200
                bg-white
                px-4
                py-2.5
                text-xs
                font-bold
                text-red-600
                transition
                hover:bg-red-50
              "
            >
              <X size={15} />

              Cancel Task
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// =====================================================
// DETAIL ROW
// =====================================================

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div
      className="
        flex
        items-center
        gap-2.5
      "
    >
      <Icon
        size={14}
        className="
          shrink-0
          text-slate-400
        "
      />

      <span
        className="
          w-[72px]
          shrink-0
          text-[10px]
          font-semibold
          uppercase
          tracking-wide
          text-slate-400
        "
      >
        {label}
      </span>

      <span
        className="
          min-w-0
          truncate
          text-xs
          font-medium
          text-slate-600
        "
      >
        {value}
      </span>
    </div>
  );
}

// =====================================================
// CREATE TASK MODAL
// =====================================================

function CreateTaskModal({
  form,
  staff,
  staffLoading,
  creating,
  onClose,
  onChange,
  onSubmit,
}: {
  form: CreateTaskForm;
  staff: User[];
  staffLoading: boolean;
  creating: boolean;
  onClose: () => void;
  onChange: (
    field: keyof CreateTaskForm,
    value: string,
  ) => void;
  onSubmit: (
    event: React.FormEvent<HTMLFormElement>,
  ) => void;
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
        bg-slate-950/55
        p-4
        backdrop-blur-sm
      "
      onMouseDown={(event) => {
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
            px-6
            py-5
          "
        >
          <div>
            <div
              className="
                flex
                items-center
                gap-2
              "
            >
              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-blue-50
                  text-blue-600
                "
              >
                <Plus size={18} />
              </div>

              <h2
                className="
                  text-lg
                  font-bold
                  text-slate-900
                "
              >
                Create Work Task
              </h2>
            </div>

            <p
              className="
                mt-1
                text-xs
                text-slate-500
              "
            >
              Assign an operational task
              to a staff member.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-lg
              text-slate-400
              transition
              hover:bg-slate-100
              hover:text-slate-700
              disabled:opacity-50
            "
            aria-label="Close"
          >
            <X size={19} />
          </button>
        </div>

        {/* FORM */}

        <form
          onSubmit={onSubmit}
          className="
            min-h-0
            overflow-y-auto
          "
        >
          <div
            className="
              space-y-5
              p-6
            "
          >

            {/* TITLE */}

            <FormField
              label="Task Title"
              required
            >
              <input
                type="text"
                value={form.title}
                onChange={(event) =>
                  onChange(
                    "title",
                    event.target.value,
                  )
                }
                placeholder="e.g. Prepare patient room"
                maxLength={200}
                required
                disabled={creating}
                className={inputClass}
              />
            </FormField>

            {/* ASSIGNEE + PRIORITY */}

            <div
              className="
                grid
                gap-5
                md:grid-cols-2
              "
            >
              <FormField
                label="Assign To"
                required
              >
                <select
                  value={
                    form.assigned_to_id
                  }
                  onChange={(event) =>
                    onChange(
                      "assigned_to_id",
                      event.target.value,
                    )
                  }
                  required
                  disabled={
                    creating ||
                    staffLoading
                  }
                  className={inputClass}
                >
                  <option value="">
                    {staffLoading
                      ? "Loading staff..."
                      : staff.length ===
                          0
                        ? "No available staff"
                        : "Select staff member"}
                  </option>

                  {staff.map(
                    (member) => (
                      <option
                        key={member.id}
                        value={
                          member.id
                        }
                      >
                        {member.full_name} —{" "}
                        {member.role}
                        {member.employee_id
                          ? ` (${member.employee_id})`
                          : ""}
                      </option>
                    ),
                  )}
                </select>
              </FormField>

              <FormField
                label="Priority"
                required
              >
                <select
                  value={
                    form.priority
                  }
                  onChange={(event) =>
                    onChange(
                      "priority",
                      event.target
                        .value,
                    )
                  }
                  disabled={creating}
                  className={inputClass}
                >
                  {PRIORITIES.map(
                    (priority) => (
                      <option
                        key={priority}
                        value={
                          priority
                        }
                      >
                        {priority}
                      </option>
                    ),
                  )}
                </select>
              </FormField>
            </div>

            {/* DUE DATE + LOCATION */}

            <div
              className="
                grid
                gap-5
                md:grid-cols-2
              "
            >
              <FormField
                label="Due Date & Time"
              >
                <input
                  type="datetime-local"
                  value={
                    form.due_at
                  }
                  onChange={(event) =>
                    onChange(
                      "due_at",
                      event.target.value,
                    )
                  }
                  disabled={creating}
                  className={inputClass}
                />
              </FormField>

              <FormField
                label="Location"
              >
                <div className="relative">
                  <MapPin
                    size={15}
                    className="
                      absolute
                      left-3
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                    "
                  />

                  <input
                    type="text"
                    value={
                      form.location
                    }
                    onChange={(event) =>
                      onChange(
                        "location",
                        event.target
                          .value,
                      )
                    }
                    placeholder="e.g. Ward 2 — Room 204"
                    maxLength={255}
                    disabled={
                      creating
                    }
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </FormField>
            </div>

            {/* DESCRIPTION */}

            <FormField
              label="Description"
            >
              <textarea
                value={
                  form.description
                }
                onChange={(event) =>
                  onChange(
                    "description",
                    event.target.value,
                  )
                }
                placeholder="Describe what needs to be done..."
                rows={3}
                maxLength={2000}
                disabled={creating}
                className={`${inputClass} min-h-[90px] resize-y py-3`}
              />
            </FormField>

            {/* INSTRUCTIONS */}

            <FormField
              label="Instructions"
            >
              <textarea
                value={
                  form.instructions
                }
                onChange={(event) =>
                  onChange(
                    "instructions",
                    event.target.value,
                  )
                }
                placeholder="Add any specific instructions for the assigned staff..."
                rows={3}
                maxLength={2000}
                disabled={creating}
                className={`${inputClass} min-h-[90px] resize-y py-3`}
              />
            </FormField>

          </div>

          {/* FOOTER */}

          <div
            className="
              flex
              shrink-0
              flex-col-reverse
              gap-3
              border-t
              border-slate-100
              bg-slate-50/70
              px-6
              py-4
              sm:flex-row
              sm:justify-end
            "
          >
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="
                rounded-xl
                border
                border-slate-200
                bg-white
                px-5
                py-2.5
                text-sm
                font-semibold
                text-slate-600
                transition
                hover:bg-slate-50
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                creating ||
                staffLoading ||
                staff.length === 0
              }
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-blue-600
                px-5
                py-2.5
                text-sm
                font-semibold
                text-white
                shadow-lg
                shadow-blue-600/20
                transition
                hover:bg-blue-700
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {creating ? (
                <>
                  <RefreshCw
                    size={15}
                    className="animate-spin"
                  />

                  Creating...
                </>
              ) : (
                <>
                  <Check size={16} />

                  Create Task
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
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span
        className="
          mb-2
          block
          text-xs
          font-bold
          text-slate-700
        "
      >
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}

// =====================================================
// INPUT CLASS
// =====================================================

const inputClass = `
  h-11
  w-full
  rounded-xl
  border
  border-slate-200
  bg-white
  px-3.5
  text-sm
  text-slate-800
  outline-none
  transition
  placeholder:text-slate-400
  focus:border-blue-500
  focus:ring-4
  focus:ring-blue-500/10
  disabled:cursor-not-allowed
  disabled:bg-slate-50
  disabled:text-slate-400
`;

// =====================================================
// EMPTY STATE
// =====================================================

function EmptyState({
  hasFilters,
  isAdministrator,
  onCreate,
}: {
  hasFilters: boolean;
  isAdministrator: boolean;
  onCreate: () => void;
}) {
  return (
    <div
      className="
        rounded-3xl
        border
        border-dashed
        border-slate-300
        bg-white
        px-6
        py-20
        text-center
        shadow-sm
      "
    >
      <div
        className="
          mx-auto
          mb-4
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
        <ClipboardList
          size={25}
        />
      </div>

      <h3
        className="
          text-base
          font-bold
          text-slate-800
        "
      >
        {hasFilters
          ? "No matching tasks"
          : "No work tasks yet"}
      </h3>

      <p
        className="
          mx-auto
          mt-2
          max-w-md
          text-sm
          leading-6
          text-slate-500
        "
      >
        {hasFilters
          ? "Try adjusting your search or filters to find the task you need."
          : isAdministrator
            ? "Create a work task and assign it to an operational staff member."
            : "You currently have no work tasks assigned to you."}
      </p>

      {!hasFilters &&
        isAdministrator && (
          <button
            type="button"
            onClick={onCreate}
            className="
              mt-5
              inline-flex
              items-center
              gap-2
              rounded-xl
              bg-blue-600
              px-4
              py-2.5
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-blue-700
            "
          >
            <Plus size={16} />

            Create Task
          </button>
        )}
    </div>
  );
}

// =====================================================
// LOADING SKELETON
// =====================================================

function TaskSkeleton() {
  return (
    <div
      className="
        grid
        gap-4
        lg:grid-cols-2
        2xl:grid-cols-3
      "
    >
      {Array.from({
        length: 6,
      }).map((_, index) => (
        <div
          key={index}
          className="
            h-[330px]
            animate-pulse
            rounded-2xl
            border
            border-slate-200
            bg-white
          "
        >
          <div className="p-5">
            <div
              className="
                mb-5
                h-6
                w-36
                rounded-full
                bg-slate-100
              "
            />

            <div
              className="
                h-5
                w-3/4
                rounded
                bg-slate-100
              "
            />

            <div
              className="
                mt-3
                h-3
                w-full
                rounded
                bg-slate-100
              "
            />

            <div
              className="
                mt-2
                h-3
                w-5/6
                rounded
                bg-slate-100
              "
            />

            <div className="mt-7 space-y-3">
              <div className="h-3 w-2/3 rounded bg-slate-100" />
              <div className="h-3 w-3/4 rounded bg-slate-100" />
              <div className="h-3 w-1/2 rounded bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}