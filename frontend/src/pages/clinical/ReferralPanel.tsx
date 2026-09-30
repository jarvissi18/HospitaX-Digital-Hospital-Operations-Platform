import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  FileText,
  Loader2,
  MessageSquareText,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
  Stethoscope,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";

import {
  acceptReferral,
  cancelReferral,
  completeReferral,
  createReferral,
  getPatientReferrals,
  rejectReferral,
  startReferral,
  updateReferral,
  type Referral,
  type ReferralCreate,
  type ReferralPriority,
  type ReferralType,
} from "../../services/referralApi";

import { getDepartments } from "../../services/hospitalStructureApi";
import { getDoctors, type User } from "../../services/staffApi";
import type { ClinicalEncounter } from "../../services/clinicalEncounterApi";
import { useAuth } from "../../context/AuthContext";

interface ReferralPanelProps {
  patientId: number;
  encounters: ClinicalEncounter[];
  canManage: boolean;
}

type DepartmentOption = {
  id: number;
  name: string;
  is_active?: boolean | string;
};

const REFERRAL_TYPES: Array<{
  value: ReferralType;
  label: string;
}> = [
  { value: "SPECIALIST", label: "Specialist Consultation" },
  { value: "DEPARTMENT", label: "Department Referral" },
  { value: "SECOND_OPINION", label: "Second Opinion" },
  { value: "FOLLOW_UP", label: "Follow-up" },
  { value: "OTHER", label: "Other" },
];

const PRIORITIES: Array<{
  value: ReferralPriority;
  label: string;
}> = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

const EMPTY_FORM: ReferralCreate = {
  patient_id: 0,
  encounter_id: 0,
  referred_to_id: null,
  department_id: null,
  specialty: "",
  referral_type: "SPECIALIST",
  reason: "",
  clinical_summary: "",
  priority: "MEDIUM",
  notes: "",
};

