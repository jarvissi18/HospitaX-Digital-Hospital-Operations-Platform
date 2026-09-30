import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ElementType,
  type ReactNode,
} from "react";

import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Edit3,
  Layers3,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import api from "../../services/api";

// =====================================================
// TYPES
// =====================================================

interface Ward {
  id: number;
  name: string;
  ward_type: string;
  floor_id: number;
  description?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface Floor {
  id: number;
  name: string;
  floor_number: number;
  department_id: number;
  is_active: boolean;
}

interface WardForm {
  name: string;
  ward_type: string;
  floor_id: string;
  description: string;
  is_active: boolean;
}

type StatusFilter = "All" | "Active" | "Inactive";

const EMPTY_FORM: WardForm = {
  name: "",
  ward_type: "General",
  floor_id: "",
  description: "",
  is_active: true,
};

const WARD_TYPES = [
  "General",
  "ICU",
  "Emergency",
  "Pediatric",
  "Maternity",
  "Isolation",
  "Surgical",
  "Recovery",
  "Private",
];

// =====================================================
// HELPERS
// =====================================================

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function getFloorLabel(floor?: Floor | null) {
  if (!floor) return "Unknown Floor";
  return `${floor.name} · Level ${floor.floor_number}`;
}

// =====================================================
// STATUS BADGE
// =====================================================

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span
      className="
        inline-flex items-center gap-1.5 rounded-full border
        border-emerald-200 bg-emerald-50 px-2.5 py-1
        text-[10px] font-bold text-emerald-700
      "
    >
      <CheckCircle2 size={12} />
      Active
    </span>
  ) : (
    <span
      className="
        inline-flex items-center gap-1.5 rounded-full border
        border-slate-200 bg-slate-100 px-2.5 py-1
        text-[10px] font-bold text-slate-500
      "
    >
      <XCircle size={12} />
      Inactive
    </span>
  );
}

// =====================================================
// MAIN
// =====================================================

