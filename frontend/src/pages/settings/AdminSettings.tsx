import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import {
  Activity,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  RotateCcw,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import {
  getSettings,
  updateSettings,
  type Settings,
} from "../../services/settingsApi";

import {
  getCurrentUser,
  updateProfile,
  changePassword,
  type User,
} from "../../services/authApi";


// =====================================================
// TYPES
// =====================================================

interface AdminForm {
  admin_name: string;
  admin_email: string;
  admin_phone: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}


// =====================================================
// DEFAULTS
// =====================================================

const EMPTY_ADMIN_FORM: AdminForm = {
  admin_name: "",
  admin_email: "",
  admin_phone: "",
};

const EMPTY_PASSWORD_FORM: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};


// =====================================================
// PAGE
// =====================================================

export default function AdminSettings() {
  const navigate = useNavigate();


  // ===================================================
  // LOADING / SAVING
  // ===================================================

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [passwordSaving, setPasswordSaving] =
    useState(false);


  // ===================================================
  // DATA
  // ===================================================

  const [settings, setSettings] =
    useState<Settings | null>(null);

  const [currentUser, setCurrentUser] =
    useState<User | null>(null);


  // ===================================================
  // ADMIN FORM
  // ===================================================

  const [form, setForm] =
    useState<AdminForm>(
      EMPTY_ADMIN_FORM
    );

  const [originalForm, setOriginalForm] =
    useState<AdminForm>(
      EMPTY_ADMIN_FORM
    );


  // ===================================================
  // PASSWORD FORM
  // ===================================================

  const [passwordForm, setPasswordForm] =
    useState<PasswordForm>(
      EMPTY_PASSWORD_FORM
    );

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);


  // ===================================================
  // ERROR
  // ===================================================

  const [error, setError] =
    useState("");


  // ===================================================
  // LOAD
  // ===================================================

  useEffect(() => {
    loadAdminSettings();
  }, []);


  async function loadAdminSettings() {
    try {
      setLoading(true);
      setError("");

      const [settingsData, userData] =
        await Promise.all([
          getSettings(),
          getCurrentUser(),
        ]);

      setSettings(settingsData);
      setCurrentUser(userData);


      const adminData: AdminForm = {
        /*
         * Name and email come from the authenticated
         * User account.
         */
        admin_name:
          userData.full_name ??
          settingsData.admin_name ??
          "",

        admin_email:
          userData.email ??
          settingsData.admin_email ??
          "",

        /*
         * Phone currently belongs to Settings because
         * User model does not contain an admin_phone field.
         */
        admin_phone:
          settingsData.admin_phone ??
          "",
      };


      setForm(adminData);
      setOriginalForm(adminData);

    } catch (err) {
      console.error(
        "Admin settings load error:",
        err
      );

      setError(
        "Unable to load administrator settings. Please try again."
      );

    } finally {
      setLoading(false);
    }
  }


  // =====================================================
  // FIELD UPDATE
  // =====================================================

  function updateField(
    field: keyof AdminForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }


  function updatePasswordField(
    field: keyof PasswordForm,
    value: string
  ) {
    setPasswordForm((current) => ({
      ...current,
      [field]: value,
    }));
  }


  // =====================================================
  // DIRTY STATE
  // =====================================================

  const hasChanges =
    form.admin_name !==
      originalForm.admin_name ||
    form.admin_email !==
      originalForm.admin_email ||
    form.admin_phone !==
      originalForm.admin_phone;


  // =====================================================
  // PASSWORD STATE
  // =====================================================

  const hasPasswordInput =
    passwordForm.currentPassword.length > 0 ||
    passwordForm.newPassword.length > 0 ||
    passwordForm.confirmPassword.length > 0;


  const passwordStrength = useMemo(() => {
    const password =
      passwordForm.newPassword;

    if (!password) {
      return {
        label: "Not entered",
        level: 0,
      };
    }

    let score = 0;

    if (password.length >= 8) {
      score++;
    }

    if (/[A-Z]/.test(password)) {
      score++;
    }

    if (/[a-z]/.test(password)) {
      score++;
    }

    if (/[0-9]/.test(password)) {
      score++;
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score++;
    }

    if (score <= 2) {
      return {
        label: "Weak",
        level: 1,
      };
    }

    if (score <= 3) {
      return {
        label: "Fair",
        level: 2,
      };
    }

    if (score === 4) {
      return {
        label: "Good",
        level: 3,
      };
    }

    return {
      label: "Strong",
      level: 4,
    };
  }, [passwordForm.newPassword]);


  // =====================================================
  // RESET PROFILE
  // =====================================================

  function handleReset() {
    setForm(originalForm);

    toast.info(
      "Administrator changes discarded."
    );
  }


  // =====================================================
  // SAVE ADMIN PROFILE
  // =====================================================

  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!settings || !currentUser) {
      toast.error(
        "Administrator account information is unavailable."
      );

      return;
    }


    const adminName =
      form.admin_name.trim();

    const adminEmail =
      form.admin_email.trim();

    const adminPhone =
      form.admin_phone.trim();


    // ---------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------

    if (!adminName) {
      toast.error(
        "Administrator name is required."
      );

      return;
    }


    if (!adminEmail) {
      toast.error(
        "Administrator email is required."
      );

      return;
    }


    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        adminEmail
      )
    ) {
      toast.error(
        "Please enter a valid administrator email."
      );

      return;
    }


    try {
      setSaving(true);


      /*
       * STEP 1
       *
       * Update the authenticated User account.
       *
       * This is important because login uses
       * User.email, not Settings.admin_email.
       */

      const updatedUser =
        await updateProfile({
          full_name: adminName,
          email: adminEmail,
        });


      /*
       * STEP 2
       *
       * Keep the Settings administrator information
       * synchronized.
       *
       * Phone is stored here because the current
       * User model has no phone column.
       */

      const updatedSettings =
        await updateSettings({
          hospital_name:
            settings.hospital_name,

          hospital_address:
            settings.hospital_address,

          hospital_phone:
            settings.hospital_phone,

          hospital_email:
            settings.hospital_email,

          admin_name:
            adminName,

          admin_email:
            adminEmail,

          admin_phone:
            adminPhone,

          admin_role:
            settings.admin_role,

        });


      // -------------------------------------------------
      // UPDATE LOCAL STATE
      // -------------------------------------------------

      setCurrentUser(updatedUser);

      setSettings(updatedSettings);


      const updatedForm: AdminForm = {
        admin_name:
          updatedUser.full_name ??
          updatedSettings.admin_name ??
          "",

        admin_email:
          updatedUser.email ??
          updatedSettings.admin_email ??
          "",

        admin_phone:
          updatedSettings.admin_phone ??
          "",
      };


      setForm(updatedForm);
      setOriginalForm(updatedForm);


      toast.success(
        "Administrator profile updated successfully."
      );

    } catch (err: any) {
      console.error(
        "Admin profile update error:",
        err
      );


      const message =
        err?.response?.data?.detail ||
        "Unable to update administrator profile.";


      toast.error(
        Array.isArray(message)
          ? "Unable to update administrator profile."
          : message
      );

    } finally {
      setSaving(false);
    }
  }


  // =====================================================
  // CHANGE PASSWORD
  // =====================================================

  async function handlePasswordChange(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();


    // ---------------------------------------------------
    // REQUIRED FIELDS
    // ---------------------------------------------------

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      toast.error(
        "Please complete all password fields."
      );

      return;
    }


    // ---------------------------------------------------
    // MINIMUM LENGTH
    // ---------------------------------------------------

    if (
      passwordForm.newPassword.length < 8
    ) {
      toast.error(
        "New password must contain at least 8 characters."
      );

      return;
    }


    // ---------------------------------------------------
    // DIFFERENT PASSWORD
    // ---------------------------------------------------

    if (
      passwordForm.newPassword ===
      passwordForm.currentPassword
    ) {
      toast.error(
        "New password must be different from your current password."
      );

      return;
    }


    // ---------------------------------------------------
    // CONFIRM PASSWORD
    // ---------------------------------------------------

    if (
      passwordForm.newPassword !==
      passwordForm.confirmPassword
    ) {
      toast.error(
        "New password and confirmation password do not match."
      );

      return;
    }


    // ---------------------------------------------------
    // PASSWORD STRENGTH
    // ---------------------------------------------------

    if (passwordStrength.level < 3) {
      toast.error(
        "Please choose a stronger password."
      );

      return;
    }


    try {
      setPasswordSaving(true);


      /*
       * Real backend password-change endpoint:
       *
       * PUT /auth/change-password
       */

      await changePassword({
        current_password:
          passwordForm.currentPassword,

        new_password:
          passwordForm.newPassword,

        confirm_password:
          passwordForm.confirmPassword,
      });


      // -------------------------------------------------
      // CLEAR PASSWORD FORM
      // -------------------------------------------------

      setPasswordForm(
        EMPTY_PASSWORD_FORM
      );

      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);


      toast.success(
        "Password changed successfully."
      );

    } catch (err: any) {
      console.error(
        "Password change error:",
        err
      );


      const message =
        err?.response?.data?.detail ||
        "Unable to change password.";


      toast.error(
        Array.isArray(message)
          ? "Unable to change password."
          : message
      );

    } finally {
      setPasswordSaving(false);
    }
  }


  // =====================================================
  // CLEAR PASSWORD
  // =====================================================

  function clearPasswordForm() {
    setPasswordForm(
      EMPTY_PASSWORD_FORM
    );

    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);

    toast.info(
      "Password changes discarded."
    );
  }


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">

        <div className="flex flex-col items-center">

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">

            <Loader2
              size={25}
              className="animate-spin text-blue-600"
            />

          </div>

          <p className="mt-4 text-sm font-semibold text-slate-700">
            Loading administrator settings...
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Please wait while we retrieve your profile.
          </p>

        </div>

      </div>
    );
  }


  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center p-8">

        <div className="w-full max-w-lg rounded-3xl border border-red-100 bg-white p-10 text-center shadow-sm">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">

            <ShieldCheck
              size={29}
              className="text-red-500"
            />

          </div>


          <h2 className="mt-5 text-xl font-bold text-slate-900">
            Settings unavailable
          </h2>


          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error}
          </p>


          <button
            type="button"
            onClick={loadAdminSettings}
            className="
              mt-6
              inline-flex
              items-center
              gap-2
              rounded-xl
              bg-slate-900
              px-5
              py-3
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-slate-800
            "
          >

            <RotateCcw size={16} />

            Try Again

          </button>

        </div>

      </div>
    );
  }


  if (!settings || !currentUser) {
    return null;
  }


  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">


      {/* =================================================
          HEADER
      ================================================= */}

      <header className="shrink-0 border-b border-slate-200/70 pb-6">

        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">


          {/* LEFT */}

          <div>

            <button
              type="button"
              onClick={() =>
                navigate("/settings")
              }
              className="
                mb-3
                inline-flex
                items-center
                gap-2
                text-sm
                font-medium
                text-blue-600
                transition
                hover:text-blue-700
              "
            >

              <ArrowLeft size={16} />

              Back to Settings

            </button>


            <div className="flex items-center gap-2 text-sm font-semibold text-blue-600">

              <UserRound size={17} />

              Account & Security

            </div>


            <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-slate-900">
              Administrator Profile
            </h1>


            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Manage administrator identity, contact
              information and account security.
            </p>

          </div>


          {/* STATUS */}

          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">

              <Activity
                size={18}
                className="text-emerald-600"
              />

            </div>


            <div>

              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Account Status
              </p>

              <div className="mt-0.5 flex items-center gap-1.5">

                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                <span className="text-sm font-bold text-emerald-700">
                  {currentUser.is_active === "true"
                    ? "Active"
                    : "Inactive"}
                </span>

              </div>

            </div>

          </div>

        </div>

      </header>


      {/* =================================================
          CONTENT
      ================================================= */}

      <main className="min-h-0 flex-1 overflow-y-auto py-6 pr-1">

        <div className="mx-auto w-full max-w-5xl space-y-6 pb-8">


          {/* =================================================
              ADMIN PROFILE
          ================================================= */}

          <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">


            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">

              <div className="flex items-start justify-between gap-4">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

                    <UserRound size={20} />

                  </div>


                  <div>

                    <h2 className="text-base font-bold text-slate-900">
                      Administrator Information
                    </h2>

                    <p className="mt-0.5 text-sm text-slate-500">
                      Primary administrator account details.
                    </p>

                  </div>

                </div>


                <span className="hidden items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700 sm:inline-flex">

                  <ShieldCheck size={13} />

                  Protected Role

                </span>

              </div>

            </div>


            <form
              onSubmit={handleSave}
              className="p-6"
            >


              {/* NAME */}

              <FormField
                label="Administrator Name"
                required
                icon={UserRound}
              >

                <Input
                  value={form.admin_name}
                  onChange={(value) =>
                    updateField(
                      "admin_name",
                      value
                    )
                  }
                  placeholder="Enter administrator name"
                  disabled={saving}
                />

              </FormField>


              {/* EMAIL + PHONE */}

              <div className="mt-5 grid gap-5 md:grid-cols-2">

                <FormField
                  label="Email Address"
                  required
                  icon={Mail}
                >

                  <Input
                    type="email"
                    value={form.admin_email}
                    onChange={(value) =>
                      updateField(
                        "admin_email",
                        value
                      )
                    }
                    placeholder="admin@hospital.com"
                    disabled={saving}
                  />

                </FormField>


                <FormField
                  label="Phone Number"
                  icon={Phone}
                >

                  <Input
                    type="tel"
                    value={form.admin_phone}
                    onChange={(value) =>
                      updateField(
                        "admin_phone",
                        value
                      )
                    }
                    placeholder="+91 XXXXX XXXXX"
                    disabled={saving}
                  />

                </FormField>

              </div>


              {/* ROLE */}

              <div className="mt-5">

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Administrator Role
                </label>


                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

                    <ShieldCheck size={19} />

                  </div>


                  <div className="min-w-0 flex-1">

                    <p className="truncate text-sm font-bold text-slate-800">
                      {currentUser.role ||
                        settings.admin_role ||
                        "Administrator"}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-400">
                      System-controlled administrator role
                    </p>

                  </div>


                  <span className="shrink-0 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                    Protected
                  </span>

                </div>


                <p className="mt-2 text-xs text-slate-400">
                  Administrator role and permissions are controlled by the system.
                </p>

              </div>


              {/* ACTION BAR */}

              <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">


                <div className="flex items-center gap-2">

                  <span
                    className={`h-2 w-2 ${
                      hasChanges
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    } rounded-full`}
                  />

                  <span className="text-xs font-medium text-slate-500">

                    {hasChanges
                      ? "You have unsaved changes"
                      : "All changes saved"}

                  </span>

                </div>


                <div className="flex items-center gap-2">

                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={
                      !hasChanges ||
                      saving
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
                      text-slate-600
                      transition
                      hover:bg-slate-50
                      disabled:cursor-not-allowed
                      disabled:opacity-40
                    "
                  >

                    <RotateCcw size={15} />

                    Discard

                  </button>


                  <button
                    type="submit"
                    disabled={
                      saving ||
                      !hasChanges
                    }
                    className="
                      inline-flex
                      items-center
                      gap-2
                      rounded-xl
                      bg-gradient-to-r
                      from-blue-600
                      to-indigo-600
                      px-5
                      py-2.5
                      text-sm
                      font-semibold
                      text-white
                      shadow-lg
                      shadow-blue-500/20
                      transition
                      hover:-translate-y-0.5
                      hover:from-blue-700
                      hover:to-indigo-700
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  >

                    {saving ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <Save size={16} />
                    )}

                    {saving
                      ? "Saving..."
                      : "Save Changes"}

                  </button>

                </div>

              </div>

            </form>

          </section>


          {/* =================================================
              ACCOUNT SECURITY
          ================================================= */}

          <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">


            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">

                  <KeyRound size={20} />

                </div>


                <div>

                  <h2 className="text-base font-bold text-slate-900">
                    Account Security
                  </h2>

                  <p className="mt-0.5 text-sm text-slate-500">
                    Manage your administrator account password.
                  </p>

                </div>

              </div>

            </div>


            <form
              onSubmit={
                handlePasswordChange
              }
              className="p-6"
            >

              <div className="max-w-2xl space-y-5">


                {/* CURRENT */}

                <PasswordInput
                  label="Current Password"
                  value={
                    passwordForm.currentPassword
                  }
                  visible={
                    showCurrentPassword
                  }
                  onToggle={() =>
                    setShowCurrentPassword(
                      (value) => !value
                    )
                  }
                  onChange={(value) =>
                    updatePasswordField(
                      "currentPassword",
                      value
                    )
                  }
                  placeholder="Enter current password"
                />


                {/* NEW */}

                <div>

                  <PasswordInput
                    label="New Password"
                    value={
                      passwordForm.newPassword
                    }
                    visible={
                      showNewPassword
                    }
                    onToggle={() =>
                      setShowNewPassword(
                        (value) => !value
                      )
                    }
                    onChange={(value) =>
                      updatePasswordField(
                        "newPassword",
                        value
                      )
                    }
                    placeholder="Enter new password"
                  />


                  {passwordForm.newPassword && (
                    <div className="mt-3">

                      <div className="flex items-center justify-between">

                        <span className="text-[11px] font-semibold text-slate-400">
                          Password strength
                        </span>

                        <span
                          className={`text-[11px] font-bold ${
                            passwordStrength.level >=
                            4
                              ? "text-emerald-600"
                              : passwordStrength.level >=
                                3
                              ? "text-blue-600"
                              : passwordStrength.level >=
                                2
                              ? "text-amber-600"
                              : "text-red-600"
                          }`}
                        >
                          {
                            passwordStrength.label
                          }
                        </span>

                      </div>


                      <div className="mt-2 flex gap-1">

                        {[1, 2, 3, 4].map(
                          (level) => (
                            <div
                              key={level}
                              className={`h-1.5 flex-1 rounded-full ${
                                passwordStrength.level >=
                                level
                                  ? "bg-blue-500"
                                  : "bg-slate-100"
                              }`}
                            />
                          )
                        )}

                      </div>

                    </div>
                  )}

                </div>


                {/* CONFIRM */}

                <PasswordInput
                  label="Confirm New Password"
                  value={
                    passwordForm.confirmPassword
                  }
                  visible={
                    showConfirmPassword
                  }
                  onToggle={() =>
                    setShowConfirmPassword(
                      (value) => !value
                    )
                  }
                  onChange={(value) =>
                    updatePasswordField(
                      "confirmPassword",
                      value
                    )
                  }
                  placeholder="Re-enter new password"
                />


                {/* REQUIREMENTS */}

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">

                  <p className="text-xs font-bold text-slate-700">
                    Password requirements
                  </p>


                  <div className="mt-3 grid gap-2 sm:grid-cols-2">

                    <PasswordRequirement
                      valid={
                        passwordForm.newPassword.length >=
                        8
                      }
                      text="At least 8 characters"
                    />

                    <PasswordRequirement
                      valid={
                        /[A-Z]/.test(
                          passwordForm.newPassword
                        )
                      }
                      text="One uppercase letter"
                    />

                    <PasswordRequirement
                      valid={
                        /[a-z]/.test(
                          passwordForm.newPassword
                        )
                      }
                      text="One lowercase letter"
                    />

                    <PasswordRequirement
                      valid={
                        /[0-9]/.test(
                          passwordForm.newPassword
                        )
                      }
                      text="One number"
                    />

                  </div>

                </div>


                {/* SECURITY NOTICE */}

                <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">

                  <ShieldCheck
                    size={18}
                    className="mt-0.5 shrink-0 text-blue-600"
                  />

                  <p className="text-xs leading-5 text-blue-800/70">
                    For security, use a unique password
                    that you do not reuse on other services.
                  </p>

                </div>


                {/* ACTIONS */}

                <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">

                  <button
                    type="button"
                    onClick={
                      clearPasswordForm
                    }
                    disabled={
                      passwordSaving ||
                      !hasPasswordInput
                    }
                    className="
                      inline-flex
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      px-4
                      py-2.5
                      text-sm
                      font-semibold
                      text-slate-600
                      transition
                      hover:bg-slate-50
                      disabled:cursor-not-allowed
                      disabled:opacity-40
                    "
                  >

                    <RotateCcw size={15} />

                    Clear

                  </button>


                  <button
                    type="submit"
                    disabled={
                      passwordSaving ||
                      !hasPasswordInput
                    }
                    className="
                      inline-flex
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      bg-slate-900
                      px-5
                      py-2.5
                      text-sm
                      font-semibold
                      text-white
                      shadow-sm
                      transition
                      hover:bg-slate-800
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  >

                    {passwordSaving ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <KeyRound size={16} />
                    )}

                    {passwordSaving
                      ? "Changing..."
                      : "Change Password"}

                  </button>

                </div>

              </div>

            </form>

          </section>


          {/* =================================================
              HOSPITAL INFORMATION
          ================================================= */}

          <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">

            <div className="border-b border-slate-100 px-6 py-5">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

                  <Building2 size={19} />

                </div>


                <div>

                  <h2 className="text-sm font-bold text-slate-900">
                    Hospital Information
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Current hospital details stored in the system.
                  </p>

                </div>

              </div>

            </div>


            <div className="grid gap-5 p-6 md:grid-cols-2">

              <ReadOnlyInfo
                label="Hospital Name"
                value={
                  settings.hospital_name
                }
              />

              <ReadOnlyInfo
                label="Hospital Phone"
                value={
                  settings.hospital_phone
                }
              />

              <ReadOnlyInfo
                label="Hospital Email"
                value={
                  settings.hospital_email
                }
              />

              <ReadOnlyInfo
                label="Hospital Address"
                value={
                  settings.hospital_address
                }
              />

            </div>

          </section>


          {/* =================================================
              SECURITY NOTICE
          ================================================= */}

          <section className="rounded-3xl border border-blue-100 bg-blue-50/60 p-5">

            <div className="flex items-start gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">

                <ShieldCheck size={18} />

              </div>


              <div>

                <h2 className="text-sm font-bold text-blue-900">
                  Administrator Security
                </h2>

                <p className="mt-1 text-xs leading-5 text-blue-800/70">
                  The administrator role is protected by
                  HospitaX. Role permissions cannot be changed
                  from this profile. Administrator information
                  is used across the hospital operations platform.
                </p>

              </div>

            </div>

          </section>

        </div>

      </main>

    </div>
  );
}


