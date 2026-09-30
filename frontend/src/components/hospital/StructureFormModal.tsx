import { useEffect, useState } from "react";
import {
  Building2,
  Layers3,
  Hospital,
  DoorOpen,
  BedDouble,
  X,
  Save,
  Loader2,
} from "lucide-react";
import { toast } from "react-toastify";

import type {
  Department,
  Floor,
  Ward,
  Room,
  Bed,
} from "../../types/hospitalStructure";

import {
  createDepartment,
  updateDepartment,
  createFloor,
  updateFloor,
  createWard,
  updateWard,
  createRoom,
  updateRoom,
  createBed,
  updateBed,
} from "../../services/hospitalStructureApi";

export type StructureEntity =
  | "department"
  | "floor"
  | "ward"
  | "room"
  | "bed";

interface Props {
  open: boolean;
  entity: StructureEntity;
  record?: Department | Floor | Ward | Room | Bed | null;

  departments: Department[];
  floors: Floor[];
  wards: Ward[];
  rooms: Room[];

  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

interface FormState {
  name: string;
  code: string;
  description: string;

  floorNumber: string;
  departmentId: string;

  wardType: string;
  floorId: string;

  roomNumber: string;
  roomType: string;
  capacity: string;
  roomStatus: string;
  wardId: string;

  bedNumber: string;
  bedType: string;
  bedStatus: string;
  roomId: string;

