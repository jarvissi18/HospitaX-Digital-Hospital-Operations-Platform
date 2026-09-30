import {
  BarChart3,
  BedDouble,
  Bot,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock3,
  DoorOpen,
  FlaskConical,
  HeartPulse,
  Hospital,
  Layers3,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  SprayCan,
  Stethoscope,
  UserRound,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
  type ElementType,
} from "react";

import {
  NavLink,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import ProfileMenu from "./ProfileMenu";

// =====================================================
// TYPES
// =====================================================

interface MenuItem {
  title: string;
  icon: ElementType;
  path: string;
  badge?: string;
  badgeTone?: "blue" | "emerald" | "amber";
}

interface MenuSection {
  label: string;
  items: MenuItem[];
}

// =====================================================
// HOSPITAL STRUCTURE
// ADMINISTRATOR ONLY
// =====================================================

const structureItems: MenuItem[] = [
  {
    title: "Departments",
    icon: Building2,
    path: "/departments",
  },
  {
    title: "Floors",
    icon: Layers3,
    path: "/floors",
  },
  {
    title: "Wards",
    icon: Hospital,
    path: "/wards",
  },
  {
    title: "Rooms",
    icon: DoorOpen,
    path: "/rooms",
  },
  {
    title: "Beds",
    icon: BedDouble,
    path: "/beds",
  },
];

// =====================================================
// STAFF MANAGEMENT
// ADMINISTRATOR ONLY
// =====================================================

const staffItems: MenuItem[] = [
  {
    title: "Total Staff",
    icon: UsersRound,
    path: "/users?role=All",
  },
  {
    title: "Doctors",
    icon: Stethoscope,
    path: "/users?role=Doctor",
  },
  {
    title: "Nurses",
    icon: HeartPulse,
    path: "/users?role=Nurse",
  },
  {
    title: "Receptionists",
    icon: UserRoundPlus,
    path: "/users?role=Receptionist",
  },
  {
    title: "Housekeepers",
    icon: SprayCan,
    path: "/users?role=Housekeeper",
  },
];

// =====================================================
// SHARED OPERATIONAL ITEMS
// =====================================================

const attendanceItem: MenuItem = {
  title: "Attendance",
  icon: Clock3,
  path: "/attendance",
};

const workManagementItem: MenuItem = {
  title: "Work Management",
  icon: ClipboardList,
  path: "/work-management",
};

const appointmentsItem: MenuItem = {
  title: "Appointments",
  icon: CalendarDays,
  path: "/appointments",
};

// =====================================================
// AI OPERATIONS ASSISTANT
// ALL AUTHENTICATED STAFF
// =====================================================

const aiAssistantItem: MenuItem = {
  title: "AI Assistant",
  icon: Bot,
  path: "/ai-assistant",
  badge: "AI",
  badgeTone: "blue",
};

// =====================================================
// LAB
// DOCTOR / NURSE / ADMINISTRATOR
// =====================================================

const labItem: MenuItem = {
  title: "Laboratory",
  icon: FlaskConical,
  path: "/lab",
};

// =====================================================
// NURSE CLINICAL OPERATIONS
// NURSE ONLY
// =====================================================

const nursingClinicalItem: MenuItem = {
  title: "Clinical Operations",
  icon: Stethoscope,
  path: "/nursing/clinical-operations",
};

// =====================================================
// DOCTOR CLINICAL RECORDS
// DOCTOR ONLY
// =====================================================

const doctorClinicalItem: MenuItem = {
  title: "Clinical Records",
  icon: Stethoscope,
  path: "/doctor/clinical-records",
};

// =====================================================
// ROLE CONFIG
// =====================================================

const menuSections = (role: string): MenuSection[] => {
  // ===================================================
  // ADMINISTRATOR
  // ===================================================

  if (role === "Administrator") {
    return [
      {
        label: "Workspace",
        items: [
          {
            title: "Dashboard",
            icon: LayoutDashboard,
            path: "/dashboard",
          },
          aiAssistantItem,
          {
            title: "Patients",
            icon: UserRound,
            path: "/patients",
          },
          appointmentsItem,
          {
            title: "Analytics",
            icon: BarChart3,
            path: "/analytics",
          },
        ],
      },
      {
        label: "Hospital Operations",
        items: [
          workManagementItem,
          labItem,
        ],
      },
      {
        label: "Administration",
        items: [
          {
            title: "Settings",
            icon: Settings,
            path: "/settings",
          },
        ],
      },
    ];
  }

  // ===================================================
  // DOCTOR
  // ===================================================

  if (role === "Doctor") {
    return [
      {
        label: "Workspace",
        items: [
          {
            title: "Dashboard",
            icon: LayoutDashboard,
            path: "/dashboard",
          },
          aiAssistantItem,
          {
            title: "Patients",
            icon: UserRound,
            path: "/patients",
          },
          appointmentsItem,
        ],
      },
      {
        label: "Clinical Care",
        items: [
          doctorClinicalItem,
          labItem,
        ],
      },
      {
        label: "My Operations",
        items: [
          workManagementItem,
          attendanceItem,
        ],
      },
    ];
  }

  // ===================================================
  // NURSE
  // ===================================================

  if (role === "Nurse") {
    return [
      {
        label: "Workspace",
        items: [
          {
            title: "Dashboard",
            icon: LayoutDashboard,
            path: "/dashboard",
          },
          aiAssistantItem,
          {
            title: "Patients",
            icon: UserRound,
            path: "/patients",
          },
        ],
      },
      {
        label: "Clinical Care",
        items: [
          nursingClinicalItem,
          labItem,
        ],
      },
      {
        label: "My Operations",
        items: [
          workManagementItem,
          attendanceItem,
        ],
      },
    ];
  }

  // ===================================================
  // RECEPTIONIST
  // ===================================================

  if (role === "Receptionist") {
    return [
      {
        label: "Workspace",
        items: [
          {
            title: "Dashboard",
            icon: LayoutDashboard,
            path: "/dashboard",
          },
          aiAssistantItem,
          {
            title: "Patients",
            icon: UserRound,
            path: "/patients",
          },
          appointmentsItem,
        ],
      },
      {
        label: "My Operations",
        items: [
          workManagementItem,
          attendanceItem,
        ],
      },
    ];
  }

  // ===================================================
  // HOUSEKEEPER
  // ===================================================

  if (role === "Housekeeper") {
    return [
      {
        label: "Workspace",
        items: [
          {
            title: "Dashboard",
            icon: LayoutDashboard,
            path: "/dashboard",
          },
          aiAssistantItem,
        ],
      },
      {
        label: "My Operations",
        items: [
          workManagementItem,
          attendanceItem,
        ],
      },
    ];
  }

  // ===================================================
  // FALLBACK
  // ===================================================

  return [
    {
      label: "Workspace",
      items: [
        {
          title: "Dashboard",
          icon: LayoutDashboard,
          path: "/dashboard",
        },
        aiAssistantItem,
      ],
    },
  ];
};

// =====================================================
// ROLE PRESENTATION
// =====================================================

function getRoleMeta(role: string) {
  switch (role) {
    case "Administrator":
      return {
        label: "Administrator",
        icon: ShieldCheck,
        tone:
          "text-violet-300 bg-violet-400/10 border-violet-400/20",
        dot: "bg-violet-400",
      };

    case "Doctor":
      return {
        label: "Doctor",
        icon: Stethoscope,
        tone:
          "text-blue-300 bg-blue-400/10 border-blue-400/20",
        dot: "bg-blue-400",
      };

    case "Nurse":
      return {
        label: "Nurse",
        icon: HeartPulse,
        tone:
          "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
        dot: "bg-emerald-400",
      };

    case "Receptionist":
      return {
        label: "Receptionist",
        icon: UserRoundPlus,
        tone:
          "text-amber-300 bg-amber-400/10 border-amber-400/20",
        dot: "bg-amber-400",
      };

    case "Housekeeper":
      return {
        label: "Housekeeper",
        icon: SprayCan,
        tone:
          "text-cyan-300 bg-cyan-400/10 border-cyan-400/20",
        dot: "bg-cyan-400",
      };

    default:
      return {
        label: role || "User",
        icon: UserRound,
        tone:
          "text-slate-300 bg-white/5 border-white/10",
        dot: "bg-slate-400",
      };
  }
}

// =====================================================
// SIDEBAR
// =====================================================

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();

  const role = user?.role ?? "";

  const sections = useMemo(
    () => menuSections(role),
    [role],
  );

  const roleMeta = getRoleMeta(role);
  const RoleIcon = roleMeta.icon;

  // ===================================================
  // COLLAPSIBLE ADMIN MENUS
  // ===================================================

  const structureIsActive =
    role === "Administrator" &&
    (location.pathname === "/hospital-structure" ||
      structureItems.some((item) =>
        location.pathname.startsWith(
          item.path.split("?")[0],
        ),
      ));

  const staffIsActive =
    role === "Administrator" &&
    location.pathname === "/users";

  const [structureOpen, setStructureOpen] =
    useState(structureIsActive);

  const [staffOpen, setStaffOpen] =
    useState(staffIsActive);

  useEffect(() => {
    if (structureIsActive) {
      setStructureOpen(true);
    }
  }, [structureIsActive]);

  useEffect(() => {
    if (staffIsActive) {
      setStaffOpen(true);
    }
  }, [staffIsActive]);

  // ===================================================
  // CURRENT PAGE
  // ===================================================

  const currentPageLabel = useMemo(() => {
    const allItems = sections.flatMap(
      (section) => section.items,
    );

    const matched = allItems.find((item) => {
      const basePath = item.path.split("?")[0];

      return (
        location.pathname === basePath ||
        (basePath !== "/dashboard" &&
          location.pathname.startsWith(
            `${basePath}/`,
          ))
      );
    });

    if (matched) {
      return matched.title;
    }

    if (structureIsActive) {
      return "Hospital Structure";
    }

    if (staffIsActive) {
      return "Staff Management";
    }

    return "Workspace";
  }, [
    location.pathname,
    sections,
    structureIsActive,
    staffIsActive,
  ]);

  return (
    <aside
      className="
        flex
        h-screen
        w-[284px]
        shrink-0
        flex-col
        overflow-hidden
        border-r
        border-slate-800/80
        bg-[#07111f]
        text-white
      "
    >
      {/* =================================================
          BRAND
      ================================================= */}

      <div className="shrink-0 border-b border-white/[0.07] px-4 pb-4 pt-5">
        <div className="flex items-center gap-3 px-1">
          <div
            className="
              relative
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              overflow-hidden
              rounded-[14px]
              bg-gradient-to-br
              from-blue-500
              via-indigo-500
              to-violet-600
              shadow-lg
              shadow-indigo-950/40
            "
          >
            <div className="absolute inset-0 bg-white/10" />

            <Stethoscope
              size={23}
              strokeWidth={2.2}
              className="relative text-white"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-[17px] font-bold tracking-tight text-white">
                HospitaX
              </h1>

              <span className="rounded-md border border-blue-400/20 bg-blue-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-blue-400">
                HMS
              </span>
            </div>

            <p className="mt-0.5 truncate text-[9px] font-medium tracking-wide text-slate-500">
              Digital Hospital Operations
            </p>
          </div>
        </div>

        {/* ROLE CONTEXT */}

        <div
          className={`mt-4 flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${roleMeta.tone}`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
            <RoleIcon size={15} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[9px] font-bold uppercase tracking-[0.13em] opacity-70">
              Current workspace
            </p>

            <p className="mt-0.5 truncate text-[11px] font-semibold">
              {roleMeta.label}
            </p>
          </div>

          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${roleMeta.dot}`}
          />
        </div>
      </div>

      {/* =================================================
          NAVIGATION
      ================================================= */}

      <nav
        className="
          sidebar-scroll
          min-h-0
          flex-1
          overflow-y-auto
          overflow-x-hidden
          px-3
          py-5
        "
        aria-label="Main navigation"
      >
        <div className="mb-5 px-3">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-[0.19em] text-slate-600">
              Navigation
            </p>

            <span className="max-w-[120px] truncate text-[9px] font-medium text-slate-600">
              {currentPageLabel}
            </span>
          </div>
        </div>

        {sections.map((section, sectionIndex) => (
          <div
            key={section.label}
            className={
              sectionIndex > 0
                ? "mt-6"
                : ""
            }
          >
            <div className="mb-2 px-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">
                {section.label}
              </p>
            </div>

            <div className="space-y-1">
              {section.items.map((item) => (
                <SidebarNavItem
                  key={`${item.title}-${item.path}`}
                  item={item}
                />
              ))}

              {section.label ===
                "Hospital Operations" && (
                <>
                  <HospitalStructureMenu
                    open={structureOpen}
                    setOpen={setStructureOpen}
                    active={structureIsActive}
                  />

                  <StaffManagementMenu
                    open={staffOpen}
                    setOpen={setStaffOpen}
                    active={staffIsActive}
                  />
                </>
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* =================================================
          PROFILE
      ================================================= */}

      <div className="shrink-0 border-t border-white/[0.06] bg-[#060f1b] p-3">
        <ProfileMenu />
      </div>
    </aside>
  );
}

// =====================================================
// NORMAL NAV ITEM
// =====================================================

function SidebarNavItem({
  item,
}: {
  item: MenuItem;
}) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      end
      className={({ isActive }) =>
        `
          group
          relative
          flex
          min-h-[48px]
          items-center
          gap-3
          rounded-xl
          px-3
          py-2
          transition-all
          duration-200
          ${
            isActive
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-950/30"
              : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100"
          }
        `
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-white" />
          )}

          <div
            className={`
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-lg
              transition-all
              ${
                isActive
                  ? "bg-white/15 text-white"
                  : "bg-white/[0.035] text-slate-500 group-hover:bg-white/[0.07] group-hover:text-slate-200"
              }
            `}
          >
            <Icon
              size={17}
              strokeWidth={isActive ? 2.2 : 1.9}
            />
          </div>

          <span
            className={`
              min-w-0
              flex-1
              truncate
              text-[12px]
              font-semibold
              ${
                isActive
                  ? "text-white"
                  : "text-slate-300"
              }
            `}
          >
            {item.title}
          </span>

          {item.badge && (
            <span
              className={`
                rounded-md
                px-1.5
                py-0.5
                text-[7px]
                font-bold
                uppercase
                tracking-[0.08em]
                ${
                  item.badgeTone === "emerald"
                    ? "bg-emerald-400/10 text-emerald-400"
                    : item.badgeTone === "amber"
                      ? "bg-amber-400/10 text-amber-400"
                      : "bg-blue-400/10 text-blue-400"
                }
              `}
            >
              {item.badge}
            </span>
          )}

          <ChevronRight
            size={14}
            className={`
              shrink-0
              transition-all
              duration-200
              ${
                isActive
                  ? "text-white/75"
                  : "-translate-x-1 text-slate-700 opacity-0 group-hover:translate-x-0 group-hover:text-slate-400 group-hover:opacity-100"
              }
            `}
          />
        </>
      )}
    </NavLink>
  );
}

// =====================================================
// HOSPITAL STRUCTURE MENU
// =====================================================

function HospitalStructureMenu({
  open,
  setOpen,
  active,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  active: boolean;
}) {
  return (
    <CollapsibleAdminMenu
      title="Hospital Structure"
      icon={Building2}
      open={open}
      setOpen={setOpen}
      active={active}
      activeTone="blue"
      items={structureItems}
    />
  );
}

// =====================================================
// STAFF MANAGEMENT MENU
// =====================================================

function StaffManagementMenu({
  open,
  setOpen,
  active,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  active: boolean;
}) {
  return (
    <CollapsibleAdminMenu
      title="Staff Management"
      icon={UsersRound}
      open={open}
      setOpen={setOpen}
      active={active}
      activeTone="emerald"
      items={staffItems}
      queryAware
    />
  );
}

// =====================================================
// SHARED COLLAPSIBLE COMPONENT
// =====================================================

function CollapsibleAdminMenu({
  title,
  icon: Icon,
  open,
  setOpen,
  active,
  activeTone,
  items,
  queryAware = false,
}: {
  title: string;
  icon: ElementType;
  open: boolean;
  setOpen: (value: boolean) => void;
  active: boolean;
  activeTone: "blue" | "emerald";
  items: MenuItem[];
  queryAware?: boolean;
}) {
  const location = useLocation();

  const currentRole = new URLSearchParams(
    location.search,
  ).get("role");

  const accent =
    activeTone === "emerald"
      ? {
          active:
            "bg-emerald-500/10 text-emerald-400",
          icon:
            "bg-emerald-500/15 text-emerald-400",
          line: "bg-emerald-400",
          dot: "bg-emerald-400",
        }
      : {
          active:
            "bg-blue-500/10 text-blue-400",
          icon:
            "bg-blue-500/15 text-blue-400",
          line: "bg-blue-400",
          dot: "bg-blue-400",
        };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`
          group
          relative
          flex
          min-h-[48px]
          w-full
          items-center
          gap-3
          rounded-xl
          px-3
          py-2
          text-left
          transition-all
          duration-200
          ${
            active
              ? "bg-white/[0.055] text-white"
              : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100"
          }
        `}
      >
        {active && (
          <span
            className={`absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full ${accent.line}`}
          />
        )}

        <div
          className={`
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-lg
            ${
              active
                ? accent.icon
                : "bg-white/[0.035] text-slate-500 group-hover:bg-white/[0.07] group-hover:text-slate-200"
            }
          `}
        >
          <Icon size={17} />
        </div>

        <span
          className={`
            flex-1
            text-[12px]
            font-semibold
            ${
              active
                ? "text-white"
                : "text-slate-300"
            }
          `}
        >
          {title}
        </span>

        {open ? (
          <ChevronDown
            size={15}
            className={
              active
                ? accent.line.replace(
                    "bg-",
                    "text-",
                  )
                : "text-slate-600"
            }
          />
        ) : (
          <ChevronRight
            size={15}
            className="text-slate-600"
          />
        )}
      </button>

      <div
        className={`
          grid
          transition-all
          duration-200
          ease-out
          ${
            open
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }
        `}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="relative ml-[30px] mt-1 space-y-0.5 border-l border-white/[0.08] pl-3">
            {items.map((item) => {
              const ItemIcon = item.icon;

              const itemQuery = item.path.includes(
                "?",
              )
                ? item.path.split("?")[1]
                : "";

              const itemRole = new URLSearchParams(
                itemQuery,
              ).get("role");

              const isQueryItem =
                queryAware &&
                item.path.startsWith("/users");

              const isActive = isQueryItem
                ? location.pathname ===
                    "/users" &&
                  currentRole === itemRole
                : location.pathname ===
                  item.path.split("?")[0];

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end
                  className={`
                    group
                    relative
                    flex
                    min-h-[38px]
                    items-center
                    gap-2.5
                    rounded-lg
                    px-3
                    py-2
                    transition-all
                    duration-150
                    ${
                      isActive
                        ? accent.active
                        : "text-slate-500 hover:bg-white/[0.035] hover:text-slate-200"
                    }
                  `}
                >
                  {isActive && (
                    <span
                      className={`absolute -left-[13px] top-1/2 h-px w-3 ${accent.line}`}
                    />
                  )}

                  <ItemIcon
                    size={14}
                    strokeWidth={
                      isActive ? 2.1 : 1.8
                    }
                  />

                  <span
                    className={`
                      min-w-0
                      flex-1
                      truncate
                      text-[11px]
                      font-medium
                      ${
                        isActive
                          ? accent.line.replace(
                              "bg-",
                              "text-",
                            )
                          : "text-slate-400"
                      }
                    `}
                  >
                    {item.title}
                  </span>

                  {isActive && (
                    <span
                      className={`ml-auto h-1.5 w-1.5 shrink-0 rounded-full ${accent.dot}`}
                    />
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}