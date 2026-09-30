import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Pill,
  Plus,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";

import {
  activatePrescription,
  cancelPrescription,
  completePrescription,
  createPrescription,
  discontinuePrescription,
  getPatientPrescriptions,
  updatePrescription,
  addPrescriptionItem,
  updatePrescriptionItem,
  deletePrescriptionItem,
  type Prescription,
  type PrescriptionCreate,
  type PrescriptionItem,
  type PrescriptionItemCreate,
  type PrescriptionItemUpdate,
} from "../../services/prescriptionApi";

import PrescriptionReportModal from "./PrescriptionReportModal";

import type { ClinicalEncounter } from "../../services/clinicalEncounterApi";

// =====================================================
// TYPES
// =====================================================

interface PrescriptionPanelProps {
  patientId: number;
  encounters: ClinicalEncounter[];
  canManage: boolean;
}

// =====================================================
// INITIAL MEDICATION
// =====================================================

const EMPTY_ITEM: PrescriptionItemCreate = {
  medication_name: "",
  generic_name: "",
  strength: "",
  dosage_form: "",
  route: "",
  dose: "",
  frequency: "",
  duration_value: null,
  duration_unit: "",
  quantity: "",
  is_prn: false,
  instructions: "",
};

// =====================================================
// HELPERS
// =====================================================