  isActive: boolean;
}

const INITIAL_FORM: FormState = {
  name: "",
  code: "",
  description: "",

  floorNumber: "",
  departmentId: "",

  wardType: "",
  floorId: "",

  roomNumber: "",
  roomType: "General",
  capacity: "1",
  roomStatus: "Available",
  wardId: "",

  bedNumber: "",
  bedType: "Standard",
  bedStatus: "Available",
  roomId: "",

  isActive: true,
};

const ENTITY_META: Record<
  StructureEntity,
  {
    title: string;
    description: string;
    icon: typeof Building2;
  }
> = {
  department: {
    title: "Department",
    description: "Create or update a hospital department.",
    icon: Building2,
  },

  floor: {
    title: "Floor",
    description: "Configure a hospital floor and its department.",
    icon: Layers3,
  },

  ward: {
    title: "Ward",
    description: "Create a patient-care ward under a floor.",
    icon: Hospital,
  },

  room: {
    title: "Room",
    description: "Configure a room and its capacity.",
    icon: DoorOpen,
  },

  bed: {
    title: "Bed",
    description: "Register an individual bed inside a room.",
    icon: BedDouble,
  },
};

export default function StructureForm({
  open,
  entity,
  record,
  departments,
  floors,
  wards,
  rooms,
  onClose,
  onSuccess,
}: Props) {
  const [form, setForm] =
    useState<FormState>(INITIAL_FORM);

  const [errors, setErrors] =
    useState<Record<string, string>>({});

  const [saving, setSaving] =
    useState(false);

  const isEditing = Boolean(record);

  const meta = ENTITY_META[entity];

  const Icon = meta.icon;

  // =====================================================
  // INITIALIZE FORM
  // =====================================================

  useEffect(() => {
    if (!open) {
      return;
    }

    setErrors({});

    if (!record) {
      setForm(INITIAL_FORM);
      return;
    }

    if (entity === "department") {
      const department = record as Department;

      setForm({
        ...INITIAL_FORM,
        name: department.name,
        code: department.code,
        description: department.description ?? "",
        isActive: department.is_active,
      });

      return;
    }

    if (entity === "floor") {
      const floor = record as Floor;

      setForm({
        ...INITIAL_FORM,
        name: floor.name,
        floorNumber: String(floor.floor_number),
        departmentId: String(floor.department_id),
        isActive: floor.is_active,
      });

      return;
    }

    if (entity === "ward") {
      const ward = record as Ward;

      setForm({
        ...INITIAL_FORM,
        name: ward.name,
        wardType: ward.ward_type,
        floorId: String(ward.floor_id),
        description: ward.description ?? "",
        isActive: ward.is_active,
      });

      return;
    }

    if (entity === "room") {
      const room = record as Room;

      setForm({
        ...INITIAL_FORM,
        roomNumber: room.room_number,
        roomType: room.room_type,
        capacity: String(room.capacity),
        roomStatus: room.status,
        wardId: String(room.ward_id),
        isActive: room.is_active,
      });

      return;
    }

    if (entity === "bed") {
      const bed = record as Bed;

      setForm({
        ...INITIAL_FORM,
        bedNumber: bed.bed_number,
        bedType: bed.bed_type,
        bedStatus: bed.status,
        roomId: String(bed.room_id),
        isActive: bed.is_active,
      });
    }
  }, [open, entity, record]);

  // =====================================================
  // INPUT HELPERS
  // =====================================================

  function updateField(
    field: keyof FormState,
    value: string | boolean
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [field]: "",
    }));
  }

  // =====================================================
  // VALIDATION
  // =====================================================

  function validate(): boolean {
    const nextErrors: Record<
      string,
      string
    > = {};

    if (entity === "department") {
      if (!form.name.trim()) {
        nextErrors.name =
          "Department name is required.";
      }

      if (!form.code.trim()) {
        nextErrors.code =
          "Department code is required.";
      }
    }

    if (entity === "floor") {
      if (!form.name.trim()) {
        nextErrors.name =
          "Floor name is required.";
      }

      const floorNumber =
        Number(form.floorNumber);

      if (
        !form.floorNumber ||
        !Number.isInteger(floorNumber) ||
        floorNumber < 0 ||
        floorNumber > 200
      ) {
        nextErrors.floorNumber =
          "Enter a valid floor number.";
      }

      if (!form.departmentId) {
        nextErrors.departmentId =
          "Select a department.";
      }
    }

    if (entity === "ward") {
      if (!form.name.trim()) {
        nextErrors.name =
          "Ward name is required.";
      }

      if (!form.wardType.trim()) {
        nextErrors.wardType =
          "Ward type is required.";
      }

      if (!form.floorId) {
        nextErrors.floorId =
          "Select a floor.";
      }
    }

    if (entity === "room") {
      if (!form.roomNumber.trim()) {
        nextErrors.roomNumber =
          "Room number is required.";
      }

      if (!form.roomType.trim()) {
        nextErrors.roomType =
          "Room type is required.";
      }

      const capacity =
        Number(form.capacity);

      if (
        !form.capacity ||
        !Number.isInteger(capacity) ||
        capacity < 1 ||
        capacity > 100
      ) {
        nextErrors.capacity =
          "Capacity must be between 1 and 100.";
      }

      if (!form.wardId) {
        nextErrors.wardId =
          "Select a ward.";
      }
    }

    if (entity === "bed") {
      if (!form.bedNumber.trim()) {
        nextErrors.bedNumber =
          "Bed number is required.";
      }

      if (!form.bedType.trim()) {
        nextErrors.bedType =
          "Bed type is required.";
      }

      if (!form.roomId) {
        nextErrors.roomId =
          "Select a room.";
      }
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  // =====================================================
  // SUBMIT
  // =====================================================

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!validate()) {
      toast.error(
        "Please correct the highlighted fields."
      );
      return;
    }

    try {
      setSaving(true);

      if (entity === "department") {
        const payload = {
          name: form.name.trim(),
          code: form.code.trim().toUpperCase(),
          description:
            form.description.trim() || null,
          is_active: form.isActive,
        };

        if (record) {
          await updateDepartment(
            record.id,
            payload
          );

          toast.success(
            "Department updated successfully."
          );
        } else {
          await createDepartment(
            payload
          );

          toast.success(
            "Department created successfully."
          );
        }
      }

      if (entity === "floor") {
        const payload = {
          name: form.name.trim(),
          floor_number:
            Number(form.floorNumber),
          department_id:
            Number(form.departmentId),
          is_active: form.isActive,
        };

        if (record) {
          await updateFloor(
            record.id,
            payload
          );

          toast.success(
            "Floor updated successfully."
          );
        } else {
          await createFloor(
            payload
          );

          toast.success(
            "Floor created successfully."
          );
        }
      }

      if (entity === "ward") {
        const payload = {
          name: form.name.trim(),
          ward_type:
            form.wardType.trim(),
          floor_id:
            Number(form.floorId),
          description:
            form.description.trim() || null,
          is_active: form.isActive,
        };

        if (record) {
          await updateWard(
            record.id,
            payload
          );

          toast.success(
            "Ward updated successfully."
          );
        } else {
          await createWard(
            payload
          );

          toast.success(
            "Ward created successfully."
          );
        }
      }

      if (entity === "room") {
        const payload = {
          room_number:
            form.roomNumber.trim(),
          room_type:
            form.roomType.trim(),
          capacity:
            Number(form.capacity),
          status:
            form.roomStatus,
          ward_id:
            Number(form.wardId),
          is_active:
            form.isActive,
        };

        if (record) {
          await updateRoom(
            record.id,
            payload
          );

          toast.success(
            "Room updated successfully."
          );
        } else {
          await createRoom(
            payload
          );

          toast.success(
            "Room created successfully."
          );
        }
      }

      if (entity === "bed") {
        const payload = {
          bed_number:
            form.bedNumber.trim(),
          bed_type:
            form.bedType.trim(),
          status:
            form.bedStatus,
          room_id:
            Number(form.roomId),
          is_active:
            form.isActive,
        };

        if (record) {
          await updateBed(
            record.id,
            payload
          );

          toast.success(
            "Bed updated successfully."
          );
        } else {
          await createBed(
            payload
          );

          toast.success(
            "Bed created successfully."
          );
        }
      }

      await onSuccess();

      onClose();
    } catch (error: any) {
      console.error(
        "Structure form error:",
        error
      );

      const message =
        error?.response?.data?.detail ||
        "Unable to save this record.";

      toast.error(
        Array.isArray(message)
          ? "Please check the form fields."
          : message
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
  // RENDER
  // =====================================================

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/50 bg-white shadow-2xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-7 py-6">

          <div className="flex items-center gap-4">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
              <Icon size={22} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  {isEditing
                    ? `Edit ${meta.title}`
                    : `Add ${meta.title}`}
                </h2>

                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                  Hospital Structure
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                {meta.description}
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
          >
            <X size={20} />
          </button>

        </div>

        {/* =================================================
            FORM
        ================================================= */}

        <form
          onSubmit={handleSubmit}
          className="min-h-0 overflow-y-auto"
        >

          <div className="space-y-6 p-7">

            {/* =================================================
                DEPARTMENT
            ================================================= */}

            {entity === "department" && (
              <>
                <FormInput
                  label="Department Name"
                  required
                  placeholder="e.g. Cardiology"
                  value={form.name}
                  error={errors.name}
                  onChange={(value) =>
                    updateField(
                      "name",
                      value
                    )
                  }
                />

                <FormInput
                  label="Department Code"
                  required
                  placeholder="e.g. CARD"
                  value={form.code}
                  error={errors.code}
                  onChange={(value) =>
                    updateField(
                      "code",
                      value
                    )
                  }
                />

                <FormTextarea
                  label="Description"
                  placeholder="Brief description of this department..."
                  value={form.description}
                  error={
                    errors.description
                  }
                  onChange={(value) =>
                    updateField(
                      "description",
                      value
                    )
                  }
                />
              </>
            )}

            {/* =================================================
                FLOOR
            ================================================= */}

            {entity === "floor" && (
              <>
                <FormInput
                  label="Floor Name"
                  required
                  placeholder="e.g. Ground Floor"
                  value={form.name}
                  error={errors.name}
                  onChange={(value) =>
                    updateField(
                      "name",
                      value
                    )
                  }
                />

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                  <FormInput
                    label="Floor Number"
                    required
                    type="number"
                    min={0}
                    max={200}
                    placeholder="e.g. 1"
                    value={form.floorNumber}
                    error={
                      errors.floorNumber
                    }
                    onChange={(value) =>
                      updateField(
                        "floorNumber",
                        value
                      )
                    }
                  />

                  <FormSelect
                    label="Department"
                    required
                    value={
                      form.departmentId
                    }
                    error={
                      errors.departmentId
                    }
                    onChange={(value) =>
                      updateField(
                        "departmentId",
                        value
                      )
                    }
                  >
                    <option value="">
                      Select department
                    </option>

                    {departments.map(
                      (department) => (
                        <option
                          key={
                            department.id
                          }
                          value={
                            department.id
                          }
                        >
                          {department.name} (
                          {
                            department.code
                          }
                          )
                        </option>
                      )
                    )}
                  </FormSelect>

                </div>
              </>
            )}

            {/* =================================================
                WARD
            ================================================= */}

            {entity === "ward" && (
              <>
                <FormInput
                  label="Ward Name"
                  required
                  placeholder="e.g. Cardiology Ward A"
                  value={form.name}
                  error={errors.name}
                  onChange={(value) =>
                    updateField(
                      "name",
                      value
                    )
                  }
                />

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                  <FormInput
                    label="Ward Type"
                    required
                    placeholder="e.g. General"
                    value={form.wardType}
                    error={
                      errors.wardType
                    }
                    onChange={(value) =>
                      updateField(
                        "wardType",
                        value
                      )
                    }
                  />

                  <FormSelect
                    label="Floor"
                    required
                    value={
                      form.floorId
                    }
                    error={
                      errors.floorId
                    }
                    onChange={(value) =>
                      updateField(
                        "floorId",
                        value
                      )
                    }
                  >
                    <option value="">
                      Select floor
                    </option>

                    {floors.map(
                      (floor) => (
                        <option
                          key={
                            floor.id
                          }
                          value={
                            floor.id
                          }
                        >
                          {floor.name} · Level{" "}
                          {
                            floor.floor_number
                          }
                        </option>
                      )
                    )}
                  </FormSelect>

                </div>

                <FormTextarea
                  label="Description"
                  placeholder="Brief description of this ward..."
                  value={form.description}
                  error={
                    errors.description
                  }
                  onChange={(value) =>
                    updateField(
                      "description",
                      value
                    )
                  }
                />
              </>
            )}

            {/* =================================================
                ROOM
            ================================================= */}

            {entity === "room" && (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                  <FormInput
                    label="Room Number"
                    required
                    placeholder="e.g. 201"
                    value={
                      form.roomNumber
                    }
                    error={
                      errors.roomNumber
                    }
                    onChange={(value) =>
                      updateField(
                        "roomNumber",
                        value
                      )
                    }
                  />

                  <FormSelect
                    label="Ward"
                    required
                    value={
                      form.wardId
                    }
                    error={
                      errors.wardId
                    }
                    onChange={(value) =>
                      updateField(
                        "wardId",
                        value
                      )
                    }
                  >
                    <option value="">
                      Select ward
                    </option>

                    {wards.map(
                      (ward) => (
                        <option
                          key={
                            ward.id
                          }
                          value={
                            ward.id
                          }
                        >
                          {ward.name}
                        </option>
                      )
                    )}
                  </FormSelect>

                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                  <FormInput
                    label="Room Type"
                    required
                    placeholder="e.g. Private"
                    value={
                      form.roomType
                    }
                    error={
                      errors.roomType
                    }
                    onChange={(value) =>
                      updateField(
                        "roomType",
                        value
                      )
                    }
                  />

                  <FormInput
                    label="Capacity"
                    required
                    type="number"
                    min={1}
                    max={100}
                    placeholder="Number of beds"
                    value={
                      form.capacity
                    }
                    error={
                      errors.capacity
                    }
                    onChange={(value) =>
                      updateField(
                        "capacity",
                        value
                      )
                    }
                  />

                </div>

                <FormSelect
                  label="Room Status"
                  required
                  value={
                    form.roomStatus
                  }
                  error={
                    errors.roomStatus
                  }
                  onChange={(value) =>
                    updateField(
                      "roomStatus",
                      value
                    )
                  }
                >
                  <option value="Available">
                    Available
                  </option>

                  <option value="Occupied">
                    Occupied
                  </option>

                  <option value="Maintenance">
                    Maintenance
                  </option>

                  <option value="Reserved">
                    Reserved
                  </option>

                  <option value="Cleaning">
                    Cleaning
                  </option>
                </FormSelect>
              </>
            )}

            {/* =================================================
                BED
            ================================================= */}

            {entity === "bed" && (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                  <FormInput
                    label="Bed Number"
                    required
                    placeholder="e.g. B-201-01"
                    value={
                      form.bedNumber
                    }
                    error={
                      errors.bedNumber
                    }
                    onChange={(value) =>
                      updateField(
                        "bedNumber",
                        value
                      )
                    }
                  />

                  <FormSelect
                    label="Room"
                    required
                    value={
                      form.roomId
                    }
                    error={
                      errors.roomId
                    }
                    onChange={(value) =>
                      updateField(
                        "roomId",
                        value
                      )
                    }
                  >
                    <option value="">
                      Select room
                    </option>

                    {rooms.map(
                      (room) => (
                        <option
                          key={
                            room.id
                          }
                          value={
                            room.id
                          }
                        >
                          Room{" "}
                          {
                            room.room_number
                          } ·{" "}
                          {
                            room.room_type
                          }
                        </option>
                      )
                    )}
                  </FormSelect>

                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                  <FormInput
                    label="Bed Type"
                    required
                    placeholder="e.g. Standard"
                    value={
                      form.bedType
                    }
                    error={
                      errors.bedType
                    }
                    onChange={(value) =>
                      updateField(
                        "bedType",
                        value
                      )
                    }
                  />

                  <FormSelect
                    label="Bed Status"
                    required
                    value={
                      form.bedStatus
                    }
                    error={
                      errors.bedStatus
                    }
                    onChange={(value) =>
                      updateField(
                        "bedStatus",
                        value
                      )
                    }
                  >
                    <option value="Available">
                      Available
                    </option>

                    <option value="Occupied">
                      Occupied
                    </option>

                    <option value="Reserved">
                      Reserved
                    </option>

                    <option value="Maintenance">
                      Maintenance
                    </option>

                    <option value="Cleaning">
                      Cleaning
                    </option>
                  </FormSelect>

                </div>
              </>
            )}

            {/* =================================================
                ACTIVE STATUS
            ================================================= */}

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-4">

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Active Record
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Inactive records remain in the database but are not actively used.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateField(
                    "isActive",
                    !form.isActive
                  )
                }
                className={`relative h-7 w-12 rounded-full transition ${
                  form.isActive
                    ? "bg-blue-600"
                    : "bg-slate-300"
                }`}
                aria-label="Toggle active status"
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                    form.isActive
                      ? "left-6"
                      : "left-1"
                  }`}
                />
              </button>

            </div>

          </div>

          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-7 py-5">

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
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

                  {isEditing
                    ? "Save Changes"
                    : `Create ${meta.title}`}
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
// FORM INPUT
// =====================================================

interface InputProps {
  label: string;
  required?: boolean;
  placeholder?: string;
  value: string;
  error?: string;
  type?: string;
  min?: number;
  max?: number;
  onChange: (value: string) => void;
}

function FormInput({
  label,
  required,
  placeholder,
  value,
  error,
  type = "text",
  min,
  max,
  onChange,
}: InputProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      <input
        type={type}
        min={min}
        max={max}
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
          error
            ? "border-red-300 focus:border-red-400 focus:ring-red-50"
            : "border-slate-200 focus:border-blue-400 focus:ring-blue-50"
        }`}
      />

      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}


// =====================================================
// SELECT
// =====================================================

interface SelectProps {
  label: string;
  required?: boolean;
  value: string;
  error?: string;
  children: React.ReactNode;
  onChange: (value: string) => void;
}

function FormSelect({
  label,
  required,
  value,
  error,
  children,
  onChange,
}: SelectProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:ring-4 ${
          error
            ? "border-red-300 focus:border-red-400 focus:ring-red-50"
            : "border-slate-200 focus:border-blue-400 focus:ring-blue-50"
        }`}
      >
        {children}
      </select>

      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}


// =====================================================
// TEXTAREA
// =====================================================

interface TextareaProps {
  label: string;
  placeholder?: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

function FormTextarea({
  label,
  placeholder,
  value,
  error,
  onChange,
}: TextareaProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <textarea
        rows={4}
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className={`w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
          error
            ? "border-red-300 focus:border-red-400 focus:ring-red-50"
            : "border-slate-200 focus:border-blue-400 focus:ring-blue-50"
        }`}
      />

      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}