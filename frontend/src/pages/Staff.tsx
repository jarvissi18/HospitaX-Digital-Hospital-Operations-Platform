import {
  useEffect,
  useMemo,
  useState,
  type ElementType,
} from "react";

import {
  ArrowLeft,
  ChevronDown,
  HeartPulse,
  Plus,
  RefreshCw,
  Scissors,
  Search,
  ShieldCheck,
  Stethoscope,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { toast } from "react-toastify";

import UserForm from "../components/staff/StaffForm";
import type {
  UserFormData,
} from "../components/staff/StaffForm";

import UserTable from "../components/staff/StaffTable";
import UserModal from "../components/staff/StaffModal";

import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
} from "../services/staffApi";

import type { User } from "../types/staff";

// =====================================================
// TYPES
// =====================================================

type StaffRole =
  | "Doctor"
  | "Nurse"
  | "Receptionist"
  | "Housekeeper";

type StaffView =
  | "Overview"
  | "All"
  | StaffRole;

type StatusValue =
  | "true"
  | "false";

interface RoleConfig {
  title: string;
  plural: string;
  description: string;
  icon: ElementType;
  iconClass: string;
}

// =====================================================
// CONSTANTS
// =====================================================

const STAFF_ROLES: StaffRole[] = [
  "Doctor",
  "Nurse",
  "Receptionist",
  "Housekeeper",
];

const ROLE_CONFIG: Record<
  StaffRole,
  RoleConfig
> = {
  Doctor: {
    title: "Doctor",
    plural: "Doctors",
    description: "Clinical staff",
    icon: Stethoscope,
    iconClass:
      "bg-blue-50 text-blue-600",
  },

  Nurse: {
    title: "Nurse",
    plural: "Nurses",
    description: "Patient care",
    icon: HeartPulse,
    iconClass:
      "bg-emerald-50 text-emerald-600",
  },

  Receptionist: {
    title: "Receptionist",
    plural: "Receptionists",
    description: "Front desk",
    icon: UserRoundPlus,
    iconClass:
      "bg-violet-50 text-violet-600",
  },

  Housekeeper: {
    title: "Housekeeper",
    plural: "Housekeepers",
    description: "Room operations",
    icon: Scissors,
    iconClass:
      "bg-amber-50 text-amber-600",
  },
};

// =====================================================
// HELPERS
// =====================================================

function isOperationalStaff(
  user: User,
): boolean {
  return user.role !== "Administrator";
}

function isUserActive(
  user: User,
): boolean {
  return user.is_active === "true";
}

function getEmployeeId(
  user: User,
): string {
  if (
    "employee_id" in user &&
    typeof user.employee_id ===
      "string"
  ) {
    return user.employee_id;
  }

  return "";
}

function parseView(
  value: string | null,
): StaffView {
  if (!value) {
    return "Overview";
  }

  if (value === "All") {
    return "All";
  }

  if (
    STAFF_ROLES.includes(
      value as StaffRole,
    )
  ) {
    return value as StaffRole;
  }

  return "Overview";
}

function getRoleCount(
  users: User[],
  role: StaffRole,
): number {
  return users.filter(
    (user) =>
      user.role === role &&
      isOperationalStaff(user),
  ).length;
}

// =====================================================
// PAGE
// =====================================================

