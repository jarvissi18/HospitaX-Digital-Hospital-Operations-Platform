import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, ElementType, ReactNode } from "react";

import {
  Check,
  CheckCircle2,
  CircleUserRound,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  Save,
  Shield,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { toast } from "react-toastify";

import { useAuth } from "../../context/AuthContext";
import {
  changePassword,
  updateProfile,
} from "../../services/authApi";

// =====================================================
// TYPES
// =====================================================

interface ProfileForm {
  full_name: string;
  email: string;
}

interface PasswordForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

// =====================================================
// COMPONENT
// =====================================================

export default function Profile() {
  const { user, updateUser } = useAuth();

  // ---------------------------------------------------
  // PROFILE STATE
  // ---------------------------------------------------

  const [profile, setProfile] = useState<ProfileForm>({
    full_name: "",
    email: "",
  });

  const [savingProfile, setSavingProfile] = useState(false);

  // ---------------------------------------------------
  // PASSWORD STATE
  // ---------------------------------------------------

  const [password, setPassword] = useState<PasswordForm>({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [changingPassword, setChangingPassword] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  // =====================================================
  // LOAD USER
  // =====================================================

  useEffect(() => {
    if (!user) {
      return;
    }

    setProfile({
      full_name: user.full_name ?? "",
      email: user.email ?? "",
    });
  }, [user]);

  // =====================================================
  // PROFILE INPUT
  // =====================================================

  const handleProfileChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;

    setProfile((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // =====================================================
  // PASSWORD INPUT
  // =====================================================

  const handlePasswordChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;

    setPassword((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // =====================================================
  // SAVE PROFILE
  // =====================================================

  const saveProfile = async () => {
    const fullName = profile.full_name.trim();
    const email = profile.email.trim();

    if (!fullName) {
      toast.error("Full name is required.");
      return;
    }

    if (fullName.length < 2) {
      toast.error("Full name must contain at least 2 characters.");
      return;
    }

    if (!email) {
      toast.error("Email address is required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    try {
      setSavingProfile(true);

      const updatedUser = await updateProfile({
        full_name: fullName,
        email,
      });

      updateUser(updatedUser);

      setProfile({
        full_name: updatedUser.full_name ?? fullName,
        email: updatedUser.email ?? email,
      });

      toast.success("Profile updated successfully.");
    } catch (err: any) {
      console.error("Profile update error:", err);

      const message =
        err?.response?.data?.detail ||
        "Failed to update profile.";

      toast.error(
        Array.isArray(message)
          ? "Failed to update profile."
          : message
      );
    } finally {
      setSavingProfile(false);
    }
  };

  // =====================================================
  // PASSWORD STRENGTH
  // =====================================================

  const passwordStrength = useMemo(() => {
    const value = password.new_password;

    const requirements = {
      length: value.length >= 8,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      number: /[0-9]/.test(value),
      special: /[^A-Za-z0-9]/.test(value),
    };

    const score = Object.values(requirements).filter(Boolean).length;

    if (!value) {
      return {
        score: 0,
        label: "Not entered",
        requirements,
      };
    }

    if (score <= 2) {
      return {
        score: 1,
        label: "Weak",
        requirements,
      };
    }

    if (score === 3) {
      return {
        score: 2,
        label: "Fair",
        requirements,
      };
    }

    if (score === 4) {
      return {
        score: 3,
        label: "Good",
        requirements,
      };
    }

    return {
      score: 4,
      label: "Strong",
      requirements,
    };
  }, [password.new_password]);

  // =====================================================
  // CHANGE PASSWORD
  // =====================================================

  const changeUserPassword = async () => {
    const currentPassword = password.current_password;
    const newPassword = password.new_password;
    const confirmPassword = password.confirm_password;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please complete all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error(
        "New password must contain at least 8 characters."
      );
      return;
    }

    if (currentPassword === newPassword) {
      toast.error(
        "New password must be different from your current password."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(
        "New password and confirmation password do not match."
      );
      return;
    }

    if (passwordStrength.score < 4) {
      toast.error(
        "Please use a strong password with uppercase, lowercase, number, and special character."
      );
      return;
    }

    try {
      setChangingPassword(true);

      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setPassword({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });

      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);

      toast.success("Password changed successfully.");
    } catch (err: any) {
      console.error("Password change error:", err);

      const message =
        err?.response?.data?.detail ||
        "Unable to change password.";

      toast.error(
        Array.isArray(message)
          ? "Unable to change password."
          : message
      );
    } finally {
      setChangingPassword(false);
    }
  };

  // =====================================================
  // USER HELPERS
  // =====================================================

  const initials = useMemo(() => {
    if (!user?.full_name) {
      return "?";
    }

    const parts = user.full_name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return (
      parts[0].charAt(0) +
      parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }, [user?.full_name]);

  const isActive =
    user?.is_active === true ||
    user?.is_active === "true";

  const formattedRole =
    user?.role || "Staff Member";

  const formattedShift =
    user?.shift || "Not assigned";

  // =====================================================
  // NO USER
  // =====================================================

  if (!user) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <Shield size={25} />
          </div>

          <h2 className="mt-5 text-lg font-bold text-slate-900">
            Profile unavailable
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Unable to load your account information.
            Please sign in again.
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-slate-50/70 pr-1">
      <div className="mx-auto w-full max-w-6xl space-y-6 pb-10">

        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <header className="pt-1">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5">
                <CircleUserRound
                  size={14}
                  className="text-blue-600"
                />

                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                  Account
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                My Profile
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Manage your personal information and
                account security from one place.
              </p>
            </div>

            <div
              className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2 ${
                isActive
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : "border-red-100 bg-red-50 text-red-700"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isActive
                    ? "bg-emerald-500"
                    : "bg-red-500"
                }`}
              />

              <span className="text-xs font-bold">
                {isActive
                  ? "Account Active"
                  : "Account Inactive"}
              </span>
            </div>
          </div>
        </header>

        {/* =================================================
            IDENTITY CARD
        ================================================= */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-6 py-7 sm:px-8">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
              {/* AVATAR */}

              <div className="relative shrink-0">
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-white/20 bg-gradient-to-br from-blue-500 to-indigo-600 text-3xl font-bold text-white shadow-2xl shadow-blue-950/30">
                  {initials}
                </div>

                <div
                  className={`absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-4 border-slate-900 ${
                    isActive
                      ? "bg-emerald-500"
                      : "bg-red-500"
                  }`}
                >
                  <Check
                    size={13}
                    strokeWidth={3}
                    className="text-white"
                  />
                </div>
              </div>

              {/* IDENTITY */}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold tracking-tight text-white">
                    {user.full_name}
                  </h2>

                  <span className="rounded-lg border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-100">
                    {formattedRole}
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-300">
                  {user.email || "No email address"}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {user.employee_id && (
                    <IdentityBadge
                      icon={IdCard}
                      label={`Employee ID: ${user.employee_id}`}
                    />
                  )}

                  <IdentityBadge
                    icon={ShieldCheck}
                    label={
                      isActive
                        ? "Verified account"
                        : "Account inactive"
                    }
                  />

                  <IdentityBadge
                    icon={KeyRound}
                    label={`Shift: ${formattedShift}`}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            ACCOUNT INFORMATION
        ================================================= */}

        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          <SectionHeader
            icon={UserRound}
            title="Personal Information"
            description="Update the information associated with your account."
          />

          <div className="p-6 md:p-8">
            <div className="grid gap-6 lg:grid-cols-2">

              {/* FULL NAME */}

              <ProfileField
                label="Full Name"
                icon={UserRound}
                required
              >
                <input
                  name="full_name"
                  value={profile.full_name}
                  onChange={handleProfileChange}
                  disabled={savingProfile}
                  autoComplete="name"
                  placeholder="Enter your full name"
                  className="
                    h-12
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50
                    px-4
                    text-sm
                    font-medium
                    text-slate-800
                    outline-none
                    transition
                    placeholder:text-slate-400
                    hover:border-slate-300
                    focus:border-blue-400
                    focus:bg-white
                    focus:ring-4
                    focus:ring-blue-50
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                />
              </ProfileField>

              {/* EMAIL */}

              <ProfileField
                label="Email Address"
                icon={Mail}
                required
              >
                <input
                  name="email"
                  type="email"
                  value={profile.email}
                  onChange={handleProfileChange}
                  disabled={savingProfile}
                  autoComplete="email"
                  placeholder="name@hospital.com"
                  className="
                    h-12
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50
                    px-4
                    text-sm
                    font-medium
                    text-slate-800
                    outline-none
                    transition
                    placeholder:text-slate-400
                    hover:border-slate-300
                    focus:border-blue-400
                    focus:bg-white
                    focus:ring-4
                    focus:ring-blue-50
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                />
              </ProfileField>

              {/* EMPLOYEE ID */}

              <ProfileField
                label="Employee ID"
                icon={IdCard}
                hint="Managed by administration"
              >
                <ReadOnlyField
                  value={
                    user.employee_id || "Not assigned"
                  }
                />
              </ProfileField>

              {/* MOBILE */}

              <ProfileField
                label="Mobile Number"
                icon={CircleUserRound}
                hint="Managed by administration"
              >
                <ReadOnlyField
                  value={
                    user.mobile || "Not provided"
                  }
                />
              </ProfileField>

              {/* ROLE */}

              <ProfileField
                label="Role"
                icon={Shield}
                hint="Role permissions are protected"
              >
                <ReadOnlyField
                  value={formattedRole}
                  badge="Protected"
                />
              </ProfileField>

              {/* SHIFT */}

              <ProfileField
                label="Assigned Shift"
                icon={KeyRound}
                hint="Managed by administration"
              >
                <ReadOnlyField
                  value={formattedShift}
                />
              </ProfileField>
            </div>

            {/* ACTION */}

            <div className="mt-8 flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <ShieldCheck size={16} />
                </div>

                <p className="max-w-xl text-xs leading-5 text-slate-500">
                  Only your name and email address can be
                  changed from this page. Staff identity and
                  role information remain protected.
                </p>
              </div>

              <button
                type="button"
                onClick={saveProfile}
                disabled={savingProfile}
                className="
                  inline-flex
                  min-h-11
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-gradient-to-r
                  from-blue-600
                  to-indigo-600
                  px-5
                  py-2.5
                  text-sm
                  font-bold
                  text-white
                  shadow-lg
                  shadow-blue-500/20
                  transition
                  hover:-translate-y-0.5
                  hover:from-blue-700
                  hover:to-indigo-700
                  focus:outline-none
                  focus:ring-4
                  focus:ring-blue-100
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                  disabled:hover:translate-y-0
                "
              >
                {savingProfile ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Save size={17} />
                )}

                {savingProfile
                  ? "Saving Changes..."
                  : "Save Changes"}
              </button>
            </div>
          </div>
        </section>

        {/* =================================================
            SECURITY
        ================================================= */}

        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          <SectionHeader
            icon={LockKeyhole}
            title="Account Security"
            description="Protect your account with a strong and unique password."
            tone="violet"
          />

          <div className="p-6 md:p-8">
            <div className="max-w-3xl space-y-6">

              {/* CURRENT PASSWORD */}

              <PasswordField
                label="Current Password"
                name="current_password"
                value={password.current_password}
                visible={showCurrentPassword}
                onChange={handlePasswordChange}
                onToggle={() =>
                  setShowCurrentPassword(
                    (value) => !value
                  )
                }
                placeholder="Enter your current password"
                autoComplete="current-password"
                disabled={changingPassword}
              />

              {/* NEW PASSWORD */}

              <div>
                <PasswordField
                  label="New Password"
                  name="new_password"
                  value={password.new_password}
                  visible={showNewPassword}
                  onChange={handlePasswordChange}
                  onToggle={() =>
                    setShowNewPassword(
                      (value) => !value
                    )
                  }
                  placeholder="Create a strong new password"
                  autoComplete="new-password"
                  disabled={changingPassword}
                />

                {/* PASSWORD STRENGTH */}

                {password.new_password && (
                  <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-600">
                        Password strength
                      </span>

                      <span
                        className={`text-xs font-bold ${
                          passwordStrength.score === 4
                            ? "text-emerald-600"
                            : passwordStrength.score === 3
                              ? "text-blue-600"
                              : passwordStrength.score === 2
                                ? "text-amber-600"
                                : "text-red-600"
                        }`}
                      >
                        {passwordStrength.label}
                      </span>
                    </div>

                    <div className="mt-3 flex gap-1.5">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            passwordStrength.score >= level
                              ? level === 4
                                ? "bg-emerald-500"
                                : level === 3
                                  ? "bg-blue-500"
                                  : level === 2
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                              : "bg-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* CONFIRM PASSWORD */}

              <PasswordField
                label="Confirm New Password"
                name="confirm_password"
                value={password.confirm_password}
                visible={showConfirmPassword}
                onChange={handlePasswordChange}
                onToggle={() =>
                  setShowConfirmPassword(
                    (value) => !value
                  )
                }
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                disabled={changingPassword}
              />

              {/* REQUIREMENTS */}

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck
                    size={16}
                    className="text-slate-500"
                  />

                  <p className="text-xs font-bold text-slate-700">
                    Password requirements
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <PasswordRequirement
                    valid={passwordStrength.requirements.length}
                    text="At least 8 characters"
                  />

                  <PasswordRequirement
                    valid={passwordStrength.requirements.uppercase}
                    text="One uppercase letter"
                  />

                  <PasswordRequirement
                    valid={passwordStrength.requirements.lowercase}
                    text="One lowercase letter"
                  />

                  <PasswordRequirement
                    valid={passwordStrength.requirements.number}
                    text="One number"
                  />

                  <PasswordRequirement
                    valid={passwordStrength.requirements.special}
                    text="One special character"
                  />
                </div>
              </div>

              {/* SECURITY NOTICE */}

              <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <Shield
                  size={18}
                  className="mt-0.5 shrink-0 text-blue-600"
                />

                <div>
                  <p className="text-xs font-bold text-blue-900">
                    Keep your account protected
                  </p>

                  <p className="mt-1 text-xs leading-5 text-blue-800/70">
                    Use a password that is unique to your
                    HospitaX account and never share it with
                    other users.
                  </p>
                </div>
              </div>

              {/* PASSWORD ACTION */}

              <div className="flex justify-end border-t border-slate-100 pt-6">
                <button
                  type="button"
                  onClick={changeUserPassword}
                  disabled={
                    changingPassword ||
                    !password.current_password ||
                    !password.new_password ||
                    !password.confirm_password
                  }
                  className="
                    inline-flex
                    min-h-11
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-slate-950
                    px-5
                    py-2.5
                    text-sm
                    font-bold
                    text-white
                    shadow-sm
                    transition
                    hover:bg-slate-800
                    focus:outline-none
                    focus:ring-4
                    focus:ring-slate-200
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {changingPassword ? (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <LockKeyhole size={17} />
                  )}

                  {changingPassword
                    ? "Updating Password..."
                    : "Change Password"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            ACCOUNT PROTECTION
        ================================================= */}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <ShieldCheck size={18} />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Account Protection
              </h3>

              <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
                Your role, employee identity, shift assignment,
                and account access are managed by the hospital
                administration. These protected fields cannot
                be changed from your profile.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// =====================================================
// SECTION HEADER
// =====================================================

function SectionHeader({
  icon: Icon,
  title,
  description,
  tone = "blue",
}: {
  icon: ElementType;
  title: string;
  description: string;
  tone?: "blue" | "violet";
}) {
  const iconClasses =
    tone === "violet"
      ? "bg-violet-50 text-violet-600"
      : "bg-blue-50 text-blue-600";

  return (
    <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-6 py-5 md:px-8">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClasses}`}
        >
          <Icon size={20} />
        </div>

        <div>
          <h2 className="text-base font-bold text-slate-900">
            {title}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// IDENTITY BADGE
// =====================================================

function IdentityBadge({
  icon: Icon,
  label,
}: {
  icon: ElementType;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5">
      <Icon
        size={13}
        className="text-slate-300"
      />

      <span className="text-[11px] font-semibold text-slate-200">
        {label}
      </span>
    </div>
  );
}

// =====================================================
// PROFILE FIELD
// =====================================================

function ProfileField({
  label,
  icon: Icon,
  required = false,
  hint,
  children,
}: {
  label: string;
  icon: ElementType;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Icon
            size={15}
            className="text-slate-400"
          />

          {label}

          {required && (
            <span className="text-red-500">*</span>
          )}
        </label>

        {hint && (
          <span className="hidden text-[10px] font-medium text-slate-400 sm:block">
            {hint}
          </span>
        )}
      </div>

      {children}
    </div>
  );
}

// =====================================================
// READ ONLY FIELD
// =====================================================

function ReadOnlyField({
  value,
  badge,
}: {
  value: string;
  badge?: string;
}) {
  return (
    <div className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-100/70 px-4">
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">
        {value}
      </span>

      {badge && (
        <span className="shrink-0 rounded-lg bg-slate-200 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
          {badge}
        </span>
      )}
    </div>
  );
}

// =====================================================
// PASSWORD FIELD
// =====================================================

function PasswordField({
  label,
  name,
  value,
  visible,
  placeholder,
  autoComplete,
  disabled,
  onChange,
  onToggle,
}: {
  label: string;
  name: string;
  value: string;
  visible: boolean;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  onChange: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
  onToggle: () => void;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>

      <div className="relative">
        <LockKeyhole
          size={17}
          className="
            pointer-events-none
            absolute
            left-3.5
            top-1/2
            -translate-y-1/2
            text-slate-400
          "
        />

        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className="
            h-12
            w-full
            rounded-xl
            border
            border-slate-200
            bg-slate-50
            pl-10
            pr-12
            text-sm
            font-medium
            text-slate-800
            outline-none
            transition
            placeholder:text-slate-400
            hover:border-slate-300
            focus:border-violet-400
            focus:bg-white
            focus:ring-4
            focus:ring-violet-50
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        />

        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className="
            absolute
            right-2
            top-1/2
            flex
            h-8
            w-8
            -translate-y-1/2
            items-center
            justify-center
            rounded-lg
            text-slate-400
            transition
            hover:bg-slate-100
            hover:text-slate-700
            focus:outline-none
            focus:ring-2
            focus:ring-violet-100
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
          aria-label={
            visible
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
        >
          {visible ? (
            <EyeOff size={17} />
          ) : (
            <Eye size={17} />
          )}
        </button>
      </div>
    </div>
  );
}

// =====================================================
// PASSWORD REQUIREMENT
// =====================================================

function PasswordRequirement({
  valid,
  text,
}: {
  valid: boolean;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          valid
            ? "bg-emerald-100"
            : "bg-slate-200"
        }`}
      >
        <CheckCircle2
          size={13}
          className={
            valid
              ? "text-emerald-600"
              : "text-slate-400"
          }
        />
      </div>

      <span
        className={`text-xs ${
          valid
            ? "font-semibold text-emerald-700"
            : "text-slate-500"
        }`}
      >
        {text}
      </span>
    </div>
  );
}