function formatDateTime(value: string | null) {
  if (!value) return "Not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not specified";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusClasses(status: Referral["status"]) {
  switch (status) {
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "ACCEPTED":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "IN_PROGRESS":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "COMPLETED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "REJECTED":
    case "CANCELLED":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function getPriorityClasses(priority: ReferralPriority) {
  switch (priority) {
    case "URGENT":
      return "border-red-200 bg-red-50 text-red-700";
    case "HIGH":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "MEDIUM":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "LOW":
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function formatStatus(status: Referral["status"]) {
  return status.replaceAll("_", " ");
}

function formatReferralType(type: ReferralType) {
  const match = REFERRAL_TYPES.find((item) => item.value === type);
  return match?.label ?? type.replaceAll("_", " ");
}

function isActive(value: boolean | string | undefined) {
  return value === true || value === "true";
}

function getDoctorLabel(doctor: User) {
  return doctor.full_name || doctor.email || `Doctor #${doctor.id}`;
}

export default function ReferralPanel({
  patientId,
  encounters,
  canManage,
}: ReferralPanelProps) {
  const { user } = useAuth();
  const isDoctor = user?.role === "Doctor";

  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [error, setError] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<ReferralCreate>({
    ...EMPTY_FORM,
    patient_id: patientId,
  });
  const [saving, setSaving] = useState(false);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<ReferralCreate>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [actionNotesId, setActionNotesId] = useState<number | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [actionType, setActionType] = useState<"reject" | "cancel" | null>(null);

  const activeDoctors = useMemo(
    () => doctors.filter((doctor) => doctor.role === "Doctor" && isActive(doctor.is_active)),
    [doctors],
  );

  const activeDepartments = useMemo(
    () => departments.filter((department) => isActive(department.is_active)),
    [departments],
  );

  const summary = useMemo(() => {
    return {
      total: referrals.length,
      pending: referrals.filter((item) => item.status === "PENDING").length,
      inProgress: referrals.filter((item) => item.status === "IN_PROGRESS").length,
      completed: referrals.filter((item) => item.status === "COMPLETED").length,
    };
  }, [referrals]);

  const encounterMap = useMemo(
    () => new Map(encounters.map((encounter) => [encounter.id, encounter])),
    [encounters],
  );

  const doctorMap = useMemo(
    () => new Map(doctors.map((doctor) => [doctor.id, doctor])),
    [doctors],
  );

  const departmentMap = useMemo(
    () => new Map(departments.map((department) => [department.id, department])),
    [departments],
  );

  async function loadReferrals(showRefresh = false) {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const data = await getPatientReferrals(patientId);
      setReferrals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Referral loading error:", err);
      setError(err instanceof Error ? err.message : "Unable to load referral history.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadLookups() {
    if (!canManage || !isDoctor) {
      setLookupLoading(false);
      return;
    }

    try {
      setLookupLoading(true);
      const [doctorData, departmentData] = await Promise.all([
        getDoctors(),
        getDepartments(),
      ]);

      setDoctors(Array.isArray(doctorData) ? doctorData : []);
      setDepartments(Array.isArray(departmentData) ? departmentData : []);
    } catch (err) {
      console.error("Referral lookup loading error:", err);
      toast.error("Unable to load doctors and departments.");
    } finally {
      setLookupLoading(false);
    }
  }

  useEffect(() => {
    void loadReferrals();
    void loadLookups();
  }, [patientId, canManage, isDoctor]);

  function resetCreateForm() {
    setForm({
      ...EMPTY_FORM,
      patient_id: patientId,
      encounter_id: encounters[0]?.id ?? 0,
    });
  }

  function openCreate() {
    resetCreateForm();
    setIsCreateOpen(true);
  }

  function closeCreate() {
    if (saving) return;
    setIsCreateOpen(false);
    resetCreateForm();
  }

  function updateForm<K extends keyof ReferralCreate>(
    field: K,
    value: ReferralCreate[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();

    if (!form.encounter_id) {
      toast.error("Select a clinical encounter.");
      return;
    }

    if (!form.referred_to_id && !form.department_id) {
      toast.error("Select a receiving doctor or department.");
      return;
    }

    if (!form.reason?.trim()) {
      toast.error("Referral reason is required.");
      return;
    }

    try {
      setSaving(true);

      const created = await createReferral({
        ...form,
        patient_id: patientId,
        encounter_id: Number(form.encounter_id),
        referred_to_id: form.referred_to_id ? Number(form.referred_to_id) : null,
        department_id: form.department_id ? Number(form.department_id) : null,
        specialty: form.specialty?.trim() || null,
        reason: form.reason.trim(),
        clinical_summary: form.clinical_summary?.trim() || null,
        notes: form.notes?.trim() || null,
      });

      setReferrals((current) => [created, ...current]);
      setIsCreateOpen(false);
      resetCreateForm();
      toast.success("Referral created successfully.");
    } catch (err) {
      console.error("Referral creation error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to create referral.");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(referral: Referral) {
    if (referral.status !== "PENDING") {
      toast.info("Only pending referrals can be edited.");
      return;
    }

    setEditingId(referral.id);
    setEditForm({
      specialty: referral.specialty,
      referral_type: referral.referral_type,
      reason: referral.reason,
      clinical_summary: referral.clinical_summary,
      priority: referral.priority,
      notes: referral.notes,
    });
  }

  async function handleEditSave() {
    if (!editingId) return;

    if (!editForm.reason?.trim()) {
      toast.error("Referral reason is required.");
      return;
    }

    try {
      setEditSaving(true);
      const updated = await updateReferral(editingId, {
        specialty: editForm.specialty?.trim() || null,
        referral_type: editForm.referral_type as ReferralType | undefined,
        reason: editForm.reason.trim(),
        clinical_summary: editForm.clinical_summary?.trim() || null,
        priority: editForm.priority as ReferralPriority | undefined,
        notes: editForm.notes?.trim() || null,
      });

      setReferrals((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setEditingId(null);
      setEditForm({});
      toast.success("Referral updated successfully.");
    } catch (err) {
      console.error("Referral update error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to update referral.");
    } finally {
      setEditSaving(false);
    }
  }

  async function processAction(
    referral: Referral,
    action: "accept" | "start" | "complete" | "reject" | "cancel",
    notes?: string,
  ) {
    try {
      setProcessingId(referral.id);
      let updated: Referral;

      switch (action) {
        case "accept":
          updated = await acceptReferral(referral.id);
          break;
        case "start":
          updated = await startReferral(referral.id);
          break;
        case "complete":
          updated = await completeReferral(referral.id);
          break;
        case "reject":
          updated = await rejectReferral(referral.id, notes?.trim() || null);
          break;
        case "cancel":
          updated = await cancelReferral(referral.id, notes?.trim() || null);
          break;
      }

      setReferrals((current) =>
        current.map((item) => (item.id === referral.id ? updated : item)),
      );
      setActionNotesId(null);
      setActionNotes("");
      setActionType(null);
      toast.success(`Referral ${action === "start" ? "started" : `${action}ed`} successfully.`);
    } catch (err) {
      console.error("Referral lifecycle error:", err);
      toast.error(err instanceof Error ? err.message : `Unable to ${action} referral.`);
    } finally {
      setProcessingId(null);
    }
  }

  function requestAction(referral: Referral, action: "reject" | "cancel") {
    setActionNotesId(referral.id);
    setActionType(action);
    setActionNotes("");
  }

  function confirmSimpleAction(referral: Referral, action: "accept" | "start" | "complete") {
    const labels = {
      accept: "Accept this referral?",
      start: "Start this referral?",
      complete: "Complete this referral?",
    };

    if (!window.confirm(labels[action])) return;
    void processAction(referral, action);
  }

  function confirmNotesAction(referral: Referral) {
    if (!actionType) return;
    const action = actionType;
    const message = action === "reject" ? "Reject this referral?" : "Cancel this referral?";
    if (!window.confirm(message)) return;
    void processAction(referral, action, actionNotes);
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-600">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Referrals</h2>
                <span className="rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-700">
                  Clinical Workflow
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Specialist, department and second-opinion referrals for this patient.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadReferrals(true)}
              disabled={refreshing}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </button>
            {canManage && isDoctor && (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-100"
              >
                <Plus className="h-4 w-4" />
                New Referral
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: "Total", value: summary.total, className: "border-slate-200 bg-slate-50 text-slate-700" },
            { label: "Pending", value: summary.pending, className: "border-amber-200 bg-amber-50 text-amber-700" },
            { label: "In Progress", value: summary.inProgress, className: "border-violet-200 bg-violet-50 text-violet-700" },
            { label: "Completed", value: summary.completed, className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
          ].map((item) => (
            <div key={item.label} className={`rounded-xl border px-4 py-3 ${item.className}`}>
              <p className="text-[9px] font-bold uppercase tracking-wider opacity-75">{item.label}</p>
              <p className="mt-1 text-xl font-bold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 sm:mx-6">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <p className="text-xs font-medium leading-5 text-red-700">{error}</p>
        </div>
      )}

      <div className="p-5 sm:p-6">
        {loading ? (
          <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading referral history...
            </div>
          </div>
        ) : referrals.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-500">
              <Send className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-800">No referrals recorded</p>
            <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
              Create a referral when the patient requires specialist consultation, department review or a second opinion.
            </p>
            {canManage && isDoctor && (
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-violet-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Referral
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.map((referral) => {
              const encounter = encounterMap.get(referral.encounter_id);
              const receivingDoctor = referral.referred_to_id
                ? doctorMap.get(referral.referred_to_id)
                : null;
              const department = referral.department_id
                ? departmentMap.get(referral.department_id)
                : null;
              const expanded = expandedId === referral.id;
              const isProcessing = processingId === referral.id;
              const isEditing = editingId === referral.id;
              const showActionNotes = actionNotesId === referral.id;

              return (
                <article
                  key={referral.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">Referral #{referral.id}</span>
                          <span className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${getStatusClasses(referral.status)}`}>
                            {formatStatus(referral.status)}
                          </span>
                          <span className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${getPriorityClasses(referral.priority)}`}>
                            {referral.priority}
                          </span>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="flex items-start gap-2">
                            <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                            <div className="min-w-0">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Referral Type</p>
                              <p className="mt-0.5 truncate text-xs font-semibold text-slate-700">{formatReferralType(referral.referral_type)}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                            <div className="min-w-0">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Receiving Doctor</p>
                              <p className="mt-0.5 truncate text-xs font-semibold text-slate-700">
                                {referral.receiving_doctor_name || (receivingDoctor ? getDoctorLabel(receivingDoctor) : "Not assigned")}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                            <div className="min-w-0">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Department</p>
                              <p className="mt-0.5 truncate text-xs font-semibold text-slate-700">
                                {referral.department_name || department?.name || "Not specified"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                            <div className="min-w-0">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Referred</p>
                              <p className="mt-0.5 truncate text-xs font-semibold text-slate-700">{formatDateTime(referral.referred_at)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Reason</p>
                          <p className="mt-1 text-xs leading-5 text-slate-700">{referral.reason}</p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
                        {canManage && isDoctor && referral.status === "PENDING" && (
                          <button
                            type="button"
                            onClick={() => openEdit(referral)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 transition hover:bg-slate-50"
                          >
                            Edit
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : referral.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 transition hover:bg-slate-50"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {expanded ? "Hide" : "View"}
                          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    {canManage && isDoctor && referral.status === "PENDING" && showActionNotes && (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {actionType === "reject" ? "Reject referral" : "Cancel referral"}
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-500">Optional note for the referral record.</p>
                          </div>
                          <button type="button" onClick={() => { setActionNotesId(null); setActionType(null); }} className="text-slate-400 hover:text-slate-700">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <textarea
                          value={actionNotes}
                          onChange={(event) => setActionNotes(event.target.value)}
                          rows={3}
                          maxLength={2000}
                          placeholder="Add a note..."
                          className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
                        />
                        <div className="mt-3 flex justify-end gap-2">
                          <button type="button" onClick={() => { setActionNotesId(null); setActionType(null); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600">Close</button>
                          <button type="button" onClick={() => confirmNotesAction(referral)} disabled={isProcessing} className="rounded-lg bg-red-600 px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">
                            {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : actionType === "reject" ? "Reject Referral" : "Cancel Referral"}
                          </button>
                        </div>
                      </div>
                    )}

                    {expanded && (
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        {isEditing ? (
                          <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4">
                            <div className="grid gap-4 lg:grid-cols-2">
                              <Field label="Referral Type">
                                <select value={String(editForm.referral_type ?? referral.referral_type)} onChange={(event) => setEditForm((current) => ({ ...current, referral_type: event.target.value as ReferralType }))} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10">
                                  {REFERRAL_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                                </select>
                              </Field>
                              <Field label="Priority">
                                <select value={String(editForm.priority ?? referral.priority)} onChange={(event) => setEditForm((current) => ({ ...current, priority: event.target.value as ReferralPriority }))} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10">
                                  {PRIORITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                                </select>
                              </Field>
                              <Field label="Specialty">
                                <input value={String(editForm.specialty ?? "")} onChange={(event) => setEditForm((current) => ({ ...current, specialty: event.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10" placeholder="e.g. Cardiology" />
                              </Field>
                              <Field label="Reason">
                                <input value={String(editForm.reason ?? "")} onChange={(event) => setEditForm((current) => ({ ...current, reason: event.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10" />
                              </Field>
                              <div className="lg:col-span-2">
                                <Field label="Clinical Summary">
                                  <textarea value={String(editForm.clinical_summary ?? "")} onChange={(event) => setEditForm((current) => ({ ...current, clinical_summary: event.target.value }))} rows={3} className="input resize-none" />
                                </Field>
                              </div>
                              <div className="lg:col-span-2">
                                <Field label="Notes">
                                  <textarea value={String(editForm.notes ?? "")} onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))} rows={2} className="input resize-none" />
                                </Field>
                              </div>
                            </div>
                            <div className="mt-4 flex justify-end gap-2">
                              <button type="button" onClick={() => { setEditingId(null); setEditForm({}); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600">Cancel</button>
                              <button type="button" onClick={() => void handleEditSave()} disabled={editSaving} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">
                                {editSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                              <Info label="Referring Doctor" value={referral.referring_doctor_name || "Not specified"} icon={<Stethoscope className="h-3.5 w-3.5" />} />
                              <Info label="Encounter" value={`Encounter #${referral.encounter_id}${encounter?.status ? ` · ${encounter.status}` : ""}`} icon={<FileText className="h-3.5 w-3.5" />} />
                              <Info label="Specialty" value={referral.specialty || "Not specified"} icon={<ArrowRight className="h-3.5 w-3.5" />} />
                              <Info label="Accepted" value={formatDateTime(referral.accepted_at)} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
                              <Info label="Started" value={formatDateTime(referral.started_at)} icon={<Clock3 className="h-3.5 w-3.5" />} />
                              <Info label="Completed" value={formatDateTime(referral.completed_at)} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
                            </div>

                            {referral.clinical_summary && (
                              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                                <p className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-blue-600"><MessageSquareText className="h-3.5 w-3.5" /> Clinical Summary</p>
                                <p className="mt-2 text-xs leading-5 text-slate-700">{referral.clinical_summary}</p>
                              </div>
                            )}

                            {referral.notes && (
                              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Notes</p>
                                <p className="mt-2 text-xs leading-5 text-slate-700">{referral.notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {canManage && isDoctor && !isEditing && !showActionNotes && (
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                        {referral.status === "PENDING" && referral.referred_to_id === user?.id && (
                          <button type="button" onClick={() => confirmSimpleAction(referral, "accept")} disabled={isProcessing} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-bold text-white transition hover:bg-blue-700 disabled:opacity-50">
                            {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            Accept
                          </button>
                        )}
                        {referral.status === "ACCEPTED" && referral.referred_to_id === user?.id && (
                          <button type="button" onClick={() => confirmSimpleAction(referral, "start")} disabled={isProcessing} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[10px] font-bold text-white transition hover:bg-violet-700 disabled:opacity-50">
                            {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                            Start
                          </button>
                        )}
                        {referral.status === "IN_PROGRESS" && referral.referred_to_id === user?.id && (
                          <button type="button" onClick={() => confirmSimpleAction(referral, "complete")} disabled={isProcessing} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50">
                            {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            Complete
                          </button>
                        )}
                        {referral.status === "PENDING" && referral.referred_to_id === user?.id && (
                          <button type="button" onClick={() => requestAction(referral, "reject")} disabled={isProcessing} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-[10px] font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50">
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        )}
                        {referral.status === "PENDING" && referral.referred_by_id === user?.id && (
                          <button type="button" onClick={() => requestAction(referral, "cancel")} disabled={isProcessing} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
                            <XCircle className="h-3.5 w-3.5" />
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-md sm:p-5">
          <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_-24px_rgba(15,23,42,0.45)]">
            {/* Modal Header */}
            <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 sm:px-7 sm:py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-200">
                    <Send className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                        Create Clinical Referral
                      </h3>
                      <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-violet-700">
                        New Referral
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Create a formal clinical referral linked to the selected patient encounter.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeCreate}
                  disabled={saving}
                  aria-label="Close referral form"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-bold text-slate-600">
                  <UserRound className="h-3.5 w-3.5 text-slate-400" />
                  Patient #{patientId}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-violet-100 bg-violet-50 px-2.5 py-1.5 text-[10px] font-bold text-violet-700">
                  <Stethoscope className="h-3.5 w-3.5" />
                  Clinical Workflow
                </span>
                <span className="ml-auto hidden items-center gap-1.5 text-[10px] font-semibold text-slate-400 sm:inline-flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Draft will be created as Pending
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreate} className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60">
              <div className="space-y-5 p-4 sm:p-6 lg:p-7">
                {lookupLoading && (
                  <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3.5 text-xs font-semibold text-blue-700 shadow-sm">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </span>
                    <div>
                      <p className="font-bold">Loading referral options</p>
                      <p className="mt-0.5 text-[10px] font-medium text-blue-600/80">
                        Fetching active doctors and departments...
                      </p>
                    </div>
                  </div>
                )}

                {/* Section: Referral Context */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                        <FileText className="h-4 w-4" />
                      </span>
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-[0.1em] text-slate-800">
                          Referral Context
                        </h4>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          Link the referral to the appropriate clinical encounter and workflow type.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
                    <Field label="Clinical Encounter" required>
                      <select
                        value={form.encounter_id || ""}
                        onChange={(event) => updateForm("encounter_id", Number(event.target.value))}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
                        required
                      >
                        <option value="">Select encounter</option>
                        {encounters.map((encounter) => (
                          <option key={encounter.id} value={encounter.id}>
                            Encounter #{encounter.id} · {encounter.status}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Referral Type" required>
                      <select
                        value={form.referral_type}
                        onChange={(event) => updateForm("referral_type", event.target.value as ReferralType)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
                      >
                        {REFERRAL_TYPES.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>

                {/* Section: Routing */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Building2 className="h-4 w-4" />
                      </span>
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-[0.1em] text-slate-800">
                          Referral Routing
                        </h4>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          Define who or which department should receive the referral.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
                    <Field label="Receiving Doctor">
                      <select
                        value={form.referred_to_id ?? ""}
                        onChange={(event) => updateForm("referred_to_id", event.target.value ? Number(event.target.value) : null)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
                      >
                        <option value="">Not assigned</option>
                        {activeDoctors.map((doctor) => (
                          <option key={doctor.id} value={doctor.id}>
                            {getDoctorLabel(doctor)}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Department">
                      <select
                        value={form.department_id ?? ""}
                        onChange={(event) => updateForm("department_id", event.target.value ? Number(event.target.value) : null)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
                      >
                        <option value="">Not assigned</option>
                        {activeDepartments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Specialty">
                      <input
                        value={form.specialty ?? ""}
                        onChange={(event) => updateForm("specialty", event.target.value)}
                        maxLength={100}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
                        placeholder="e.g. Cardiology, Neurology"
                      />
                    </Field>

                    <Field label="Priority" required>
                      <select
                        value={form.priority ?? "MEDIUM"}
                        onChange={(event) => updateForm("priority", event.target.value as ReferralPriority)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
                      >
                        {PRIORITIES.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="mx-4 mb-4 flex items-start gap-2.5 rounded-xl border border-violet-100 bg-violet-50/70 px-3.5 py-3 sm:mx-5 sm:mb-5">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                    <p className="text-[10px] leading-4 text-violet-700">
                      Select at least one receiving target: a specific doctor or a department.
                    </p>
                  </div>
                </div>

                {/* Section: Clinical Information */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                        <Stethoscope className="h-4 w-4" />
                      </span>
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-[0.1em] text-slate-800">
                          Clinical Information
                        </h4>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          Provide the clinical reason and relevant context for the receiving team.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-4 sm:p-5">
                    <Field label="Reason for Referral" required>
                      <textarea
                        value={form.reason}
                        onChange={(event) => updateForm("reason", event.target.value)}
                        maxLength={2000}
                        rows={3}
                        required
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-medium leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
                        placeholder="Describe why specialist or department review is required..."
                      />
                      <p className="mt-1.5 text-right text-[9px] font-medium text-slate-400">
                        {form.reason?.length ?? 0}/2000
                      </p>
                    </Field>

                    <Field label="Clinical Summary">
                      <textarea
                        value={form.clinical_summary ?? ""}
                        onChange={(event) => updateForm("clinical_summary", event.target.value)}
                        maxLength={5000}
                        rows={4}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-medium leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
                        placeholder="Relevant clinical context, findings and current treatment..."
                      />
                      <p className="mt-1.5 text-right text-[9px] font-medium text-slate-400">
                        {form.clinical_summary?.length ?? 0}/5000
                      </p>
                    </Field>

                    <Field label="Notes">
                      <textarea
                        value={form.notes ?? ""}
                        onChange={(event) => updateForm("notes", event.target.value)}
                        maxLength={2000}
                        rows={2}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-medium leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
                        placeholder="Additional referral notes..."
                      />
                      <p className="mt-1.5 text-right text-[9px] font-medium text-slate-400">
                        {form.notes?.length ?? 0}/2000
                      </p>
                    </Field>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-7">
                <p className="hidden text-[10px] font-medium text-slate-400 sm:block">
                  <span className="font-bold text-red-500">*</span> Required fields
                </p>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeCreate}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || lookupLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-500/15 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {saving ? "Creating..." : "Create Referral"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}{required ? <span className="ml-1 text-red-500">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function Info({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-0.5 break-words text-xs font-semibold text-slate-700">{value}</p>
      </div>
    </div>
  );
}
