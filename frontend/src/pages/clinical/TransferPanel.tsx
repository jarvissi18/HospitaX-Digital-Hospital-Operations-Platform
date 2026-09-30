import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Edit3,
  FileText,
  Hospital,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Stethoscope,
  X,
  XCircle,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import { useAuth } from "../../context/AuthContext";

import type { ClinicalEncounter } from "../../services/clinicalEncounterApi";

import {
  approveTransfer,
  cancelTransfer,
  completeTransfer,
  createTransfer,
  getPatientTransfers,
  rejectTransfer,
  startTransfer,
  updateTransfer,
  type PatientTransfer,
  type TransferCreate,
  type TransferPriority,
  type TransferTransportMode,
  type TransferType,
  type TransferUpdate,
} from "../../services/transferApi";

import {
  getBeds,
  getDepartments,
  getRooms,
  getWards,
} from "../../services/hospitalStructureApi";

import type {
  Department,
  Ward,
  Room,
  Bed,
} from "../../types/hospitalStructure";

import {
  getActivePatientAssignment,
  type PatientAssignment,
} from "../../services/patientApi";


/* ============================================================================
 * PROPS
 * ========================================================================== */

interface TransferPanelProps {
  patientId: number;
  encounters: ClinicalEncounter[];
  canManage: boolean;
}


/* ============================================================================
 * CONSTANTS
 * ========================================================================== */

const TRANSFER_TYPES: {
  value: TransferType;
  label: string;
}[] = [
  {
    value: "WARD_TRANSFER",
    label: "Ward Transfer",
  },
  {
    value: "DEPARTMENT_TRANSFER",
    label: "Department Transfer",
  },
  {
    value: "ROOM_TRANSFER",
    label: "Room Transfer",
  },
  {
    value: "BED_TRANSFER",
    label: "Bed Transfer",
  },
  {
    value: "ICU_TRANSFER",
    label: "ICU Transfer",
  },
  {
    value: "EMERGENCY_TRANSFER",
    label: "Emergency Transfer",
  },
  {
    value: "OTHER",
    label: "Other",
  },
];

const PRIORITIES: {
  value: TransferPriority;
  label: string;
}[] = [
  {
    value: "LOW",
    label: "Low",
  },
  {
    value: "MEDIUM",
    label: "Medium",
  },
  {
    value: "HIGH",
    label: "High",
  },
  {
    value: "URGENT",
    label: "Urgent",
  },
];

const TRANSPORT_MODES: {
  value: TransferTransportMode;
  label: string;
}[] = [
  {
    value: "WALKING",
    label: "Walking",
  },
  {
    value: "WHEELCHAIR",
    label: "Wheelchair",
  },
  {
    value: "STRETCHER",
    label: "Stretcher",
  },
  {
    value: "BED",
    label: "Bed",
  },
  {
    value: "AMBULANCE",
    label: "Ambulance",
  },
  {
    value: "OTHER",
    label: "Other",
  },
];


/* ============================================================================
 * FORM
 * ========================================================================== */

interface TransferFormState {
  encounter_id: string;

  transfer_type: TransferType;
  priority: TransferPriority;

  source_department_id: string;
  source_ward_id: string;
  source_room_id: string;
  source_bed_id: string;

  destination_department_id: string;
  destination_ward_id: string;
  destination_room_id: string;
  destination_bed_id: string;

  reason: string;
  clinical_summary: string;
  handover_notes: string;

  transport_mode: TransferTransportMode | "";
  notes: string;
}

const EMPTY_FORM: TransferFormState = {
  encounter_id: "",

  transfer_type: "WARD_TRANSFER",
  priority: "MEDIUM",

  source_department_id: "",
  source_ward_id: "",
  source_room_id: "",
  source_bed_id: "",

  destination_department_id: "",
  destination_ward_id: "",
  destination_room_id: "",
  destination_bed_id: "",

  reason: "",
  clinical_summary: "",
  handover_notes: "",

  transport_mode: "",
  notes: "",
};


/* ============================================================================
 * HELPERS
 * ========================================================================== */

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "Not specified";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not specified";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}


function formatStatus(status: string): string {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}


function formatTransferType(type: string): string {
  return type
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}


