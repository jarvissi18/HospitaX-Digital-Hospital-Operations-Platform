import {
  useEffect,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

import {
  Activity,
  CalendarDays,
  CheckCircle2,
  HeartPulse,
  Loader2,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  User,
  UserRound,
  X,
} from "lucide-react";

import { toast } from "react-toastify";

import type { Patient } from "../../types/patient";

import {
  createPatient,
  updatePatient,
} from "../../services/patientApi";

// =====================================================
// TYPES
// =====================================================

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patient?: Patient | null;
}

type PatientForm = Omit<Patient, "id">;

type FormErrors = {
  name: string;
  age: string;
  village: string;
  disease: string;
  mobile: string;
};

// =====================================================
// DEFAULTS
// =====================================================

const EMPTY_FORM: PatientForm = {
  name: "",
  age: 0,
  gender: "Male",
  village: "",
  disease: "",
  mobile: "",
};

const EMPTY_ERRORS: FormErrors = {
  name: "",
  age: "",
  village: "",
  disease: "",
  mobile: "",
};

// =====================================================
// COMPONENT
// =====================================================

export default function PatientFormModal({
  open,
  onClose,
  onSuccess,
  patient,
}: Props) {
  const [form, setForm] =
    useState<PatientForm>({
      ...EMPTY_FORM,
    });

  const [errors, setErrors] =
    useState<FormErrors>({
      ...EMPTY_ERRORS,
    });

  const [loading, setLoading] =
    useState(false);

  // ===================================================
  // INITIALIZE FORM
  // ===================================================

  useEffect(() => {
    if (!open) {
      return;
    }

    if (patient) {
      setForm({
        name: patient.name ?? "",
        age: patient.age ?? 0,
        gender: patient.gender ?? "Male",
        village: patient.village ?? "",
        disease: patient.disease ?? "",
        mobile: patient.mobile ?? "",
      });
    } else {
      setForm({
        ...EMPTY_FORM,
      });
    }

    setErrors({
      ...EMPTY_ERRORS,
    });
  }, [open, patient]);

  // ===================================================
  // ESCAPE KEY
  // ===================================================

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key === "Escape" &&
        !loading
      ) {
        onClose();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open, loading, onClose]);

  // ===================================================
  // DO NOT RENDER WHEN CLOSED
  // ===================================================

  if (!open) {
    return null;
  }

  // ===================================================
  // INPUT CHANGE
  // ===================================================

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement |
      HTMLSelectElement
    >,
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]:
        name === "age"
          ? Number(value)
          : value,
    }));

    setErrors((current) => ({
      ...current,
      [name]:
        name in current
          ? ""
          : current[
              name as keyof FormErrors
            ],
    }));
  };

  // ===================================================
  // MOBILE CHANGE
  // ===================================================

  const handleMobileChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const value =
      event.target.value
        .replace(/\D/g, "")
        .slice(0, 10);

    setForm((current) => ({
      ...current,
      mobile: value,
    }));

    setErrors((current) => ({
      ...current,
      mobile: "",
    }));
  };

  // ===================================================
  // VALIDATION
  // ===================================================

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {
      ...EMPTY_ERRORS,
    };

    let valid = true;

    // Name

    if (!form.name.trim()) {
      nextErrors.name =
        "Patient name is required.";
      valid = false;
    } else if (
      form.name.trim().length < 2
    ) {
      nextErrors.name =
        "Enter at least 2 characters.";
      valid = false;
    }

    // Age

    if (
      !Number.isFinite(form.age) ||
      form.age < 1 ||
      form.age > 120
    ) {
      nextErrors.age =
        "Age must be between 1 and 120.";
      valid = false;
    }

    // Village

    if (!form.village.trim()) {
      nextErrors.village =
        "Village is required.";
      valid = false;
    }

    // Disease

    if (!form.disease.trim()) {
      nextErrors.disease =
        "Disease or condition is required.";
      valid = false;
    }

    // Mobile

    if (
      !/^\d{10}$/.test(
        form.mobile,
      )
    ) {
      nextErrors.mobile =
        "Enter a valid 10-digit mobile number.";
      valid = false;
    }

    setErrors(nextErrors);

    return valid;
  };

  // ===================================================
  // SUBMIT
  // ===================================================

  const handleSubmit = async () => {
    if (loading) {
      return;
    }

    if (!validateForm()) {
      toast.error(
        "Please review the highlighted fields.",
      );

      return;
    }

    try {
      setLoading(true);

      const payload: PatientForm = {
        name: form.name.trim(),
        age: Number(form.age),
        gender: form.gender.trim(),
        village: form.village.trim(),
        disease: form.disease.trim(),
        mobile: form.mobile.trim(),
      };

      if (patient?.id) {
        await updatePatient(
          patient.id,
          payload,
        );

        toast.success(
          "Patient updated successfully.",
        );
      } else {
        await createPatient(
          payload,
        );

        toast.success(
          "Patient registered successfully.",
        );
      }

      setForm({
        ...EMPTY_FORM,
      });

      setErrors({
        ...EMPTY_ERRORS,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(
        "Patient save error:",
        error,
      );

      const message =
        error?.response?.data?.detail ||
        error?.message ||
        "Unable to save patient.";

      toast.error(
        typeof message === "string"
          ? message
          : "Unable to save patient.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // CLOSE
  // ===================================================

  const handleClose = () => {
    if (loading) {
      return;
    }

    onClose();
  };

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div
      className="
        fixed
        inset-0
        z-[200]
        flex
        items-center
        justify-center
        bg-slate-950/50
        p-4
        backdrop-blur-sm
        animate-fadeIn
      "
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          handleClose();
        }
      }}
    >
      {/* =================================================
          MODAL
      ================================================= */}

      <div
        className="
          flex
          max-h-[92vh]
          w-full
          max-w-4xl
          flex-col
          overflow-hidden
          rounded-[28px]
          border
          border-slate-200
          bg-white
          shadow-[0_30px_100px_rgba(15,23,42,0.24)]
          animate-modalPop
        "
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div
          className="
            shrink-0
            border-b
            border-slate-100
            bg-white
            px-6
            py-5
            sm:px-8
          "
        >
          <div
            className="
              flex
              items-start
              justify-between
              gap-4
            "
          >
            {/* TITLE */}

            <div
              className="
                flex
                min-w-0
                items-center
                gap-4
              "
            >
              <div
                className="
                  relative
                  flex
                  h-12
                  w-12
                  shrink-0
                  items-center
                  justify-center
                  overflow-hidden
                  rounded-2xl
                  bg-gradient-to-br
                  from-blue-600
                  to-indigo-600
                  text-white
                  shadow-lg
                  shadow-blue-500/20
                "
              >
                <div
                  className="
                    absolute
                    inset-0
                    bg-white/10
                  "
                />

                <UserRound
                  size={23}
                  strokeWidth={2.1}
                  className="
                    relative
                  "
                />
              </div>

              <div className="min-w-0">
                <div
                  className="
                    flex
                    flex-wrap
                    items-center
                    gap-2
                  "
                >
                  <h2
                    className="
                      truncate
                      text-xl
                      font-bold
                      tracking-tight
                      text-slate-950
                    "
                  >
                    {patient
                      ? "Edit Patient"
                      : "Register Patient"}
                  </h2>

                  <span
                    className="
                      rounded-full
                      border
                      border-blue-100
                      bg-blue-50
                      px-2.5
                      py-1
                      text-[9px]
                      font-bold
                      uppercase
                      tracking-[0.14em]
                      text-blue-700
                    "
                  >
                    {patient
                      ? "Update"
                      : "New Record"}
                  </span>
                </div>

                <p
                  className="
                    mt-1
                    max-w-xl
                    text-xs
                    leading-5
                    text-slate-500
                    sm:text-sm
                  "
                >
                  {patient
                    ? "Update the registered patient information and keep the record accurate."
                    : "Create a secure patient record with the essential registration information."}
                </p>
              </div>
            </div>

            {/* CLOSE */}

            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              title="Close"
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                text-slate-400
                transition
                hover:bg-slate-100
                hover:text-slate-700
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* =================================================
            BODY
        ================================================= */}

        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
          "
        >
          <div
            className="
              space-y-7
              p-6
              sm:p-8
            "
          >
            {/* =================================================
                INTRO CARD
            ================================================= */}

            <div
              className="
                relative
                overflow-hidden
                rounded-2xl
                border
                border-blue-100
                bg-gradient-to-br
                from-blue-50
                via-indigo-50
                to-white
                p-5
              "
            >
              <div
                className="
                  absolute
                  -right-10
                  -top-10
                  h-28
                  w-28
                  rounded-full
                  bg-blue-200/40
                  blur-3xl
                "
              />

              <div
                className="
                  relative
                  flex
                  items-start
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
                    bg-white
                    text-blue-600
                    shadow-sm
                  "
                >
                  <ShieldCheck
                    size={19}
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
                    Patient Registration
                  </p>

                  <p
                    className="
                      mt-1
                      max-w-2xl
                      text-xs
                      leading-5
                      text-slate-500
                    "
                  >
                    Complete the required
                    information below. Required
                    fields are marked with an
                    asterisk.
                  </p>
                </div>
              </div>
            </div>

            {/* =================================================
                PATIENT INFORMATION
            ================================================= */}

            <section>
              <SectionHeader
                icon={User}
                title="Patient Information"
                description="Basic identity and registration details"
              />

              <div
                className="
                  grid
                  gap-5
                  sm:grid-cols-2
                "
              >
                {/* NAME */}

                <FormField
                  label="Patient Name"
                  required
                  error={errors.name}
                  icon={UserRound}
                >
                  <input
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange}
                    autoComplete="name"
                    placeholder="Enter full patient name"
                    className={inputClass(
                      Boolean(
                        errors.name,
                      ),
                    )}
                  />
                </FormField>

                {/* AGE */}

                <FormField
                  label="Age"
                  required
                  error={errors.age}
                  icon={CalendarDays}
                >
                  <input
                    name="age"
                    type="number"
                    min={1}
                    max={120}
                    value={
                      form.age === 0
                        ? ""
                        : form.age
                    }
                    onChange={handleChange}
                    placeholder="Enter age"
                    className={inputClass(
                      Boolean(
                        errors.age,
                      ),
                    )}
                  />
                </FormField>

                {/* GENDER */}

                <FormField
                  label="Gender"
                  required
                  icon={UserRound}
                >
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className={inputClass()}
                  >
                    <option value="Male">
                      Male
                    </option>

                    <option value="Female">
                      Female
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>
                </FormField>

                {/* MOBILE */}

                <FormField
                  label="Mobile Number"
                  required
                  error={errors.mobile}
                  icon={Phone}
                >
                  <input
                    name="mobile"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={10}
                    value={form.mobile}
                    onChange={
                      handleMobileChange
                    }
                    placeholder="10-digit mobile number"
                    className={inputClass(
                      Boolean(
                        errors.mobile,
                      ),
                    )}
                  />
                </FormField>
              </div>
            </section>

            {/* =================================================
                MEDICAL / LOCATION
            ================================================= */}

            <section>
              <SectionHeader
                icon={Activity}
                title="Clinical & Location Details"
                description="Information used for patient records and operational context"
              />

              <div
                className="
                  grid
                  gap-5
                  sm:grid-cols-2
                "
              >
                {/* VILLAGE */}

                <FormField
                  label="Village"
                  required
                  error={errors.village}
                  icon={MapPin}
                >
                  <input
                    name="village"
                    type="text"
                    value={form.village}
                    onChange={handleChange}
                    autoComplete="address-level2"
                    placeholder="Enter village or locality"
                    className={inputClass(
                      Boolean(
                        errors.village,
                      ),
                    )}
                  />
                </FormField>

                {/* DISEASE */}

                <FormField
                  label="Disease / Condition"
                  required
                  error={errors.disease}
                  icon={HeartPulse}
                >
                  <input
                    name="disease"
                    type="text"
                    value={form.disease}
                    onChange={handleChange}
                    placeholder="Enter disease or condition"
                    className={inputClass(
                      Boolean(
                        errors.disease,
                      ),
                    )}
                  />
                </FormField>
              </div>
            </section>

            {/* =================================================
                VALIDATION SUMMARY
            ================================================= */}

            {Object.values(
              errors,
            ).some(Boolean) && (
              <div
                className="
                  flex
                  items-start
                  gap-3
                  rounded-2xl
                  border
                  border-red-100
                  bg-red-50
                  p-4
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
                    bg-red-100
                    text-red-600
                  "
                >
                  <X
                    size={15}
                  />
                </div>

                <div>
                  <p
                    className="
                      text-xs
                      font-bold
                      text-red-700
                    "
                  >
                    Please review the
                    highlighted fields.
                  </p>

                  <p
                    className="
                      mt-0.5
                      text-xs
                      leading-5
                      text-red-500
                    "
                  >
                    Correct the validation
                    errors before saving the
                    patient record.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div
          className="
            flex
            shrink-0
            flex-col-reverse
            gap-4
            border-t
            border-slate-100
            bg-slate-50/80
            px-6
            py-4
            sm:flex-row
            sm:items-center
            sm:justify-between
            sm:px-8
          "
        >
          {/* SECURITY NOTE */}

          <div
            className="
              hidden
              items-center
              gap-2
              text-xs
              text-slate-400
              sm:flex
            "
          >
            <CheckCircle2
              size={14}
              className="text-emerald-500"
            />

            <span>
              Patient record ready for secure
              registration
            </span>
          </div>

          {/* ACTIONS */}

          <div
            className="
              flex
              items-center
              justify-end
              gap-3
            "
          >
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
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
                shadow-sm
                transition
                hover:bg-slate-50
                hover:text-slate-800
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="
                inline-flex
                min-w-[155px]
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
                font-semibold
                text-white
                shadow-lg
                shadow-blue-500/20
                transition
                hover:-translate-y-0.5
                hover:from-blue-700
                hover:to-indigo-700
                hover:shadow-xl
                focus:outline-none
                focus:ring-4
                focus:ring-blue-100
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {loading ? (
                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />

                  Saving...
                </>
              ) : (
                <>
                  <Save size={17} />

                  {patient
                    ? "Save Changes"
                    : "Register Patient"}
                </>
              )}
            </button>
          </div>
        </div>
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
}: {
  icon: typeof User;
  title: string;
  description: string;
}) {
  return (
    <div
      className="
        mb-4
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
          rounded-xl
          bg-slate-100
          text-slate-600
        "
      >
        <Icon size={16} />
      </div>

      <div>
        <h3
          className="
            text-sm
            font-bold
            text-slate-800
          "
        >
          {title}
        </h3>

        <p
          className="
            mt-0.5
            text-xs
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
// FORM FIELD
// =====================================================

function FormField({
  label,
  required = false,
  error,
  icon: Icon,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  icon: typeof User;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        className="
          mb-2
          flex
          items-center
          gap-1.5
          text-xs
          font-semibold
          text-slate-700
        "
      >
        <Icon
          size={14}
          className="text-slate-400"
        />

        <span>
          {label}
        </span>

        {required && (
          <span
            className="text-red-500"
          >
            *
          </span>
        )}
      </label>

      {children}

      {error && (
        <p
          className="
            mt-1.5
            text-xs
            font-medium
            text-red-500
          "
        >
          {error}
        </p>
      )}
    </div>
  );
}

// =====================================================
// INPUT STYLE
// =====================================================

function inputClass(
  hasError = false,
) {
  return `
    h-11
    w-full
    rounded-xl
    border
    ${
      hasError
        ? `
          border-red-300
          bg-red-50/40
          focus:border-red-400
          focus:ring-red-500/10
        `
        : `
          border-slate-200
          bg-slate-50
          focus:border-blue-400
          focus:bg-white
          focus:ring-blue-500/10
        `
    }
    px-3.5
    text-sm
    text-slate-800
    outline-none
    transition-all
    duration-200
    placeholder:text-slate-400
    focus:ring-4
  `;
}