// =====================================================
// FORM FIELD
// =====================================================

function FormField({
  label,
  required = false,
  icon: Icon,
  children,
}: {
  label: string;
  required?: boolean;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div>

      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">

        <Icon
          size={15}
          className="text-slate-400"
        />

        {label}

        {required && (
          <span className="text-red-500">
            *
          </span>
        )}

      </label>

      {children}

    </div>
  );
}


// =====================================================
// INPUT
// =====================================================

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) =>
        onChange(
          event.target.value
        )
      }
      placeholder={placeholder}
      disabled={disabled}
      className="
        h-11
        w-full
        rounded-xl
        border
        border-slate-200
        bg-slate-50
        px-4
        text-sm
        text-slate-800
        outline-none
        transition
        placeholder:text-slate-400
        focus:border-blue-400
        focus:bg-white
        focus:ring-4
        focus:ring-blue-50
        disabled:cursor-not-allowed
        disabled:opacity-60
      "
    />
  );
}


// =====================================================
// PASSWORD INPUT
// =====================================================

function PasswordInput({
  label,
  value,
  visible,
  placeholder,
  onChange,
  onToggle,
}: {
  label: string;
  value: string;
  visible: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>


      <div className="relative">

        <KeyRound
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
          type={
            visible
              ? "text"
              : "password"
          }
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          placeholder={placeholder}
          className="
            h-11
            w-full
            rounded-xl
            border
            border-slate-200
            bg-slate-50
            pl-10
            pr-11
            text-sm
            text-slate-800
            outline-none
            transition
            placeholder:text-slate-400
            focus:border-blue-400
            focus:bg-white
            focus:ring-4
            focus:ring-blue-50
          "
        />


        <button
          type="button"
          onClick={onToggle}
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
          "
          aria-label={
            visible
              ? "Hide password"
              : "Show password"
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
    <div className="flex items-center gap-2">

      <CheckCircle2
        size={14}
        className={
          valid
            ? "text-emerald-500"
            : "text-slate-300"
        }
      />

      <span
        className={`text-xs ${
          valid
            ? "font-medium text-emerald-700"
            : "text-slate-500"
        }`}
      >
        {text}
      </span>

    </div>
  );
}


// =====================================================
// READ ONLY INFORMATION
// =====================================================

function ReadOnlyInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>

      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>


      <div className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">

        <p className="break-words text-sm font-medium text-slate-700">
          {value || "Not configured"}
        </p>

      </div>

    </div>
  );
}