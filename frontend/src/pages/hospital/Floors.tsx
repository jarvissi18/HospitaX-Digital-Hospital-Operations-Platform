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
  ChevronDown,
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

interface Floor {
  id: number;
  name: string;
  floor_number: number;
  department_id: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface Department {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  is_active: boolean;
}

interface FloorForm {
  name: string;
  floor_number: string;
  department_id: string;
  is_active: boolean;
}

type StatusFilter =
  | "All"
  | "Active"
  | "Inactive";

// =====================================================
// DEFAULT FORM
// =====================================================

const EMPTY_FORM: FloorForm = {
  name: "",
  floor_number: "",
  department_id: "",
  is_active: true,
};

// =====================================================
// HELPERS
// =====================================================

function getDepartmentLabel(
  department?: Department | null,
): string {
  if (!department) {
    return "Unknown Department";
  }

  return department.code
    ? `${department.name} · ${department.code}`
    : department.name;
}

// =====================================================
// STATUS BADGE
// =====================================================

function StatusBadge({
  active,
}: {
  active: boolean;
}) {
  return active ? (
    <span
      className="
        inline-flex
        items-center
        gap-1.5
        rounded-full
        border
        border-emerald-200
        bg-emerald-50
        px-2.5
        py-1
        text-[10px]
        font-bold
        text-emerald-700
      "
    >
      <CheckCircle2 size={12} />
      Active
    </span>
  ) : (
    <span
      className="
        inline-flex
        items-center
        gap-1.5
        rounded-full
        border
        border-slate-200
        bg-slate-100
        px-2.5
        py-1
        text-[10px]
        font-bold
        text-slate-500
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

export default function Floors() {
  const navigate = useNavigate();

  const [floors, setFloors] =
    useState<Floor[]>([]);

  const [departments, setDepartments] =
    useState<Department[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("All");

  const [modalOpen, setModalOpen] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [editingFloor, setEditingFloor] =
    useState<Floor | null>(null);

  const [form, setForm] =
    useState<FloorForm>({
      ...EMPTY_FORM,
    });

  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadData = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const [
          floorsResponse,
          departmentsResponse,
        ] = await Promise.all([
          api.get(
            "/hospital-structure/floors",
          ),
          api.get(
            "/hospital-structure/departments",
          ),
        ]);

        const floorPayload =
          floorsResponse.data;

        const departmentPayload =
          departmentsResponse.data;

        const floorRecords: Floor[] =
          Array.isArray(floorPayload)
            ? floorPayload
            : Array.isArray(
                floorPayload?.items,
              )
            ? floorPayload.items
            : Array.isArray(
                floorPayload?.data,
              )
            ? floorPayload.data
            : [];

        const departmentRecords: Department[] =
          Array.isArray(departmentPayload)
            ? departmentPayload
            : Array.isArray(
                departmentPayload?.items,
              )
            ? departmentPayload.items
            : Array.isArray(
                departmentPayload?.data,
              )
            ? departmentPayload.data
            : [];

        setFloors(floorRecords);
        setDepartments(
          departmentRecords,
        );
      } catch (error: any) {
        console.error(
          "Unable to load floors:",
          error,
        );

        toast.error(
          error?.response?.data?.detail ||
            "Unable to load floors.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // =====================================================
  // DEPARTMENT LOOKUP
  // =====================================================

  const departmentMap = useMemo(() => {
    const map = new Map<
      number,
      Department
    >();

    departments.forEach(
      (department) => {
        map.set(
          department.id,
          department,
        );
      },
    );

    return map;
  }, [departments]);

  // =====================================================
  // STATISTICS
  // =====================================================

  const statistics = useMemo(() => {
    const active = floors.filter(
      (floor) => floor.is_active,
    ).length;

    const inactive =
      floors.length - active;

    const departmentsUsed = new Set(
      floors.map(
        (floor) => floor.department_id,
      ),
    ).size;

    const highestLevel =
      floors.length > 0
        ? Math.max(
            ...floors.map(
              (floor) =>
                Number(
                  floor.floor_number,
                ),
            ),
          )
        : 0;

    return {
      total: floors.length,
      active,
      inactive,
      departmentsUsed,
      highestLevel,
    };
  }, [floors]);

  // =====================================================
  // FILTER
  // =====================================================

  const filteredFloors = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    return floors.filter(
      (floor) => {
        const matchesStatus =
          statusFilter === "All" ||
          (statusFilter === "Active" &&
            floor.is_active) ||
          (statusFilter === "Inactive" &&
            !floor.is_active);

        if (!matchesStatus) {
          return false;
        }

        if (!keyword) {
          return true;
        }

        const department =
          departmentMap.get(
            floor.department_id,
          );

        return (
          floor.name
            .toLowerCase()
            .includes(keyword) ||
          String(
            floor.floor_number,
          ).includes(keyword) ||
          String(
            floor.department_id,
          ).includes(keyword) ||
          String(
            department?.name ?? "",
          )
            .toLowerCase()
            .includes(keyword) ||
          String(
            department?.code ?? "",
          )
            .toLowerCase()
            .includes(keyword)
        );
      },
    );
  }, [
    floors,
    departmentMap,
    search,
    statusFilter,
  ]);

  // =====================================================
  // ADD
  // =====================================================

  const openAdd = () => {
    setEditingFloor(null);

    setForm({
      ...EMPTY_FORM,
      department_id:
        departments.length > 0
          ? String(
              departments[0].id,
            )
          : "",
    });

    setModalOpen(true);
  };

  // =====================================================
  // EDIT
  // =====================================================

  const openEdit = (
    floor: Floor,
  ) => {
    setEditingFloor(floor);

    setForm({
      name: floor.name ?? "",
      floor_number:
        floor.floor_number !==
        undefined
          ? String(
              floor.floor_number,
            )
          : "",
      department_id:
        floor.department_id !==
        undefined
          ? String(
              floor.department_id,
            )
          : "",
      is_active:
        floor.is_active !== false,
    });

    setModalOpen(true);
  };

  // =====================================================
  // CLOSE
  // =====================================================

  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalOpen(false);
    setEditingFloor(null);

    setForm({
      ...EMPTY_FORM,
    });
  };

  // =====================================================
  // FORM CHANGE
  // =====================================================

  const updateForm = (
    field: keyof FloorForm,
    value:
      | string
      | boolean,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  // =====================================================
  // SAVE
  // =====================================================

  const saveFloor = async () => {
    const name =
      form.name.trim();

    if (!name) {
      toast.error(
        "Floor name is required.",
      );
      return;
    }

    if (!form.floor_number.trim()) {
      toast.error(
        "Floor number is required.",
      );
      return;
    }

    const floorNumber = Number(
      form.floor_number,
    );

    if (
      !Number.isInteger(
        floorNumber,
      ) ||
      floorNumber < 0 ||
      floorNumber > 200
    ) {
      toast.error(
        "Floor number must be between 0 and 200.",
      );
      return;
    }

    if (!form.department_id) {
      toast.error(
        "Please select a department.",
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name,
        floor_number:
          floorNumber,
        department_id:
          Number(
            form.department_id,
          ),
        is_active:
          form.is_active,
      };

      if (editingFloor) {
        await api.put(
          `/hospital-structure/floors/${editingFloor.id}`,
          payload,
        );

        toast.success(
          "Floor updated successfully.",
        );
      } else {
        await api.post(
          "/hospital-structure/floors",
          payload,
        );

        toast.success(
          "Floor created successfully.",
        );
      }

      setModalOpen(false);
      setEditingFloor(null);

      setForm({
        ...EMPTY_FORM,
      });

      await loadData(true);
    } catch (error: any) {
      console.error(
        "Unable to save floor:",
        error,
      );

      toast.error(
        error?.response?.data?.detail ||
          "Unable to save floor.",
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // DELETE
  // =====================================================

  const deleteFloor = async (
    floor: Floor,
  ) => {
    const confirmed =
      window.confirm(
        `Delete floor "${floor.name}"? This action cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(
        `/hospital-structure/floors/${floor.id}`,
      );

      toast.success(
        "Floor deleted successfully.",
      );

      await loadData(true);
    } catch (error: any) {
      console.error(
        "Unable to delete floor:",
        error,
      );

      toast.error(
        error?.response?.data?.detail ||
          "Unable to delete floor.",
      );
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      className="
        flex
        h-full
        min-h-0
        flex-col
        overflow-hidden
      "
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <header
        className="
          shrink-0
          border-b
          border-slate-200/80
          bg-white
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
            gap-4
            px-5
            py-4
            sm:px-6
          "
        >
          <div className="flex min-w-0 items-center gap-3">
            {/* BACK */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/departments",
                )
              }
              title="Back to departments"
              className="
                hidden
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-lg
                border
                border-slate-200
                bg-white
                text-slate-500
                transition
                hover:border-slate-300
                hover:bg-slate-50
                hover:text-slate-900
                sm:flex
              "
            >
              <ArrowLeft size={16} />
            </button>

            {/* ICON */}

            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-violet-50
                text-violet-600
              "
            >
              <Layers3 size={19} />
            </div>

            {/* TITLE */}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="
                    hidden
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-[0.15em]
                    text-slate-400
                    md:inline
                  "
                >
                  Hospital Structure
                </span>

                <span className="hidden text-slate-300 md:inline">
                  /
                </span>

                <span
                  className="
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-[0.15em]
                    text-violet-600
                  "
                >
                  Floors
                </span>
              </div>

              <h1
                className="
                  text-xl
                  font-bold
                  tracking-tight
                  text-slate-950
                  sm:text-2xl
                "
              >
                Floors
              </h1>

              <p
                className="
                  hidden
                  text-xs
                  text-slate-500
                  sm:block
                "
              >
                Organize hospital levels
                and department locations.
              </p>
            </div>
          </div>

          {/* ACTIONS */}

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() =>
                void loadData(true)
              }
              disabled={refreshing}
              title="Refresh floors"
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-lg
                border
                border-slate-200
                bg-white
                text-slate-600
                shadow-sm
                transition
                hover:border-slate-300
                hover:bg-slate-50
                hover:text-slate-900
                disabled:cursor-not-allowed
                disabled:opacity-50
                sm:w-auto
                sm:px-3
              "
            >
              <RefreshCw
                size={15}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              <span className="ml-2 hidden text-xs font-semibold sm:inline">
                {refreshing
                  ? "Refreshing..."
                  : "Refresh"}
              </span>
            </button>

            <button
              type="button"
              onClick={openAdd}
              disabled={
                departments.length ===
                0
              }
              className="
                inline-flex
                h-9
                items-center
                gap-2
                rounded-lg
                bg-slate-950
                px-3.5
                text-xs
                font-semibold
                text-white
                shadow-sm
                transition
                hover:bg-violet-600
                focus:outline-none
                focus:ring-4
                focus:ring-violet-100
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              <Plus size={15} />

              <span className="hidden sm:inline">
                Add Floor
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

      <main
        className="
          min-h-0
          flex-1
          overflow-y-auto
        "
      >
        <div
          className="
            mx-auto
            flex
            min-h-full
            w-full
            max-w-[1600px]
            flex-col
            gap-4
            p-4
            sm:p-5
          "
        >
          {/* =================================================
              STATISTICS
          ================================================= */}

          <section
            className="
              grid
              shrink-0
              grid-cols-2
              gap-3
              xl:grid-cols-5
            "
          >
            <StatCard
              label="Total Floors"
              value={statistics.total}
              icon={Layers3}
              iconClass="bg-violet-50 text-violet-600"
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
              label="Departments Used"
              value={
                statistics.departmentsUsed
              }
              icon={Building2}
              iconClass="bg-blue-50 text-blue-600"
            />

            <StatCard
              label="Highest Level"
              value={
                statistics.highestLevel
              }
              icon={Layers3}
              iconClass="bg-amber-50 text-amber-600"
            />
          </section>

          {/* =================================================
              REGISTRY
          ================================================= */}

          <section
            className="
              flex
              min-h-[420px]
              flex-1
              flex-col
              overflow-hidden
              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-sm
            "
          >
            {/* TOOLBAR */}

            <div
              className="
                flex
                shrink-0
                flex-col
                gap-3
                border-b
                border-slate-100
                p-4
                md:flex-row
                md:items-center
                md:justify-between
              "
            >
              <div>
                <div className="flex items-center gap-2">
                  <h2
                    className="
                      text-sm
                      font-bold
                      text-slate-900
                    "
                  >
                    Floor Directory
                  </h2>

                  <span
                    className="
                      rounded-full
                      bg-slate-100
                      px-2
                      py-0.5
                      text-[9px]
                      font-bold
                      uppercase
                      tracking-wide
                      text-slate-500
                    "
                  >
                    {
                      filteredFloors.length
                    }
                  </span>
                </div>

                <p
                  className="
                    mt-0.5
                    text-[11px]
                    text-slate-400
                  "
                >
                  Showing{" "}
                  <span className="font-semibold text-slate-600">
                    {
                      filteredFloors.length
                    }
                  </span>{" "}
                  of {floors.length} floors
                </p>
              </div>

              <div
                className="
                  flex
                  flex-col
                  gap-2
                  sm:flex-row
                "
              >
                {/* SEARCH */}

                <div
                  className="
                    relative
                    w-full
                    sm:w-64
                  "
                >
                  <Search
                    size={15}
                    className="
                      pointer-events-none
                      absolute
                      left-3
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                    "
                  />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value,
                      )
                    }
                    placeholder="Search floors..."
                    className="
                      h-9
                      w-full
                      rounded-lg
                      border
                      border-slate-200
                      bg-slate-50
                      pl-9
                      pr-3
                      text-xs
                      text-slate-800
                      outline-none
                      transition
                      placeholder:text-slate-400
                      focus:border-violet-400
                      focus:bg-white
                      focus:ring-4
                      focus:ring-violet-500/10
                    "
                  />
                </div>

                {/* STATUS */}

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target
                        .value as StatusFilter,
                    )
                  }
                  className="
                    h-9
                    min-w-[125px]
                    rounded-lg
                    border
                    border-slate-200
                    bg-slate-50
                    px-3
                    text-xs
                    font-medium
                    text-slate-700
                    outline-none
                    transition
                    focus:border-violet-400
                    focus:bg-white
                    focus:ring-4
                    focus:ring-violet-500/10
                  "
                >
                  <option value="All">
                    All Status
                  </option>

                  <option value="Active">
                    Active
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>
                </select>
              </div>
            </div>

            {/* =================================================
                TABLE
            ================================================= */}

            <div
              className="
                min-h-0
                flex-1
                overflow-auto
              "
            >
              {loading ? (
                <LoadingState />
              ) : filteredFloors.length ===
                0 ? (
                <EmptyState
                  search={search}
                  onAdd={openAdd}
                  disabled={
                    departments.length ===
                    0
                  }
                />
              ) : (
                <table
                  className="
                    w-full
                    min-w-[850px]
                    border-collapse
                  "
                >
                  <thead
                    className="
                      sticky
                      top-0
                      z-10
                      bg-slate-50
                    "
                  >
                    <tr className="border-b border-slate-200">
                      <TableHeader>
                        Floor
                      </TableHeader>

                      <TableHeader>
                        Level
                      </TableHeader>

                      <TableHeader>
                        Department
                      </TableHeader>

                      <TableHeader>
                        Code
                      </TableHeader>

                      <TableHeader>
                        Status
                      </TableHeader>

                      <TableHeader align="right">
                        Actions
                      </TableHeader>
                    </tr>
                  </thead>

                  <tbody className="bg-white">
                    {filteredFloors.map(
                      (floor) => {
                        const department =
                          departmentMap.get(
                            floor.department_id,
                          );

                        return (
                          <tr
                            key={floor.id}
                            className="
                              border-b
                              border-slate-100
                              transition
                              hover:bg-slate-50/70
                            "
                          >
                            {/* FLOOR */}

                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div
                                  className="
                                    flex
                                    h-9
                                    w-9
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-lg
                                    bg-violet-50
                                    text-violet-600
                                  "
                                >
                                  <Layers3
                                    size={16}
                                  />
                                </div>

                                <div className="min-w-0">
                                  <p
                                    className="
                                      truncate
                                      text-xs
                                      font-bold
                                      text-slate-800
                                    "
                                  >
                                    {
                                      floor.name
                                    }
                                  </p>

                                  <p
                                    className="
                                      mt-0.5
                                      text-[10px]
                                      text-slate-400
                                    "
                                  >
                                    Floor ID #
                                    {
                                      floor.id
                                    }
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* LEVEL */}

                            <td className="px-5 py-3.5">
                              <span
                                className="
                                  inline-flex
                                  rounded-md
                                  bg-violet-50
                                  px-2
                                  py-1
                                  text-[10px]
                                  font-bold
                                  text-violet-700
                                "
                              >
                                Level{" "}
                                {
                                  floor.floor_number
                                }
                              </span>
                            </td>

                            {/* DEPARTMENT */}

                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <Building2
                                  size={14}
                                  className="shrink-0 text-slate-400"
                                />

                                <span
                                  className="
                                    max-w-[220px]
                                    truncate
                                    text-xs
                                    font-medium
                                    text-slate-700
                                  "
                                >
                                  {getDepartmentLabel(
                                    department,
                                  )}
                                </span>
                              </div>
                            </td>

                            {/* CODE */}

                            <td className="px-5 py-3.5">
                              <span
                                className="
                                  inline-flex
                                  rounded-md
                                  bg-slate-100
                                  px-2
                                  py-1
                                  text-[10px]
                                  font-semibold
                                  text-slate-600
                                "
                              >
                                {department?.code ||
                                  "—"}
                              </span>
                            </td>

                            {/* STATUS */}

                            <td className="px-5 py-3.5">
                              <StatusBadge
                                active={
                                  floor.is_active
                                }
                              />
                            </td>

                            {/* ACTIONS */}

                            <td className="px-5 py-3.5">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEdit(
                                      floor,
                                    )
                                  }
                                  title="Edit floor"
                                  className="
                                    flex
                                    h-8
                                    w-8
                                    items-center
                                    justify-center
                                    rounded-lg
                                    border
                                    border-slate-200
                                    bg-white
                                    text-slate-500
                                    transition
                                    hover:border-blue-200
                                    hover:bg-blue-50
                                    hover:text-blue-600
                                  "
                                >
                                  <Edit3
                                    size={13}
                                  />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    void deleteFloor(
                                      floor,
                                    )
                                  }
                                  title="Delete floor"
                                  className="
                                    flex
                                    h-8
                                    w-8
                                    items-center
                                    justify-center
                                    rounded-lg
                                    border
                                    border-slate-200
                                    bg-white
                                    text-slate-500
                                    transition
                                    hover:border-red-200
                                    hover:bg-red-50
                                    hover:text-red-600
                                  "
                                >
                                  <Trash2
                                    size={13}
                                  />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* FOOTER */}

            {!loading &&
              filteredFloors.length >
                0 && (
                <div
                  className="
                    flex
                    shrink-0
                    items-center
                    justify-between
                    border-t
                    border-slate-100
                    bg-slate-50/60
                    px-5
                    py-2.5
                  "
                >
                  <p className="text-[10px] text-slate-500">
                    Showing{" "}
                    <span className="font-bold text-slate-700">
                      {
                        filteredFloors.length
                      }
                    </span>{" "}
                    floors
                  </p>

                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
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
        <FloorModal
          editingFloor={editingFloor}
          form={form}
          departments={departments}
          saving={saving}
          onChange={updateForm}
          onClose={closeModal}
          onSave={() =>
            void saveFloor()
          }
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
        rounded-xl
        border
        border-slate-200
        bg-white
        p-3.5
        shadow-sm
        transition
        hover:-translate-y-0.5
        hover:shadow-md
      "
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
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

          <p
            className="
              mt-1
              text-xl
              font-bold
              tracking-tight
              text-slate-900
            "
          >
            {value}
          </p>
        </div>

        <div
          className={`
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-lg
            ${iconClass}
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
        whitespace-nowrap
        px-5
        py-3
        text-${align}
        text-[9px]
        font-bold
        uppercase
        tracking-[0.12em]
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
        flex
        min-h-[360px]
        flex-col
        items-center
        justify-center
      "
    >
      <div
        className="
          flex
          h-11
          w-11
          items-center
          justify-center
          rounded-xl
          bg-violet-50
          text-violet-600
        "
      >
        <RefreshCw
          size={19}
          className="animate-spin"
        />
      </div>

      <p
        className="
          mt-3
          text-sm
          font-semibold
          text-slate-700
        "
      >
        Loading floors...
      </p>

      <p
        className="
          mt-1
          text-[11px]
          text-slate-400
        "
      >
        Fetching current floor registry
      </p>
    </div>
  );
}

// =====================================================
// EMPTY STATE
// =====================================================

function EmptyState({
  search,
  onAdd,
  disabled,
}: {
  search: string;
  onAdd: () => void;
  disabled: boolean;
}) {
  return (
    <div
      className="
        flex
        min-h-[360px]
        flex-col
        items-center
        justify-center
        px-6
        text-center
      "
    >
      <div
        className="
          flex
          h-14
          w-14
          items-center
          justify-center
          rounded-xl
          bg-violet-50
          text-violet-600
        "
      >
        <Layers3 size={24} />
      </div>

      <h3
        className="
          mt-4
          text-sm
          font-bold
          text-slate-800
        "
      >
        {search
          ? "No floors found"
          : "No floors registered"}
      </h3>

      <p
        className="
          mt-1
          max-w-sm
          text-xs
          leading-5
          text-slate-400
        "
      >
        {search
          ? "Try changing your search or status filter."
          : disabled
            ? "Create a department first before adding a floor."
            : "Create your first hospital floor to start organizing infrastructure."}
      </p>

      {!search && !disabled && (
        <button
          type="button"
          onClick={onAdd}
          className="
            mt-4
            inline-flex
            items-center
            gap-2
            rounded-lg
            bg-slate-900
            px-3.5
            py-2
            text-xs
            font-semibold
            text-white
            transition
            hover:bg-slate-800
          "
        >
          <Plus size={14} />
          Add First Floor
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
          mb-1.5
          block
          text-xs
          font-semibold
          text-slate-700
        "
      >
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}

// =====================================================
// FLOOR MODAL
// =====================================================

function FloorModal({
  editingFloor,
  form,
  departments,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  editingFloor: Floor | null;
  form: FloorForm;
  departments: Department[];
  saving: boolean;
  onChange: (
    field: keyof FloorForm,
    value:
      | string
      | boolean,
  ) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div
      className="
        fixed
        inset-0
        z-[200]
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
          onClose();
        }
      }}
    >
      <div
        className="
          w-full
          max-w-xl
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-[0_25px_70px_rgba(15,23,42,0.22)]
        "
      >
        {/* HEADER */}

        <div
          className="
            flex
            items-center
            justify-between
            border-b
            border-slate-100
            px-5
            py-4
          "
        >
          <div className="flex items-center gap-3">
            <div
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-lg
                bg-violet-50
                text-violet-600
              "
            >
              <Layers3 size={17} />
            </div>

            <div>
              <h2
                className="
                  text-sm
                  font-bold
                  text-slate-900
                "
              >
                {editingFloor
                  ? "Edit Floor"
                  : "Add New Floor"}
              </h2>

              <p
                className="
                  mt-0.5
                  text-[10px]
                  text-slate-400
                "
              >
                Configure hospital floor
                information.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-lg
              text-slate-400
              transition
              hover:bg-slate-100
              hover:text-slate-700
            "
          >
            <X size={17} />
          </button>
        </div>

        {/* BODY */}

        <div
          className="
            max-h-[65vh]
            space-y-4
            overflow-y-auto
            px-5
            py-5
          "
        >
          <div
            className="
              grid
              gap-4
              sm:grid-cols-2
            "
          >
            {/* FLOOR NAME */}

            <FormField
              label="Floor Name"
              required
            >
              <input
                value={form.name}
                onChange={(event) =>
                  onChange(
                    "name",
                    event.target.value,
                  )
                }
                placeholder="e.g. Ground Floor"
                className="
                  h-10
                  w-full
                  rounded-lg
                  border
                  border-slate-200
                  bg-slate-50
                  px-3
                  text-xs
                  text-slate-800
                  outline-none
                  transition
                  placeholder:text-slate-400
                  focus:border-violet-400
                  focus:bg-white
                  focus:ring-4
                  focus:ring-violet-500/10
                "
              />
            </FormField>

            {/* FLOOR NUMBER */}

            <FormField
              label="Floor Number"
              required
            >
              <input
                type="number"
                min={0}
                max={200}
                value={
                  form.floor_number
                }
                onChange={(event) =>
                  onChange(
                    "floor_number",
                    event.target.value.replace(
                      /\D/g,
                      "",
                    ),
                  )
                }
                placeholder="e.g. 1"
                inputMode="numeric"
                className="
                  h-10
                  w-full
                  rounded-lg
                  border
                  border-slate-200
                  bg-slate-50
                  px-3
                  text-xs
                  text-slate-800
                  outline-none
                  transition
                  placeholder:text-slate-400
                  focus:border-violet-400
                  focus:bg-white
                  focus:ring-4
                  focus:ring-violet-500/10
                "
              />
            </FormField>

            {/* DEPARTMENT */}

            <div className="sm:col-span-2">
              <FormField
                label="Department"
                required
              >
                <div className="relative">
                  <select
                    value={
                      form.department_id
                    }
                    onChange={(event) =>
                      onChange(
                        "department_id",
                        event.target.value,
                      )
                    }
                    className="
                      h-10
                      w-full
                      appearance-none
                      rounded-lg
                      border
                      border-slate-200
                      bg-slate-50
                      px-3
                      pr-9
                      text-xs
                      text-slate-800
                      outline-none
                      transition
                      focus:border-violet-400
                      focus:bg-white
                      focus:ring-4
                      focus:ring-violet-500/10
                    "
                  >
                    <option value="">
                      Select department
                    </option>

                    {departments.map(
                      (
                        department,
                      ) => (
                        <option
                          key={
                            department.id
                          }
                          value={
                            department.id
                          }
                        >
                          {getDepartmentLabel(
                            department,
                          )}
                        </option>
                      ),
                    )}
                  </select>

                  <ChevronDown
                    size={15}
                    className="
                      pointer-events-none
                      absolute
                      right-3
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                    "
                  />
                </div>

                {departments.length ===
                  0 && (
                  <p
                    className="
                      mt-1.5
                      text-[10px]
                      font-medium
                      text-amber-600
                    "
                  >
                    No departments are
                    available. Create a
                    department first.
                  </p>
                )}
              </FormField>
            </div>
          </div>

          {/* STATUS */}

          <div
            className="
              flex
              items-center
              justify-between
              rounded-xl
              border
              border-slate-200
              bg-slate-50
              px-4
              py-3
            "
          >
            <div>
              <p
                className="
                  text-xs
                  font-bold
                  text-slate-800
                "
              >
                Floor status
              </p>

              <p
                className="
                  mt-0.5
                  text-[10px]
                  text-slate-400
                "
              >
                Control whether this
                floor is operational.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                onChange(
                  "is_active",
                  !form.is_active,
                )
              }
              className={`
                relative
                h-6
                w-11
                shrink-0
                rounded-full
                transition
                ${
                  form.is_active
                    ? "bg-emerald-500"
                    : "bg-slate-300"
                }
              `}
              aria-label="Toggle floor status"
            >
              <span
                className={`
                  absolute
                  top-0.5
                  h-5
                  w-5
                  rounded-full
                  bg-white
                  shadow-sm
                  transition
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

        {/* FOOTER */}

        <div
          className="
            flex
            items-center
            justify-end
            gap-2
            border-t
            border-slate-100
            bg-slate-50/70
            px-5
            py-3.5
          "
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="
              rounded-lg
              border
              border-slate-200
              bg-white
              px-3.5
              py-2
              text-xs
              font-semibold
              text-slate-600
              transition
              hover:bg-slate-50
            "
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={
              saving ||
              departments.length ===
                0
            }
            className="
              inline-flex
              min-w-[125px]
              items-center
              justify-center
              gap-2
              rounded-lg
              bg-slate-950
              px-3.5
              py-2
              text-xs
              font-semibold
              text-white
              shadow-sm
              transition
              hover:bg-violet-600
              disabled:cursor-not-allowed
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

                {editingFloor
                  ? "Save Changes"
                  : "Create Floor"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}