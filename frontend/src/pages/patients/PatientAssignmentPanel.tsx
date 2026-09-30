import {
  BedDouble,
  Building2,
  CheckCircle2,
  ChevronDown,
  Edit3,
  History,
  Hospital,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { toast } from "react-toastify";

import api from "../../services/api";

import type { PatientAssignment } from "../../services/patientApi";


// =====================================================
// TYPES
// =====================================================


// =====================================================
// STRUCTURE TYPES
// =====================================================

interface Department {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  is_active: boolean;
}

interface Ward {
  id: number;
  name: string;
  ward_type: string;
  floor_id: number;
  description?: string | null;
  is_active: boolean;
}

interface Room {
  id: number;
  room_number: string;
  room_type: string;
  capacity: number;
  status: string;
  ward_id: number;
  is_active: boolean;
}

interface Bed {
  id: number;
  bed_number: string;
  bed_type: string;
  status: string;
  room_id: number;
  is_active: boolean;
}


// =====================================================
// STAFF TYPE
// =====================================================

interface StaffUser {
  id: number;
  employee_id?: string | null;
  full_name: string;
  email?: string | null;
  role: string;
  is_active: string;
}


// =====================================================
// FORM
// =====================================================

interface AssignmentForm {
  assignment_type: string;

  department_id: string;
  doctor_id: string;
  nurse_id: string;
  ward_id: string;
  bed_id: string;

  notes: string;
}


// =====================================================
// PROPS
// =====================================================

interface Props {
  patientId: number;

  activeAssignment?: PatientAssignment | null;

  onAssignmentChange?: (
    assignment: PatientAssignment | null,
  ) => void;

  canManage?: boolean;
}


// =====================================================
// CONSTANTS
// =====================================================

const ASSIGNMENT_TYPES = [
  {
    value: "Department Assignment",
    label: "Department Assignment",
    description: "Allocate the patient to a department.",
  },
  {
    value: "Doctor Assignment",
    label: "Doctor Assignment",
    description: "Assign a responsible doctor.",
  },
  {
    value: "Nurse Assignment",
    label: "Nurse Assignment",
    description: "Assign a responsible nurse.",
  },
  {
    value: "Ward Assignment",
    label: "Ward Assignment",
    description: "Place the patient in a ward.",
  },
  {
    value: "Bed Assignment",
    label: "Bed Assignment",
    description: "Allocate a ward bed.",
  },
  {
    value: "General Assignment",
    label: "General Assignment",
    description: "General operational patient allocation.",
  },
] as const;


const EMPTY_FORM: AssignmentForm = {
  assignment_type: "General Assignment",

  department_id: "",
  doctor_id: "",
  nurse_id: "",
  ward_id: "",
  bed_id: "",

  notes: "",
};


// =====================================================
// HELPERS
// =====================================================

function getApiError(
  error: unknown,
  fallback: string,
): string {
  const response = (
    error as {
      response?: {
        data?: {
          detail?: string;
        };
      };
    }
  )?.response;

  return (
    response?.data?.detail ||
    fallback
  );
}


function formatDateTime(
  value: string | null | undefined,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(
    [],
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}


function getStatusClasses(
  status: string,
): string {
  switch (status) {
    case "Active":
      return (
        "border-emerald-200 " +
        "bg-emerald-50 " +
        "text-emerald-700"
      );

    case "Transferred":
      return (
        "border-blue-200 " +
        "bg-blue-50 " +
        "text-blue-700"
      );

    case "Released":
      return (
        "border-slate-200 " +
        "bg-slate-100 " +
        "text-slate-600"
      );

    default:
      return (
        "border-slate-200 " +
        "bg-slate-100 " +
        "text-slate-600"
      );
  }
}


// =====================================================
// INPUT CLASS
// =====================================================

const INPUT_CLASS = `
  h-11
  w-full
  rounded-xl
  border
  border-slate-200
  bg-white
  px-3.5
  text-sm
  font-medium
  text-slate-800
  outline-none
  transition
  placeholder:text-slate-400
  focus:border-blue-400
  focus:ring-4
  focus:ring-blue-500/10
  disabled:cursor-not-allowed
  disabled:bg-slate-50
  disabled:text-slate-400
`;

const TEXTAREA_CLASS = `
  min-h-[110px]
  w-full
  resize-y
  rounded-xl
  border
  border-slate-200
  bg-white
  px-3.5
  py-3
  text-sm
  font-medium
  text-slate-800
  outline-none
  transition
  placeholder:text-slate-400
  focus:border-blue-400
  focus:ring-4
  focus:ring-blue-500/10
`;


// =====================================================
// MAIN COMPONENT
// =====================================================

export default function PatientAssignmentPanel({
  patientId,
  activeAssignment: controlledActiveAssignment,
  onAssignmentChange,
  canManage = true,
}: Props) {
  // ===================================================
  // DATA
  // ===================================================

  const [
    internalActiveAssignment,
    setInternalActiveAssignment,
  ] = useState<PatientAssignment | null>(
    controlledActiveAssignment ?? null,
  );

  const [history, setHistory] =
    useState<PatientAssignment[]>([]);

  const [departments, setDepartments] =
    useState<Department[]>([]);

  const [wards, setWards] =
    useState<Ward[]>([]);

  const [rooms, setRooms] =
    useState<Room[]>([]);

  const [beds, setBeds] =
    useState<Bed[]>([]);

  const [staff, setStaff] =
    useState<StaffUser[]>([]);


  // ===================================================
  // PAGE STATE
  // ===================================================

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [structureLoading, setStructureLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [historyError, setHistoryError] =
    useState("");


  // ===================================================
  // MODAL STATE
  // ===================================================

  const [formOpen, setFormOpen] =
    useState(false);

  const [editingAssignment, setEditingAssignment] =
    useState<PatientAssignment | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [releasing, setReleasing] =
    useState(false);

  const [releaseConfirmOpen, setReleaseConfirmOpen] =
    useState(false);


  // ===================================================
  // FORM
  // ===================================================

  const [form, setForm] =
    useState<AssignmentForm>({
      ...EMPTY_FORM,
    });


  // ===================================================
  // SYNC CONTROLLED ASSIGNMENT
  // ===================================================

  useEffect(() => {
    if (
      controlledActiveAssignment !== undefined
    ) {
      setInternalActiveAssignment(
        controlledActiveAssignment,
      );
    }
  }, [
    controlledActiveAssignment,
  ]);


  // ===================================================
  // ACTIVE ASSIGNMENT
  // ===================================================

  const activeAssignment =
    internalActiveAssignment;


  // ===================================================
  // STAFF FILTERS
  // ===================================================

  const doctors = useMemo(
    () =>
      staff.filter(
        (user) =>
          user.role === "Doctor" &&
          user.is_active === "true",
      ),
    [staff],
  );


  const nurses = useMemo(
    () =>
      staff.filter(
        (user) =>
          user.role === "Nurse" &&
          user.is_active === "true",
      ),
    [staff],
  );


  // ===================================================
  // WARD ROOMS
  // ===================================================

  const wardRooms = useMemo(() => {
    if (!form.ward_id) {
      return [];
    }

    const wardId =
      Number(form.ward_id);

    return rooms.filter(
      (room) =>
        room.ward_id === wardId &&
        room.is_active,
    );
  }, [
    rooms,
    form.ward_id,
  ]);


  // ===================================================
  // AVAILABLE BEDS
  // ===================================================

  const availableBeds = useMemo(() => {
    if (!form.ward_id) {
      return [];
    }

    const wardId =
      Number(form.ward_id);

    const roomIds = new Set(
      rooms
        .filter(
          (room) =>
            room.ward_id === wardId &&
            room.is_active,
        )
        .map(
          (room) => room.id,
        ),
    );

    return beds.filter(
      (bed) =>
        bed.is_active &&
        bed.status === "Available" &&
        roomIds.has(bed.room_id),
    );
  }, [
    beds,
    rooms,
    form.ward_id,
  ]);


  // ===================================================
  // LOOKUP MAPS
  // ===================================================

  const departmentMap = useMemo(
    () =>
      new Map(
        departments.map(
          (item) => [
            item.id,
            item,
          ],
        ),
      ),
    [departments],
  );


  const wardMap = useMemo(
    () =>
      new Map(
        wards.map(
          (item) => [
            item.id,
            item,
          ],
        ),
      ),
    [wards],
  );


  const bedMap = useMemo(
    () =>
      new Map(
        beds.map(
          (item) => [
            item.id,
            item,
          ],
        ),
      ),
    [beds],
  );


  const roomMap = useMemo(
    () =>
      new Map(
        rooms.map(
          (item) => [
            item.id,
            item,
          ],
        ),
      ),
    [rooms],
  );


  const staffMap = useMemo(
    () =>
      new Map(
        staff.map(
          (item) => [
            item.id,
            item,
          ],
        ),
      ),
    [staff],
  );


  // ===================================================
  // LOAD ACTIVE ASSIGNMENT
  // ===================================================

  async function loadActiveAssignment() {
    try {
      const response =
        await api.get<PatientAssignment>(
          `/patients/${patientId}/assignments/active`,
        );

      const assignment =
        response.data ?? null;

      setInternalActiveAssignment(
        assignment,
      );

      onAssignmentChange?.(
        assignment,
      );

      return assignment;
    } catch (error) {
      const status =
        (
          error as {
            response?: {
              status?: number;
            };
          }
        )?.response?.status;

      if (status === 404) {
        setInternalActiveAssignment(
          null,
        );

        onAssignmentChange?.(
          null,
        );

        return null;
      }

      throw error;
    }
  }


  // ===================================================
  // LOAD HISTORY
  // ===================================================

  async function loadHistory() {
    try {
      setHistoryLoading(true);
      setHistoryError("");

      const response =
        await api.get<
          PatientAssignment[]
        >(
          `/patients/${patientId}/assignments`,
        );

      setHistory(
        Array.isArray(response.data)
          ? response.data
          : [],
      );
    } catch (error) {
      console.error(
        "Patient assignment history error:",
        error,
      );

      setHistory([]);
      setHistoryError(
        getApiError(
          error,
          "Unable to load assignment history.",
        ),
      );
    } finally {
      setHistoryLoading(false);
    }
  }


  // ===================================================
  // LOAD STRUCTURE
  // ===================================================

  async function loadStructure() {
    try {
      setStructureLoading(true);

      const [
        departmentResponse,
        wardResponse,
        roomResponse,
        bedResponse,
        staffResponse,
      ] = await Promise.all([
        api.get<Department[]>(
          "/departments",
        ),
        api.get<Ward[]>(
          "/wards",
        ),
        api.get<Room[]>(
          "/rooms",
        ),
        api.get<Bed[]>(
          "/beds",
        ),
        api.get<StaffUser[]>(
          "/users",
        ),
      ]);

      setDepartments(
        Array.isArray(
          departmentResponse.data,
        )
          ? departmentResponse.data
          : [],
      );

      setWards(
        Array.isArray(
          wardResponse.data,
        )
          ? wardResponse.data
          : [],
      );

      setRooms(
        Array.isArray(
          roomResponse.data,
        )
          ? roomResponse.data
          : [],
      );

      setBeds(
        Array.isArray(
          bedResponse.data,
        )
          ? bedResponse.data
          : [],
      );

      setStaff(
        Array.isArray(
          staffResponse.data,
        )
          ? staffResponse.data
          : [],
      );
    } catch (error) {
      console.error(
        "Patient assignment structure loading error:",
        error,
      );

      throw error;
    } finally {
      setStructureLoading(false);
    }
  }


  // ===================================================
  // INITIAL LOAD
  // ===================================================

  async function loadAll(
    showRefreshState = false,
  ) {
    try {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      await Promise.all([
        loadActiveAssignment(),
        loadHistory(),
        loadStructure(),
      ]);
    } catch (error) {
      console.error(
        "Patient assignment loading error:",
        error,
      );

      setError(
        getApiError(
          error,
          "Unable to load patient assignment data.",
        ),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }


  useEffect(() => {
    if (
      !Number.isInteger(patientId) ||
      patientId <= 0
    ) {
      setError(
        "Invalid patient record.",
      );

      setLoading(false);

      return;
    }

    void loadAll();
  }, [
    patientId,
  ]);


  // ===================================================
  // FORM RESET
  // ===================================================

  function resetForm() {
    setForm({
      ...EMPTY_FORM,
    });

    setEditingAssignment(null);
  }


  // ===================================================
  // OPEN CREATE
  // ===================================================

  function openCreateForm() {
    resetForm();

    setFormOpen(true);
  }


  // ===================================================
  // OPEN EDIT
  // ===================================================

  function openEditForm(
    assignment: PatientAssignment,
  ) {
    setEditingAssignment(
      assignment,
    );

    setForm({
      assignment_type:
        assignment.assignment_type ||
        "General Assignment",

      department_id:
        assignment.department_id !== null
          ? String(
              assignment.department_id,
            )
          : "",

      doctor_id:
        assignment.doctor_id !== null
          ? String(
              assignment.doctor_id,
            )
          : "",

      nurse_id:
        assignment.nurse_id !== null
          ? String(
              assignment.nurse_id,
            )
          : "",

      ward_id:
        assignment.ward_id !== null
          ? String(
              assignment.ward_id,
            )
          : "",

      bed_id:
        assignment.bed_id !== null
          ? String(
              assignment.bed_id,
            )
          : "",

      notes:
        assignment.notes ?? "",
    });

    setFormOpen(true);
  }


  // ===================================================
  // CLOSE FORM
  // ===================================================

  function closeForm() {
    if (saving) {
      return;
    }

    setFormOpen(false);
    resetForm();
  }


  // ===================================================
  // FIELD UPDATE
  // ===================================================

  function updateField(
    field: keyof AssignmentForm,
    value: string,
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );
  }


  // ===================================================
  // WARD CHANGE
  // ===================================================

  function handleWardChange(
    value: string,
  ) {
    setForm(
      (current) => ({
        ...current,
        ward_id: value,
        bed_id: "",
      }),
    );
  }


  // ===================================================
  // VALIDATION
  // ===================================================

  function validateForm(): boolean {
    if (
      !form.assignment_type.trim()
    ) {
      toast.error(
        "Assignment type is required.",
      );

      return false;
    }

    if (
      form.bed_id &&
      !form.ward_id
    ) {
      toast.error(
        "Ward must be selected when assigning a bed.",
      );

      return false;
    }

    if (
      form.department_id &&
      !departments.some(
        (item) =>
          item.id ===
          Number(
            form.department_id,
          ),
      )
    ) {
      toast.error(
        "Selected department is no longer available.",
      );

      return false;
    }

    if (
      form.doctor_id &&
      !doctors.some(
        (item) =>
          item.id ===
          Number(
            form.doctor_id,
          ),
      ) &&
      !(
        editingAssignment &&
        editingAssignment.doctor_id ===
          Number(
            form.doctor_id,
          )
      )
    ) {
      toast.error(
        "Selected doctor is not available.",
      );

      return false;
    }

    if (
      form.nurse_id &&
      !nurses.some(
        (item) =>
          item.id ===
          Number(
            form.nurse_id,
          ),
      ) &&
      !(
        editingAssignment &&
        editingAssignment.nurse_id ===
          Number(
            form.nurse_id,
          )
      )
    ) {
      toast.error(
        "Selected nurse is not available.",
      );

      return false;
    }

    if (
      form.ward_id &&
      !wards.some(
        (item) =>
          item.id ===
          Number(
            form.ward_id,
          ),
      )
    ) {
      toast.error(
        "Selected ward is not available.",
      );

      return false;
    }

    if (
      form.bed_id
    ) {
      const selectedBed =
        bedMap.get(
          Number(
            form.bed_id,
          ),
        );

      const editingSameBed =
        editingAssignment?.bed_id ===
        Number(
          form.bed_id,
        );

      if (
        !selectedBed ||
        !selectedBed.is_active
      ) {
        toast.error(
          "Selected bed is not available.",
        );

        return false;
      }

      if (
        selectedBed.status !==
          "Available" &&
        !editingSameBed
      ) {
        toast.error(
          "Selected bed is no longer available.",
        );

        return false;
      }
    }

    return true;
  }


  // ===================================================
  // CREATE / UPDATE
  // ===================================================

  async function handleSubmit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload = {
      patient_id: patientId,

      assignment_type:
        form.assignment_type.trim(),

      department_id:
        form.department_id
          ? Number(
              form.department_id,
            )
          : null,

      doctor_id:
        form.doctor_id
          ? Number(
              form.doctor_id,
            )
          : null,

      nurse_id:
        form.nurse_id
          ? Number(
              form.nurse_id,
            )
          : null,

      ward_id:
        form.ward_id
          ? Number(
              form.ward_id,
            )
          : null,

      bed_id:
        form.bed_id
          ? Number(
              form.bed_id,
            )
          : null,

      notes:
        form.notes.trim() ||
        null,
    };

    try {
      setSaving(true);

      let response;

      if (editingAssignment) {
        response =
          await api.put<PatientAssignment>(
            `/patients/${patientId}/assignments/${editingAssignment.id}`,
            payload,
          );

        toast.success(
          "Patient assignment updated successfully.",
        );
      } else {
        response =
          await api.post<PatientAssignment>(
            `/patients/${patientId}/assignments`,
            payload,
          );

        toast.success(
          "Patient assignment created successfully.",
        );
      }

      const assignment =
        response.data;

      setInternalActiveAssignment(
        assignment,
      );

      onAssignmentChange?.(
        assignment,
      );

      setFormOpen(false);
      resetForm();

      await Promise.all([
        loadHistory(),
        loadStructure(),
      ]);
    } catch (error) {
      console.error(
        "Patient assignment save error:",
        error,
      );

      toast.error(
        getApiError(
          error,
          editingAssignment
            ? "Unable to update patient assignment."
            : "Unable to create patient assignment.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }


  // ===================================================
  // RELEASE
  // ===================================================

  async function handleRelease() {
    if (!activeAssignment) {
      return;
    }

    try {
      setReleasing(true);

      const response =
        await api.post<PatientAssignment>(
          `/patients/${patientId}/assignments/${activeAssignment.id}/release`,
        );

      const released =
        response.data;

      setInternalActiveAssignment(
        null,
      );

      onAssignmentChange?.(
        null,
      );

      setReleaseConfirmOpen(
        false,
      );

      toast.success(
        "Patient assignment released successfully.",
      );

      await Promise.all([
        loadHistory(),
        loadStructure(),
      ]);

      void released;
    } catch (error) {
      console.error(
        "Patient assignment release error:",
        error,
      );

      toast.error(
        getApiError(
          error,
          "Unable to release patient assignment.",
        ),
      );
    } finally {
      setReleasing(false);
    }
  }


  // ===================================================
  // ACTIVE ASSIGNMENT DISPLAY
  // ===================================================

  const activeDepartment =
    activeAssignment?.department_id !== null &&
    activeAssignment?.department_id !== undefined
      ? departmentMap.get(
          activeAssignment.department_id,
        )
      : null;


  const activeDoctor =
    activeAssignment?.doctor_id !== null &&
    activeAssignment?.doctor_id !== undefined
      ? staffMap.get(
          activeAssignment.doctor_id,
        )
      : null;


  const activeNurse =
    activeAssignment?.nurse_id !== null &&
    activeAssignment?.nurse_id !== undefined
      ? staffMap.get(
          activeAssignment.nurse_id,
        )
      : null;


  const activeWard =
    activeAssignment?.ward_id !== null &&
    activeAssignment?.ward_id !== undefined
      ? wardMap.get(
          activeAssignment.ward_id,
        )
      : null;


  const activeBed =
    activeAssignment?.bed_id !== null &&
    activeAssignment?.bed_id !== undefined
      ? bedMap.get(
          activeAssignment.bed_id,
        )
      : null;


  const activeRoom =
    activeBed
      ? roomMap.get(
          activeBed.room_id,
        )
      : null;


  // ===================================================
  // RENDER
  // ===================================================

  return (
    <>
      <section
        className="
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-sm
        "
      >
        {/* ============================================
            HEADER
        ============================================ */}

        <div
          className="
            flex
            flex-col
            gap-4
            border-b
            border-slate-100
            bg-slate-50/70
            px-5
            py-5
            sm:flex-row
            sm:items-center
            sm:justify-between
            sm:px-6
          "
        >
          <div
            className="
              flex
              min-w-0
              items-center
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
                bg-blue-50
                text-blue-600
              "
            >
              <ShieldCheck
                size={19}
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
                    text-sm
                    font-bold
                    text-slate-900
                  "
                >
                  Patient Assignment
                </h2>

                {activeAssignment && (
                  <span
                    className={`
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-full
                      border
                      px-2.5
                      py-1
                      text-[9px]
                      font-bold
                      ${getStatusClasses(
                        activeAssignment.status,
                      )}
                    `}
                  >
                    <CheckCircle2
                      size={11}
                    />

                    {activeAssignment.status}
                  </span>
                )}
              </div>

              <p
                className="
                  mt-0.5
                  text-[11px]
                  text-slate-500
                "
              >
                Operational allocation and
                placement history
              </p>
            </div>
          </div>

          <div
            className="
              flex
              flex-wrap
              items-center
              gap-2
            "
          >
            <button
              type="button"
              onClick={() =>
                void loadAll(true)
              }
              disabled={
                refreshing ||
                loading
              }
              className="
                inline-flex
                h-9
                items-center
                gap-2
                rounded-lg
                border
                border-slate-200
                bg-white
                px-3
                text-[10px]
                font-bold
                text-slate-600
                transition
                hover:border-slate-300
                hover:bg-slate-50
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              <RefreshCw
                size={13}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>

            {canManage && (
              <button
                type="button"
                onClick={openCreateForm}
                className="
                  inline-flex
                  h-9
                  items-center
                  gap-2
                  rounded-lg
                  bg-slate-900
                  px-3.5
                  text-[10px]
                  font-bold
                  text-white
                  transition
                  hover:bg-slate-800
                "
              >
                <Plus
                  size={14}
                />

                New Assignment
              </button>
            )}
          </div>
        </div>


        {/* ============================================
            ERROR
        ============================================ */}

        {error && (
          <div
            className="
              flex
              items-start
              gap-3
              border-b
              border-red-100
              bg-red-50
              px-5
              py-3
              text-[11px]
              text-red-700
              sm:px-6
            "
          >
            <X
              size={15}
              className="mt-0.5 shrink-0"
            />

            <span className="flex-1">
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                void loadAll(true)
              }
              className="
                shrink-0
                font-bold
                underline
              "
            >
              Retry
            </button>
          </div>
        )}


        {/* ============================================
            CONTENT
        ============================================ */}

        <div
          className="
            p-5
            sm:p-6
          "
        >
          {loading ? (
            <div
              className="
                flex
                min-h-[180px]
                items-center
                justify-center
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-2
                  text-xs
                  font-semibold
                  text-slate-500
                "
              >
                <Loader2
                  size={17}
                  className="animate-spin"
                />

                Loading assignment data...
              </div>
            </div>
          ) : (
            <>
              {/* ======================================
                  ACTIVE ASSIGNMENT
              ====================================== */}

              {activeAssignment ? (
                <div
                  className="
                    rounded-2xl
                    border
                    border-slate-200
                    bg-slate-50/60
                    p-4
                    sm:p-5
                  "
                >
                  <div
                    className="
                      flex
                      flex-col
                      gap-4
                      lg:flex-row
                      lg:items-start
                      lg:justify-between
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
                            h-8
                            w-8
                            items-center
                            justify-center
                            rounded-lg
                            bg-emerald-50
                            text-emerald-600
                          "
                        >
                          <CheckCircle2
                            size={16}
                          />
                        </div>

                        <div>
                          <p
                            className="
                              text-xs
                              font-bold
                              text-slate-900
                            "
                          >
                            Active Allocation
                          </p>

                          <p
                            className="
                              text-[10px]
                              text-slate-400
                            "
                          >
                            Assignment #
                            {activeAssignment.id}
                          </p>
                        </div>
                      </div>
                    </div>

                    {canManage && (
                      <div
                        className="
                          flex
                          flex-wrap
                          gap-2
                        "
                      >
                        <button
                          type="button"
                          onClick={() =>
                            openEditForm(
                              activeAssignment,
                            )
                          }
                          className="
                            inline-flex
                            h-8
                            items-center
                            gap-1.5
                            rounded-lg
                            border
                            border-slate-200
                            bg-white
                            px-3
                            text-[10px]
                            font-bold
                            text-slate-600
                            transition
                            hover:border-blue-200
                            hover:bg-blue-50
                            hover:text-blue-700
                          "
                        >
                          <Edit3
                            size={13}
                          />

                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setReleaseConfirmOpen(
                              true,
                            )
                          }
                          className="
                            inline-flex
                            h-8
                            items-center
                            gap-1.5
                            rounded-lg
                            border
                            border-red-200
                            bg-white
                            px-3
                            text-[10px]
                            font-bold
                            text-red-600
                            transition
                            hover:bg-red-50
                          "
                        >
                          <Trash2
                            size={13}
                          />

                          Release
                        </button>
                      </div>
                    )}
                  </div>


                  {/* ASSIGNMENT TYPE */}

                  <div
                    className="
                      mt-5
                      flex
                      flex-wrap
                      items-center
                      gap-2
                    "
                  >
                    <span
                      className="
                        rounded-lg
                        bg-blue-50
                        px-2.5
                        py-1.5
                        text-[10px]
                        font-bold
                        text-blue-700
                      "
                    >
                      {activeAssignment.assignment_type}
                    </span>

                    <span
                      className="
                        text-[10px]
                        text-slate-400
                      "
                    >
                      Assigned{" "}
                      {formatDateTime(
                        activeAssignment.assigned_at,
                      )}
                    </span>
                  </div>


                  {/* TARGETS */}

                  <div
                    className="
                      mt-4
                      grid
                      grid-cols-1
                      gap-3
                      sm:grid-cols-2
                      xl:grid-cols-5
                    "
                  >
                    <AssignmentInfo
                      icon={Building2}
                      label="Department"
                      value={
                        activeDepartment?.name ||
                        (
                          activeAssignment.department_id !==
                          null
                            ? `Department #${activeAssignment.department_id}`
                            : "Not assigned"
                        )
                      }
                    />

                    <AssignmentInfo
                      icon={Stethoscope}
                      label="Doctor"
                      value={
                        activeDoctor?.full_name ||
                        (
                          activeAssignment.doctor_id !==
                          null
                            ? `Doctor #${activeAssignment.doctor_id}`
                            : "Not assigned"
                        )
                      }
                    />

                    <AssignmentInfo
                      icon={UsersRound}
                      label="Nurse"
                      value={
                        activeNurse?.full_name ||
                        (
                          activeAssignment.nurse_id !==
                          null
                            ? `Nurse #${activeAssignment.nurse_id}`
                            : "Not assigned"
                        )
                      }
                    />

                    <AssignmentInfo
                      icon={Hospital}
                      label="Ward"
                      value={
                        activeWard?.name ||
                        (
                          activeAssignment.ward_id !==
                          null
                            ? `Ward #${activeAssignment.ward_id}`
                            : "Not assigned"
                        )
                      }
                    />

                    <AssignmentInfo
                      icon={BedDouble}
                      label="Bed"
                      value={
                        activeBed
                          ? `${activeBed.bed_number}${
                              activeRoom
                                ? ` · Room ${activeRoom.room_number}`
                                : ""
                            }`
                          : activeAssignment.bed_id !==
                              null
                            ? `Bed #${activeAssignment.bed_id}`
                            : "Not assigned"
                      }
                    />
                  </div>


                  {/* NOTES */}

                  {activeAssignment.notes && (
                    <div
                      className="
                        mt-4
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        px-4
                        py-3
                      "
                    >
                      <p
                        className="
                          text-[9px]
                          font-bold
                          uppercase
                          tracking-[0.14em]
                          text-slate-400
                        "
                      >
                        Assignment Notes
                      </p>

                      <p
                        className="
                          mt-1
                          whitespace-pre-wrap
                          text-[11px]
                          leading-5
                          text-slate-600
                        "
                      >
                        {activeAssignment.notes}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="
                    rounded-2xl
                    border
                    border-dashed
                    border-slate-200
                    bg-slate-50/50
                    px-5
                    py-8
                    text-center
                  "
                >
                  <div
                    className="
                      mx-auto
                      flex
                      h-11
                      w-11
                      items-center
                      justify-center
                      rounded-xl
                      bg-blue-50
                      text-blue-600
                    "
                  >
                    <MapPin
                      size={19}
                    />
                  </div>

                  <p
                    className="
                      mt-3
                      text-sm
                      font-bold
                      text-slate-800
                    "
                  >
                    No active assignment
                  </p>

                  <p
                    className="
                      mx-auto
                      mt-1
                      max-w-md
                      text-[11px]
                      leading-5
                      text-slate-500
                    "
                  >
                    This patient currently has no
                    active operational allocation.
                  </p>

                  {canManage && (
                    <button
                      type="button"
                      onClick={openCreateForm}
                      className="
                        mt-4
                        inline-flex
                        h-9
                        items-center
                        gap-2
                        rounded-lg
                        bg-slate-900
                        px-4
                        text-[10px]
                        font-bold
                        text-white
                        transition
                        hover:bg-slate-800
                      "
                    >
                      <Plus
                        size={14}
                      />

                      Create Assignment
                    </button>
                  )}
                </div>
              )}


              {/* ======================================
                  HISTORY
              ====================================== */}

              <div
                className="
                  mt-6
                  border-t
                  border-slate-100
                  pt-6
                "
              >
                <div
                  className="
                    flex
                    flex-col
                    gap-3
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                  "
                >
                  <div
                    className="
                      flex
                      items-center
                      gap-2
                    "
                  >
                    <History
                      size={16}
                      className="text-slate-500"
                    />

                    <div>
                      <p
                        className="
                          text-xs
                          font-bold
                          text-slate-800
                        "
                      >
                        Assignment History
                      </p>

                      <p
                        className="
                          mt-0.5
                          text-[10px]
                          text-slate-400
                        "
                      >
                        Previous allocations and
                        transfers are preserved.
                      </p>
                    </div>
                  </div>

                  <span
                    className="
                      w-fit
                      rounded-full
                      bg-slate-100
                      px-2.5
                      py-1
                      text-[9px]
                      font-bold
                      text-slate-500
                    "
                  >
                    {history.length} record
                    {history.length === 1
                      ? ""
                      : "s"}
                  </span>
                </div>


                {historyError && (
                  <div
                    className="
                      mt-4
                      rounded-xl
                      border
                      border-red-100
                      bg-red-50
                      px-4
                      py-3
                      text-[10px]
                      text-red-700
                    "
                  >
                    <div
                      className="
                        flex
                        items-center
                        justify-between
                        gap-3
                      "
                    >
                      <span>
                        {historyError}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          void loadHistory()
                        }
                        className="
                          shrink-0
                          font-bold
                          underline
                        "
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                )}


                {historyLoading ? (
                  <div
                    className="
                      flex
                      min-h-[100px]
                      items-center
                      justify-center
                    "
                  >
                    <div
                      className="
                        flex
                        items-center
                        gap-2
                        text-[10px]
                        font-semibold
                        text-slate-400
                      "
                    >
                      <Loader2
                        size={14}
                        className="animate-spin"
                      />

                      Loading history...
                    </div>
                  </div>
                ) : history.length === 0 ? (
                  <div
                    className="
                      mt-4
                      rounded-xl
                      border
                      border-slate-100
                      bg-slate-50/60
                      px-4
                      py-6
                      text-center
                    "
                  >
                    <p
                      className="
                        text-[11px]
                        font-semibold
                        text-slate-500
                      "
                    >
                      No assignment history
                    </p>
                  </div>
                ) : (
                  <div
                    className="
                      mt-4
                      overflow-x-auto
                      rounded-xl
                      border
                      border-slate-200
                    "
                  >
                    <table
                      className="
                        w-full
                        min-w-[760px]
                        text-left
                      "
                    >
                      <thead>
                        <tr
                          className="
                            border-b
                            border-slate-200
                            bg-slate-50
                          "
                        >
                          <th
                            className="
                              px-4
                              py-3
                              text-[9px]
                              font-bold
                              uppercase
                              tracking-[0.12em]
                              text-slate-400
                            "
                          >
                            Assignment
                          </th>

                          <th
                            className="
                              px-4
                              py-3
                              text-[9px]
                              font-bold
                              uppercase
                              tracking-[0.12em]
                              text-slate-400
                            "
                          >
                            Allocation
                          </th>

                          <th
                            className="
                              px-4
                              py-3
                              text-[9px]
                              font-bold
                              uppercase
                              tracking-[0.12em]
                              text-slate-400
                            "
                          >
                            Assigned
                          </th>

                          <th
                            className="
                              px-4
                              py-3
                              text-[9px]
                              font-bold
                              uppercase
                              tracking-[0.12em]
                              text-slate-400
                            "
                          >
                            Released
                          </th>

                          <th
                            className="
                              px-4
                              py-3
                              text-[9px]
                              font-bold
                              uppercase
                              tracking-[0.12em]
                              text-slate-400
                            "
                          >
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {history.map(
                          (assignment) => {
                            const department =
                              assignment.department_id !==
                              null
                                ? departmentMap.get(
                                    assignment.department_id,
                                  )
                                : null;

                            const doctor =
                              assignment.doctor_id !==
                              null
                                ? staffMap.get(
                                    assignment.doctor_id,
                                  )
                                : null;

                            const nurse =
                              assignment.nurse_id !==
                              null
                                ? staffMap.get(
                                    assignment.nurse_id,
                                  )
                                : null;

                            const ward =
                              assignment.ward_id !==
                              null
                                ? wardMap.get(
                                    assignment.ward_id,
                                  )
                                : null;

                            const bed =
                              assignment.bed_id !==
                              null
                                ? bedMap.get(
                                    assignment.bed_id,
                                  )
                                : null;

                            return (
                              <tr
                                key={
                                  assignment.id
                                }
                                className="
                                  border-b
                                  border-slate-100
                                  last:border-b-0
                                  hover:bg-slate-50/60
                                "
                              >
                                <td
                                  className="
                                    px-4
                                    py-3.5
                                  "
                                >
                                  <div>
                                    <p
                                      className="
                                        text-[10px]
                                        font-bold
                                        text-slate-700
                                      "
                                    >
                                      {
                                        assignment.assignment_type
                                      }
                                    </p>

                                    <p
                                      className="
                                        mt-0.5
                                        text-[9px]
                                        text-slate-400
                                      "
                                    >
                                      #
                                      {
                                        assignment.id
                                      }
                                    </p>
                                  </div>
                                </td>

                                <td
                                  className="
                                    px-4
                                    py-3.5
                                  "
                                >
                                  <div
                                    className="
                                      flex
                                      max-w-[320px]
                                      flex-wrap
                                      gap-1.5
                                    "
                                  >
                                    {department && (
                                      <MiniTag>
                                        Dept:{" "}
                                        {
                                          department.name
                                        }
                                      </MiniTag>
                                    )}

                                    {doctor && (
                                      <MiniTag>
                                        Dr.{" "}
                                        {
                                          doctor.full_name
                                        }
                                      </MiniTag>
                                    )}

                                    {nurse && (
                                      <MiniTag>
                                        Nurse{" "}
                                        {
                                          nurse.full_name
                                        }
                                      </MiniTag>
                                    )}

                                    {ward && (
                                      <MiniTag>
                                        Ward:{" "}
                                        {
                                          ward.name
                                        }
                                      </MiniTag>
                                    )}

                                    {bed && (
                                      <MiniTag>
                                        Bed:{" "}
                                        {
                                          bed.bed_number
                                        }
                                      </MiniTag>
                                    )}

                                    {!department &&
                                      !doctor &&
                                      !nurse &&
                                      !ward &&
                                      !bed && (
                                        <span
                                          className="
                                            text-[9px]
                                            text-slate-400
                                          "
                                        >
                                          No target
                                        </span>
                                      )}
                                  </div>
                                </td>

                                <td
                                  className="
                                    whitespace-nowrap
                                    px-4
                                    py-3.5
                                    text-[9px]
                                    font-medium
                                    text-slate-500
                                  "
                                >
                                  {formatDateTime(
                                    assignment.assigned_at,
                                  )}
                                </td>

                                <td
                                  className="
                                    whitespace-nowrap
                                    px-4
                                    py-3.5
                                    text-[9px]
                                    font-medium
                                    text-slate-500
                                  "
                                >
                                  {formatDateTime(
                                    assignment.released_at,
                                  )}
                                </td>

                                <td
                                  className="
                                    px-4
                                    py-3.5
                                  "
                                >
                                  <span
                                    className={`
                                      inline-flex
                                      rounded-full
                                      border
                                      px-2.5
                                      py-1
                                      text-[9px]
                                      font-bold
                                      ${getStatusClasses(
                                        assignment.status,
                                      )}
                                    `}
                                  >
                                    {
                                      assignment.status
                                    }
                                  </span>
                                </td>
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>


      {/* ==================================================
          ASSIGNMENT MODAL
      ================================================== */}

      {formOpen && (
        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-slate-950/45
            p-4
            backdrop-blur-sm
          "
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeForm();
            }
          }}
        >
          <div
            className="
              flex
              max-h-[92vh]
              w-full
              max-w-3xl
              flex-col
              overflow-hidden
              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-2xl
            "
          >
            {/* MODAL HEADER */}

            <div
              className="
                flex
                items-center
                justify-between
                gap-4
                border-b
                border-slate-100
                px-5
                py-4
                sm:px-6
              "
            >
              <div
                className="
                  flex
                  min-w-0
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
                    bg-blue-50
                    text-blue-600
                  "
                >
                  {editingAssignment ? (
                    <Edit3
                      size={17}
                    />
                  ) : (
                    <Plus
                      size={17}
                    />
                  )}
                </div>

                <div className="min-w-0">
                  <h3
                    className="
                      truncate
                      text-sm
                      font-bold
                      text-slate-900
                    "
                  >
                    {editingAssignment
                      ? "Edit Patient Assignment"
                      : "Create Patient Assignment"}
                  </h3>

                  <p
                    className="
                      mt-0.5
                      text-[10px]
                      text-slate-400
                    "
                  >
                    Configure the patient's
                    operational allocation.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  text-slate-400
                  transition
                  hover:bg-slate-100
                  hover:text-slate-700
                  disabled:opacity-50
                "
              >
                <X
                  size={17}
                />
              </button>
            </div>


            {/* MODAL BODY */}

            <form
              onSubmit={handleSubmit}
              className="
                min-h-0
                overflow-y-auto
              "
            >
              <div
                className="
                  space-y-5
                  p-5
                  sm:p-6
                "
              >
                {/* TYPE */}

                <Field
                  label="Assignment Type"
                  required
                  icon={ShieldCheck}
                >
                  <div className="relative">
                    <select
                      value={
                        form.assignment_type
                      }
                      onChange={(event) =>
                        updateField(
                          "assignment_type",
                          event.target.value,
                        )
                      }
                      className={`
                        ${INPUT_CLASS}
                        appearance-none
                        pr-10
                      `}
                      disabled={saving}
                    >
                      {ASSIGNMENT_TYPES.map(
                        (type) => (
                          <option
                            key={
                              type.value
                            }
                            value={
                              type.value
                            }
                          >
                            {type.label}
                          </option>
                        ),
                      )}
                    </select>

                    <ChevronDown
                      size={15}
                      className="
                        pointer-events-none
                        absolute
                        right-3.5
                        top-1/2
                        -translate-y-1/2
                        text-slate-400
                      "
                    />
                  </div>
                </Field>


                {/* STAFF / DEPARTMENT */}

                <div
                  className="
                    grid
                    grid-cols-1
                    gap-4
                    md:grid-cols-2
                  "
                >
                  <Field
                    label="Department"
                    icon={Building2}
                  >
                    <SelectField
                      value={
                        form.department_id
                      }
                      onChange={(value) =>
                        updateField(
                          "department_id",
                          value,
                        )
                      }
                      disabled={saving}
                      placeholder="Select department"
                    >
                      {departments
                        .filter(
                          (item) =>
                            item.is_active,
                        )
                        .map(
                          (department) => (
                            <option
                              key={
                                department.id
                              }
                              value={
                                department.id
                              }
                            >
                              {department.name}
                              {department.code
                                ? ` · ${department.code}`
                                : ""}
                            </option>
                          ),
                        )}
                    </SelectField>
                  </Field>


                  <Field
                    label="Doctor"
                    icon={Stethoscope}
                  >
                    <SelectField
                      value={
                        form.doctor_id
                      }
                      onChange={(value) =>
                        updateField(
                          "doctor_id",
                          value,
                        )
                      }
                      disabled={saving}
                      placeholder="Select doctor"
                    >
                      {doctors.map(
                        (doctor) => (
                          <option
                            key={
                              doctor.id
                            }
                            value={
                              doctor.id
                            }
                          >
                            {doctor.full_name}
                            {doctor.employee_id
                              ? ` · ${doctor.employee_id}`
                              : ""}
                          </option>
                        ),
                      )}
                    </SelectField>
                  </Field>


                  <Field
                    label="Nurse"
                    icon={UsersRound}
                  >
                    <SelectField
                      value={
                        form.nurse_id
                      }
                      onChange={(value) =>
                        updateField(
                          "nurse_id",
                          value,
                        )
                      }
                      disabled={saving}
                      placeholder="Select nurse"
                    >
                      {nurses.map(
                        (nurse) => (
                          <option
                            key={
                              nurse.id
                            }
                            value={
                              nurse.id
                            }
                          >
                            {nurse.full_name}
                            {nurse.employee_id
                              ? ` · ${nurse.employee_id}`
                              : ""}
                          </option>
                        ),
                      )}
                    </SelectField>
                  </Field>


                  {/* WARD */}

                  <Field
                    label="Ward"
                    icon={Hospital}
                  >
                    <SelectField
                      value={
                        form.ward_id
                      }
                      onChange={
                        handleWardChange
                      }
                      disabled={
                        saving ||
                        structureLoading
                      }
                      placeholder="Select ward"
                    >
                      {wards
                        .filter(
                          (item) =>
                            item.is_active,
                        )
                        .map(
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
                              {ward.ward_type
                                ? ` · ${ward.ward_type}`
                                : ""}
                            </option>
                          ),
                        )}
                    </SelectField>
                  </Field>
                </div>


                {/* BED */}

                <Field
                  label="Bed"
                  icon={BedDouble}
                  hint={
                    form.ward_id
                      ? `${availableBeds.length} available bed${
                          availableBeds.length ===
                          1
                            ? ""
                            : "s"
                        }`
                      : "Select a ward first"
                  }
                >
                  <SelectField
                    value={
                      form.bed_id
                    }
                    onChange={(value) =>
                      updateField(
                        "bed_id",
                        value,
                      )
                    }
                    disabled={
                      saving ||
                      !form.ward_id ||
                      structureLoading
                    }
                    placeholder={
                      form.ward_id
                        ? availableBeds.length >
                          0
                          ? "Select available bed"
                          : "No available beds"
                        : "Select ward first"
                    }
                  >
                    {availableBeds.map(
                      (bed) => {
                        const room =
                          roomMap.get(
                            bed.room_id,
                          );

                        return (
                          <option
                            key={
                              bed.id
                            }
                            value={
                              bed.id
                            }
                          >
                            {bed.bed_number}
                            {" · "}
                            {room
                              ? `Room ${room.room_number}`
                              : "Room unavailable"}
                            {" · "}
                            {bed.bed_type}
                          </option>
                        );
                      },
                    )}
                  </SelectField>

                  {form.ward_id &&
                    wardRooms.length ===
                      0 && (
                      <p
                        className="
                          mt-1.5
                          text-[9px]
                          text-amber-600
                        "
                      >
                        No active rooms are
                        configured for this ward.
                      </p>
                    )}
                </Field>


                {/* NOTES */}

                <Field
                  label="Assignment Notes"
                  icon={Edit3}
                  hint="Optional"
                >
                  <textarea
                    value={
                      form.notes
                    }
                    onChange={(event) =>
                      updateField(
                        "notes",
                        event.target.value,
                      )
                    }
                    placeholder="Add operational instructions or allocation notes..."
                    className={
                      TEXTAREA_CLASS
                    }
                    maxLength={2000}
                    disabled={saving}
                  />

                  <div
                    className="
                      mt-1
                      text-right
                      text-[9px]
                      text-slate-400
                    "
                  >
                    {form.notes.length}
                    /2000
                  </div>
                </Field>


                {/* INFO */}

                <div
                  className="
                    rounded-xl
                    border
                    border-blue-100
                    bg-blue-50/60
                    px-4
                    py-3
                  "
                >
                  <p
                    className="
                      text-[9px]
                      font-bold
                      uppercase
                      tracking-[0.12em]
                      text-blue-700
                    "
                  >
                    Assignment validation
                  </p>

                  <p
                    className="
                      mt-1
                      text-[10px]
                      leading-5
                      text-blue-700/75
                    "
                  >
                    Active staff, departments,
                    wards and available beds are
                    validated again by the backend
                    before the assignment is saved.
                  </p>
                </div>
              </div>


              {/* MODAL FOOTER */}

              <div
                className="
                  sticky
                  bottom-0
                  flex
                  flex-col-reverse
                  gap-2
                  border-t
                  border-slate-100
                  bg-white
                  px-5
                  py-4
                  sm:flex-row
                  sm:justify-end
                  sm:px-6
                "
              >
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="
                    inline-flex
                    h-10
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-5
                    text-[10px]
                    font-bold
                    text-slate-600
                    transition
                    hover:bg-slate-50
                    disabled:opacity-50
                  "
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="
                    inline-flex
                    h-10
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-slate-900
                    px-5
                    text-[10px]
                    font-bold
                    text-white
                    transition
                    hover:bg-slate-800
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >
                  {saving ? (
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                  ) : (
                    <CheckCircle2
                      size={14}
                    />
                  )}

                  {editingAssignment
                    ? "Save Changes"
                    : "Create Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ==================================================
          RELEASE CONFIRMATION
      ================================================== */}

      {releaseConfirmOpen &&
        activeAssignment && (
          <div
            className="
              fixed
              inset-0
              z-[110]
              flex
              items-center
              justify-center
              bg-slate-950/50
              p-4
              backdrop-blur-sm
            "
          >
            <div
              className="
                w-full
                max-w-md
                rounded-2xl
                border
                border-slate-200
                bg-white
                p-5
                shadow-2xl
                sm:p-6
              "
            >
              <div
                className="
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
                    bg-red-50
                    text-red-600
                  "
                >
                  <Trash2
                    size={18}
                  />
                </div>

                <div>
                  <h3
                    className="
                      text-sm
                      font-bold
                      text-slate-900
                    "
                  >
                    Release assignment?
                  </h3>

                  <p
                    className="
                      mt-1
                      text-[11px]
                      leading-5
                      text-slate-500
                    "
                  >
                    This will release the active
                    patient allocation. If a bed is
                    linked, the backend will return it
                    to Available.
                  </p>
                </div>
              </div>

              <div
                className="
                  mt-5
                  flex
                  flex-col-reverse
                  gap-2
                  sm:flex-row
                  sm:justify-end
                "
              >
                <button
                  type="button"
                  onClick={() =>
                    setReleaseConfirmOpen(
                      false,
                    )
                  }
                  disabled={releasing}
                  className="
                    inline-flex
                    h-10
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-5
                    text-[10px]
                    font-bold
                    text-slate-600
                    hover:bg-slate-50
                  "
                >
                  Keep Assignment
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void handleRelease()
                  }
                  disabled={releasing}
                  className="
                    inline-flex
                    h-10
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-red-600
                    px-5
                    text-[10px]
                    font-bold
                    text-white
                    hover:bg-red-700
                    disabled:opacity-60
                  "
                >
                  {releasing ? (
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                  ) : (
                    <Trash2
                      size={14}
                    />
                  )}

                  Release
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
}


// =====================================================
// ASSIGNMENT INFO
// =====================================================

function AssignmentInfo({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div
      className="
        min-w-0
        rounded-xl
        border
        border-slate-200
        bg-white
        px-3.5
        py-3
      "
    >
      <div
        className="
          flex
          items-center
          gap-2
        "
      >
        <Icon
          size={14}
          className="shrink-0 text-slate-400"
        />

        <p
          className="
            truncate
            text-[9px]
            font-bold
            uppercase
            tracking-[0.12em]
            text-slate-400
          "
        >
          {label}
        </p>
      </div>

      <p
        className="
          mt-2
          truncate
          text-[11px]
          font-bold
          text-slate-700
        "
        title={value}
      >
        {value}
      </p>
    </div>
  );
}


// =====================================================
// MINI TAG
// =====================================================

function MiniTag({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span
      className="
        inline-flex
        max-w-full
        truncate
        rounded-md
        bg-slate-100
        px-2
        py-1
        text-[8px]
        font-semibold
        text-slate-500
      "
    >
      {children}
    </span>
  );
}


// =====================================================
// FIELD
// =====================================================

function Field({
  label,
  icon: Icon,
  required = false,
  hint,
  children,
}: {
  label: string;
  icon: typeof Building2;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="
          mb-1.5
          flex
          items-center
          justify-between
          gap-3
        "
      >
        <label
          className="
            flex
            items-center
            gap-1.5
            text-[10px]
            font-bold
            text-slate-700
          "
        >
          <Icon
            size={12}
            className="text-slate-400"
          />

          {label}

          {required && (
            <span className="text-red-500">
              *
            </span>
          )}
        </label>

        {hint && (
          <span
            className="
              text-[9px]
              font-medium
              text-slate-400
            "
          >
            {hint}
          </span>
        )}
      </div>

      {children}
    </div>
  );
}


// =====================================================
// SELECT FIELD
// =====================================================

function SelectField({
  value,
  onChange,
  disabled,
  placeholder,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        disabled={disabled}
        className={`
          ${INPUT_CLASS}
          appearance-none
          pr-10
        `}
      >
        <option value="">
          {placeholder}
        </option>

        {children}
      </select>

      <ChevronDown
        size={15}
        className="
          pointer-events-none
          absolute
          right-3.5
          top-1/2
          -translate-y-1/2
          text-slate-400
        "
      />
    </div>
  );
}