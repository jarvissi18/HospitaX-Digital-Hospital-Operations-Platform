import { useEffect, useState } from "react";
import { X, UserRound, Save } from "lucide-react";
import { toast } from "react-toastify";

import type {
  Housekeeper,
  HousekeeperCreate,
} from "../../types/housekeeper";

import {
  createHousekeeper,
  updateHousekeeper,
} from "../../services/housekeeperApi";

interface Props {
  open: boolean;
  housekeeper?: Housekeeper | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormErrors {
  full_name: string;
  employee_code: string;
  phone: string;
  email: string;
}

const emptyForm: HousekeeperCreate = {
  full_name: "",
  employee_code: "",
  phone: "",
  email: "",
  status: "Active",
  notes: "",
};

const emptyErrors: FormErrors = {
  full_name: "",
  employee_code: "",
  phone: "",
  email: "",
};

export default function HousekeeperFormModal({
  open,
  housekeeper,
  onClose,
  onSuccess,
}: Props) {
  const [form, setForm] =
    useState<HousekeeperCreate>(emptyForm);

  const [errors, setErrors] =
    useState<FormErrors>(emptyErrors);

  const [saving, setSaving] =
    useState(false);

  const isEditMode = Boolean(housekeeper);


  // =====================================================
  // INITIALIZE FORM
  // =====================================================

  useEffect(() => {
    if (!open) {
      return;
    }

    if (housekeeper) {
      setForm({
        full_name: housekeeper.full_name,
        employee_code: housekeeper.employee_code,
        phone: housekeeper.phone,
        email: housekeeper.email ?? "",
        status: housekeeper.status,
        notes: housekeeper.notes ?? "",
      });
    } else {
      setForm(emptyForm);
    }

    setErrors(emptyErrors);
  }, [open, housekeeper]);


  // =====================================================
  // CHANGE
  // =====================================================

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement |
      HTMLTextAreaElement |
      HTMLSelectElement
    >
  ) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  }


  // =====================================================
  // VALIDATION
  // =====================================================

  function validate(): boolean {
    const nextErrors: FormErrors = {
      full_name: "",
      employee_code: "",
      phone: "",
      email: "",
    };

    let valid = true;

    if (!form.full_name.trim()) {
      nextErrors.full_name =
        "Full name is required.";

      valid = false;
    }

    if (!form.employee_code.trim()) {
      nextErrors.employee_code =
        "Employee code is required.";

      valid = false;
    }

    if (!/^[0-9]{10}$/.test(form.phone)) {
      nextErrors.phone =
        "Enter a valid 10-digit mobile number.";

      valid = false;
    }

    if (
      form.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email
      )
    ) {
      nextErrors.email =
        "Enter a valid email address.";

      valid = false;
    }

    setErrors(nextErrors);

    return valid;
  }


  // =====================================================
  // SUBMIT
  // =====================================================

  async function handleSubmit() {
    if (!validate()) {
      return;
    }

    try {
      setSaving(true);

      const payload: HousekeeperCreate = {
        full_name: form.full_name.trim(),
        employee_code:
          form.employee_code.trim(),
        phone: form.phone.trim(),
        email:
          form.email?.trim() || null,
        status: form.status,
        notes:
          form.notes?.trim() || null,
      };

      if (housekeeper) {
        await updateHousekeeper(
          housekeeper.id,
          payload
        );

        toast.success(
          "Housekeeper updated successfully."
        );
      } else {
        await createHousekeeper(payload);

        toast.success(
          "Housekeeper added successfully."
        );
      }

      onSuccess();
      onClose();

      setForm(emptyForm);
      setErrors(emptyErrors);

    } catch (error) {
      console.error(
        "Housekeeper save error:",
        error
      );

      toast.error(
        "Unable to save housekeeper."
      );
    } finally {
      setSaving(false);
    }
  }


  // =====================================================
  // CLOSED
  // =====================================================

  if (!open) {
    return null;
  }


  // =====================================================
  // MODAL
  // =====================================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex items-center justify-between border-b border-slate-100 px-7 py-6">

          <div className="flex items-center gap-4">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <UserRound size={22} />
            </div>

            <div>

              <h2 className="text-xl font-bold text-slate-900">
                {isEditMode
                  ? "Edit Housekeeper"
                  : "Add Housekeeper"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {isEditMode
                  ? "Update staff information."
                  : "Register a new housekeeping staff member."}
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>

        </div>


        {/* =================================================
            BODY
        ================================================= */}

        <div className="space-y-5 p-7">

          {/* Full Name */}

          <div>

            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Full Name
            </label>

            <input
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              placeholder="Enter housekeeper name"
              className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 focus:ring-blue-50 ${
                errors.full_name
                  ? "border-red-300 focus:border-red-400"
                  : "border-slate-200 focus:border-blue-400"
              }`}
            />

            {errors.full_name && (
              <p className="mt-1.5 text-xs text-red-500">
                {errors.full_name}
              </p>
            )}

          </div>


          {/* Employee Code + Phone */}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Employee Code
              </label>

              <input
                name="employee_code"
                value={form.employee_code}
                onChange={handleChange}
                placeholder="e.g. HK-003"
                className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 focus:ring-blue-50 ${
                  errors.employee_code
                    ? "border-red-300 focus:border-red-400"
                    : "border-slate-200 focus:border-blue-400"
                }`}
              />

              {errors.employee_code && (
                <p className="mt-1.5 text-xs text-red-500">
                  {errors.employee_code}
                </p>
              )}

            </div>


            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Mobile Number
              </label>

              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                inputMode="numeric"
                maxLength={10}
                className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 focus:ring-blue-50 ${
                  errors.phone
                    ? "border-red-300 focus:border-red-400"
                    : "border-slate-200 focus:border-blue-400"
                }`}
              />

              {errors.phone && (
                <p className="mt-1.5 text-xs text-red-500">
                  {errors.phone}
                </p>
              )}

            </div>

          </div>


          {/* Email + Status */}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Email
              </label>

              <input
                type="email"
                name="email"
                value={form.email ?? ""}
                onChange={handleChange}
                placeholder="staff@example.com"
                className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 focus:ring-blue-50 ${
                  errors.email
                    ? "border-red-300 focus:border-red-400"
                    : "border-slate-200 focus:border-blue-400"
                }`}
              />

              {errors.email && (
                <p className="mt-1.5 text-xs text-red-500">
                  {errors.email}
                </p>
              )}

            </div>


            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Status
              </label>

              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              >
                <option value="Active">
                  Active
                </option>

                <option value="Inactive">
                  Inactive
                </option>
              </select>

            </div>

          </div>


          {/* Notes */}

          <div>

            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Notes
              <span className="ml-1 font-normal text-slate-400">
                (Optional)
              </span>
            </label>

            <textarea
              name="notes"
              value={form.notes ?? ""}
              onChange={handleChange}
              rows={3}
              placeholder="Add any relevant staff notes..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />

          </div>

        </div>


        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-7 py-5">

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={17} />

            {saving
              ? "Saving..."
              : isEditMode
              ? "Update Housekeeper"
              : "Add Housekeeper"}
          </button>

        </div>

      </div>

    </div>
  );
}