function getStatusClasses(status: string): string {
  switch (status) {
    case "REQUESTED":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "APPROVED":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "IN_PROGRESS":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "COMPLETED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "REJECTED":
      return "border-red-200 bg-red-50 text-red-700";

    case "CANCELLED":
      return "border-slate-200 bg-slate-100 text-slate-600";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}


function getPriorityClasses(priority: string): string {
  switch (priority) {
    case "URGENT":
      return "border-red-200 bg-red-50 text-red-700";

    case "HIGH":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "MEDIUM":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "LOW":
      return "border-slate-200 bg-slate-50 text-slate-600";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}


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

  return response?.data?.detail || fallback;
}


/* ============================================================================
 * COMPONENT
 * ========================================================================== */

export default function TransferPanel({
  patientId,
  encounters,
  canManage,
}: TransferPanelProps) {
  const { user } = useAuth();

  const isDoctor = user?.role === "Doctor";
  const isNurse = user?.role === "Nurse";
  const isAdministrator = user?.role === "Administrator";

  const canCreate = canManage && isDoctor;

  const canApprove =
    isDoctor || isAdministrator;

  const canExecute =
    isDoctor ||
    isNurse ||
    isAdministrator;


  /* --------------------------------------------------------------------------
   * Data
   * ------------------------------------------------------------------------ */

  const [transfers, setTransfers] = useState<
    PatientTransfer[]
  >([]);

  const [departments, setDepartments] = useState<
    Department[]
  >([]);

  const [wards, setWards] = useState<Ward[]>([]);

  const [rooms, setRooms] = useState<Room[]>([]);

  const [beds, setBeds] = useState<Bed[]>([]);

  const [activeAssignment, setActiveAssignment] =
    useState<PatientAssignment | null>(null);


  /* --------------------------------------------------------------------------
   * Loading
   * ------------------------------------------------------------------------ */

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [structureLoading, setStructureLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [processingId, setProcessingId] =
    useState<number | null>(null);


  /* --------------------------------------------------------------------------
   * UI
   * ------------------------------------------------------------------------ */

  const [error, setError] =
    useState("");

  const [expandedId, setExpandedId] =
    useState<number | null>(null);

  const [isCreateOpen, setIsCreateOpen] =
    useState(false);

  const [editingId, setEditingId] =
    useState<number | null>(null);


  /* --------------------------------------------------------------------------
   * Form
   * ------------------------------------------------------------------------ */

  const [form, setForm] =
    useState<TransferFormState>(
      EMPTY_FORM,
    );


  /* ==========================================================================
   * LOAD TRANSFERS
   * ======================================================================== */

  async function loadTransfers(
    showRefresh = false,
  ) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const data =
        await getPatientTransfers(patientId);

      setTransfers(
        Array.isArray(data)
          ? data
          : [],
      );
    } catch (err) {
      console.error(
        "Transfer history loading error:",
        err,
      );

      setError(
        getApiError(
          err,
          "Unable to load transfer history.",
        ),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }


  /* ==========================================================================
   * LOAD HOSPITAL STRUCTURE
   * ======================================================================== */

  async function loadStructure() {
    try {
      setStructureLoading(true);

      const [
        departmentData,
        wardData,
        roomData,
        bedData,
        assignment,
      ] = await Promise.all([
        getDepartments(),
        getWards(),
        getRooms(),
        getBeds(),
        getActivePatientAssignment(
          patientId,
        ).catch(() => null),
      ]);

      setDepartments(
        Array.isArray(departmentData)
          ? departmentData
          : [],
      );

      setWards(
        Array.isArray(wardData)
          ? wardData
          : [],
      );

      setRooms(
        Array.isArray(roomData)
          ? roomData
          : [],
      );

      setBeds(
        Array.isArray(bedData)
          ? bedData
          : [],
      );

      setActiveAssignment(
        assignment &&
          typeof assignment === "object"
          ? assignment
          : null,
      );
    } catch (err) {
      console.error(
        "Hospital structure loading error:",
        err,
      );

      toast.error(
        getApiError(
          err,
          "Unable to load hospital structure.",
        ),
      );
    } finally {
      setStructureLoading(false);
    }
  }


  useEffect(() => {
    void loadTransfers();
    void loadStructure();
  }, [patientId]);


  /* ==========================================================================
   * SOURCE LOCATION
   * ======================================================================== */

  const sourceDepartmentId =
    activeAssignment?.department_id ?? null;

  const sourceWardId =
    activeAssignment?.ward_id ?? null;

  const sourceBedId =
    activeAssignment?.bed_id ?? null;

  const sourceRoomId = useMemo(() => {
    if (!sourceBedId) {
      return null;
    }

    const bed = beds.find(
      (item) => item.id === sourceBedId,
    );

    return bed?.room_id ?? null;
  }, [beds, sourceBedId]);


  /* --------------------------------------------------------------------------
   * RESOLVED CURRENT LOCATION
   * ------------------------------------------------------------------------
   * The active patient assignment is the authoritative current location.
   * Transfer history is historical data and must not be used here.
   */

  const currentDepartmentName = useMemo(() => {
    if (!sourceDepartmentId) {
      return "Not assigned";
    }

    return (
      departments.find(
        (department) =>
          department.id === sourceDepartmentId,
      )?.name ??
      `Department #${sourceDepartmentId}`
    );
  }, [departments, sourceDepartmentId]);


  const currentWardName = useMemo(() => {
    if (!sourceWardId) {
      return "Not assigned";
    }

    return (
      wards.find(
        (ward) => ward.id === sourceWardId,
      )?.name ??
      `Ward #${sourceWardId}`
    );
  }, [sourceWardId, wards]);


  const currentRoomName = useMemo(() => {
    if (!sourceRoomId) {
      return "Not assigned";
    }

    return (
      rooms.find(
        (room) => room.id === sourceRoomId,
      )?.room_number ??
      `Room #${sourceRoomId}`
    );
  }, [rooms, sourceRoomId]);


  const currentBedName = useMemo(() => {
    if (!sourceBedId) {
      return "Not assigned";
    }

    return (
      beds.find(
        (bed) => bed.id === sourceBedId,
      )?.bed_number ??
      `Bed #${sourceBedId}`
    );
  }, [beds, sourceBedId]);


  /*
   * Because Ward contains floor_id rather than
   * department_id, we load the floor catalog here.
   */

  const [floors, setFloors] =
    useState<
      {
        id: number;
        name: string;
        floor_number: number;
        department_id: number;
        is_active: boolean;
      }[]
    >([]);


  async function loadFloors() {
    try {
      const data = await import(
        "../../services/hospitalStructureApi"
      ).then(
        (module) => module.getFloors(),
      );

      setFloors(
        Array.isArray(data)
          ? data
          : [],
      );
    } catch (err) {
      console.error(
        "Floor loading error:",
        err,
      );
    }
  }


  useEffect(() => {
    void loadFloors();
  }, []);


  const filteredDestinationWards =
    useMemo(() => {
      if (
        !form.destination_department_id
      ) {
        return wards;
      }

      const departmentId =
        Number(
          form.destination_department_id,
        );

      const departmentFloorIds =
        new Set(
          floors
            .filter(
              (floor) =>
                floor.department_id ===
                departmentId,
            )
            .map(
              (floor) => floor.id,
            ),
        );

      return wards.filter(
        (ward) =>
          departmentFloorIds.has(
            ward.floor_id,
          ),
      );
    }, [
      wards,
      floors,
      form.destination_department_id,
    ]);


  const filteredDestinationRooms =
    useMemo(() => {
      if (
        !form.destination_ward_id
      ) {
        return [];
      }

      return rooms.filter(
        (room) =>
          room.ward_id ===
          Number(
            form.destination_ward_id,
          ),
      );
    }, [
      rooms,
      form.destination_ward_id,
    ]);


  const filteredDestinationBeds =
    useMemo(() => {
      if (
        !form.destination_room_id
      ) {
        return [];
      }

      return beds.filter(
        (bed) =>
          bed.room_id ===
          Number(
            form.destination_room_id,
          ),
      );
    }, [
      beds,
      form.destination_room_id,
    ]);


  /* ==========================================================================
   * ACTIVE / AVAILABLE BEDS
   * ======================================================================== */

  const availableDestinationBeds =
    useMemo(() => {
      return filteredDestinationBeds.filter(
        (bed) =>
          bed.is_active &&
          String(
            bed.status ?? "",
          ).toLowerCase() ===
            "available",
      );
    }, [
      filteredDestinationBeds,
    ]);


  /* ==========================================================================
   * FORM HELPERS
   * ======================================================================== */

  function updateForm(
    field: keyof TransferFormState,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }


  function resetForm() {
    setForm({
      ...EMPTY_FORM,

      encounter_id:
        encounters[0]
          ? String(encounters[0].id)
          : "",

      source_department_id:
        sourceDepartmentId
          ? String(sourceDepartmentId)
          : "",

      source_ward_id:
        sourceWardId
          ? String(sourceWardId)
          : "",

      source_room_id:
        sourceRoomId
          ? String(sourceRoomId)
          : "",

      source_bed_id:
        sourceBedId
          ? String(sourceBedId)
          : "",
    });
  }


  function openCreate() {
    resetForm();
    setEditingId(null);
    setIsCreateOpen(true);
  }


  function closeModal() {
    if (saving) {
      return;
    }

    setIsCreateOpen(false);
    setEditingId(null);
    resetForm();
  }


  /* ==========================================================================
   * EDIT
   * ======================================================================== */

  function openEdit(
    transfer: PatientTransfer,
  ) {
    if (transfer.status !== "REQUESTED") {
      toast.info(
        "Only requested transfers can be edited.",
      );
      return;
    }

    setEditingId(transfer.id);

    setForm({
      encounter_id:
        String(transfer.encounter_id),

      transfer_type:
        transfer.transfer_type,

      priority:
        transfer.priority,

      source_department_id:
        transfer.source_department_id
          ? String(
              transfer.source_department_id,
            )
          : "",

      source_ward_id:
        transfer.source_ward_id
          ? String(
              transfer.source_ward_id,
            )
          : "",

      source_room_id:
        transfer.source_room_id
          ? String(
              transfer.source_room_id,
            )
          : "",

      source_bed_id:
        transfer.source_bed_id
          ? String(
              transfer.source_bed_id,
            )
          : "",

      destination_department_id:
        transfer.destination_department_id
          ? String(
              transfer.destination_department_id,
            )
          : "",

      destination_ward_id:
        transfer.destination_ward_id
          ? String(
              transfer.destination_ward_id,
            )
          : "",

      destination_room_id:
        transfer.destination_room_id
          ? String(
              transfer.destination_room_id,
            )
          : "",

      destination_bed_id:
        transfer.destination_bed_id
          ? String(
              transfer.destination_bed_id,
            )
          : "",

      reason:
        transfer.reason ?? "",

      clinical_summary:
        transfer.clinical_summary ?? "",

      handover_notes:
        transfer.handover_notes ?? "",

      transport_mode:
        transfer.transport_mode
          ? (transfer.transport_mode as TransferTransportMode)
          : "",

      notes:
        transfer.notes ?? "",
    });

    setIsCreateOpen(true);
  }


  /* ==========================================================================
   * CASCADE RESET
   * ======================================================================== */

  function handleDestinationDepartmentChange(
    value: string,
  ) {
    setForm((current) => ({
      ...current,

      destination_department_id:
        value,

      destination_ward_id: "",
      destination_room_id: "",
      destination_bed_id: "",
    }));
  }


  function handleDestinationWardChange(
    value: string,
  ) {
    setForm((current) => ({
      ...current,

      destination_ward_id:
        value,

      destination_room_id: "",
      destination_bed_id: "",
    }));
  }


  function handleDestinationRoomChange(
    value: string,
  ) {
    setForm((current) => ({
      ...current,

      destination_room_id:
        value,

      destination_bed_id: "",
    }));
  }


  /* ==========================================================================
   * CREATE / UPDATE
   * ======================================================================== */

  async function handleSave() {
    if (!canCreate) {
      return;
    }

    if (!form.encounter_id) {
      toast.error(
        "Select a clinical encounter.",
      );
      return;
    }

    if (!form.reason.trim()) {
      toast.error(
        "Transfer reason is required.",
      );
      return;
    }

    if (
      !form.destination_department_id &&
      !form.destination_ward_id &&
      !form.destination_room_id &&
      !form.destination_bed_id
    ) {
      toast.error(
        "Select at least one destination.",
      );
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        const payload: TransferUpdate = {
          transfer_type:
            form.transfer_type,

          priority:
            form.priority,

          source_department_id:
            form.source_department_id
              ? Number(
                  form.source_department_id,
                )
              : null,

          source_ward_id:
            form.source_ward_id
              ? Number(
                  form.source_ward_id,
                )
              : null,

          source_room_id:
            form.source_room_id
              ? Number(
                  form.source_room_id,
                )
              : null,

          source_bed_id:
            form.source_bed_id
              ? Number(
                  form.source_bed_id,
                )
              : null,

          destination_department_id:
            form.destination_department_id
              ? Number(
                  form.destination_department_id,
                )
              : null,

          destination_ward_id:
            form.destination_ward_id
              ? Number(
                  form.destination_ward_id,
                )
              : null,

          destination_room_id:
            form.destination_room_id
              ? Number(
                  form.destination_room_id,
                )
              : null,

          destination_bed_id:
            form.destination_bed_id
              ? Number(
                  form.destination_bed_id,
                )
              : null,

          reason:
            form.reason.trim(),

          clinical_summary:
            form.clinical_summary.trim() ||
            null,

          handover_notes:
            form.handover_notes.trim() ||
            null,

          transport_mode:
            form.transport_mode ||
            null,

          notes:
            form.notes.trim() ||
            null,
        };

        const updated =
          await updateTransfer(
            editingId,
            payload,
          );

        setTransfers((current) =>
          current.map((item) =>
            item.id === updated.id
              ? updated
              : item,
          ),
        );

        toast.success(
          "Transfer request updated successfully.",
        );
      } else {
        const payload: TransferCreate = {
          patient_id: patientId,

          encounter_id:
            Number(form.encounter_id),

          transfer_type:
            form.transfer_type,

          priority:
            form.priority,

          source_department_id:
            form.source_department_id
              ? Number(
                  form.source_department_id,
                )
              : null,

          source_ward_id:
            form.source_ward_id
              ? Number(
                  form.source_ward_id,
                )
              : null,

          source_room_id:
            form.source_room_id
              ? Number(
                  form.source_room_id,
                )
              : null,

          source_bed_id:
            form.source_bed_id
              ? Number(
                  form.source_bed_id,
                )
              : null,

          destination_department_id:
            form.destination_department_id
              ? Number(
                  form.destination_department_id,
                )
              : null,

          destination_ward_id:
            form.destination_ward_id
              ? Number(
                  form.destination_ward_id,
                )
              : null,

          destination_room_id:
            form.destination_room_id
              ? Number(
                  form.destination_room_id,
                )
              : null,

          destination_bed_id:
            form.destination_bed_id
              ? Number(
                  form.destination_bed_id,
                )
              : null,

          reason:
            form.reason.trim(),

          clinical_summary:
            form.clinical_summary.trim() ||
            null,

          handover_notes:
            form.handover_notes.trim() ||
            null,

          transport_mode:
            form.transport_mode ||
            null,

          notes:
            form.notes.trim() ||
            null,
        };

        const created =
          await createTransfer(
            payload,
          );

        setTransfers((current) => [
          created,
          ...current,
        ]);

        toast.success(
          "Transfer request created successfully.",
        );
      }

      setIsCreateOpen(false);
      setEditingId(null);
      resetForm();
    } catch (err) {
      console.error(
        "Transfer save error:",
        err,
      );

      toast.error(
        getApiError(
          err,
          editingId
            ? "Failed to update transfer."
            : "Failed to create transfer.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }


  /* ==========================================================================
   * LIFECYCLE
   * ======================================================================== */

  async function processAction(
    transfer: PatientTransfer,
    action:
      | "approve"
      | "start"
      | "complete"
      | "reject"
      | "cancel",
  ) {
    const messages = {
      approve:
        "Approve this transfer request?",
      start:
        "Start this patient transfer?",
      complete:
        "Complete this patient transfer?",
      reject:
        "Reject this transfer request?",
      cancel:
        "Cancel this transfer request?",
    };

    if (
      !window.confirm(
        messages[action],
      )
    ) {
      return;
    }

    try {
      setProcessingId(
        transfer.id,
      );

      let updated: PatientTransfer;

      switch (action) {
        case "approve":
          updated =
            await approveTransfer(
              transfer.id,
            );
          break;

        case "start":
          updated =
            await startTransfer(
              transfer.id,
            );
          break;

        case "complete":
          updated =
            await completeTransfer(
              transfer.id,
            );
          break;

        case "reject":
          updated =
            await rejectTransfer(
              transfer.id,
            );
          break;

        case "cancel":
          updated =
            await cancelTransfer(
              transfer.id,
            );
          break;
      }

      setTransfers((current) =>
        current.map((item) =>
          item.id === transfer.id
            ? updated
            : item,
        ),
      );

      if (
        action === "complete"
      ) {
        await loadStructure();
      }

      const successMessages = {
        approve:
          "Transfer approved successfully.",
        start:
          "Transfer started successfully.",
        complete:
          "Transfer completed successfully.",
        reject:
          "Transfer rejected successfully.",
        cancel:
          "Transfer cancelled successfully.",
      };

      toast.success(
        successMessages[action],
      );
    } catch (err) {
      console.error(
        `Transfer ${action} error:`,
        err,
      );

      toast.error(
        getApiError(
          err,
          `Failed to ${action} transfer.`,
        ),
      );
    } finally {
      setProcessingId(null);
    }
  }


  /* ==========================================================================
   * SUMMARY
   * ======================================================================== */

  const summary = useMemo(
    () => ({
      total: transfers.length,

      requested:
        transfers.filter(
          (item) =>
            item.status === "REQUESTED",
        ).length,

      approved:
        transfers.filter(
          (item) =>
            item.status === "APPROVED",
        ).length,

      inProgress:
        transfers.filter(
          (item) =>
            item.status ===
            "IN_PROGRESS",
        ).length,

      completed:
        transfers.filter(
          (item) =>
            item.status === "COMPLETED",
        ).length,
    }),
    [transfers],
  );


  /* ==========================================================================
   * LOCATION DISPLAY
   * ======================================================================== */

  function getLocationLabel(
    transfer: PatientTransfer,
    destination = false,
  ) {
    const department = destination
      ? transfer.destination_department_name
      : transfer.source_department_name;

    const ward = destination
      ? transfer.destination_ward_name
      : transfer.source_ward_name;

    const room = destination
      ? transfer.destination_room_name
      : transfer.source_room_name;

    const bed = destination
      ? transfer.destination_bed_name
      : transfer.source_bed_name;

    const parts = [
      department,
      ward,
      room,
      bed,
    ].filter(Boolean);

    return parts.length > 0
      ? parts.join(" / ")
      : "Not specified";
  }


  /* ==========================================================================
   * LOADING
   * ======================================================================== */

  if (loading) {
    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-center px-6 py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <p className="text-xs font-semibold text-slate-500">
              Loading transfer history...
            </p>
          </div>
        </div>
      </section>
    );
  }


  /* ==========================================================================
   * RENDER
   * ======================================================================== */

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_-24px_rgba(15,23,42,0.3)]">

        {/* ================================================================
            HEADER
        ================================================================ */}

        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex items-start gap-3">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50 text-cyan-600">
                <ArrowRight className="h-5 w-5" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Patient Transfers
                  </h2>

                  <span className="rounded-full border border-cyan-100 bg-cyan-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-700">
                    Clinical Workflow
                  </span>
                </div>

                <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                  Manage controlled patient movement between
                  departments, wards, rooms and beds.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">

              <button
                type="button"
                onClick={() => {
                  void Promise.all([
                    loadTransfers(true),
                    loadStructure(),
                  ]);
                }}
                disabled={refreshing}
                className="
                  inline-flex h-10 items-center gap-2 rounded-xl
                  border border-slate-200 bg-white px-3
                  text-xs font-bold text-slate-600
                  transition hover:bg-slate-50
                  disabled:cursor-not-allowed disabled:opacity-60
                "
              >
                <RefreshCw
                  className={
                    refreshing
                      ? "h-4 w-4 animate-spin"
                      : "h-4 w-4"
                  }
                />

                Refresh
              </button>

              {canCreate && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="
                    inline-flex h-10 items-center gap-2 rounded-xl
                    bg-cyan-600 px-4 text-xs font-bold text-white
                    shadow-sm transition hover:bg-cyan-700
                    focus:outline-none focus:ring-4 focus:ring-cyan-100
                  "
                >
                  <Plus className="h-4 w-4" />
                  New Transfer
                </button>
              )}

            </div>
          </div>


          {/* ============================================================
              SUMMARY
          ============================================================ */}

          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-5">

            <SummaryCard
              label="Total"
              value={summary.total}
              icon={FileText}
              className="border-slate-200 bg-slate-50 text-slate-700"
            />

            <SummaryCard
              label="Requested"
              value={summary.requested}
              icon={Clock3}
              className="border-amber-200 bg-amber-50 text-amber-700"
            />

            <SummaryCard
              label="Approved"
              value={summary.approved}
              icon={ShieldCheck}
              className="border-blue-200 bg-blue-50 text-blue-700"
            />

            <SummaryCard
              label="In Progress"
              value={summary.inProgress}
              icon={ArrowRight}
              className="border-violet-200 bg-violet-50 text-violet-700"
            />

            <SummaryCard
              label="Completed"
              value={summary.completed}
              icon={CheckCircle2}
              className="border-emerald-200 bg-emerald-50 text-emerald-700"
            />

          </div>
        </div>


        {/* ================================================================
            ACTIVE LOCATION
        ================================================================ */}

        <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 sm:px-6">

          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600" />

            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Current Patient Location
            </p>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-4">

            <LocationValue
              label="Department"
              value={currentDepartmentName}
            />

            <LocationValue
              label="Ward"
              value={currentWardName}
            />

            <LocationValue
              label="Room"
              value={currentRoomName}
            />

            <LocationValue
              label="Bed"
              value={currentBedName}
            />

          </div>
        </div>


        {/* ================================================================
            ERROR
        ================================================================ */}

        {error && (
          <div className="m-5 rounded-xl border border-red-100 bg-red-50/70 p-4 sm:m-6">

            <div className="flex items-start gap-3">

              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />

              <div>
                <p className="text-xs font-bold text-red-700">
                  Transfer history unavailable
                </p>

                <p className="mt-1 text-[11px] leading-5 text-red-600">
                  {error}
                </p>
              </div>

            </div>
          </div>
        )}


        {/* ================================================================
            TRANSFER LIST
        ================================================================ */}

        <div className="p-5 sm:p-6">

          {transfers.length === 0 ? (

            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-12 text-center">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
                <ArrowRight className="h-5 w-5" />
              </div>

              <h3 className="mt-4 text-sm font-bold text-slate-800">
                No transfer history
              </h3>

              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
                Patient transfer requests, approvals and
                completed movements will appear here.
              </p>

              {canCreate && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="
                    mt-5 inline-flex items-center gap-2 rounded-xl
                    bg-cyan-600 px-4 py-2.5 text-xs font-bold
                    text-white transition hover:bg-cyan-700
                  "
                >
                  <Plus className="h-4 w-4" />
                  Create Transfer
                </button>
              )}

            </div>

          ) : (

            <div className="space-y-3">

              {transfers.map((transfer) => {

                const expanded =
                  expandedId === transfer.id;

                const isProcessing =
                  processingId === transfer.id;

                return (
                  <article
                    key={transfer.id}
                    className="
                      overflow-hidden rounded-xl border border-slate-200
                      bg-white transition
                      hover:border-slate-300 hover:shadow-sm
                    "
                  >

                    {/* ----------------------------------------------------
                        CARD HEADER
                    ---------------------------------------------------- */}

                    <div className="px-4 py-4 sm:px-5">

                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">

                        <div className="min-w-0 flex-1">

                          <div className="flex flex-wrap items-center gap-2">

                            <span className="text-sm font-bold text-slate-900">
                              Transfer #{transfer.id}
                            </span>

                            <span
                              className={`
                                rounded-full border px-2 py-1
                                text-[9px] font-bold uppercase tracking-wider
                                ${getStatusClasses(transfer.status)}
                              `}
                            >
                              {formatStatus(
                                transfer.status,
                              )}
                            </span>

                            <span
                              className={`
                                rounded-full border px-2 py-1
                                text-[9px] font-bold uppercase tracking-wider
                                ${getPriorityClasses(transfer.priority)}
                              `}
                            >
                              {transfer.priority}
                            </span>

                          </div>


                          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

                            <TransferInfo
                              icon={ArrowRight}
                              label="Transfer Type"
                              value={formatTransferType(
                                transfer.transfer_type,
                              )}
                            />

                            <TransferInfo
                              icon={MapPin}
                              label="Destination"
                              value={getLocationLabel(
                                transfer,
                                true,
                              )}
                            />

                            <TransferInfo
                              icon={Stethoscope}
                              label="Requested By"
                              value={
                                transfer.requesting_doctor_name ||
                                `User #${transfer.requested_by_id}`
                              }
                            />

                            <TransferInfo
                              icon={CalendarDays}
                              label="Requested"
                              value={formatDateTime(
                                transfer.requested_at,
                              )}
                            />

                          </div>

                        </div>


                        {/* ACTIONS */}

                        <div className="flex shrink-0 flex-wrap items-center gap-2">

                          {transfer.status ===
                            "REQUESTED" &&
                            canApprove && (
                              <ActionButton
                                label="Approve"
                                icon={ShieldCheck}
                                className="bg-blue-600 text-white hover:bg-blue-700"
                                disabled={isProcessing}
                                onClick={() =>
                                  void processAction(
                                    transfer,
                                    "approve",
                                  )
                                }
                              />
                            )}

                          {transfer.status ===
                            "REQUESTED" &&
                            canApprove && (
                              <ActionButton
                                label="Reject"
                                icon={XCircle}
                                className="border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                disabled={isProcessing}
                                onClick={() =>
                                  void processAction(
                                    transfer,
                                    "reject",
                                  )
                                }
                              />
                            )}

                          {transfer.status ===
                            "APPROVED" &&
                            canExecute && (
                              <ActionButton
                                label="Start"
                                icon={ArrowRight}
                                className="bg-violet-600 text-white hover:bg-violet-700"
                                disabled={isProcessing}
                                onClick={() =>
                                  void processAction(
                                    transfer,
                                    "start",
                                  )
                                }
                              />
                            )}

                          {transfer.status ===
                            "IN_PROGRESS" &&
                            canExecute && (
                              <ActionButton
                                label="Complete"
                                icon={CheckCircle2}
                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                                disabled={isProcessing}
                                onClick={() =>
                                  void processAction(
                                    transfer,
                                    "complete",
                                  )
                                }
                              />
                            )}

                          {canCreate &&
                            transfer.status ===
                              "REQUESTED" && (
                              <ActionButton
                                label="Edit"
                                icon={Edit3}
                                className="border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                disabled={isProcessing}
                                onClick={() =>
                                  openEdit(
                                    transfer,
                                  )
                                }
                              />
                            )}

                          {isDoctor &&
                            transfer.status ===
                              "REQUESTED" &&
                            transfer.requested_by_id ===
                              user?.id && (
                              <ActionButton
                                label="Cancel"
                                icon={X}
                                className="border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                disabled={isProcessing}
                                onClick={() =>
                                  void processAction(
                                    transfer,
                                    "cancel",
                                  )
                                }
                              />
                            )}

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(
                                expanded
                                  ? null
                                  : transfer.id,
                              )
                            }
                            className="
                              inline-flex h-9 items-center gap-1.5
                              rounded-lg border border-slate-200
                              bg-white px-3 text-[10px] font-bold
                              text-slate-600 transition
                              hover:bg-slate-50
                            "
                          >
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition-transform ${
                                expanded
                                  ? "rotate-180"
                                  : ""
                              }`}
                            />

                            {expanded
                              ? "Hide"
                              : "View"}
                          </button>

                        </div>
                      </div>
                    </div>


                    {/* ----------------------------------------------------
                        EXPANDED DETAILS
                    ---------------------------------------------------- */}

                    {expanded && (
                      <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-5 sm:px-5">

                        <div className="grid gap-4 lg:grid-cols-2">

                          {/* SOURCE */}

                          <LocationCard
                            title="Source Location"
                            icon={MapPin}
                            values={[
                              [
                                "Department",
                                transfer.source_department_name ||
                                  (transfer.source_department_id
                                    ? `Department #${transfer.source_department_id}`
                                    : "Not specified"),
                              ],
                              [
                                "Ward",
                                transfer.source_ward_name ||
                                  (transfer.source_ward_id
                                    ? `Ward #${transfer.source_ward_id}`
                                    : "Not specified"),
                              ],
                              [
                                "Room",
                                transfer.source_room_name ||
                                  (transfer.source_room_id
                                    ? `Room #${transfer.source_room_id}`
                                    : "Not specified"),
                              ],
                              [
                                "Bed",
                                transfer.source_bed_name ||
                                  (transfer.source_bed_id
                                    ? `Bed #${transfer.source_bed_id}`
                                    : "Not specified"),
                              ],
                            ]}
                          />


                          {/* DESTINATION */}

                          <LocationCard
                            title="Destination Location"
                            icon={Hospital}
                            values={[
                              [
                                "Department",
                                transfer.destination_department_name ||
                                  (transfer.destination_department_id
                                    ? `Department #${transfer.destination_department_id}`
                                    : "Not specified"),
                              ],
                              [
                                "Ward",
                                transfer.destination_ward_name ||
                                  (transfer.destination_ward_id
                                    ? `Ward #${transfer.destination_ward_id}`
                                    : "Not specified"),
                              ],
                              [
                                "Room",
                                transfer.destination_room_name ||
                                  (transfer.destination_room_id
                                    ? `Room #${transfer.destination_room_id}`
                                    : "Not specified"),
                              ],
                              [
                                "Bed",
                                transfer.destination_bed_name ||
                                  (transfer.destination_bed_id
                                    ? `Bed #${transfer.destination_bed_id}`
                                    : "Not specified"),
                              ],
                            ]}
                          />

                        </div>


                        {/* CLINICAL DETAILS */}

                        <div className="mt-4 grid gap-4 lg:grid-cols-2">

                          <DetailBlock
                            title="Transfer Reason"
                            icon={FileText}
                            value={transfer.reason}
                          />

                          {transfer.clinical_summary && (
                            <DetailBlock
                              title="Clinical Summary"
                              icon={Stethoscope}
                              value={
                                transfer.clinical_summary
                              }
                            />
                          )}

                          {transfer.handover_notes && (
                            <DetailBlock
                              title="Handover Notes"
                              icon={Send}
                              value={
                                transfer.handover_notes
                              }
                            />
                          )}

                          {transfer.notes && (
                            <DetailBlock
                              title="Operational Notes"
                              icon={FileText}
                              value={
                                transfer.notes
                              }
                            />
                          )}

                        </div>


                        {/* TRANSPORT */}

                        {transfer.transport_mode && (
                          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">

                            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                              Transport Mode
                            </p>

                            <p className="mt-1 text-xs font-bold text-slate-800">
                              {formatStatus(
                                transfer.transport_mode,
                              )}
                            </p>

                          </div>
                        )}


                        {/* AUDIT TIMELINE */}

                        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">

                          <div className="flex items-center gap-2">
                            <Clock3 className="h-4 w-4 text-slate-500" />

                            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                              Transfer Timeline
                            </p>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                            <TimelineItem
                              label="Requested"
                              value={formatDateTime(
                                transfer.requested_at,
                              )}
                              active
                            />

                            <TimelineItem
                              label="Approved"
                              value={formatDateTime(
                                transfer.approved_at,
                              )}
                              active={
                                !!transfer.approved_at
                              }
                            />

                            <TimelineItem
                              label="Started"
                              value={formatDateTime(
                                transfer.started_at,
                              )}
                              active={
                                !!transfer.started_at
                              }
                            />

                            <TimelineItem
                              label="Completed"
                              value={formatDateTime(
                                transfer.completed_at,
                              )}
                              active={
                                !!transfer.completed_at
                              }
                            />

                            <TimelineItem
                              label="Rejected"
                              value={formatDateTime(
                                transfer.rejected_at,
                              )}
                              active={
                                !!transfer.rejected_at
                              }
                            />

                            <TimelineItem
                              label="Cancelled"
                              value={formatDateTime(
                                transfer.cancelled_at,
                              )}
                              active={
                                !!transfer.cancelled_at
                              }
                            />

                          </div>

                        </div>

                      </div>
                    )}

                  </article>
                );
              })}

            </div>
          )}

        </div>
      </section>


      {/* =========================================================================
          CREATE / EDIT MODAL
      ========================================================================= */}

      {isCreateOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

            {/* HEADER */}

            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                  <ArrowRight className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {editingId
                      ? "Edit Transfer Request"
                      : "New Patient Transfer"}
                  </h2>

                  <p className="mt-0.5 text-[10px] text-slate-400">
                    Controlled clinical movement workflow
                  </p>
                </div>

              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="
                  flex h-9 w-9 items-center justify-center rounded-lg
                  text-slate-400 transition hover:bg-slate-100
                  hover:text-slate-700 disabled:opacity-50
                "
              >
                <X className="h-4 w-4" />
              </button>

            </div>


            {/* BODY */}

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">

              <div className="space-y-5">

                {/* ==========================================================
                    ENCOUNTER / TYPE / PRIORITY
                ========================================================== */}

                <div className="grid gap-4 md:grid-cols-3">

                  <SelectField
                    label="Clinical Encounter"
                    value={form.encounter_id}
                    onChange={(value) =>
                      updateForm(
                        "encounter_id",
                        value,
                      )
                    }
                    disabled={!!editingId}
                    required
                  >
                    <option value="">
                      Select encounter
                    </option>

                    {encounters.map(
                      (encounter) => (
                        <option
                          key={encounter.id}
                          value={encounter.id}
                        >
                          Encounter #{encounter.id} ·{" "}
                          {encounter.chief_complaint ||
                            "Clinical consultation"}
                        </option>
                      ),
                    )}
                  </SelectField>


                  <SelectField
                    label="Transfer Type"
                    value={form.transfer_type}
                    onChange={(value) =>
                      updateForm(
                        "transfer_type",
                        value,
                      )
                    }
                    required
                  >
                    {TRANSFER_TYPES.map(
                      (item) => (
                        <option
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </option>
                      ),
                    )}
                  </SelectField>


                  <SelectField
                    label="Priority"
                    value={form.priority}
                    onChange={(value) =>
                      updateForm(
                        "priority",
                        value,
                      )
                    }
                    required
                  >
                    {PRIORITIES.map(
                      (item) => (
                        <option
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </option>
                      ),
                    )}
                  </SelectField>

                </div>


                {/* ==========================================================
                    SOURCE
                ========================================================== */}

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">

                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-500" />

                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Source Location
                      </p>

                      <p className="mt-0.5 text-xs font-bold text-slate-800">
                        Current Patient Assignment
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                    <ReadOnlyLocation
                      label="Department"
                      value={currentDepartmentName}
                    />

                    <ReadOnlyLocation
                      label="Ward"
                      value={currentWardName}
                    />

                    <ReadOnlyLocation
                      label="Room"
                      value={currentRoomName}
                    />

                    <ReadOnlyLocation
                      label="Bed"
                      value={currentBedName}
                    />

                  </div>

                </div>


                {/* ==========================================================
                    DESTINATION
                ========================================================== */}

                <div className="rounded-xl border border-cyan-100 bg-cyan-50/30 p-4">

                  <div className="flex items-center gap-2">
                    <Hospital className="h-4 w-4 text-cyan-600" />

                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-cyan-600">
                        Destination
                      </p>

                      <p className="mt-0.5 text-xs font-bold text-slate-800">
                        Select the destination location
                      </p>
                    </div>
                  </div>


                  {structureLoading ? (
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-cyan-100 bg-white p-4">
                      <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />

                      <span className="text-xs font-semibold text-slate-500">
                        Loading hospital structure...
                      </span>
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">

                      <SelectField
                        label="Department"
                        value={
                          form.destination_department_id
                        }
                        onChange={
                          handleDestinationDepartmentChange
                        }
                      >
                        <option value="">
                          Select department
                        </option>

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
                                  ? ` (${department.code})`
                                  : ""}
                              </option>
                            ),
                          )}
                      </SelectField>


                      <SelectField
                        label="Ward"
                        value={
                          form.destination_ward_id
                        }
                        onChange={
                          handleDestinationWardChange
                        }
                      >
                        <option value="">
                          Select ward
                        </option>

                        {filteredDestinationWards
                          .filter(
                            (item) =>
                              item.is_active,
                          )
                          .map(
                            (ward) => (
                              <option
                                key={ward.id}
                                value={ward.id}
                              >
                                {ward.name}
                                {ward.ward_type
                                  ? ` · ${ward.ward_type}`
                                  : ""}
                              </option>
                            ),
                          )}
                      </SelectField>


                      <SelectField
                        label="Room"
                        value={
                          form.destination_room_id
                        }
                        onChange={
                          handleDestinationRoomChange
                        }
                      >
                        <option value="">
                          Select room
                        </option>

                        {filteredDestinationRooms
                          .filter(
                            (item) =>
                              item.is_active,
                          )
                          .map(
                            (room) => (
                              <option
                                key={room.id}
                                value={room.id}
                              >
                                {room.room_number}
                                {" · "}
                                {room.room_type}
                              </option>
                            ),
                          )}
                      </SelectField>


                      <SelectField
                        label="Bed"
                        value={
                          form.destination_bed_id
                        }
                        onChange={(value) =>
                          updateForm(
                            "destination_bed_id",
                            value,
                          )
                        }
                      >
                        <option value="">
                          Select bed
                        </option>

                        {availableDestinationBeds.map(
                          (bed) => (
                            <option
                              key={bed.id}
                              value={bed.id}
                            >
                              {bed.bed_number}
                              {" · "}
                              {bed.bed_type}
                            </option>
                          ),
                        )}
                      </SelectField>

                    </div>
                  )}

                  <p className="mt-3 text-[10px] leading-5 text-slate-400">
                    Destination availability is validated again by
                    the backend when the transfer is created and
                    before completion.
                  </p>

                </div>


                {/* ==========================================================
                    TRANSPORT
                ========================================================== */}

                <div className="grid gap-4 md:grid-cols-2">

                  <SelectField
                    label="Transport Mode"
                    value={
                      form.transport_mode
                    }
                    onChange={(value) =>
                      updateForm(
                        "transport_mode",
                        value,
                      )
                    }
                  >
                    <option value="">
                      Select transport mode
                    </option>

                    {TRANSPORT_MODES.map(
                      (item) => (
                        <option
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </option>
                      ),
                    )}
                  </SelectField>

                </div>


                {/* ==========================================================
                    CLINICAL REASON
                ========================================================== */}

                <TextAreaField
                  label="Transfer Reason"
                  value={form.reason}
                  onChange={(value) =>
                    updateForm(
                      "reason",
                      value,
                    )
                  }
                  placeholder="Explain why the patient needs to be transferred..."
                  required
                  rows={3}
                />


                <div className="grid gap-4 lg:grid-cols-2">

                  <TextAreaField
                    label="Clinical Summary"
                    value={
                      form.clinical_summary
                    }
                    onChange={(value) =>
                      updateForm(
                        "clinical_summary",
                        value,
                      )
                    }
                    placeholder="Relevant clinical information for the receiving team..."
                    rows={4}
                  />

                  <TextAreaField
                    label="Handover Notes"
                    value={
                      form.handover_notes
                    }
                    onChange={(value) =>
                      updateForm(
                        "handover_notes",
                        value,
                      )
                    }
                    placeholder="Important handover instructions..."
                    rows={4}
                  />

                </div>


                <TextAreaField
                  label="Operational Notes"
                  value={form.notes}
                  onChange={(value) =>
                    updateForm(
                      "notes",
                      value,
                    )
                  }
                  placeholder="Additional operational information..."
                  rows={3}
                />

              </div>
            </div>


            {/* FOOTER */}

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="
                  inline-flex h-10 items-center justify-center
                  rounded-xl border border-slate-200 bg-white
                  px-4 text-xs font-bold text-slate-600
                  transition hover:bg-slate-50
                  disabled:opacity-50
                "
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleSave()
                }
                disabled={saving}
                className="
                  inline-flex h-10 items-center justify-center gap-2
                  rounded-xl bg-cyan-600 px-5 text-xs font-bold text-white
                  shadow-sm transition hover:bg-cyan-700
                  disabled:cursor-not-allowed disabled:opacity-60
                "
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}

                {editingId
                  ? "Save Changes"
                  : "Create Transfer"}
              </button>

            </div>

          </div>
        </div>
      )}
    </>
  );
}