export default function Users() {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const view = parseView(
    searchParams.get("role"),
  );

  const isOverview =
    view === "Overview";

  const isRegistry =
    !isOverview;

  // IMPORTANT:
  // currentRole can NEVER be "Overview"
  // or "All".
  const currentRole: StaffRole | null =
    STAFF_ROLES.includes(
      view as StaffRole,
    )
      ? (view as StaffRole)
      : null;

  // ===================================================
  // DATA
  // ===================================================

  const [users, setUsers] =
    useState<User[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  // ===================================================
  // SEARCH
  // ===================================================

  const [search, setSearch] =
    useState("");

  // ===================================================
  // MODAL
  // ===================================================

  const [openModal, setOpenModal] =
    useState(false);

  const [editingUser, setEditingUser] =
    useState<User | null>(null);

  const [staffRole, setStaffRole] =
    useState<StaffRole>(
      currentRole ??
        "Receptionist",
    );

  const [showMenu, setShowMenu] =
    useState(false);

  // ===================================================
  // LOAD USERS
  // ===================================================

  const loadUsers = async (
    showRefreshState = false,
  ) => {
    try {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

    const data = await getUsers();

    setUsers(data);
    } catch (error: any) {
      console.error(
        "Failed to load users:",
        error,
      );

      const message =
        error?.response?.data?.detail;

      toast.error(
        Array.isArray(message)
          ? "Failed to load staff records."
          : message ||
              "Failed to load staff records.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  // ===================================================
  // KEEP ROLE IN SYNC
  // ===================================================

  useEffect(() => {
    if (currentRole) {
      setStaffRole(
        currentRole,
      );
    }

    setSearch("");
  }, [currentRole]);

  // ===================================================
  // OPERATIONAL STAFF
  // ===================================================

  const operationalUsers =
    useMemo(
      () =>
        users.filter(
          isOperationalStaff,
        ),
      [users],
    );

  // ===================================================
  // REGISTRY DATA
  // ===================================================

  const registryUsers =
    useMemo(() => {
      if (view === "Overview") {
        return [];
      }

      if (view === "All") {
        return operationalUsers;
      }

      return operationalUsers.filter(
        (user) =>
          user.role === view,
      );
    }, [
      operationalUsers,
      view,
    ]);

  // ===================================================
  // SEARCHED DATA
  // ===================================================

  const filteredUsers =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return registryUsers;
      }

      return registryUsers.filter(
        (user) => {
          const fullName =
            user.full_name
              ?.toLowerCase() ??
            "";

          const email =
            user.email
              ?.toLowerCase() ??
            "";

          const role =
            user.role
              ?.toLowerCase() ??
            "";

          const employeeId =
            getEmployeeId(
              user,
            ).toLowerCase();

          return (
            fullName.includes(
              keyword,
            ) ||
            email.includes(
              keyword,
            ) ||
            role.includes(
              keyword,
            ) ||
            employeeId.includes(
              keyword,
            )
          );
        },
      );
    }, [
      registryUsers,
      search,
    ]);

  // ===================================================
  // OVERVIEW STATS
  // ===================================================

  const totalStaff =
    operationalUsers.length;

  const activeStaff =
    operationalUsers.filter(
      isUserActive,
    ).length;

  const inactiveStaff =
    totalStaff -
    activeStaff;

  const roleCounts =
    useMemo(
      () => ({
        Doctor: getRoleCount(
          users,
          "Doctor",
        ),

        Nurse: getRoleCount(
          users,
          "Nurse",
        ),

        Receptionist:
          getRoleCount(
            users,
            "Receptionist",
          ),

        Housekeeper:
          getRoleCount(
            users,
            "Housekeeper",
          ),
      }),
      [users],
    );

  // ===================================================
  // REGISTRY STATS
  // ===================================================

  const visibleTotal =
    filteredUsers.length;

  const visibleActive =
    filteredUsers.filter(
      isUserActive,
    ).length;

  const visibleInactive =
    visibleTotal -
    visibleActive;

  // ===================================================
  // NAVIGATION
  // ===================================================

  const openOverview = () => {
    navigate("/users");
  };

  const openRegistry = (
    role: "All" | StaffRole,
  ) => {
    navigate(
      `/users?role=${role}`,
    );
  };

  // ===================================================
  // ADD STAFF
  // ===================================================

  const openAddStaff = (
    role: StaffRole,
  ) => {
    setStaffRole(role);
    setEditingUser(null);
    setShowMenu(false);
    setOpenModal(true);
  };

  // ===================================================
  // CLOSE MODAL
  // ===================================================

  const closeModal = () => {
    setOpenModal(false);
    setEditingUser(null);
    setShowMenu(false);
  };

  // ===================================================
  // CREATE STAFF
  // ===================================================

  const handleCreate = async (
    data: UserFormData,
  ) => {
    try {
      await createUser({
        // ---------------------------------------------
        // BASIC INFORMATION
        // ---------------------------------------------

        full_name:
          data.full_name.trim(),

        // Email is optional.
        // Empty email is not sent to the backend.
        email:
          data.email?.trim()
            ? data.email
                .trim()
                .toLowerCase()
            : undefined,

        // ---------------------------------------------
        // SECURITY
        // ---------------------------------------------

        // Password is optional.
        // If the administrator entered a password,
        // it is sent to the backend.
        //
        // If it is blank, it is omitted completely.
        password:
          data.password?.trim()
            ? data.password
            : undefined,

        // PIN is mandatory.
        // StaffForm validates the PIN before submit.
        pin:
          data.pin.trim(),

        // ---------------------------------------------
        // ROLE
        // ---------------------------------------------

        role:
          staffRole,

        // ---------------------------------------------
        // STAFF DETAILS
        // ---------------------------------------------

        // Employee ID is generated by backend.
        // We intentionally do NOT send a manually
        // entered/generated value from this page.
        mobile:
          data.mobile?.trim()
            ? data.mobile.trim()
            : undefined,

        shift:
          data.shift?.trim()
            ? data.shift.trim()
            : undefined,
      });

      toast.success(
        `${staffRole} created successfully.`,
      );

      closeModal();

      await loadUsers();
    } catch (error: any) {
      console.error(
        "Create staff error:",
        error,
      );

      const message =
        error?.response?.data?.detail;

      // FastAPI/Pydantic validation errors
      // normally arrive as an array.
      if (Array.isArray(message)) {
        const validationMessage =
          message
            .map((item) => {
              if (
                typeof item ===
                "string"
              ) {
                return item;
              }

              return (
                item?.msg ||
                "Invalid staff information."
              );
            })
            .join(" ");

        toast.error(
          validationMessage ||
            "Unable to create staff member.",
        );
      } else {
        toast.error(
          message ||
            `Unable to create ${staffRole.toLowerCase()}.`,
        );
      }

      throw error;
    }
  };

  // ===================================================
  // UPDATE STAFF
  // ===================================================

  const handleUpdate = async (
    data: UserFormData,
  ) => {
    if (!editingUser) {
      return;
    }

    try {
      await updateUser(
        editingUser.id,
        {
          full_name:
            data.full_name.trim(),

          email:
            data.email?.trim()
              ? data.email
                  .trim()
                  .toLowerCase()
              : undefined,
        },
      );

      toast.success(
        "Staff member updated successfully.",
      );

      closeModal();

      await loadUsers();
    } catch (error: any) {
      console.error(
        "Update staff error:",
        error,
      );

      const message =
        error?.response?.data?.detail;

      if (Array.isArray(message)) {
        const validationMessage =
          message
            .map((item) => {
              if (
                typeof item ===
                "string"
              ) {
                return item;
              }

              return (
                item?.msg ||
                "Invalid staff information."
              );
            })
            .join(" ");

        toast.error(
          validationMessage ||
            "Unable to update staff member.",
        );
      } else {
        toast.error(
          message ||
            "Unable to update staff member.",
        );
      }

      throw error;
    }
  };

  // ===================================================
  // DELETE STAFF
  // ===================================================

  const handleDelete = async (
    user: User,
  ) => {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete ${user.full_name}?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteUser(
        user.id,
      );

      toast.success(
        "Staff member deleted successfully.",
      );

      await loadUsers();
    } catch (error: any) {
      console.error(
        "Delete staff error:",
        error,
      );

      const message =
        error?.response?.data?.detail;

      toast.error(
        Array.isArray(message)
          ? "Unable to delete staff member."
          : message ||
              "Unable to delete staff member.",
      );
    }
  };

  // ===================================================
  // STATUS
  // ===================================================

  const handleToggleStatus =
    async (
      user: User,
    ) => {
      try {
        const nextStatus: StatusValue =
          isUserActive(user)
            ? "false"
            : "true";

        await updateUserStatus(
          user.id,
          {
            is_active:
              nextStatus,
          },
        );

        toast.success(
          nextStatus === "true"
            ? "Staff member activated."
            : "Staff member deactivated.",
        );

        await loadUsers();
      } catch (error: any) {
        console.error(
          "Status update error:",
          error,
        );

        const message =
          error?.response?.data?.detail;

        toast.error(
          Array.isArray(message)
            ? "Unable to update staff status."
            : message ||
                "Unable to update staff status.",
        );
      }
    };

  // ===================================================
  // REFRESH
  // ===================================================

  const handleRefresh =
    async () => {
      await loadUsers(true);

      toast.success(
        "Staff registry refreshed.",
      );
    };

  // ===================================================
  // EDIT
  // ===================================================

  const handleEdit = (
    user: User,
  ) => {
    if (
      user.role ===
      "Administrator"
    ) {
      toast.info(
        "Administrator account cannot be edited here.",
      );

      return;
    }

    if (
      !STAFF_ROLES.includes(
        user.role as StaffRole,
      )
    ) {
      toast.error(
        "Unsupported staff role.",
      );

      return;
    }

    setEditingUser(user);

    setStaffRole(
      user.role as StaffRole,
    );

    setShowMenu(false);
    setOpenModal(true);
  };

  // ===================================================
  // PAGE CONFIG
  // ===================================================

  const roleConfig =
    currentRole
      ? ROLE_CONFIG[
          currentRole
        ]
      : null;

  const pageTitle =
    isOverview
      ? "Staff Management"
      : view === "All"
        ? "Total Staff"
        : roleConfig?.plural ??
          "Staff";

  const pageDescription =
    isOverview
      ? "Manage operational hospital staff."
      : view === "All"
        ? "All operational staff accounts."
        : roleConfig?.description ??
          "Staff accounts.";

  const addLabel =
    currentRole
      ? `Add ${roleConfig?.title ?? "Staff"}`
      : "Add Staff";

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div
      className="
        page-enter
        flex
        h-full
        min-h-0
        flex-col
        gap-4
        overflow-hidden
      "
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <header
        className="
          flex
          shrink-0
          items-center
          justify-between
          gap-4
        "
      >
        <div className="flex min-w-0 items-center gap-3">
          {isRegistry && (
            <button
              type="button"
              onClick={
                openOverview
              }
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-slate-200
                bg-white
                text-slate-500
                shadow-sm
                transition
                hover:border-blue-200
                hover:bg-blue-50
                hover:text-blue-600
              "
              title="Back to Staff Management"
            >
              <ArrowLeft
                size={17}
              />
            </button>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {roleConfig ? (
                <div
                  className={`
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    ${roleConfig.iconClass}
                  `}
                >
                  <roleConfig.icon
                    size={15}
                  />
                </div>
              ) : (
                <div
                  className="
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    bg-blue-50
                    text-blue-600
                  "
                >
                  <UsersRound
                    size={15}
                  />
                </div>
              )}

              <span
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.16em]
                  text-slate-400
                "
              >
                Staff
              </span>

              {isRegistry && (
                <>
                  <span className="text-slate-300">
                    /
                  </span>

                  <span
                    className="
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-[0.14em]
                      text-slate-500
                    "
                  >
                    {view === "All"
                      ? "Total Staff"
                      : roleConfig?.title}
                  </span>
                </>
              )}
            </div>

            <h1
              className="
                mt-1
                text-2xl
                font-bold
                tracking-tight
                text-slate-950
              "
            >
              {pageTitle}
            </h1>

            <p
              className="
                mt-0.5
                text-xs
                text-slate-500
              "
            >
              {pageDescription}
            </p>
          </div>
        </div>

        {/* ACTIONS */}

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() =>
              void handleRefresh()
            }
            disabled={
              refreshing
            }
            className="
              flex
              h-9
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-slate-200
              bg-white
              px-3
              text-xs
              font-semibold
              text-slate-600
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
              Refresh
            </span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setShowMenu(
                  (value) =>
                    !value,
                )
              }
              className="
                flex
                h-9
                items-center
                gap-2
                rounded-xl
                bg-gradient-to-r
                from-blue-600
                to-indigo-600
                px-3.5
                text-xs
                font-semibold
                text-white
                shadow-lg
                shadow-blue-500/20
                transition
                hover:-translate-y-0.5
              "
            >
              <Plus
                size={15}
              />

              {addLabel}

              <ChevronDown
                size={13}
                className={
                  showMenu
                    ? "rotate-180 transition-transform"
                    : "transition-transform"
                }
              />
            </button>

            {showMenu && (
              <>
                <button
                  type="button"
                  aria-label="Close add staff menu"
                  className="
                    fixed
                    inset-0
                    z-30
                    cursor-default
                  "
                  onClick={() =>
                    setShowMenu(
                      false,
                    )
                  }
                />

                <div
                  className="
                    absolute
                    right-0
                    top-full
                    z-40
                    mt-2
                    w-64
                    overflow-hidden
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    p-2
                    shadow-[0_20px_60px_rgba(15,23,42,0.16)]
                  "
                >
                  <div className="px-3 pb-2 pt-1">
                    <p
                      className="
                        text-[10px]
                        font-bold
                        uppercase
                        tracking-[0.15em]
                        text-slate-400
                      "
                    >
                      Add Staff
                    </p>

                    <p
                      className="
                        mt-1
                        text-[11px]
                        text-slate-400
                      "
                    >
                      Select an account type.
                    </p>
                  </div>

                  {STAFF_ROLES.map(
                    (role) => {
                      const config =
                        ROLE_CONFIG[
                          role
                        ];

                      const Icon =
                        config.icon;

                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() =>
                            openAddStaff(
                              role,
                            )
                          }
                          className="
                            flex
                            w-full
                            items-center
                            gap-3
                            rounded-xl
                            px-3
                            py-2.5
                            text-left
                            transition
                            hover:bg-slate-50
                          "
                        >
                          <div
                            className={`
                              flex
                              h-9
                              w-9
                              shrink-0
                              items-center
                              justify-center
                              rounded-xl
                              ${config.iconClass}
                            `}
                          >
                            <Icon
                              size={16}
                            />
                          </div>

                          <div className="min-w-0">
                            <p
                              className="
                                text-xs
                                font-semibold
                                text-slate-800
                              "
                            >
                              {
                                config.title
                              }
                            </p>

                            <p
                              className="
                                mt-0.5
                                text-[10px]
                                text-slate-400
                              "
                            >
                              {
                                config.description
                              }
                            </p>
                          </div>
                        </button>
                      );
                    },
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* =================================================
          OVERVIEW
      ================================================= */}

      {isOverview && (
        <div
          className="
            flex
            min-h-0
            flex-1
            flex-col
            gap-4
            overflow-auto
          "
        >
          <div
            className="
              grid
              shrink-0
              grid-cols-2
              gap-3
              xl:grid-cols-4
            "
          >
            {STAFF_ROLES.map(
              (role) => {
                const config =
                  ROLE_CONFIG[
                    role
                  ];

                const Icon =
                  config.icon;

                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() =>
                      openRegistry(
                        role,
                      )
                    }
                    className="
                      group
                      rounded-2xl
                      border
                      border-slate-200
                      bg-white
                      p-4
                      text-left
                      shadow-sm
                      transition
                      hover:-translate-y-0.5
                      hover:border-slate-300
                      hover:shadow-md
                    "
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div
                        className={`
                          flex
                          h-10
                          w-10
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          ${config.iconClass}
                        `}
                      >
                        <Icon
                          size={18}
                        />
                      </div>

                      <span
                        className="
                          text-2xl
                          font-bold
                          tracking-tight
                          text-slate-900
                        "
                      >
                        {
                          roleCounts[
                            role
                          ]
                        }
                      </span>
                    </div>

                    <div className="mt-3">
                      <p
                        className="
                          text-sm
                          font-bold
                          text-slate-900
                        "
                      >
                        {
                          config.plural
                        }
                      </p>

                      <p
                        className="
                          mt-0.5
                          text-[11px]
                          text-slate-400
                        "
                      >
                        {
                          config.description
                        }
                      </p>
                    </div>
                  </button>
                );
              },
            )}
          </div>

          <div
            className="
              grid
              shrink-0
              grid-cols-1
              gap-3
              sm:grid-cols-3
            "
          >
            <OverviewStat
              icon={UsersRound}
              label="Total Staff"
              value={totalStaff}
              description="Operational accounts"
              iconClass="bg-blue-50 text-blue-600"
            />

            <OverviewStat
              icon={ShieldCheck}
              label="Active"
              value={activeStaff}
              description="Currently active"
              iconClass="bg-emerald-50 text-emerald-600"
            />

            <OverviewStat
              icon={UserRoundPlus}
              label="Inactive"
              value={inactiveStaff}
              description="Currently inactive"
              iconClass="bg-rose-50 text-rose-600"
            />
          </div>

          <div
            className="
              min-h-0
              flex-1
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-5
              shadow-sm
            "
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p
                  className="
                    text-sm
                    font-bold
                    text-slate-900
                  "
                >
                  Staff Registry
                </p>

                <p
                  className="
                    mt-0.5
                    text-xs
                    text-slate-400
                  "
                >
                  Open a category to manage staff accounts.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  openRegistry(
                    "All",
                  )
                }
                className="
                  rounded-xl
                  bg-slate-900
                  px-3.5
                  py-2
                  text-xs
                  font-semibold
                  text-white
                  transition
                  hover:bg-slate-800
                "
              >
                View All
              </button>
            </div>

            <div
              className="
                mt-5
                grid
                grid-cols-2
                gap-3
                md:grid-cols-4
              "
            >
              {STAFF_ROLES.map(
                (role) => {
                  const config =
                    ROLE_CONFIG[
                      role
                    ];

                  const Icon =
                    config.icon;

                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() =>
                        openRegistry(
                          role,
                        )
                      }
                      className="
                        flex
                        items-center
                        gap-3
                        rounded-xl
                        border
                        border-slate-100
                        bg-slate-50
                        px-3
                        py-3
                        text-left
                        transition
                        hover:border-slate-200
                        hover:bg-white
                        hover:shadow-sm
                      "
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
                          ${config.iconClass}
                        `}
                      >
                        <Icon
                          size={16}
                        />
                      </div>

                      <div className="min-w-0">
                        <p
                          className="
                            truncate
                            text-xs
                            font-semibold
                            text-slate-800
                          "
                        >
                          {
                            config.plural
                          }
                        </p>

                        <p
                          className="
                            mt-0.5
                            text-[10px]
                            text-slate-400
                          "
                        >
                          {
                            roleCounts[
                              role
                            ]
                          }{" "}
                          records
                        </p>
                      </div>
                    </button>
                  );
                },
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          REGISTRY
      ================================================= */}

      {isRegistry && (
        <div
          className="
            flex
            min-h-0
            flex-1
            flex-col
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
              shrink-0
              flex-col
              gap-3
              border-b
              border-slate-100
              p-4
              md:flex-row
              md:items-center
              md:justify-between
            "
          >
            <div>
              <p
                className="
                  text-sm
                  font-bold
                  text-slate-900
                "
              >
                {view === "All"
                  ? "Total Staff Registry"
                  : `${roleConfig?.title} Registry`}
              </p>

              <p
                className="
                  mt-0.5
                  text-[11px]
                  text-slate-400
                "
              >
                {visibleTotal} of{" "}
                {
                  registryUsers.length
                }{" "}
                records
              </p>
            </div>

            <div
              className="
                flex
                flex-col
                gap-2
                sm:flex-row
                sm:items-center
              "
            >
              <div
                className="
                  relative
                  w-full
                  sm:w-64
                "
              >
                <Search
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
                  value={search}
                  onChange={(
                    event,
                  ) =>
                    setSearch(
                      event.target
                        .value,
                    )
                  }
                  placeholder={
                    view === "All"
                      ? "Search staff..."
                      : `Search ${roleConfig?.title.toLowerCase()}...`
                  }
                  className="
                    h-9
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50
                    pl-9
                    pr-3
                    text-xs
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

              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >
                <span
                  className="
                    inline-flex
                    items-center
                    gap-1.5
                    rounded-xl
                    bg-emerald-50
                    px-2.5
                    py-2
                    text-[10px]
                    font-bold
                    text-emerald-700
                  "
                >
                  <ShieldCheck
                    size={13}
                  />
                  {visibleActive} active
                </span>

                <span
                  className="
                    rounded-xl
                    bg-slate-100
                    px-2.5
                    py-2
                    text-[10px]
                    font-bold
                    text-slate-500
                  "
                >
                  {visibleInactive} inactive
                </span>
              </div>
            </div>
          </div>

          <div
            className="
              flex
              shrink-0
              items-center
              justify-between
              border-b
              border-slate-100
              px-5
              py-3
            "
          >
            <div>
              <p
                className="
                  text-xs
                  font-semibold
                  text-slate-800
                "
              >
                {view === "All"
                  ? "Operational Staff"
                  : roleConfig?.plural}
              </p>

              <p
                className="
                  mt-0.5
                  text-[10px]
                  text-slate-400
                "
              >
                {view === "All"
                  ? "Doctors, nurses, receptionists and housekeepers"
                  : roleConfig?.description}
              </p>
            </div>

            <span
              className="
                hidden
                rounded-lg
                bg-slate-50
                px-2.5
                py-1.5
                text-[10px]
                font-semibold
                text-slate-500
                sm:inline-flex
              "
            >
              {visibleTotal} records
            </span>
          </div>

          <UserTable
            users={filteredUsers}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleStatus={
              handleToggleStatus
            }
          />
        </div>
      )}

      {/* =================================================
          STAFF MODAL
      ================================================= */}

      <UserModal
        open={openModal}
        title={
          editingUser
            ? `Edit ${editingUser.role}`
            : `Add ${staffRole}`
        }
        onClose={closeModal}
      >
        <UserForm
          role={staffRole}
          isEdit={
            !!editingUser
          }
          initialData={
            editingUser
              ? {
                  full_name:
                    editingUser.full_name,

                  email:
                    editingUser.email ??
                    "",

                  // Never preload existing
                  // password.
                  password:
                    "",

                  // Never preload existing
                  // PIN.
                  pin:
                    "",

                  employee_id:
                    getEmployeeId(
                      editingUser,
                    ),

                  mobile:
                    "mobile" in
                    editingUser &&
                    typeof editingUser.mobile ===
                      "string"
                      ? editingUser.mobile
                      : "",

                  shift:
                    "shift" in
                    editingUser &&
                    typeof editingUser.shift ===
                      "string"
                      ? editingUser.shift
                      : "Morning",
                }
              : undefined
          }
          onSubmit={async (
            data,
          ) => {
            if (editingUser) {
              await handleUpdate(
                data,
              );
            } else {
              await handleCreate(
                data,
              );
            }
          }}
          onCancel={
            closeModal
          }
        />
      </UserModal>
    </div>
  );
}

// =====================================================
// OVERVIEW STAT
// =====================================================

function OverviewStat({
  icon: Icon,
  label,
  value,
  description,
  iconClass,
}: {
  icon: ElementType;
  label: string;
  value: number;
  description: string;
  iconClass: string;
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
      "
    >
      <div
        className="
          flex
          items-center
          justify-between
          gap-4
        "
      >
        <div>
          <p
            className="
              text-[10px]
              font-bold
              uppercase
              tracking-[0.14em]
              text-slate-400
            "
          >
            {label}
          </p>

          <p
            className="
              mt-1.5
              text-2xl
              font-bold
              tracking-tight
              text-slate-900
            "
          >
            {value}
          </p>

          <p
            className="
              mt-0.5
              text-[10px]
              text-slate-400
            "
          >
            {description}
          </p>
        </div>

        <div
          className={`
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            ${iconClass}
          `}
        >
          <Icon
            size={17}
          />
        </div>
      </div>
    </div>
  );
}