function formatDateTime(value: string | null) {
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

function getStatusClasses(status: Prescription["status"]) {
  switch (status) {
    case "ACTIVE":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "COMPLETED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "DISCONTINUED":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "CANCELLED":
      return "border-red-200 bg-red-50 text-red-700";

    case "DRAFT":
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

// =====================================================
// COMPONENT
// =====================================================

export default function PrescriptionPanel({
  patientId,
  encounters,
  canManage,
}: PrescriptionPanelProps) {
  const [prescriptions, setPrescriptions] = useState<
    Prescription[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [isCreateOpen, setIsCreateOpen] =
    useState(false);

  const [selectedEncounterId, setSelectedEncounterId] =
    useState<number | "">("");

  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<
    PrescriptionItemCreate[]
  >([{ ...EMPTY_ITEM }]);

  const [submitting, setSubmitting] =
    useState(false);

  const [processingPrescriptionId, setProcessingPrescriptionId] =
    useState<number | null>(null);

  const [expandedPrescriptionId, setExpandedPrescriptionId] =
    useState<number | null>(null);

  const [reportPrescription, setReportPrescription] =
    useState<Prescription | null>(null);


// ===================================================
// DRAFT EDITING
// ===================================================

const [editingPrescription, setEditingPrescription] =
  useState<Prescription | null>(null);

const [editNotes, setEditNotes] = useState("");

const [editItems, setEditItems] = useState<
  Array<PrescriptionItem & { isNew?: boolean }>
>([]);

const [editSubmitting, setEditSubmitting] =
  useState(false);

  // ===================================================
  // LOAD PRESCRIPTIONS
  // ===================================================

  const loadPrescriptions = async (
    showRefresh = false,
  ) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const result =
        await getPatientPrescriptions(patientId);

      const sorted = [...result].sort(
        (a, b) =>
          new Date(
            b.prescribed_at ?? 0,
          ).getTime() -
          new Date(
            a.prescribed_at ?? 0,
          ).getTime(),
      );

      setPrescriptions(sorted);
    } catch (err) {
      console.error(
        "Prescription loading error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load prescriptions.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadPrescriptions();
  }, [patientId]);

  // ===================================================
  // SUMMARY
  // ===================================================

  const summary = useMemo(() => {
    return {
      total: prescriptions.length,

      active: prescriptions.filter(
        (item) => item.status === "ACTIVE",
      ).length,

      drafts: prescriptions.filter(
        (item) => item.status === "DRAFT",
      ).length,

      completed: prescriptions.filter(
        (item) => item.status === "COMPLETED",
      ).length,
    };
  }, [prescriptions]);

  // ===================================================
  // OPEN CREATE
  // ===================================================

  const openCreate = () => {
    const firstAvailableEncounter =
      encounters.find(
        (encounter) =>
          encounter.status !== "Cancelled",
      );

    setSelectedEncounterId(
      firstAvailableEncounter?.id ?? "",
    );

    setNotes("");

    setItems([
      {
        ...EMPTY_ITEM,
      },
    ]);

    setIsCreateOpen(true);
  };

  // ===================================================
  // CLOSE CREATE
  // ===================================================

  const closeCreate = () => {
    if (submitting) {
      return;
    }

    setIsCreateOpen(false);
    setSelectedEncounterId("");
    setNotes("");
    setItems([{ ...EMPTY_ITEM }]);
  };

  // ===================================================
// OPEN DRAFT EDIT
// ===================================================

const openDraftEdit = (
  prescription: Prescription,
) => {
  if (
    !canManage ||
    prescription.status !== "DRAFT"
  ) {
    return;
  }

  setEditingPrescription(prescription);

  setEditNotes(
    prescription.notes ?? "",
  );

  setEditItems(
    prescription.items.map((item) => ({
      ...item,
      isNew: false,
    })),
  );
};

// ===================================================
// CLOSE DRAFT EDIT
// ===================================================

const closeDraftEdit = () => {
  if (editSubmitting) {
    return;
  }

  setEditingPrescription(null);
  setEditNotes("");
  setEditItems([]);
};

// ===================================================
// UPDATE DRAFT ITEM
// ===================================================

const updateDraftItem = (
  itemId: number,
  field: keyof PrescriptionItemCreate,
  value:
    | string
    | number
    | boolean
    | null,
) => {
  setEditItems((current) =>
    current.map((item) =>
      item.id === itemId
        ? {
            ...item,
            [field]: value,
          }
        : item,
    ),
  );
};

// ===================================================
// UPDATE NEW DRAFT ITEM
// =====================================================

const updateNewDraftItem = (
  index: number,
  field: keyof PrescriptionItemCreate,
  value:
    | string
    | number
    | boolean
    | null,
) => {
  setEditItems((current) =>
    current.map((item, itemIndex) =>
      itemIndex === index
        ? {
            ...item,
            [field]: value,
          }
        : item,
    ),
  );
};

// ===================================================
// ADD DRAFT ITEM
// ===================================================

const addDraftItem = () => {
  const newItem = {
    id: -Date.now(),
    prescription_id:
      editingPrescription?.id ?? 0,
    medication_name: "",
    generic_name: null,
    strength: null,
    dosage_form: null,
    route: null,
    dose: null,
    frequency: null,
    duration_value: null,
    duration_unit: null,
    quantity: null,
    is_prn: false,
    instructions: null,
    created_at: null,
    updated_at: null,
    isNew: true,
  };

  setEditItems((current) => [
    ...current,
    newItem,
  ]);
};

// ===================================================
// REMOVE DRAFT ITEM
// ===================================================

const removeDraftItem = (
  index: number,
) => {
  if (editItems.length === 1) {
    toast.error(
      "A prescription must contain at least one medication.",
    );
    return;
  }

  setEditItems((current) =>
    current.filter(
      (_, itemIndex) =>
        itemIndex !== index,
    ),
  );
};

// ===================================================
// SAVE DRAFT
// ===================================================

const handleSaveDraft = async () => {
  if (!editingPrescription) {
    return;
  }

  if (
    editingPrescription.status !==
    "DRAFT"
  ) {
    return;
  }

  const cleanedItems =
    editItems.map((item) => ({
      ...item,
      medication_name:
        item.medication_name.trim(),
      generic_name:
        item.generic_name?.trim() ||
        null,
      strength:
        item.strength?.trim() || null,
      dosage_form:
        item.dosage_form?.trim() || null,
      route:
        item.route?.trim() || null,
      dose:
        item.dose?.trim() || null,
      frequency:
        item.frequency?.trim() || null,
      duration_unit:
        item.duration_unit?.trim() ||
        null,
      quantity:
        item.quantity?.trim() || null,
      instructions:
        item.instructions?.trim() ||
        null,
    }));

  if (cleanedItems.length === 0) {
    toast.error(
      "At least one medication is required.",
    );
    return;
  }

  const invalidItem =
    cleanedItems.find(
      (item) =>
        !item.medication_name,
    );

  if (invalidItem) {
    toast.error(
      "Medication name is required for every item.",
    );
    return;
  }

  try {
    setEditSubmitting(true);

    // -----------------------------------------------
    // UPDATE PRESCRIPTION NOTES
    // -----------------------------------------------

    const updatedPrescription =
      await updatePrescription(
        editingPrescription.id,
        {
          notes:
            editNotes.trim() || null,
        },
      );

    // -----------------------------------------------
    // UPDATE / ADD ITEMS
    // -----------------------------------------------

    const originalItems =
      editingPrescription.items;

    const originalItemIds =
      new Set(
        originalItems.map(
          (item) => item.id,
        ),
      );

    const currentExistingItemIds =
      new Set(
        cleanedItems
          .filter(
            (item) =>
              !item.isNew &&
              originalItemIds.has(
                item.id,
              ),
          )
          .map(
            (item) => item.id,
          ),
      );

    // Delete removed original items
    for (const originalItem of originalItems) {
      if (
        !currentExistingItemIds.has(
          originalItem.id,
        )
      ) {
        await deletePrescriptionItem(
          originalItem.id,
        );
      }
    }

    // Update existing + create new
    const finalItems: PrescriptionItem[] =
      [];

    for (const item of cleanedItems) {
      if (item.isNew) {
        const payload: PrescriptionItemCreate =
          {
            medication_name:
              item.medication_name,
            generic_name:
              item.generic_name,
            strength:
              item.strength,
            dosage_form:
              item.dosage_form,
            route: item.route,
            dose: item.dose,
            frequency:
              item.frequency,
            duration_value:
              item.duration_value,
            duration_unit:
              item.duration_unit,
            quantity:
              item.quantity,
            is_prn:
              item.is_prn,
            instructions:
              item.instructions,
          };

        const created =
          await addPrescriptionItem(
            editingPrescription.id,
            payload,
          );

        finalItems.push(created);
      } else {
        const payload: PrescriptionItemUpdate =
          {
            medication_name:
              item.medication_name,
            generic_name:
              item.generic_name,
            strength:
              item.strength,
            dosage_form:
              item.dosage_form,
            route: item.route,
            dose: item.dose,
            frequency:
              item.frequency,
            duration_value:
              item.duration_value,
            duration_unit:
              item.duration_unit,
            quantity:
              item.quantity,
            is_prn:
              item.is_prn,
            instructions:
              item.instructions,
          };

        const updatedItem =
          await updatePrescriptionItem(
            item.id,
            payload,
          );

        finalItems.push(
          updatedItem,
        );
      }
    }

    const finalPrescription: Prescription =
      {
        ...updatedPrescription,
        items: finalItems,
      };

    setPrescriptions((current) =>
      current.map((item) =>
        item.id ===
        editingPrescription.id
          ? finalPrescription
          : item,
      ),
    );

    closeDraftEdit();

    toast.success(
      "Draft prescription updated successfully.",
    );
  } catch (err) {
    console.error(
      "Draft prescription update error:",
      err,
    );

    toast.error(
      err instanceof Error
        ? err.message
        : "Failed to update prescription.",
    );
  } finally {
    setEditSubmitting(false);
  }
};


  // ===================================================
  // UPDATE ITEM
  // ===================================================

  const updateItem = (
    index: number,
    field: keyof PrescriptionItemCreate,
    value: string | number | boolean | null,
  ) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  };

  // ===================================================
  // ADD ITEM
  // ===================================================

  const addItem = () => {
    setItems((current) => [
      ...current,
      {
        ...EMPTY_ITEM,
      },
    ]);
  };

  // ===================================================
  // REMOVE ITEM
  // ===================================================

  const removeItem = (index: number) => {
    if (items.length === 1) {
      return;
    }

    setItems((current) =>
      current.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    );
  };

  // ===================================================
  // CREATE PRESCRIPTION
  // ===================================================

  const handleCreate = async () => {
    if (!selectedEncounterId) {
      toast.error(
        "Select a clinical encounter.",
      );
      return;
    }

    const cleanedItems =
      items.map((item) => ({
        ...item,

        medication_name:
          item.medication_name.trim(),

        generic_name:
          item.generic_name?.trim() || null,

        strength:
          item.strength?.trim() || null,

        dosage_form:
          item.dosage_form?.trim() || null,

        route:
          item.route?.trim() || null,

        dose:
          item.dose?.trim() || null,

        frequency:
          item.frequency?.trim() || null,

        duration_unit:
          item.duration_unit?.trim() || null,

        quantity:
          item.quantity?.trim() || null,

        instructions:
          item.instructions?.trim() || null,
      }));

    const invalidItem = cleanedItems.find(
      (item) => !item.medication_name,
    );

    if (invalidItem) {
      toast.error(
        "Medication name is required for every item.",
      );
      return;
    }

    try {
      setSubmitting(true);

      const payload: PrescriptionCreate = {
        patient_id: patientId,
        encounter_id: Number(
          selectedEncounterId,
        ),
        notes: notes.trim() || null,
        items: cleanedItems,
      };

      const created =
        await createPrescription(payload);

      setPrescriptions((current) => [
        created,
        ...current,
      ]);

      closeCreate();

      toast.success(
        "Prescription created successfully.",
      );
    } catch (err) {
      console.error(
        "Prescription creation error:",
        err,
      );

      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to create prescription.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ===================================================
  // LIFECYCLE ACTION
  // ===================================================

  const processPrescription = async (
    prescription: Prescription,
    action:
      | "activate"
      | "complete"
      | "discontinue"
      | "cancel",
  ) => {
    const messages = {
      activate:
        "Activate this prescription?",
      complete:
        "Complete this prescription?",
      discontinue:
        "Discontinue this prescription?",
      cancel:
        "Cancel this prescription?",
    };

    if (!window.confirm(messages[action])) {
      return;
    }

    try {
      setProcessingPrescriptionId(
        prescription.id,
      );

      let updated: Prescription;

      switch (action) {
        case "activate":
          updated =
            await activatePrescription(
              prescription.id,
            );
          break;

        case "complete":
          updated =
            await completePrescription(
              prescription.id,
            );
          break;

        case "discontinue":
          updated =
            await discontinuePrescription(
              prescription.id,
            );
          break;

        case "cancel":
          updated =
            await cancelPrescription(
              prescription.id,
            );
          break;
      }

      setPrescriptions((current) =>
        current.map((item) =>
          item.id === prescription.id
            ? updated
            : item,
        ),
      );

      toast.success(
        `Prescription ${action}d successfully.`,
      );
    } catch (err) {
      console.error(
        "Prescription lifecycle error:",
        err,
      );

      toast.error(
        err instanceof Error
          ? err.message
          : `Failed to ${action} prescription.`,
      );
    } finally {
      setProcessingPrescriptionId(null);
    }
  };

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Pill size={19} />
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Prescriptions
            </h2>

            <p className="mt-0.5 text-[11px] text-slate-400">
              Medication orders and treatment instructions
            </p>
          </div>
        </div>

        <div className="space-y-3 p-5">
          <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </section>
    );
  }

  // ===================================================
  // MAIN
  // ===================================================

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* HEADER */}

        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Pill size={19} />
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-violet-600">
                Medication Management
              </p>

              <h2 className="mt-0.5 text-sm font-bold text-slate-900">
                Prescriptions
              </h2>

              <p className="mt-0.5 text-[11px] text-slate-400">
                Medication orders and treatment instructions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                void loadPrescriptions(true)
              }
              disabled={refreshing}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
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
                onClick={openCreate}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-950 px-3.5 text-[10px] font-semibold text-white shadow-sm transition hover:bg-violet-600"
              >
                <Plus size={14} />
                New Prescription
              </button>
            )}
          </div>
        </div>

        {/* SUMMARY */}

        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 px-2 py-3 sm:grid-cols-4 sm:px-2">
          <SummaryCard
            label="Total"
            value={summary.total}
            tone="slate"
          />

          <SummaryCard
            label="Active"
            value={summary.active}
            tone="blue"
          />

          <SummaryCard
            label="Drafts"
            value={summary.drafts}
            tone="amber"
          />

          <SummaryCard
            label="Completed"
            value={summary.completed}
            tone="emerald"
          />
        </div>

        {/* ERROR */}

        {error && (
          <div className="m-5 rounded-xl border border-red-100 bg-red-50/70 p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert
                size={17}
                className="mt-0.5 shrink-0 text-red-500"
              />

              <div>
                <p className="text-xs font-bold text-red-700">
                  Prescription history unavailable
                </p>

                <p className="mt-1 text-[11px] leading-5 text-red-600">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* EMPTY */}

        {!error && prescriptions.length === 0 && (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <Pill size={21} />
            </div>

            <h3 className="mt-4 text-sm font-bold text-slate-800">
              No prescriptions yet
            </h3>

            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
              Medication prescriptions created for this
              patient will appear here.
            </p>

            {canManage && (
              <button
                type="button"
                onClick={openCreate}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-600"
              >
                <Plus size={14} />
                Create Prescription
              </button>
            )}
          </div>
        )}

        {/* PRESCRIPTION LIST */}

        {!error &&
          prescriptions.length > 0 && (
            <div className="divide-y divide-slate-100">
              {prescriptions.map(
                (prescription) => {
                  const expanded =
                    expandedPrescriptionId ===
                    prescription.id;

                  const processing =
                    processingPrescriptionId ===
                    prescription.id;

                  return (
                    <article
                      key={prescription.id}
                      className="p-5"
                    >
                      {/* CARD HEADER */}

                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              Prescription #
                              {prescription.id}
                            </span>

                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold ${getStatusClasses(
                                prescription.status,
                              )}`}
                            >
                              {prescription.status}
                            </span>
                          </div>

                          <p className="mt-1 text-[10px] text-slate-400">
                            Encounter #
                            {prescription.encounter_id}
                            {" · "}
                            Prescribed{" "}
                            {formatDateTime(
                              prescription.prescribed_at,
                            )}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {canManage &&
                            prescription.status ===
                              "DRAFT" && (
                              <>
                              <button
                                type="button"
                                onClick={() =>
                                    openDraftEdit(
                                    prescription,
                                    )
                                }
                                disabled={processing}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[10px] font-bold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
                                >
                                <FileText size={13} />
                                Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    void processPrescription(
                                      prescription,
                                      "activate",
                                    )
                                  }
                                  disabled={
                                    processing
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                                >
                                  {processing ? (
                                    <Loader2
                                      size={13}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <CheckCircle2
                                      size={13}
                                    />
                                  )}

                                  Activate
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    void processPrescription(
                                      prescription,
                                      "cancel",
                                    )
                                  }
                                  disabled={
                                    processing
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                                >
                                  <XCircle
                                    size={13}
                                  />
                                  Cancel
                                </button>
                              </>
                            )}

                          {canManage &&
                            prescription.status ===
                              "ACTIVE" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void processPrescription(
                                      prescription,
                                      "complete",
                                    )
                                  }
                                  disabled={
                                    processing
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                                >
                                  {processing ? (
                                    <Loader2
                                      size={13}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <CheckCircle2
                                      size={13}
                                    />
                                  )}

                                  Complete
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    void processPrescription(
                                      prescription,
                                      "discontinue",
                                    )
                                  }
                                  disabled={
                                    processing
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-[10px] font-bold text-orange-700 transition hover:bg-orange-100 disabled:opacity-50"
                                >
                                  <XCircle
                                    size={13}
                                  />
                                  Discontinue
                                </button>
                              </>
                            )}

                                          <button
                            type="button"
                            onClick={() =>
                              setReportPrescription(prescription)
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[10px] font-bold text-violet-700 transition hover:bg-violet-100"
                          >
                            <FileText size={13} />
                            Report
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedPrescriptionId(
                                expanded
                                  ? null
                                  : prescription.id,
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 transition hover:bg-slate-50"
                          >
                            {expanded ? (
                              <ChevronUp
                                size={13}
                              />
                            ) : (
                              <ChevronDown
                                size={13}
                              />
                            )}

                            {expanded
                              ? "Hide"
                              : "View"}
                          </button>
                        </div>
                      </div>

                      {/* EXPANDED CONTENT */}

                      {expanded && (
                        <div className="mt-4 space-y-3">
                          {prescription.notes && (
                            <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3.5">
                              <p className="text-[9px] font-bold uppercase tracking-wide text-violet-600">
                                Prescription Notes
                              </p>

                              <p className="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-slate-700">
                                {prescription.notes}
                              </p>
                            </div>
                          )}

                          <div className="overflow-hidden rounded-xl border border-slate-100">
                            <div className="hidden bg-slate-50 px-4 py-3 text-[9px] font-bold uppercase tracking-wide text-slate-400 md:grid md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr] md:gap-3">
                              <span>Medication</span>
                              <span>Dose</span>
                              <span>Frequency</span>
                              <span>Duration</span>
                              <span>Instructions</span>
                            </div>

                            <div className="divide-y divide-slate-100">
                              {prescription.items.map(
                                (item) => (
                                  <div
                                    key={item.id}
                                    className="grid gap-3 px-4 py-3.5 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr] md:items-center"
                                  >
                                    <div>
                                      <p className="text-xs font-bold text-slate-800">
                                        {
                                          item.medication_name
                                        }
                                      </p>

                                      <p className="mt-0.5 text-[10px] text-slate-400">
                                        {[
                                          item.generic_name,
                                          item.strength,
                                          item.dosage_form,
                                          item.route,
                                        ]
                                          .filter(
                                            Boolean,
                                          )
                                          .join(
                                            " · ",
                                          ) ||
                                          "Medication details not specified"}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 md:hidden">
                                        Dose
                                      </p>

                                      <p className="text-xs font-semibold text-slate-700">
                                        {item.dose ||
                                          "—"}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 md:hidden">
                                        Frequency
                                      </p>

                                      <p className="text-xs font-semibold text-slate-700">
                                        {item.frequency ||
                                          "—"}

                                        {item.is_prn && (
                                          <span className="ml-1.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[8px] font-bold text-amber-700">
                                            PRN
                                          </span>
                                        )}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 md:hidden">
                                        Duration
                                      </p>

                                      <p className="text-xs font-semibold text-slate-700">
                                        {item.duration_value
                                          ? `${item.duration_value} ${item.duration_unit ?? ""}`
                                          : "—"}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 md:hidden">
                                        Instructions
                                      </p>

                                      <p className="whitespace-pre-wrap text-xs leading-5 text-slate-600">
                                        {item.instructions ||
                                          "—"}
                                      </p>
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                },
              )}
            </div>
          )}
      </section>


{/* =================================================
    EDIT DRAFT PRESCRIPTION MODAL
================================================= */}

{editingPrescription &&
  canManage &&
  editingPrescription.status ===
    "DRAFT" && (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          closeDraftEdit();
        }
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

        {/* HEADER */}

        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <Pill size={17} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Edit Prescription #
                  {editingPrescription.id}
                </h2>

                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">
                  DRAFT
                </span>
              </div>

              <p className="text-[10px] text-slate-400">
                Modify medication order before activation
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeDraftEdit}
            disabled={editSubmitting}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <XCircle size={18} />
          </button>
        </div>

        {/* BODY */}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-5">

            {/* ENCOUNTER INFO */}

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <div className="grid gap-4 sm:grid-cols-3">

                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                    Patient
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-800">
                    Patient #{editingPrescription.patient_id}
                  </p>
                </div>

                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                    Encounter
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-800">
                    Encounter #{editingPrescription.encounter_id}
                  </p>
                </div>

                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                    Prescribed
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-800">
                    {formatDateTime(
                      editingPrescription.prescribed_at,
                    )}
                  </p>
                </div>

              </div>
            </div>

            {/* MEDICATIONS */}

            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Medications
                  </p>

                  <p className="mt-0.5 text-[10px] text-slate-400">
                    Update, remove, or add medications.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addDraftItem}
                  disabled={editSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[10px] font-bold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
                >
                  <Plus size={13} />
                  Add Medication
                </button>
              </div>

              <div className="space-y-4">

                {editItems.map(
                  (item, index) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                    >

                      <div className="mb-4 flex items-center justify-between">

                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-100 text-[9px] font-bold text-violet-700">
                            {index + 1}
                          </span>

                          <span className="text-xs font-bold text-slate-800">
                            Medication Item
                          </span>

                          {item.isNew && (
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[8px] font-bold text-blue-700">
                              NEW
                            </span>
                          )}
                        </div>

                        {editItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              removeDraftItem(
                                index,
                              )
                            }
                            disabled={
                              editSubmitting
                            }
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            <XCircle
                              size={13}
                            />
                            Remove
                          </button>
                        )}

                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">

                        <PrescriptionInput
                          label="Medication Name"
                          required
                          value={
                            item.medication_name
                          }
                          onChange={(value) =>
                            item.isNew
                              ? updateNewDraftItem(
                                  index,
                                  "medication_name",
                                  value,
                                )
                              : updateDraftItem(
                                  item.id,
                                  "medication_name",
                                  value,
                                )
                          }
                          placeholder="e.g. Paracetamol"
                        />

                        <PrescriptionInput
                          label="Generic Name"
                          value={
                            item.generic_name ??
                            ""
                          }
                          onChange={(value) =>
                            item.isNew
                              ? updateNewDraftItem(
                                  index,
                                  "generic_name",
                                  value,
                                )
                              : updateDraftItem(
                                  item.id,
                                  "generic_name",
                                  value,
                                )
                          }
                          placeholder="e.g. Acetaminophen"
                        />

                        <PrescriptionInput
                          label="Strength"
                          value={
                            item.strength ??
                            ""
                          }
                          onChange={(value) =>
                            item.isNew
                              ? updateNewDraftItem(
                                  index,
                                  "strength",
                                  value,
                                )
                              : updateDraftItem(
                                  item.id,
                                  "strength",
                                  value,
                                )
                          }
                          placeholder="e.g. 500 mg"
                        />

                        <PrescriptionSelect
                          label="Dosage Form"
                          value={
                            item.dosage_form ??
                            ""
                          }
                          onChange={(value) =>
                            item.isNew
                              ? updateNewDraftItem(
                                  index,
                                  "dosage_form",
                                  value,
                                )
                              : updateDraftItem(
                                  item.id,
                                  "dosage_form",
                                  value,
                                )
                          }
                          options={[
                            "Tablet",
                            "Capsule",
                            "Syrup",
                            "Injection",
                            "Cream",
                            "Ointment",
                            "Drops",
                            "Inhaler",
                            "Powder",
                            "Suspension",
                            "Other",
                          ]}
                        />

                        <PrescriptionSelect
                          label="Route"
                          value={
                            item.route ?? ""
                          }
                          onChange={(value) =>
                            item.isNew
                              ? updateNewDraftItem(
                                  index,
                                  "route",
                                  value,
                                )
                              : updateDraftItem(
                                  item.id,
                                  "route",
                                  value,
                                )
                          }
                          options={[
                            "Oral",
                            "IV",
                            "IM",
                            "SC",
                            "Topical",
                            "Ophthalmic",
                            "Otic",
                            "Nasal",
                            "Inhalation",
                            "Other",
                          ]}
                        />

                        <PrescriptionInput
                          label="Dose"
                          value={
                            item.dose ?? ""
                          }
                          onChange={(value) =>
                            item.isNew
                              ? updateNewDraftItem(
                                  index,
                                  "dose",
                                  value,
                                )
                              : updateDraftItem(
                                  item.id,
                                  "dose",
                                  value,
                                )
                          }
                          placeholder="e.g. 1 tablet"
                        />

                        <PrescriptionInput
                          label="Frequency"
                          value={
                            item.frequency ??
                            ""
                          }
                          onChange={(value) =>
                            item.isNew
                              ? updateNewDraftItem(
                                  index,
                                  "frequency",
                                  value,
                                )
                              : updateDraftItem(
                                  item.id,
                                  "frequency",
                                  value,
                                )
                          }
                          placeholder="e.g. Twice daily"
                        />

                        <PrescriptionInput
                          label="Quantity"
                          value={
                            item.quantity ??
                            ""
                          }
                          onChange={(value) =>
                            item.isNew
                              ? updateNewDraftItem(
                                  index,
                                  "quantity",
                                  value,
                                )
                              : updateDraftItem(
                                  item.id,
                                  "quantity",
                                  value,
                                )
                          }
                          placeholder="e.g. 10 tablets"
                        />

                        <PrescriptionInput
                          label="Duration"
                          type="number"
                          value={
                            item.duration_value ??
                            ""
                          }
                          onChange={(value) =>
                            item.isNew
                              ? updateNewDraftItem(
                                  index,
                                  "duration_value",
                                  value
                                    ? Number(
                                        value,
                                      )
                                    : null,
                                )
                              : updateDraftItem(
                                  item.id,
                                  "duration_value",
                                  value
                                    ? Number(
                                        value,
                                      )
                                    : null,
                                )
                          }
                          placeholder="e.g. 5"
                        />

                        <PrescriptionSelect
                          label="Duration Unit"
                          value={
                            item.duration_unit ??
                            ""
                          }
                          onChange={(value) =>
                            item.isNew
                              ? updateNewDraftItem(
                                  index,
                                  "duration_unit",
                                  value,
                                )
                              : updateDraftItem(
                                  item.id,
                                  "duration_unit",
                                  value,
                                )
                          }
                          options={[
                            "Days",
                            "Weeks",
                            "Months",
                          ]}
                        />

                        <div className="flex items-end">
                          <label className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700">
                            <input
                              type="checkbox"
                              checked={
                                item.is_prn
                              }
                              onChange={(
                                event,
                              ) =>
                                item.isNew
                                  ? updateNewDraftItem(
                                      index,
                                      "is_prn",
                                      event.target
                                        .checked,
                                    )
                                  : updateDraftItem(
                                      item.id,
                                      "is_prn",
                                      event.target
                                        .checked,
                                    )
                              }
                              disabled={
                                editSubmitting
                              }
                              className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                            />

                            <span className="font-semibold">
                              PRN / As Needed
                            </span>
                          </label>
                        </div>

                        <div className="md:col-span-2 lg:col-span-2">
                          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Instructions
                          </label>

                          <textarea
                            value={
                              item.instructions ??
                              ""
                            }
                            onChange={(
                              event,
                            ) =>
                              item.isNew
                                ? updateNewDraftItem(
                                    index,
                                    "instructions",
                                    event.target
                                      .value,
                                  )
                                : updateDraftItem(
                                    item.id,
                                    "instructions",
                                    event.target
                                      .value,
                                  )
                            }
                            rows={2}
                            maxLength={1000}
                            disabled={
                              editSubmitting
                            }
                            placeholder="e.g. Take after food"
                            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-50 disabled:bg-slate-50"
                          />
                        </div>

                      </div>
                    </div>
                  ),
                )}

              </div>
            </div>

            {/* NOTES */}

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Prescription Notes
              </label>

              <textarea
                value={editNotes}
                onChange={(event) =>
                  setEditNotes(
                    event.target.value,
                  )
                }
                rows={3}
                maxLength={2000}
                disabled={editSubmitting}
                placeholder="Additional prescription instructions or clinical notes..."
                className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-50 disabled:bg-slate-50"
              />
            </div>

          </div>
        </div>

        {/* FOOTER */}

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">

          <button
            type="button"
            onClick={closeDraftEdit}
            disabled={editSubmitting}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() =>
              void handleSaveDraft()
            }
            disabled={
              editSubmitting ||
              editItems.length === 0
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-xs font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {editSubmitting ? (
              <>
                <Loader2
                  size={14}
                  className="animate-spin"
                />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2
                  size={14}
                />
                Save Draft
              </>
            )}
          </button>

        </div>

      </div>
    </div>
  )}
      {/* =================================================
          CREATE PRESCRIPTION MODAL
      ================================================= */}

      {isCreateOpen && canManage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeCreate();
            }
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* HEADER */}

            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                  <Pill size={17} />
                </div>

                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    New Prescription
                  </h2>

                  <p className="text-[10px] text-slate-400">
                    Create a structured medication order
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeCreate}
                disabled={submitting}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <XCircle size={18} />
              </button>
            </div>

            {/* BODY */}

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <div className="space-y-5">
                {/* ENCOUNTER */}

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Clinical Encounter
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </label>

                  <select
                    value={selectedEncounterId}
                    onChange={(event) =>
                      setSelectedEncounterId(
                        event.target.value
                          ? Number(
                              event.target.value,
                            )
                          : "",
                      )
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-50"
                  >
                    <option value="">
                      Select encounter
                    </option>

                    {encounters
                      .filter(
                        (encounter) =>
                          encounter.status !==
                          "Cancelled",
                      )
                      .map((encounter) => (
                        <option
                          key={encounter.id}
                          value={encounter.id}
                        >
                          Consultation #
                          {encounter.id} —{" "}
                          {encounter.chief_complaint ||
                            "Clinical consultation"}{" "}
                          —{" "}
                          {formatDateTime(
                            encounter.created_at,
                          )}
                        </option>
                      ))}
                  </select>

                  {encounters.length === 0 && (
                    <p className="mt-1.5 text-[10px] text-amber-600">
                      A clinical encounter is required
                      before creating a prescription.
                    </p>
                  )}
                </div>

                {/* MEDICATIONS */}

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Medications
                      </p>

                      <p className="mt-0.5 text-[10px] text-slate-400">
                        Add each prescribed medication as
                        a separate item.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addItem}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[10px] font-bold text-violet-700 transition hover:bg-violet-100"
                    >
                      <Plus size={13} />
                      Add Medication
                    </button>
                  </div>

                  <div className="space-y-4">
                    {items.map(
                      (item, index) => (
                        <div
                          key={index}
                          className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                        >
                          <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-100 text-[9px] font-bold text-violet-700">
                                {index + 1}
                              </span>

                              <span className="text-xs font-bold text-slate-800">
                                Medication Item
                              </span>
                            </div>

                            {items.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  removeItem(
                                    index,
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold text-red-600 transition hover:bg-red-50"
                              >
                                <XCircle
                                  size={13}
                                />
                                Remove
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                            <PrescriptionInput
                              label="Medication Name"
                              required
                              value={
                                item.medication_name
                              }
                              onChange={(value) =>
                                updateItem(
                                  index,
                                  "medication_name",
                                  value,
                                )
                              }
                              placeholder="e.g. Paracetamol"
                            />

                            <PrescriptionInput
                              label="Generic Name"
                              value={
                                item.generic_name ??
                                ""
                              }
                              onChange={(value) =>
                                updateItem(
                                  index,
                                  "generic_name",
                                  value,
                                )
                              }
                              placeholder="e.g. Acetaminophen"
                            />

                            <PrescriptionInput
                              label="Strength"
                              value={
                                item.strength ?? ""
                              }
                              onChange={(value) =>
                                updateItem(
                                  index,
                                  "strength",
                                  value,
                                )
                              }
                              placeholder="e.g. 500 mg"
                            />

                            <PrescriptionSelect
                              label="Dosage Form"
                              value={
                                item.dosage_form ?? ""
                              }
                              onChange={(value) =>
                                updateItem(
                                  index,
                                  "dosage_form",
                                  value,
                                )
                              }
                              options={[
                                "Tablet",
                                "Capsule",
                                "Syrup",
                                "Injection",
                                "Cream",
                                "Ointment",
                                "Drops",
                                "Inhaler",
                                "Powder",
                                "Suspension",
                                "Other",
                              ]}
                            />

                            <PrescriptionSelect
                              label="Route"
                              value={
                                item.route ?? ""
                              }
                              onChange={(value) =>
                                updateItem(
                                  index,
                                  "route",
                                  value,
                                )
                              }
                              options={[
                                "Oral",
                                "IV",
                                "IM",
                                "SC",
                                "Topical",
                                "Ophthalmic",
                                "Otic",
                                "Nasal",
                                "Inhalation",
                                "Other",
                              ]}
                            />

                            <PrescriptionInput
                              label="Dose"
                              value={
                                item.dose ?? ""
                              }
                              onChange={(value) =>
                                updateItem(
                                  index,
                                  "dose",
                                  value,
                                )
                              }
                              placeholder="e.g. 1 tablet"
                            />

                            <PrescriptionInput
                              label="Frequency"
                              value={
                                item.frequency ?? ""
                              }
                              onChange={(value) =>
                                updateItem(
                                  index,
                                  "frequency",
                                  value,
                                )
                              }
                              placeholder="e.g. Twice daily"
                            />

                            <PrescriptionInput
                              label="Quantity"
                              value={
                                item.quantity ?? ""
                              }
                              onChange={(value) =>
                                updateItem(
                                  index,
                                  "quantity",
                                  value,
                                )
                              }
                              placeholder="e.g. 10 tablets"
                            />

                            <PrescriptionInput
                              label="Duration"
                              type="number"
                              value={
                                item.duration_value ??
                                ""
                              }
                              onChange={(value) =>
                                updateItem(
                                  index,
                                  "duration_value",
                                  value
                                    ? Number(
                                        value,
                                      )
                                    : null,
                                )
                              }
                              placeholder="e.g. 5"
                            />

                            <PrescriptionSelect
                              label="Duration Unit"
                              value={
                                item.duration_unit ??
                                ""
                              }
                              onChange={(value) =>
                                updateItem(
                                  index,
                                  "duration_unit",
                                  value,
                                )
                              }
                              options={[
                                "Days",
                                "Weeks",
                                "Months",
                              ]}
                            />

                            <div className="flex items-end">
                              <label className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={
                                    item.is_prn
                                  }
                                  onChange={(event) =>
                                    updateItem(
                                      index,
                                      "is_prn",
                                      event.target
                                        .checked,
                                    )
                                  }
                                  className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                                />

                                <span className="font-semibold">
                                  PRN / As Needed
                                </span>
                              </label>
                            </div>

                            <div className="md:col-span-2 lg:col-span-2">
                              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                Instructions
                              </label>

                              <textarea
                                value={
                                  item.instructions ??
                                  ""
                                }
                                onChange={(event) =>
                                  updateItem(
                                    index,
                                    "instructions",
                                    event.target
                                      .value,
                                  )
                                }
                                rows={2}
                                maxLength={1000}
                                placeholder="e.g. Take after food"
                                className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-50"
                              />
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {/* NOTES */}

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Prescription Notes
                  </label>

                  <textarea
                    value={notes}
                    onChange={(event) =>
                      setNotes(event.target.value)
                    }
                    rows={3}
                    maxLength={2000}
                    placeholder="Additional prescription instructions or clinical notes..."
                    className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-50"
                  />
                </div>
              </div>
            </div>

            {/* FOOTER */}

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={closeCreate}
                disabled={submitting}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleCreate()
                }
                disabled={
                  submitting ||
                  !selectedEncounterId ||
                  items.length === 0
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-xs font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    Create Prescription
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}


      {reportPrescription && (
        <PrescriptionReportModal
          prescription={reportPrescription}
          onClose={() =>
            setReportPrescription(null)
          }
        />
      )}
    </>
  );
}

// =====================================================
// SUMMARY CARD
// =====================================================

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "blue" | "amber" | "emerald";
}) {
  const toneClasses = {
    slate: "border-slate-200 bg-slate-50 text-slate-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };

  const labelClasses = {
    slate: "text-slate-500",
    blue: "text-blue-600",
    amber: "text-amber-600",
    emerald: "text-emerald-600",
  };

  return (
    <div
      className={`
        min-h-[72px]
        rounded-xl
        border
        px-4
        py-3
        ${toneClasses[tone]}
      `}
    >
      <p
        className={`
          text-[9px]
          font-bold
          uppercase
          tracking-[0.12em]
          ${labelClasses[tone]}
        `}
      >
        {label}
      </p>

      <p className="mt-1 text-xl font-bold tracking-tight">
        {value}
      </p>
    </div>
  );
}

// =====================================================
// INPUT
// =====================================================

function PrescriptionInput({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        min={
          type === "number"
            ? 1
            : undefined
        }
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-50"
      />
    </div>
  );
}

// =====================================================
// SELECT
// =====================================================

function PrescriptionSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-50"
      >
        <option value="">
          Select
        </option>

        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}