import {
  Activity,
  HeartPulse,
  Mail,
  Pencil,
  RefreshCw,
  Scissors,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserCheck,
  UserRound,
  UserRoundPlus,
  UserX,
} from "lucide-react";

import type { ReactNode } from "react";

import type { User } from "../../types/staff";

interface Props {
  users: User[];
  loading: boolean;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onToggleStatus: (user: User) => void;
}

// =====================================================
// HELPERS
// =====================================================

function getEmployeeId(
  user: User,
): string {
  if (
    "employee_id" in user &&
    typeof user.employee_id === "string" &&
    user.employee_id.trim()
  ) {
    return user.employee_id.trim();
  }

  return "—";
}

// =====================================================
// MAIN TABLE
// =====================================================

export default function UserTable({
  users,
  loading,
  onEdit,
  onDelete,
  onToggleStatus,
}: Props) {
  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <div className="flex min-h-[320px] flex-1 items-center justify-center">
        <div className="flex flex-col items-center">
          <div
            className="
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-2xl
              bg-blue-50
              text-blue-600
            "
          >
            <RefreshCw
              size={21}
              className="animate-spin"
            />
          </div>

          <p className="mt-4 text-sm font-semibold text-slate-600">
            Loading staff records...
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Fetching the latest staff registry
          </p>
        </div>
      </div>
    );
  }

  // ===================================================
  // EMPTY
  // ===================================================

  if (users.length === 0) {
    return (
      <div
        className="
          flex
          min-h-[320px]
          flex-1
          flex-col
          items-center
          justify-center
          px-6
          text-center
        "
      >
        <div
          className="
            flex
            h-16
            w-16
            items-center
            justify-center
            rounded-2xl
            bg-slate-100
            text-slate-400
          "
        >
          <UserRound size={28} />
        </div>

        <h3 className="mt-5 text-sm font-bold text-slate-800">
          No staff members found
        </h3>

        <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
          No staff records match your current search.
          Try another name, email or role.
        </p>
      </div>
    );
  }

  // ===================================================
  // TABLE
  // ===================================================

  return (
    <div
      className="
        min-h-0
        flex-1
        overflow-auto
        staff-table-scroll
      "
    >
      <div className="min-w-[1050px]">
        <table className="w-full border-collapse text-left">
          {/* =================================================
              HEADER
          ================================================= */}

          <thead className="sticky top-0 z-20">
            <tr
              className="
                border-b
                border-slate-200
                bg-slate-50/95
                backdrop-blur-md
              "
            >
              <TableHeader>
                Staff Member
              </TableHeader>

              <TableHeader>
                Email
              </TableHeader>

              <TableHeader>
                Role
              </TableHeader>

              <TableHeader>
                Status
              </TableHeader>

              <TableHeader align="right">
                Actions
              </TableHeader>
            </tr>
          </thead>

          {/* =================================================
              BODY
          ================================================= */}

          <tbody className="divide-y divide-slate-100 bg-white">
            {users.map((user) => {
              const isActive =
                user.is_active === "true";

              const isAdministrator =
                user.role === "Administrator";

              const employeeId =
                getEmployeeId(user);

              const email =
                typeof user.email === "string"
                  ? user.email.trim()
                  : "";

              return (
                <tr
                  key={user.id}
                  className="
                    group
                    transition-colors
                    duration-150
                    hover:bg-slate-50/70
                  "
                >
                  {/* =================================================
                      STAFF MEMBER
                  ================================================= */}

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <RoleAvatar
                        name={user.full_name}
                        role={user.role}
                        active={isActive}
                      />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {user.full_name}
                        </p>

                        {/* GENERATED EMPLOYEE ID */}

                        <p
                          className="
                            mt-0.5
                            font-mono
                            text-[11px]
                            font-medium
                            text-slate-400
                          "
                        >
                          {employeeId}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* =================================================
                      EMAIL
                  ================================================= */}

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Mail
                        size={14}
                        className="shrink-0 text-slate-400"
                      />

                      <span
                        className={`
                          max-w-[280px]
                          truncate
                          text-sm
                          ${
                            email
                              ? "text-slate-600"
                              : "italic text-slate-400"
                          }
                        `}
                      >
                        {email || "No email"}
                      </span>
                    </div>
                  </td>

                  {/* =================================================
                      ROLE
                  ================================================= */}

                  <td className="px-6 py-4">
                    <RoleBadge
                      role={user.role}
                    />
                  </td>

                  {/* =================================================
                      STATUS
                  ================================================= */}

                  <td className="px-6 py-4">
                    <StatusBadge
                      active={isActive}
                    />
                  </td>

                  {/* =================================================
                      ACTIONS
                  ================================================= */}

                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {/* EDIT */}

                      <button
                        type="button"
                        onClick={() =>
                          onEdit(user)
                        }
                        disabled={
                          isAdministrator
                        }
                        title={
                          isAdministrator
                            ? "Administrator account is protected"
                            : "Edit staff"
                        }
                        className={`
                          inline-flex
                          h-9
                          w-9
                          items-center
                          justify-center
                          rounded-lg
                          border
                          bg-white
                          transition-all
                          duration-200
                          ${
                            isAdministrator
                              ? "cursor-not-allowed border-violet-100 text-violet-300"
                              : "border-slate-200 text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                          }
                        `}
                      >
                        {isAdministrator ? (
                          <ShieldCheck
                            size={15}
                          />
                        ) : (
                          <Pencil
                            size={15}
                          />
                        )}
                      </button>

                      {/* STATUS */}

                      {!isAdministrator && (
                        <button
                          type="button"
                          onClick={() =>
                            onToggleStatus(
                              user,
                            )
                          }
                          title={
                            isActive
                              ? "Deactivate staff"
                              : "Activate staff"
                          }
                          className={`
                            inline-flex
                            h-9
                            w-9
                            items-center
                            justify-center
                            rounded-lg
                            border
                            bg-white
                            transition-all
                            duration-200
                            ${
                              isActive
                                ? "border-amber-100 text-amber-500 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600"
                                : "border-emerald-100 text-emerald-500 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600"
                            }
                          `}
                        >
                          {isActive ? (
                            <UserX
                              size={15}
                            />
                          ) : (
                            <UserCheck
                              size={15}
                            />
                          )}
                        </button>
                      )}

                      {/* DELETE */}

                      {!isAdministrator && (
                        <button
                          type="button"
                          onClick={() =>
                            onDelete(user)
                          }
                          title="Delete staff"
                          className="
                            inline-flex
                            h-9
                            w-9
                            items-center
                            justify-center
                            rounded-lg
                            border
                            border-red-100
                            bg-white
                            text-red-500
                            transition-all
                            duration-200
                            hover:border-red-200
                            hover:bg-red-50
                            hover:text-red-600
                          "
                        >
                          <Trash2
                            size={15}
                          />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =====================================================
// TABLE HEADER
// =====================================================

function TableHeader({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`
        px-6
        py-3.5
        text-${align}
        text-[10px]
        font-bold
        uppercase
        tracking-[0.12em]
        text-slate-500
      `}
    >
      {children}
    </th>
  );
}

// =====================================================
// ROLE AVATAR
// =====================================================

function RoleAvatar({
  name,
  role,
  active,
}: {
  name: string;
  role: string;
  active: boolean;
}) {
  const normalizedRole =
    role.trim().toLowerCase();

  let containerClass =
    "bg-slate-100 text-slate-600";

  let Icon = UserRound;

  if (normalizedRole === "doctor") {
    containerClass =
      "bg-blue-50 text-blue-600";

    Icon = Stethoscope;
  } else if (
    normalizedRole === "nurse"
  ) {
    containerClass =
      "bg-emerald-50 text-emerald-600";

    Icon = HeartPulse;
  } else if (
    normalizedRole === "receptionist"
  ) {
    containerClass =
      "bg-violet-50 text-violet-600";

    Icon = UserRoundPlus;
  } else if (
    normalizedRole === "housekeeper"
  ) {
    containerClass =
      "bg-amber-50 text-amber-600";

    Icon = Scissors;
  } else if (
    normalizedRole === "administrator"
  ) {
    containerClass =
      "bg-indigo-50 text-indigo-600";

    Icon = ShieldCheck;
  }

  return (
    <div
      className={`
        relative
        flex
        h-10
        w-10
        shrink-0
        items-center
        justify-center
        rounded-xl
        ${containerClass}
      `}
      title={`${name} — ${role}`}
    >
      <Icon
        size={17}
        strokeWidth={2.1}
      />

      <span
        className={`
          absolute
          -bottom-0.5
          -right-0.5
          h-2.5
          w-2.5
          rounded-full
          border-2
          border-white
          ${
            active
              ? "bg-emerald-500"
              : "bg-slate-300"
          }
        `}
      />
    </div>
  );
}

// =====================================================
// ROLE BADGE
// =====================================================

function RoleBadge({
  role,
}: {
  role: string;
}) {
  const normalizedRole =
    role.trim().toLowerCase();

  let styles =
    "border-slate-200 bg-slate-50 text-slate-600";

  let Icon = Activity;

  if (normalizedRole === "doctor") {
    styles =
      "border-blue-100 bg-blue-50 text-blue-700";

    Icon = Stethoscope;
  } else if (
    normalizedRole === "nurse"
  ) {
    styles =
      "border-emerald-100 bg-emerald-50 text-emerald-700";

    Icon = HeartPulse;
  } else if (
    normalizedRole === "receptionist"
  ) {
    styles =
      "border-violet-100 bg-violet-50 text-violet-700";

    Icon = UserRoundPlus;
  } else if (
    normalizedRole === "housekeeper"
  ) {
    styles =
      "border-amber-100 bg-amber-50 text-amber-700";

    Icon = Scissors;
  } else if (
    normalizedRole === "administrator"
  ) {
    styles =
      "border-indigo-100 bg-indigo-50 text-indigo-700";

    Icon = ShieldCheck;
  }

  return (
    <span
      className={`
        inline-flex
        items-center
        gap-1.5
        rounded-lg
        border
        px-2.5
        py-1.5
        text-[11px]
        font-bold
        ${styles}
      `}
    >
      <Icon size={12} />
      {role}
    </span>
  );
}

// =====================================================
// STATUS BADGE
// =====================================================

function StatusBadge({
  active,
}: {
  active: boolean;
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
        ${
          active
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-slate-100 text-slate-500"
        }
      `}
    >
      <span
        className={`
          h-1.5
          w-1.5
          rounded-full
          ${
            active
              ? "bg-emerald-500"
              : "bg-slate-400"
          }
        `}
      />

      {active
        ? "Active"
        : "Inactive"}
    </span>
  );
}