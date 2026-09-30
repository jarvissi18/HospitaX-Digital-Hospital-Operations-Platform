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
  BedDouble,
  CheckCircle2,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wrench,
  X,
  XCircle,
  Clock3,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import api from "../../services/api";

// =====================================================
// TYPES
// =====================================================

interface Bed {
  id: number;
  bed_number: string;
  room_id?: number | null;
  room_number?: string | null;
  ward_id?: number | null;
  ward_name?: string | null;
  department_id?: number | null;
  department_name?: string | null;
  bed_type?: string | null;
  status: string;
  description?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface Room {
  id: number;
  name?: string | null;
  room_number?: string | null;
  ward_id?: number | null;
  ward_name?: string | null;
  department_id?: number | null;
  department_name?: string | null;
  is_active: boolean;
}

interface BedForm {
  bed_number: string;
  room_id: string;
  bed_type: string;
  status: string;
  description: string;
  is_active: boolean;
}

type StatusFilter =
  | "All"
  | "Available"
  | "Occupied"
  | "Reserved"
  | "Maintenance"
  | "Inactive";

// =====================================================
// CONSTANTS
// =====================================================

const EMPTY_FORM: BedForm = {
  bed_number: "",
  room_id: "",
  bed_type: "Standard",
  status: "Available",
  description: "",
  is_active: true,
};

const BED_TYPES = [
  "Standard",
  "ICU",
  "Emergency",
  "Pediatric",
  "Maternity",
  "Isolation",
];

const BED_STATUSES = [
  "Available",
  "Occupied",
  "Reserved",
  "Maintenance",
  "Inactive",
];

// =====================================================
// HELPERS
// =====================================================

function normalize(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getBedStatus(bed: Bed): string {
  if (!bed.is_active) {
    return "Inactive";
  }

  return bed.status || "Available";
}

function getRoomLabel(room: Room): string {
  return (
    room.room_number ||
    room.name ||
    `Room #${room.id}`
  );
}

// =====================================================
// STATUS BADGE
// =====================================================

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized = normalize(status);

  if (
    normalized === "available" ||
    normalized === "vacant"
  ) {
    return (
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
        Available
      </span>
    );
  }

  if (
    normalized === "occupied" ||
    normalized === "assigned"
  ) {
    return (
      <span
        className="
          inline-flex
          items-center
          gap-1.5
          rounded-full
          border
          border-blue-200
          bg-blue-50
          px-2.5
          py-1
          text-[10px]
          font-bold
          text-blue-700
        "
      >
        <BedDouble size={12} />
        Occupied
      </span>
    );
  }

  if (
    normalized === "reserved" ||
    normalized === "booked"
  ) {
    return (
      <span
        className="
          inline-flex
          items-center
          gap-1.5
          rounded-full
          border
          border-violet-200
          bg-violet-50
          px-2.5
          py-1
          text-[10px]
          font-bold
          text-violet-700
        "
      >
        <Clock3 size={12} />
        Reserved
      </span>
    );
  }

  if (
    normalized === "maintenance" ||
    normalized === "under maintenance"
  ) {
    return (
      <span
        className="
          inline-flex
          items-center
          gap-1.5
          rounded-full
          border
          border-amber-200
          bg-amber-50
          px-2.5
          py-1
          text-[10px]
          font-bold
          text-amber-700
        "
      >
        <Wrench size={12} />
        Maintenance
      </span>
    );
  }

  return (
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

export default function Beds() {
  const navigate = useNavigate();

  const [beds, setBeds] = useState<Bed[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingBed, setEditingBed] =
    useState<Bed | null>(null);

  const [form, setForm] = useState<BedForm>({
    ...EMPTY_FORM,
  });

  // ===================================================
  // LOAD DATA
  // ===================================================

  const loadData = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const [bedsResponse, roomsResponse] =
          await Promise.all([
            api.get("/hospital-structure/beds"),
            api.get("/hospital-structure/rooms"),
          ]);

        const bedPayload = bedsResponse.data;
        const roomPayload = roomsResponse.data;

        const bedRecords: Bed[] =
          Array.isArray(bedPayload)
            ? bedPayload
            : Array.isArray(bedPayload?.items)
              ? bedPayload.items
              : Array.isArray(bedPayload?.data)
                ? bedPayload.data
                : [];

        const roomRecords: Room[] =
          Array.isArray(roomPayload)
            ? roomPayload
            : Array.isArray(roomPayload?.items)
              ? roomPayload.items
              : Array.isArray(roomPayload?.data)
                ? roomPayload.data
                : [];

        setBeds(bedRecords);
        setRooms(roomRecords);
      } catch (error: any) {
        console.error(
          "Unable to load beds:",
          error,
        );

        toast.error(
          error?.response?.data?.detail ||
            "Unable to load beds.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  // ===================================================
  // INITIAL LOAD
  // ===================================================

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // ===================================================
  // ROOM MAP
  // ===================================================

  const roomMap = useMemo(() => {
    const map = new Map<number, Room>();

    rooms.forEach((room) => {
      map.set(room.id, room);
    });

    return map;
  }, [rooms]);

  // ===================================================
  // STATISTICS
  // ===================================================

  const statistics = useMemo(() => {
    const available = beds.filter(
      (bed) =>
        normalize(getBedStatus(bed)) ===
        "available",
    ).length;

    const occupied = beds.filter(
      (bed) =>
        normalize(getBedStatus(bed)) ===
        "occupied",
    ).length;

    const reserved = beds.filter(
      (bed) =>
        normalize(getBedStatus(bed)) ===
        "reserved",
    ).length;

    const maintenance = beds.filter(
      (bed) =>
        normalize(getBedStatus(bed)) ===
        "maintenance",
    ).length;

    const inactive = beds.filter(
      (bed) => !bed.is_active,
    ).length;

    return {
      total: beds.length,
      available,
      occupied,
      reserved,
      maintenance,
      inactive,
    };
  }, [beds]);

  // ===================================================
  // FILTER
  // ===================================================

  const filteredBeds = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    return beds.filter((bed) => {
      const status = getBedStatus(bed);

      const matchesStatus =
        statusFilter === "All" ||
        normalize(status) ===
          normalize(statusFilter);

      if (!matchesStatus) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const room =
        bed.room_id !== null &&
        bed.room_id !== undefined
          ? roomMap.get(bed.room_id)
          : undefined;

      return (
        bed.bed_number
          .toLowerCase()
          .includes(keyword) ||
        String(
          bed.room_number ??
            room?.room_number ??
            room?.name ??
            "",
        )
          .toLowerCase()
          .includes(keyword) ||
        String(
          bed.ward_name ??
            room?.ward_name ??
            "",
        )
          .toLowerCase()
          .includes(keyword) ||
        String(
          bed.department_name ??
            room?.department_name ??
            "",
        )
          .toLowerCase()
          .includes(keyword) ||
        String(
          bed.bed_type ?? "",
        )
          .toLowerCase()
          .includes(keyword) ||
        status
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [
    beds,
    roomMap,
    search,
    statusFilter,
  ]);

  // ===================================================
  // ADD
  // ===================================================

  const openAdd = () => {
    setEditingBed(null);
    setForm({
      ...EMPTY_FORM,
    });
    setModalOpen(true);
  };

  // ===================================================
  // EDIT
  // ===================================================

  const openEdit = (bed: Bed) => {
    setEditingBed(bed);

    setForm({
      bed_number: bed.bed_number ?? "",
      room_id:
        bed.room_id !== null &&
        bed.room_id !== undefined
          ? String(bed.room_id)
          : "",
      bed_type:
        bed.bed_type || "Standard",
      status:
        bed.status || "Available",
      description:
        bed.description || "",
      is_active:
        bed.is_active !== false,
    });

    setModalOpen(true);
  };

  // ===================================================
  // CLOSE
  // ===================================================

  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalOpen(false);
    setEditingBed(null);

    setForm({
      ...EMPTY_FORM,
    });
  };

  // ===================================================
  // FORM CHANGE
  // ===================================================

  const updateForm = (
    field: keyof BedForm,
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

  const saveBed = async () => {
    const bedNumber =
      form.bed_number.trim();

    if (!bedNumber) {
      toast.error(
        "Bed number is required.",
      );
      return;
    }

    if (bedNumber.length < 1) {
      toast.error(
        "Bed number is invalid.",
      );
      return;
    }

    if (!form.room_id) {
      toast.error(
        "Room is required.",
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        bed_number: bedNumber,
        room_id: Number(form.room_id),
        bed_type:
          form.bed_type.trim() ||
          "Standard",
        status:
          form.status.trim() ||
          "Available",
        description:
          form.description.trim() ||
          null,
        is_active: form.is_active,
      };

      if (editingBed) {
        await api.put(
          `/hospital-structure/beds/${editingBed.id}`,
          payload,
        );

        toast.success(
          "Bed updated successfully.",
        );
      } else {
        await api.post(
          "/hospital-structure/beds",
          payload,
        );

        toast.success(
          "Bed created successfully.",
        );
      }

      setModalOpen(false);
      setEditingBed(null);

      setForm({
        ...EMPTY_FORM,
      });

      await loadData(true);
    } catch (error: any) {
      console.error(
        "Unable to save bed:",
        error,
      );

      toast.error(
        error?.response?.data?.detail ||
          "Unable to save bed.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ===================================================
  // DELETE
  // ===================================================

  const deleteBed = async (bed: Bed) => {
    const confirmed =
      window.confirm(
        `Delete bed "${bed.bed_number}"? This action cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(
        `/hospital-structure/beds/${bed.id}`,
      );

      toast.success(
        "Bed deleted successfully.",
      );

      await loadData(true);
    } catch (error: any) {
      console.error(
        "Unable to delete bed:",
        error,
      );

      toast.error(
        error?.response?.data?.detail ||
          "Unable to delete bed.",
      );
    }
  };

  // ===================================================
  // PAGE
  // ===================================================

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
                navigate("/dashboard")
              }
              title="Back to dashboard"
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
                bg-blue-50
                text-blue-600
              "
            >
              <BedDouble size={19} />
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
                    text-blue-600
                  "
                >
                  Beds
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
                Beds
              </h1>

              <p
                className="
                  hidden
                  text-xs
                  text-slate-500
                  sm:block
                "
              >
                Manage hospital beds and
                their availability.
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
              title="Refresh beds"
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
                hover:bg-blue-600
                focus:outline-none
                focus:ring-4
                focus:ring-blue-100
              "
            >
              <Plus size={15} />

              <span className="hidden sm:inline">
                Add Bed
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
              label="Beds"
              value={statistics.total}
              icon={BedDouble}
              iconClass="bg-blue-50 text-blue-600"
            />

            <StatCard
              label="Available"
              value={statistics.available}
              icon={CheckCircle2}
              iconClass="bg-emerald-50 text-emerald-600"
            />

            <StatCard
              label="Occupied"
              value={statistics.occupied}
              icon={BedDouble}
              iconClass="bg-blue-50 text-blue-600"
            />

            <StatCard
              label="Reserved"
              value={statistics.reserved}
              icon={Clock3}
              iconClass="bg-violet-50 text-violet-600"
            />

            <StatCard
              label="Maintenance"
              value={statistics.maintenance}
              icon={Wrench}
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
                    Bed Directory
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
                    {filteredBeds.length}
                  </span>
                </div>

                <p
                  className="
                    mt-0.5
                    text-[11px]
                    text-slate-400
                  "
                >
                  {filteredBeds.length}{" "}
                  of {beds.length} beds
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
                    placeholder="Search beds..."
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
                      focus:border-blue-400
                      focus:bg-white
                      focus:ring-4
                      focus:ring-blue-500/10
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
                    min-w-[140px]
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
                    focus:border-blue-400
                    focus:bg-white
                    focus:ring-4
                    focus:ring-blue-500/10
                  "
                >
                  <option value="All">
                    All Status
                  </option>

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

                  <option value="Inactive">
                    Inactive
                  </option>
                </select>
              </div>
            </div>

            {/* TABLE AREA */}

            <div
              className="
                min-h-0
                flex-1
                overflow-auto
              "
            >
              {loading ? (
                <LoadingState />
              ) : filteredBeds.length === 0 ? (
                <EmptyState
                  search={search}
                  statusFilter={statusFilter}
                  onAdd={openAdd}
                />
              ) : (
                <table
                  className="
                    w-full
                    min-w-[950px]
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
                        Bed
                      </TableHeader>

                      <TableHeader>
                        Room
                      </TableHeader>

                      <TableHeader>
                        Ward
                      </TableHeader>

                      <TableHeader>
                        Department
                      </TableHeader>

                      <TableHeader>
                        Type
                      </TableHeader>

                      <TableHeader>
                        Status
                      </TableHeader>

                      <TableHeader>
                        State
                      </TableHeader>

                      <TableHeader align="right">
                        Actions
                      </TableHeader>
                    </tr>
                  </thead>

                  <tbody className="bg-white">
                    {filteredBeds.map(
                      (bed) => {
                        const room =
                          bed.room_id !==
                            null &&
                          bed.room_id !==
                            undefined
                            ? roomMap.get(
                                bed.room_id,
                              )
                            : undefined;

                        const roomLabel =
                          bed.room_number ||
                          (room
                            ? getRoomLabel(
                                room,
                              )
                            : bed.room_id
                              ? `Room #${bed.room_id}`
                              : "—");

                        const wardLabel =
                          bed.ward_name ||
                          room?.ward_name ||
                          (bed.ward_id
                            ? `Ward #${bed.ward_id}`
                            : "—");

                        const departmentLabel =
                          bed.department_name ||
                          room?.department_name ||
                          (bed.department_id
                            ? `Department #${bed.department_id}`
                            : "—");

                        return (
                          <tr
                            key={bed.id}
                            className="
                              border-b
                              border-slate-100
                              transition
                              hover:bg-slate-50/70
                            "
                          >
                            {/* BED */}

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
                                    bg-blue-50
                                    text-blue-600
                                  "
                                >
                                  <BedDouble
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
                                    Bed{" "}
                                    {
                                      bed.bed_number
                                    }
                                  </p>

                                  <p
                                    className="
                                      mt-0.5
                                      text-[10px]
                                      text-slate-400
                                    "
                                  >
                                    ID #
                                    {
                                      bed.id
                                    }
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* ROOM */}

                            <td className="px-5 py-3.5">
                              <div>
                                <p className="whitespace-nowrap text-xs font-semibold text-slate-700">
                                  {roomLabel}
                                </p>

                                {bed.room_id && (
                                  <p className="mt-0.5 text-[10px] text-slate-400">
                                    ID #
                                    {
                                      bed.room_id
                                    }
                                  </p>
                                )}
                              </div>
                            </td>

                            {/* WARD */}

                            <td className="px-5 py-3.5">
                              <p className="whitespace-nowrap text-xs font-semibold text-slate-700">
                                {wardLabel}
                              </p>
                            </td>

                            {/* DEPARTMENT */}

                            <td className="px-5 py-3.5">
                              <p className="max-w-[180px] truncate text-xs font-medium text-slate-600">
                                {
                                  departmentLabel
                                }
                              </p>
                            </td>

                            {/* TYPE */}

                            <td className="px-5 py-3.5">
                              <span
                                className="
                                  inline-flex
                                  rounded-md
                                  bg-blue-50
                                  px-2
                                  py-1
                                  text-[10px]
                                  font-bold
                                  text-blue-700
                                "
                              >
                                {bed.bed_type ||
                                  "Standard"}
                              </span>
                            </td>

                            {/* STATUS */}

                            <td className="px-5 py-3.5">
                              <StatusBadge
                                status={getBedStatus(
                                  bed,
                                )}
                              />
                            </td>

                            {/* STATE */}

                            <td className="px-5 py-3.5">
                              <span
                                className={`
                                  inline-flex
                                  items-center
                                  gap-1.5
                                  rounded-full
                                  px-2.5
                                  py-1
                                  text-[10px]
                                  font-bold
                                  ${
                                    bed.is_active
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-slate-100 text-slate-500"
                                  }
                                `}
                              >
                                <span
                                  className={`
                                    h-1.5
                                    w-1.5
                                    rounded-full
                                    ${
                                      bed.is_active
                                        ? "bg-emerald-500"
                                        : "bg-slate-400"
                                    }
                                  `}
                                />

                                {bed.is_active
                                  ? "Active"
                                  : "Inactive"}
                              </span>
                            </td>

                            {/* ACTIONS */}

                            <td className="px-5 py-3.5">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEdit(
                                      bed,
                                    )
                                  }
                                  title="Edit bed"
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
                                    void deleteBed(
                                      bed,
                                    )
                                  }
                                  title="Delete bed"
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

            {/* TABLE FOOTER */}

            {!loading &&
              filteredBeds.length > 0 && (
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
                        filteredBeds.length
                      }
                    </span>{" "}
                    beds
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
        <BedModal
          editingBed={editingBed}
          form={form}
          rooms={rooms}
          saving={saving}
          onChange={updateForm}
          onClose={closeModal}
          onSave={() =>
            void saveBed()
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
        text-[9px]
        font-bold
        uppercase
        tracking-[0.12em]
        text-slate-500
        ${align === "right" ? "text-right" : "text-left"}
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
          bg-blue-50
          text-blue-600
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
        Loading beds...
      </p>

      <p
        className="
          mt-1
          text-[11px]
          text-slate-400
        "
      >
        Fetching bed registry
      </p>
    </div>
  );
}

// =====================================================
// EMPTY STATE
// =====================================================

function EmptyState({
  search,
  statusFilter,
  onAdd,
}: {
  search: string;
  statusFilter: StatusFilter;
  onAdd: () => void;
}) {
  const hasFilter =
    Boolean(search.trim()) ||
    statusFilter !== "All";

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
          bg-blue-50
          text-blue-600
        "
      >
        <BedDouble size={24} />
      </div>

      <h3
        className="
          mt-4
          text-sm
          font-bold
          text-slate-800
        "
      >
        {hasFilter
          ? "No beds found"
          : "No beds registered"}
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
        {hasFilter
          ? "Try changing your search or status filter."
          : "Create your first bed to start building the hospital structure."}
      </p>

      {!hasFilter && (
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
          Add Bed
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
// BED MODAL
// =====================================================

function BedModal({
  editingBed,
  form,
  rooms,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  editingBed: Bed | null;
  form: BedForm;
  rooms: Room[];
  saving: boolean;
  onChange: (
    field: keyof BedForm,
    value: string | boolean,
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
        {/* MODAL HEADER */}

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
                bg-blue-50
                text-blue-600
              "
            >
              <BedDouble size={17} />
            </div>

            <div>
              <h2
                className="
                  text-sm
                  font-bold
                  text-slate-900
                "
              >
                {editingBed
                  ? "Edit Bed"
                  : "Add New Bed"}
              </h2>

              <p
                className="
                  mt-0.5
                  text-[10px]
                  text-slate-400
                "
              >
                Configure bed information.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            title="Close"
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

        {/* MODAL BODY */}

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
            {/* BED NUMBER */}

            <FormField
              label="Bed Number"
              required
            >
              <input
                value={form.bed_number}
                onChange={(event) =>
                  onChange(
                    "bed_number",
                    event.target.value,
                  )
                }
                placeholder="e.g. B-101"
                maxLength={50}
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
                  focus:border-blue-400
                  focus:bg-white
                  focus:ring-4
                  focus:ring-blue-500/10
                "
              />
            </FormField>

            {/* ROOM */}

            <FormField
              label="Room"
              required
            >
              <select
                value={form.room_id}
                onChange={(event) =>
                  onChange(
                    "room_id",
                    event.target.value,
                  )
                }
                className="
                  h-10
                  w-full
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
                  focus:border-blue-400
                  focus:bg-white
                  focus:ring-4
                  focus:ring-blue-500/10
                "
              >
                <option value="">
                  Select room
                </option>

                {rooms
                  .filter(
                    (room) =>
                      room.is_active,
                  )
                  .map((room) => (
                    <option
                      key={room.id}
                      value={room.id}
                    >
                      {getRoomLabel(
                        room,
                      )}
                      {room.ward_name
                        ? ` · ${room.ward_name}`
                        : ""}
                    </option>
                  ))}
              </select>
            </FormField>

            {/* TYPE */}

            <FormField label="Bed Type">
              <select
                value={form.bed_type}
                onChange={(event) =>
                  onChange(
                    "bed_type",
                    event.target.value,
                  )
                }
                className="
                  h-10
                  w-full
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
                  focus:border-blue-400
                  focus:bg-white
                  focus:ring-4
                  focus:ring-blue-500/10
                "
              >
                {BED_TYPES.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  ),
                )}
              </select>
            </FormField>

            {/* STATUS */}

            <FormField label="Status">
              <select
                value={form.status}
                onChange={(event) =>
                  onChange(
                    "status",
                    event.target.value,
                  )
                }
                className="
                  h-10
                  w-full
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
                  focus:border-blue-400
                  focus:bg-white
                  focus:ring-4
                  focus:ring-blue-500/10
                "
              >
                {BED_STATUSES.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  ),
                )}
              </select>
            </FormField>

            {/* DESCRIPTION */}

            <div className="sm:col-span-2">
              <FormField label="Description">
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    onChange(
                      "description",
                      event.target.value,
                    )
                  }
                  placeholder="Add optional bed notes..."
                  rows={3}
                  className="
                    w-full
                    resize-none
                    rounded-lg
                    border
                    border-slate-200
                    bg-slate-50
                    px-3
                    py-2.5
                    text-xs
                    text-slate-800
                    outline-none
                    transition
                    placeholder:text-slate-400
                    focus:border-blue-400
                    focus:bg-white
                    focus:ring-4
                    focus:ring-blue-500/10
                  "
                />
              </FormField>
            </div>
          </div>

          {/* ACTIVE STATUS */}

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
                Bed status
              </p>

              <p
                className="
                  mt-0.5
                  text-[10px]
                  text-slate-400
                "
              >
                Control whether this bed
                remains active.
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
              aria-label="Toggle bed status"
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

        {/* MODAL FOOTER */}

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
            disabled={saving}
            className="
              inline-flex
              min-w-[120px]
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
              hover:bg-blue-600
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

                {editingBed
                  ? "Save Changes"
                  : "Create Bed"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