/* ============================================================================
 * SUMMARY CARD
 * ========================================================================== */

function SummaryCard({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: number;
  icon: typeof FileText;
  className: string;
}) {
  return (
    <div
      className={`
        rounded-xl border px-3.5 py-3
        ${className}
      `}
    >
      <div className="flex items-center justify-between gap-2">

        <p className="text-[9px] font-bold uppercase tracking-[0.12em]">
          {label}
        </p>

        <Icon className="h-3.5 w-3.5 opacity-70" />

      </div>

      <p className="mt-1 text-lg font-bold">
        {value}
      </p>
    </div>
  );
}


/* ============================================================================
 * TRANSFER INFO
 * ========================================================================== */

function TransferInfo({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">

      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

      <div className="min-w-0">

        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <p
          className="mt-0.5 truncate text-xs font-semibold text-slate-700"
          title={value}
        >
          {value}
        </p>

      </div>
    </div>
  );
}


/* ============================================================================
 * LOCATION VALUE
 * ========================================================================== */

function LocationValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">

      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-bold text-slate-700">
        {value}
      </p>

    </div>
  );
}


/* ============================================================================
 * LOCATION CARD
 * ========================================================================== */

function LocationCard({
  title,
  icon: Icon,
  values,
}: {
  title: string;
  icon: typeof MapPin;
  values: [string, string][];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">

      <div className="flex items-center gap-2">

        <Icon className="h-4 w-4 text-cyan-600" />

        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
          {title}
        </p>

      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">

        {values.map(
          ([label, value]) => (
            <div key={label}>

              <p className="text-[9px] font-semibold text-slate-400">
                {label}
              </p>

              <p className="mt-0.5 text-xs font-bold text-slate-700">
                {value}
              </p>

            </div>
          ),
        )}

      </div>
    </div>
  );
}