export default function Wards() {
  const navigate = useNavigate();

  const [wards, setWards] = useState<Ward[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingWard, setEditingWard] = useState<Ward | null>(null);

  const [form, setForm] = useState<WardForm>({
    ...EMPTY_FORM,
  });

  // ===================================================
  // LOAD DATA
  // ===================================================

  const loadData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [wardsResponse, floorsResponse] = await Promise.all([
        api.get("/hospital-structure/wards"),
        api.get("/hospital-structure/floors"),
      ]);

      const wardPayload = wardsResponse.data;
      const floorPayload = floorsResponse.data;

      const wardRecords: Ward[] = Array.isArray(wardPayload)
        ? wardPayload
        : Array.isArray(wardPayload?.items)
          ? wardPayload.items
          : Array.isArray(wardPayload?.data)
            ? wardPayload.data
            : [];

      const floorRecords: Floor[] = Array.isArray(floorPayload)
        ? floorPayload
        : Array.isArray(floorPayload?.items)
          ? floorPayload.items
          : Array.isArray(floorPayload?.data)
            ? floorPayload.data
            : [];

      setWards(wardRecords);
      setFloors(floorRecords);
    } catch (error: any) {
      console.error("Unable to load wards:", error);

      toast.error(
        error?.response?.data?.detail ||
          "Unable to load wards.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // ===================================================
  // FLOOR LOOKUP
  // ===================================================

  const floorMap = useMemo(() => {
    const map = new Map<number, Floor>();

    floors.forEach((floor) => {
      map.set(floor.id, floor);
    });

    return map;
  }, [floors]);

  // ===================================================
  // STATISTICS
  // ===================================================

  const statistics = useMemo(() => {
    const active = wards.filter(
      (ward) => ward.is_active,
    ).length;

    const inactive = wards.length - active;

    const types = new Set(
      wards.map((ward) => normalize(ward.ward_type)),
    ).size;

    const floorsUsed = new Set(
      wards.map((ward) => ward.floor_id),
    ).size;

    return {
      total: wards.length,
      active,
      inactive,
      types,
      floorsUsed,
    };
  }, [wards]);

  // ===================================================
  // FILTER
  // ===================================================

  const filteredWards = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return wards.filter((ward) => {
      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" && ward.is_active) ||
        (statusFilter === "Inactive" && !ward.is_active);

      if (!matchesStatus) return false;

      if (!keyword) return true;

      const floor = floorMap.get(ward.floor_id);

      return (
        ward.name.toLowerCase().includes(keyword) ||
        ward.ward_type.toLowerCase().includes(keyword) ||
        String(ward.floor_id).includes(keyword) ||
        String(floor?.name ?? "").toLowerCase().includes(keyword) ||
        String(floor?.floor_number ?? "").includes(keyword) ||
        String(ward.description ?? "").toLowerCase().includes(keyword)
      );
    });
  }, [wards, floorMap, search, statusFilter]);

  // ===================================================
  // ADD
  // ===================================================

  const openAdd = () => {
    setEditingWard(null);

    setForm({
      ...EMPTY_FORM,
      floor_id:
        floors.length > 0
          ? String(floors[0].id)
          : "",
    });

    setModalOpen(true);
  };

  // ===================================================
  // EDIT
  // ===================================================

  const openEdit = (ward: Ward) => {
    setEditingWard(ward);

    setForm({
      name: ward.name ?? "",
      ward_type: ward.ward_type ?? "General",
      floor_id:
        ward.floor_id !== undefined
          ? String(ward.floor_id)
          : "",
      description: ward.description ?? "",
      is_active: ward.is_active !== false,
    });

    setModalOpen(true);
  };

  // ===================================================
  // CLOSE MODAL
  // ===================================================

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingWard(null);

    setForm({
      ...EMPTY_FORM,
    });
  };

  // ===================================================
  // FORM CHANGE
  // ===================================================

  const updateForm = (
    field: keyof WardForm,
    value: string | boolean,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  // ===================================================
  // SAVE
  // ===================================================

  const saveWard = async () => {
    const name = form.name.trim();

    if (!name) {
      toast.error("Ward name is required.");
      return;
    }

    if (name.length < 2) {
      toast.error(
        "Ward name must contain at least 2 characters.",
      );
      return;
    }

    if (!form.ward_type.trim()) {
      toast.error("Ward type is required.");
      return;
    }

    if (!form.floor_id) {
      toast.error("Please select a floor.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name,
        ward_type: form.ward_type.trim(),
        floor_id: Number(form.floor_id),
        description: form.description.trim() || null,
        is_active: form.is_active,
      };

      if (editingWard) {
        await api.put(
          `/hospital-structure/wards/${editingWard.id}`,
          payload,
        );

        toast.success("Ward updated successfully.");
      } else {
        await api.post(
          "/hospital-structure/wards",
          payload,
        );

        toast.success("Ward created successfully.");
      }

      setModalOpen(false);
      setEditingWard(null);

      setForm({
        ...EMPTY_FORM,
      });

      await loadData(true);
    } catch (error: any) {
      console.error("Unable to save ward:", error);

      toast.error(
        error?.response?.data?.detail ||
          "Unable to save ward.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ===================================================
  // DELETE
  // ===================================================

  const deleteWard = async (ward: Ward) => {
    const confirmed = window.confirm(
      `Delete ward "${ward.name}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      await api.delete(
        `/hospital-structure/wards/${ward.id}`,
      );

      toast.success("Ward deleted successfully.");

      await loadData(true);
    } catch (error: any) {
      console.error("Unable to delete ward:", error);

      toast.error(
        error?.response?.data?.detail ||
          "Unable to delete ward.",
      );
    }
  };

  // ===================================================
  // PAGE
  // ===================================================

  return (
    <div
      className="
        flex h-full min-h-0 flex-col overflow-hidden
      "
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <header
        className="
          shrink-0 border-b border-slate-200/80 bg-white
        "
      >
        <div
          className="
            flex items-center justify-between gap-4
            px-5 py-4 sm:px-6
          "
        >
          <div className="flex min-w-0 items-center gap-3">
            {/* BACK */}

            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              title="Back to dashboard"
              className="
                hidden h-9 w-9 shrink-0 items-center justify-center
                rounded-lg border border-slate-200 bg-white
                text-slate-500 transition hover:border-slate-300
                hover:bg-slate-50 hover:text-slate-900 sm:flex
              "
            >
              <ArrowLeft size={16} />
            </button>

            {/* ICON */}

            <div
              className="
                flex h-10 w-10 shrink-0 items-center justify-center
                rounded-xl bg-blue-50 text-blue-600
              "
            >
              <Building2 size={19} />
            </div>

            {/* TITLE */}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="
                    hidden text-[9px] font-bold uppercase
                    tracking-[0.15em] text-slate-400 md:inline
                  "
                >
                  Hospital Structure
                </span>

                <span className="hidden text-slate-300 md:inline">
                  /
                </span>

                <span
                  className="
                    text-[9px] font-bold uppercase
                    tracking-[0.15em] text-blue-600
                  "
                >
                  Wards
                </span>
              </div>

              <h1
                className="
                  text-xl font-bold tracking-tight text-slate-950
                  sm:text-2xl
                "
              >
                Wards
              </h1>

              <p
                className="
                  hidden text-xs text-slate-500 sm:block
                "
              >
                Manage hospital wards and patient care areas.
              </p>
            </div>
          </div>

          {/* ACTIONS */}

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void loadData(true)}
              disabled={refreshing}
              title="Refresh wards"
              className="
                flex h-9 w-9 items-center justify-center rounded-lg
                border border-slate-200 bg-white text-slate-600
                shadow-sm transition hover:border-slate-300
                hover:bg-slate-50 hover:text-slate-900
                disabled:cursor-not-allowed disabled:opacity-50
                sm:w-auto sm:px-3
              "
            >
              <RefreshCw
                size={15}
                className={refreshing ? "animate-spin" : ""}
              />

              <span className="ml-2 hidden text-xs font-semibold sm:inline">
                {refreshing ? "Refreshing..." : "Refresh"}
              </span>
            </button>

            <button
              type="button"
              onClick={openAdd}
              disabled={floors.length === 0}
              className="
                inline-flex h-9 items-center gap-2 rounded-lg
                bg-slate-950 px-3.5 text-xs font-semibold text-white
                shadow-sm transition hover:bg-blue-600
                focus:outline-none focus:ring-4 focus:ring-blue-100
                disabled:cursor-not-allowed disabled:opacity-50
              "
            >
              <Plus size={15} />

              <span className="hidden sm:inline">
                Add Ward
              </span>

              <span className="sm:hidden">
                Add
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* =================================================
          CONTENT
      ================================================= */}

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div
          className="
            mx-auto flex min-h-full w-full max-w-[1600px]
            flex-col gap-4 p-4 sm:p-5
          "
        >
          {/* =================================================
              STATISTICS
          ================================================= */}

          <section
            className="
              grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4
            "
          >
            <StatCard
              label="Wards"
              value={statistics.total}
              icon={Building2}
              iconClass="bg-blue-50 text-blue-600"
            />

            <StatCard
              label="Active"
              value={statistics.active}
              icon={CheckCircle2}
              iconClass="bg-emerald-50 text-emerald-600"
            />

            <StatCard
              label="Inactive"
              value={statistics.inactive}
              icon={XCircle}
              iconClass="bg-slate-100 text-slate-500"
            />

            <StatCard
              label="Floors Used"
              value={statistics.floorsUsed}
              icon={Layers3}
              iconClass="bg-violet-50 text-violet-600"
            />
          </section>

          {/* =================================================
              REGISTRY
          ================================================= */}

          <section
            className="
              flex min-h-[420px] flex-1 flex-col overflow-hidden
              rounded-2xl border border-slate-200 bg-white shadow-sm
            "
          >
            {/* TOOLBAR */}

            <div
              className="
                flex shrink-0 flex-col gap-3 border-b
                border-slate-100 p-4 md:flex-row md:items-center
                md:justify-between
              "
            >
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900">
                    Ward Directory
                  </h2>

                  <span
                    className="
                      rounded-full bg-slate-100 px-2 py-0.5
                      text-[9px] font-bold uppercase tracking-wide
                      text-slate-500
                    "
                  >
                    {filteredWards.length}
                  </span>
                </div>

                <p className="mt-0.5 text-[11px] text-slate-400">
                  {filteredWards.length} of {wards.length} wards
                </p>
              </div>

              <div
                className="
                  flex flex-col gap-2 sm:flex-row
                "
              >
                {/* SEARCH */}

                <div
                  className="
                    relative w-full sm:w-64
                  "
                >
                  <Search
                    size={15}
                    className="
                      pointer-events-none absolute left-3 top-1/2
                      -translate-y-1/2 text-slate-400
                    "
                  />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search wards..."
                    className="
                      h-9 w-full rounded-lg border
                      border-slate-200 bg-slate-50 pl-9 pr-3
                      text-xs text-slate-800 outline-none transition
                      placeholder:text-slate-400 focus:border-blue-400
                      focus:bg-white focus:ring-4
                      focus:ring-blue-500/10
                    "
                  />
                </div>

                {/* STATUS */}

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as StatusFilter,
                    )
                  }
                  className="
                    h-9 min-w-[125px] rounded-lg border
                    border-slate-200 bg-slate-50 px-3
                    text-xs font-medium text-slate-700 outline-none
                    transition focus:border-blue-400 focus:bg-white
                    focus:ring-4 focus:ring-blue-500/10
                  "
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* TABLE AREA */}

            <div
              className="
                min-h-0 flex-1 overflow-auto
              "
            >
              {loading ? (
                <LoadingState />
              ) : filteredWards.length === 0 ? (
                <EmptyState
                  search={search}
                  hasStatusFilter={statusFilter !== "All"}
                  onAdd={openAdd}
                  disabled={floors.length === 0}
                />
              ) : (
                <table
                  className="
                    w-full min-w-[900px] border-collapse
                  "
                >
                  {/* TABLE HEADER */}

                  <thead
                    className="
                      sticky top-0 z-10 bg-slate-50
                    "
                  >
                    <tr className="border-b border-slate-200">
                      <TableHeader>Ward</TableHeader>
                      <TableHeader>Type</TableHeader>
                      <TableHeader>Floor</TableHeader>
                      <TableHeader>Description</TableHeader>
                      <TableHeader>Status</TableHeader>
                      <TableHeader align="right">
                        Actions
                      </TableHeader>
                    </tr>
                  </thead>

                  {/* TABLE BODY */}

                  <tbody className="bg-white">
                    {filteredWards.map((ward) => {
                      const floor = floorMap.get(ward.floor_id);

                      return (
                        <tr
                          key={ward.id}
                          className="
                            border-b border-slate-100
                            transition hover:bg-slate-50/70
                          "
                        >
                          {/* WARD */}

                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                className="
                                  flex h-9 w-9 shrink-0 items-center
                                  justify-center rounded-lg bg-blue-50
                                  text-blue-600
                                "
                              >
                                <Building2 size={16} />
                              </div>

                              <div className="min-w-0">
                                <p
                                  className="
                                    truncate text-xs font-bold
                                    text-slate-800
                                  "
                                >
                                  {ward.name}
                                </p>

                                <p
                                  className="
                                    mt-0.5 text-[10px] text-slate-400
                                  "
                                >
                                  ID #{ward.id}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* TYPE */}

                          <td className="px-5 py-3.5">
                            <span
                              className="
                                inline-flex rounded-md bg-blue-50
                                px-2 py-1 text-[10px] font-bold
                                uppercase tracking-wide text-blue-700
                              "
                            >
                              {ward.ward_type || "—"}
                            </span>
                          </td>

                          {/* FLOOR */}

                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="
                                  flex h-7 w-7 items-center justify-center
                                  rounded-lg bg-violet-50 text-violet-600
                                "
                              >
                                <Layers3 size={13} />
                              </span>

                              <span
                                className="
                                  whitespace-nowrap text-xs font-semibold
                                  text-slate-700
                                "
                              >
                                {getFloorLabel(floor)}
                              </span>
                            </div>
                          </td>

                          {/* DESCRIPTION */}

                          <td className="max-w-[300px] px-5 py-3.5">
                            <p
                              className="
                                truncate text-xs text-slate-500
                              "
                              title={
                                ward.description || undefined
                              }
                            >
                              {ward.description || "No description"}
                            </p>
                          </td>

                          {/* STATUS */}

                          <td className="px-5 py-3.5">
                            <StatusBadge active={ward.is_active} />
                          </td>

                          {/* ACTIONS */}

                          <td className="px-5 py-3.5">
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEdit(ward)}
                                title="Edit ward"
                                className="
                                  flex h-8 w-8 items-center
                                  justify-center rounded-lg border
                                  border-slate-200 bg-white text-slate-500
                                  transition hover:border-blue-200
                                  hover:bg-blue-50 hover:text-blue-600
                                "
                              >
                                <Edit3 size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  void deleteWard(ward)
                                }
                                title="Delete ward"
                                className="
                                  flex h-8 w-8 items-center
                                  justify-center rounded-lg border
                                  border-slate-200 bg-white text-slate-500
                                  transition hover:border-red-200
                                  hover:bg-red-50 hover:text-red-600
                                "
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* TABLE FOOTER */}

            {!loading && filteredWards.length > 0 && (
              <div
                className="
                  flex shrink-0 items-center justify-between
                  border-t border-slate-100 bg-slate-50/60
                  px-5 py-2.5
                "
              >
                <p className="text-[10px] text-slate-500">
                  Showing{" "}
                  <span className="font-bold text-slate-700">
                    {filteredWards.length}
                  </span>{" "}
                  wards
                </p>

                <div
                  className="
                    flex items-center gap-1.5 text-[10px]
                    font-medium text-slate-400
                  "
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Registry active
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* =================================================
          MODAL
      ================================================= */}

      {modalOpen && (
        <WardModal
          editingWard={editingWard}
          form={form}
          floors={floors}
          saving={saving}
          onChange={updateForm}
          onClose={closeModal}
          onSave={() => void saveWard()}
        />
      )}
    </div>
  );
}

// =====================================================
// STAT CARD
// =====================================================

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: number;
  icon: ElementType;
  iconClass: string;
}) {
  return (
    <div
      className="
        rounded-xl border border-slate-200 bg-white p-3.5
        shadow-sm transition hover:-translate-y-0.5 hover:shadow-md
      "
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p
            className="
              truncate text-[9px] font-bold uppercase
              tracking-[0.12em] text-slate-400
            "
          >
            {label}
          </p>

          <p
            className="
              mt-1 text-xl font-bold tracking-tight text-slate-900
            "
          >
            {value}
          </p>
        </div>

        <div
          className={`
            flex h-9 w-9 shrink-0 items-center justify-center
            rounded-lg ${iconClass}
          `}
        >
          <Icon size={16} />
        </div>
      </div>
    </div>
  );
}

// =====================================================
// TABLE HEADER
// =====================================================

function TableHeader({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`
        whitespace-nowrap px-5 py-3 text-${align}
        text-[9px] font-bold uppercase tracking-[0.12em]
        text-slate-500
      `}
    >
      {children}
    </th>
  );
}

// =====================================================
// LOADING
// =====================================================

function LoadingState() {
  return (
    <div
      className="
        flex min-h-[360px] flex-col items-center justify-center
      "
    >
      <div
        className="
          flex h-11 w-11 items-center justify-center
          rounded-xl bg-blue-50 text-blue-600
        "
      >
        <RefreshCw size={19} className="animate-spin" />
      </div>

      <p
        className="
          mt-3 text-sm font-semibold text-slate-700
        "
      >
        Loading wards...
      </p>

      <p
        className="
          mt-1 text-[11px] text-slate-400
        "
      >
        Fetching ward registry
      </p>
    </div>
  );
}

// =====================================================
// EMPTY STATE
// =====================================================

function EmptyState({
  search,
  hasStatusFilter,
  onAdd,
  disabled,
}: {
  search: string;
  hasStatusFilter: boolean;
  onAdd: () => void;
  disabled: boolean;
}) {
  const hasFilters = Boolean(search) || hasStatusFilter;

  return (
    <div
      className="
        flex min-h-[360px] flex-col items-center
        justify-center px-6 text-center
      "
    >
      <div
        className="
          flex h-14 w-14 items-center justify-center
          rounded-xl bg-blue-50 text-blue-600
        "
      >
        <Building2 size={24} />
      </div>

      <h3
        className="
          mt-4 text-sm font-bold text-slate-800
        "
      >
        {hasFilters ? "No wards found" : "No wards registered"}
      </h3>

      <p
        className="
          mt-1 max-w-sm text-xs leading-5 text-slate-400
        "
      >
        {hasFilters
          ? "Try changing your search or status filter."
          : disabled
            ? "Create a floor first before adding a ward."
            : "Create your first ward to start managing patient care areas."}
      </p>

      {!hasFilters && !disabled && (
        <button
          type="button"
          onClick={onAdd}
          className="
            mt-4 inline-flex items-center gap-2 rounded-lg
            bg-slate-900 px-3.5 py-2 text-xs font-semibold
            text-white transition hover:bg-slate-800
          "
        >
          <Plus size={14} />
          Add Ward
        </button>
      )}
    </div>
  );
}

// =====================================================
// FORM FIELD
// =====================================================

function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        className="
          mb-1.5 block text-xs font-semibold text-slate-700
        "
      >
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      {children}
    </div>
  );
}

// =====================================================
// WARD MODAL
// =====================================================

function WardModal({
  editingWard,
  form,
  floors,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  editingWard: Ward | null;
  form: WardForm;
  floors: Floor[];
  saving: boolean;
  onChange: (
    field: keyof WardForm,
    value: string | boolean,
  ) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div
      className="
        fixed inset-0 z-[200] flex items-center justify-center
        bg-slate-950/45 p-4 backdrop-blur-sm
      "
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="
          w-full max-w-xl overflow-hidden rounded-2xl
          border border-slate-200 bg-white
          shadow-[0_25px_70px_rgba(15,23,42,0.22)]
        "
      >
        {/* MODAL HEADER */}

        <div
          className="
            flex items-center justify-between border-b
            border-slate-100 px-5 py-4
          "
        >
          <div className="flex items-center gap-3">
            <div
              className="
                flex h-9 w-9 items-center justify-center
                rounded-lg bg-blue-50 text-blue-600
              "
            >
              <Building2 size={17} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {editingWard ? "Edit Ward" : "Add New Ward"}
              </h2>

              <p className="mt-0.5 text-[10px] text-slate-400">
                Configure ward information.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            title="Close"
            className="
              flex h-8 w-8 items-center justify-center
              rounded-lg text-slate-400 transition
              hover:bg-slate-100 hover:text-slate-700
              disabled:opacity-50
            "
          >
            <X size={17} />
          </button>
        </div>

        {/* MODAL BODY */}

        <div
          className="
            max-h-[65vh] space-y-4 overflow-y-auto
            px-5 py-5
          "
        >
          <div
            className="
              grid gap-4 sm:grid-cols-2
            "
          >
            {/* NAME */}

            <FormField label="Ward Name" required>
              <input
                value={form.name}
                onChange={(event) =>
                  onChange("name", event.target.value)
                }
                placeholder="e.g. General Ward"
                className="
                  h-10 w-full rounded-lg border
                  border-slate-200 bg-slate-50 px-3 text-xs
                  text-slate-800 outline-none transition
                  placeholder:text-slate-400 focus:border-blue-400
                  focus:bg-white focus:ring-4
                  focus:ring-blue-500/10
                "
              />
            </FormField>

            {/* TYPE */}

            <FormField label="Ward Type" required>
              <div className="relative">
                <select
                  value={form.ward_type}
                  onChange={(event) =>
                    onChange("ward_type", event.target.value)
                  }
                  className="
                    h-10 w-full appearance-none rounded-lg
                    border border-slate-200 bg-slate-50 px-3 pr-9
                    text-xs text-slate-800 outline-none transition
                    focus:border-blue-400 focus:bg-white
                    focus:ring-4 focus:ring-blue-500/10
                  "
                >
                  {WARD_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <span
                  className="
                    pointer-events-none absolute right-3 top-1/2
                    -translate-y-1/2 text-[10px] text-slate-400
                  "
                >
                  ▼
                </span>
              </div>
            </FormField>

            {/* FLOOR */}

            <div className="sm:col-span-2">
              <FormField label="Floor" required>
                <div className="relative">
                  <select
                    value={form.floor_id}
                    onChange={(event) =>
                      onChange("floor_id", event.target.value)
                    }
                    className="
                      h-10 w-full appearance-none rounded-lg
                      border border-slate-200 bg-slate-50 px-3 pr-9
                      text-xs text-slate-800 outline-none transition
                      focus:border-blue-400 focus:bg-white
                      focus:ring-4 focus:ring-blue-500/10
                    "
                  >
                    <option value="">Select floor</option>

                    {floors.map((floor) => (
                      <option
                        key={floor.id}
                        value={floor.id}
                      >
                        {getFloorLabel(floor)}
                      </option>
                    ))}
                  </select>

                  <span
                    className="
                      pointer-events-none absolute right-3 top-1/2
                      -translate-y-1/2 text-[10px] text-slate-400
                    "
                  >
                    ▼
                  </span>
                </div>

                {floors.length === 0 && (
                  <p className="mt-1.5 text-xs font-medium text-amber-600">
                    No floors are available. Create a floor first.
                  </p>
                )}
              </FormField>
            </div>

            {/* DESCRIPTION */}

            <div className="sm:col-span-2">
              <FormField label="Description">
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    onChange("description", event.target.value)
                  }
                  placeholder="Describe the ward's purpose..."
                  rows={3}
                  className="
                    w-full resize-none rounded-lg border
                    border-slate-200 bg-slate-50 px-3 py-2.5
                    text-xs text-slate-800 outline-none transition
                    placeholder:text-slate-400 focus:border-blue-400
                    focus:bg-white focus:ring-4
                    focus:ring-blue-500/10
                  "
                />
              </FormField>
            </div>
          </div>

          {/* STATUS */}

          <div
            className="
              flex items-center justify-between rounded-xl
              border border-slate-200 bg-slate-50 px-4 py-3
            "
          >
            <div>
              <p className="text-xs font-bold text-slate-800">
                Ward status
              </p>

              <p className="mt-0.5 text-[10px] text-slate-400">
                Control whether this ward is operational.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                onChange("is_active", !form.is_active)
              }
              aria-label="Toggle ward status"
              className={`
                relative h-6 w-11 shrink-0 rounded-full transition
                ${form.is_active ? "bg-emerald-500" : "bg-slate-300"}
              `}
            >
              <span
                className={`
                  absolute top-0.5 h-5 w-5 rounded-full bg-white
                  shadow-sm transition
                  ${
                    form.is_active
                      ? "left-[22px]"
                      : "left-0.5"
                  }
                `}
              />
            </button>
          </div>
        </div>

        {/* MODAL FOOTER */}

        <div
          className="
            flex items-center justify-end gap-2 border-t
            border-slate-100 bg-slate-50/70 px-5 py-3.5
          "
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="
              rounded-lg border border-slate-200 bg-white
              px-3.5 py-2 text-xs font-semibold text-slate-600
              transition hover:bg-slate-50 disabled:opacity-50
            "
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={saving || floors.length === 0}
            className="
              inline-flex min-w-[130px] items-center justify-center
              gap-2 rounded-lg bg-slate-950 px-3.5 py-2
              text-xs font-semibold text-white shadow-sm transition
              hover:bg-blue-600 disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            {saving ? (
              <>
                <RefreshCw
                  size={13}
                  className="animate-spin"
                />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 size={13} />
                {editingWard
                  ? "Save Changes"
                  : "Create Ward"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
