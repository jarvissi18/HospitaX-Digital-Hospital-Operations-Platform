import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import {
  Activity,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import {
  getSettings,
  updateSettings,
  type Settings,
} from "../../services/settingsApi";

// =====================================================
// TYPES
// =====================================================

interface HospitalForm {
  hospital_name: string;
  hospital_address: string;
  hospital_phone: string;
  hospital_email: string;
}

// =====================================================
// DEFAULT FORM
// =====================================================

const EMPTY_FORM: HospitalForm = {
  hospital_name: "",
  hospital_address: "",
  hospital_phone: "",
  hospital_email: "",
};

// =====================================================
// INPUT CLASS
// =====================================================

const INPUT_CLASS = `
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
`;

// =====================================================
// PAGE
// =====================================================

export default function HospitalSettings() {
  const navigate = useNavigate();

  // ---------------------------------------------------
  // STATE
  // ---------------------------------------------------

  const [settings, setSettings] = useState<Settings | null>(null);

  const [form, setForm] =
    useState<HospitalForm>(EMPTY_FORM);

  const [originalForm, setOriginalForm] =
    useState<HospitalForm>(EMPTY_FORM);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  // ---------------------------------------------------
  // LOAD
  // ---------------------------------------------------

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");

      const data = await getSettings();

      setSettings(data);

      const hospitalForm: HospitalForm = {
        hospital_name: data.hospital_name ?? "",
        hospital_address: data.hospital_address ?? "",
        hospital_phone: data.hospital_phone ?? "",
        hospital_email: data.hospital_email ?? "",
      };

      setForm(hospitalForm);
      setOriginalForm(hospitalForm);
    } catch (err) {
      console.error("Hospital settings load error:", err);

      setError(
        "Unable to load hospital information. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------
  // FIELD CHANGE
  // ---------------------------------------------------

  function handleChange(
    field: keyof HospitalForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  // ---------------------------------------------------
  // DIRTY STATE
  // ---------------------------------------------------

  const hasChanges =
    form.hospital_name !== originalForm.hospital_name ||
    form.hospital_address !== originalForm.hospital_address ||
    form.hospital_phone !== originalForm.hospital_phone ||
    form.hospital_email !== originalForm.hospital_email;

  // ---------------------------------------------------
  // RESET
  // ---------------------------------------------------

  function handleReset() {
    if (!hasChanges || saving) {
      return;
    }

    setForm(originalForm);

    toast.info("Changes have been discarded.");
  }

  // ---------------------------------------------------
  // SAVE
  // ---------------------------------------------------

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!settings) {
      toast.error(
        "Hospital settings are unavailable."
      );
      return;
    }

    const hospitalName =
      form.hospital_name.trim();

    const hospitalAddress =
      form.hospital_address.trim();

    const hospitalPhone =
      form.hospital_phone.trim();

    const hospitalEmail =
      form.hospital_email.trim().toLowerCase();

    // -----------------------------------------------
    // VALIDATION
    // -----------------------------------------------

    if (!hospitalName) {
      toast.error("Hospital name is required.");
      return;
    }

    if (
      hospitalEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        hospitalEmail
      )
    ) {
      toast.error(
        "Please enter a valid hospital email."
      );
      return;
    }

    if (
      hospitalPhone &&
      !/^[0-9+\-\s()]{7,20}$/.test(
        hospitalPhone
      )
    ) {
      toast.error(
        "Please enter a valid hospital phone number."
      );
      return;
    }

    try {
      setSaving(true);

      // ---------------------------------------------
      // UPDATE SETTINGS
      // ---------------------------------------------
      //
      // IMPORTANT:
      // No Voice AI fields are sent.
      //
      // Administrator information is preserved.
      // ---------------------------------------------

      const updatedSettings =
        await updateSettings({
          hospital_name: hospitalName,
          hospital_address: hospitalAddress,
          hospital_phone: hospitalPhone,
          hospital_email: hospitalEmail,

          admin_name: settings.admin_name ?? "",
          admin_email: settings.admin_email ?? "",
          admin_phone: settings.admin_phone ?? "",
          admin_role: settings.admin_role ?? "",
        });

      // ---------------------------------------------
      // UPDATE LOCAL STATE
      // ---------------------------------------------

      setSettings(updatedSettings);

      const updatedForm: HospitalForm = {
        hospital_name:
          updatedSettings.hospital_name ?? "",

        hospital_address:
          updatedSettings.hospital_address ?? "",

        hospital_phone:
          updatedSettings.hospital_phone ?? "",

        hospital_email:
          updatedSettings.hospital_email ?? "",
      };

      setForm(updatedForm);
      setOriginalForm(updatedForm);

      toast.success(
        "Hospital information updated successfully."
      );
    } catch (err: any) {
      console.error(
        "Hospital settings update error:",
        err
      );

      const detail =
        err?.response?.data?.detail;

      let message =
        "Unable to update hospital information.";

      if (typeof detail === "string") {
        message = detail;
      }

      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
            <RefreshCw
              size={24}
              className="animate-spin text-blue-600"
            />
          </div>

          <p className="mt-4 text-sm font-semibold text-slate-700">
            Loading hospital information...
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Please wait while we retrieve your settings.
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
            <Building2
              size={28}
              className="text-red-500"
            />
          </div>

          <h2 className="mt-5 text-xl font-bold text-slate-900">
            Hospital information unavailable
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error}
          </p>

          <button
            type="button"
            onClick={() => void loadSettings()}
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
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // =====================================================
  // SAFETY CHECK
  // =====================================================

  if (!settings) {
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
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-400">
              <button
                type="button"
                onClick={() => navigate("/settings")}
                className="transition hover:text-blue-600"
              >
                Settings
              </button>

              <span>/</span>

              <span className="text-slate-600">
                Hospital Information
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
                <Building2
                  size={23}
                  className="text-blue-600"
                />
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  Hospital Information
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Manage your hospital identity and contact information.
                </p>
              </div>
            </div>
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
                Configuration
              </p>

              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                <span className="text-sm font-bold text-emerald-700">
                  Active
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

        <form
          onSubmit={handleSubmit}
          className="mx-auto w-full max-w-5xl space-y-6 pb-24"
        >

          {/* =================================================
              HOSPITAL IDENTITY
          ================================================= */}

          <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">

            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                  <Building2
                    size={19}
                    className="text-blue-600"
                  />
                </div>

                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Hospital Identity
                  </h2>

                  <p className="mt-0.5 text-sm text-slate-500">
                    Basic information used across the HospitaX platform.
                  </p>
                </div>

              </div>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-2">

              {/* NAME */}

              <FormField
                label="Hospital Name"
                required
                icon={Building2}
              >
                <input
                  type="text"
                  value={form.hospital_name}
                  onChange={(event) =>
                    handleChange(
                      "hospital_name",
                      event.target.value
                    )
                  }
                  placeholder="Enter hospital name"
                  disabled={saving}
                  autoComplete="organization"
                  className={INPUT_CLASS}
                />
              </FormField>

              {/* EMAIL */}

              <FormField
                label="Hospital Email"
                icon={Mail}
              >
                <input
                  type="email"
                  value={form.hospital_email}
                  onChange={(event) =>
                    handleChange(
                      "hospital_email",
                      event.target.value
                    )
                  }
                  placeholder="hospital@example.com"
                  disabled={saving}
                  autoComplete="email"
                  className={INPUT_CLASS}
                />
              </FormField>

              {/* PHONE */}

              <FormField
                label="Hospital Phone"
                icon={Phone}
              >
                <input
                  type="tel"
                  value={form.hospital_phone}
                  onChange={(event) =>
                    handleChange(
                      "hospital_phone",
                      event.target.value
                    )
                  }
                  placeholder="+91 98765 43210"
                  disabled={saving}
                  autoComplete="tel"
                  className={INPUT_CLASS}
                />
              </FormField>

              {/* ADDRESS */}

              <FormField
                label="Hospital Address"
                icon={MapPin}
                fullWidth
              >
                <textarea
                  value={form.hospital_address}
                  onChange={(event) =>
                    handleChange(
                      "hospital_address",
                      event.target.value
                    )
                  }
                  placeholder="Enter complete hospital address"
                  rows={4}
                  disabled={saving}
                  autoComplete="street-address"
                  className="
                    w-full
                    resize-none
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50
                    px-4
                    py-3
                    text-sm
                    leading-6
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
              </FormField>

            </div>
          </section>

          {/* =================================================
              PREVIEW
          ================================================= */}

          <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">

            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                  <CheckCircle2
                    size={19}
                    className="text-emerald-600"
                  />
                </div>

                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Information Preview
                  </h2>

                  <p className="mt-0.5 text-sm text-slate-500">
                    Review the current hospital configuration.
                  </p>
                </div>

              </div>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">

              <PreviewItem
                label="Hospital"
                value={
                  form.hospital_name ||
                  "Not configured"
                }
                icon={Building2}
              />

              <PreviewItem
                label="Email"
                value={
                  form.hospital_email ||
                  "Not configured"
                }
                icon={Mail}
              />

              <PreviewItem
                label="Phone"
                value={
                  form.hospital_phone ||
                  "Not configured"
                }
                icon={Phone}
              />

            </div>
          </section>

          {/* =================================================
              SECURITY NOTICE
          ================================================= */}

          <section className="rounded-2xl border border-slate-200/80 bg-slate-50/70 px-5 py-4">

            <div className="flex items-start gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                <ShieldCheck
                  size={17}
                  className="text-slate-500"
                />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Administrative Settings
                </h3>

                <p className="mt-0.5 text-xs leading-5 text-slate-500">
                  Hospital information is part of the platform-wide configuration.
                  Changes may be visible across dashboards, reports and operational modules.
                </p>
              </div>

            </div>
          </section>

          {/* =================================================
              ACTION BAR
          ================================================= */}

          <div className="sticky bottom-0 z-20 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">

            {/* STATUS */}

            <div className="flex items-center gap-2">

              <span
                className={`h-2 w-2 rounded-full ${
                  hasChanges
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
              />

              <span className="text-xs font-medium text-slate-500">
                {hasChanges
                  ? "You have unsaved changes"
                  : "All changes saved"}
              </span>

            </div>

            {/* ACTIONS */}

            <div className="flex flex-wrap items-center gap-2">

              <button
                type="button"
                onClick={() => navigate("/settings")}
                disabled={saving}
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
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                <ArrowLeft size={16} />
                Back
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={!hasChanges || saving}
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
                Reset
              </button>

              <button
                type="submit"
                disabled={saving || !hasChanges}
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
                  disabled:hover:translate-y-0
                "
              >
                {saving ? (
                  <RefreshCw
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
  fullWidth = false,
  children,
}: {
  label: string;
  required?: boolean;
  icon: React.ElementType;
  fullWidth?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={
        fullWidth
          ? "md:col-span-2"
          : ""
      }
    >
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
// PREVIEW ITEM
// =====================================================

function PreviewItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">

      <div className="flex items-center gap-2">
        <Icon
          size={15}
          className="text-slate-400"
        />

        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>
      </div>

      <p className="mt-2 truncate text-sm font-bold text-slate-800">
        {value}
      </p>

    </div>
  );
}