/* ============================================================================
 * DETAIL BLOCK
 * ========================================================================== */

function DetailBlock({
  title,
  icon: Icon,
  value,
}: {
  title: string;
  icon: typeof FileText;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">

      <div className="flex items-center gap-2">

        <Icon className="h-3.5 w-3.5 text-slate-400" />

        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
          {title}
        </p>

      </div>

      <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-700">
        {value}
      </p>

    </div>
  );
}


/* ============================================================================
 * TIMELINE ITEM
 * ========================================================================== */

function TimelineItem({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div
      className={`
        rounded-xl border p-3
        ${
          active
            ? "border-emerald-100 bg-emerald-50/50"
            : "border-slate-100 bg-slate-50"
        }
      `}
    >

      <div className="flex items-center gap-2">

        <span
          className={`
            h-2 w-2 rounded-full
            ${
              active
                ? "bg-emerald-500"
                : "bg-slate-300"
            }
          `}
        />

        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>

      </div>

      <p className="mt-1.5 text-[11px] font-semibold text-slate-700">
        {value}
      </p>

    </div>
  );
}


/* ============================================================================
 * ACTION BUTTON
 * ========================================================================== */

function ActionButton({
  label,
  icon: Icon,
  className,
  disabled,
  onClick,
}: {
  label: string;
  icon: typeof Check;
  className: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex h-9 items-center gap-1.5 rounded-lg
        px-3 text-[10px] font-bold transition
        disabled:cursor-not-allowed disabled:opacity-50
        ${className}
      `}
    >
      {disabled ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}

      {label}
    </button>
  );
}


/* ============================================================================
 * SELECT FIELD
 * ========================================================================== */

function SelectField({
  label,
  value,
  onChange,
  children,
  disabled = false,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <label className="block">

      <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        disabled={disabled}
        className="
          h-10 w-full rounded-xl border border-slate-200
          bg-white px-3 text-xs font-semibold text-slate-700
          outline-none transition
          focus:border-cyan-400 focus:ring-4 focus:ring-cyan-50
          disabled:cursor-not-allowed disabled:bg-slate-50
          disabled:text-slate-400
        "
      >
        {children}
      </select>

    </label>
  );
}


/* ============================================================================
 * TEXTAREA
 * ========================================================================== */

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}) {
  return (
    <label className="block">

      <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        placeholder={placeholder}
        rows={rows}
        className="
          w-full resize-y rounded-xl border border-slate-200
          bg-white px-3 py-2.5 text-xs leading-5 text-slate-700
          outline-none transition placeholder:text-slate-300
          focus:border-cyan-400 focus:ring-4 focus:ring-cyan-50
        "
      />

    </label>
  );
}


/* ============================================================================
 * READ ONLY LOCATION
 * ========================================================================== */

function ReadOnlyLocation({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">

      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xs font-bold text-slate-700">
        {value}
      </p>

    </div>
  );
}