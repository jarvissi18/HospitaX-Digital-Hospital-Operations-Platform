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
  DoorOpen,
  Edit3,
  Hospital,
  Layers3,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import api from "../../services/api";

// =====================================================
// TYPES
// =====================================================

interface Room {
  id: number;
  room_number: string;
  room_type?: string | null;
  ward_id?: number | null;
  ward_name?: string | null;
  floor_name?: string | null;
  department_name?: string | null;
  capacity?: number | null;
  is_active?: boolean | string | null;
}

interface RoomFormData {
  room_number: string;
  room_type: string;
  ward_id: string;
}

type StatusFilter = "All" | "Active" | "Inactive";

// =====================================================
// CONSTANTS
// =====================================================

const ROOM_TYPES = [
  "General",
  "Private",
  "Semi Private",
  "ICU",
  "Isolation",
  "Operation",
  "Emergency",
];

// =====================================================
// HELPERS
// =====================================================

function isRoomActive(
  value: Room["is_active"],
): boolean {
  return (
    value === true ||
    value === "true" ||
    value === undefined ||
    value === null
  );
}

// =====================================================
// MAIN
// =====================================================

export default function Rooms() {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] =
    useState<Room | null>(null);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState<RoomFormData>({
    room_number: "",
    room_type: "General",
    ward_id: "",
  });

  // ===================================================
  // LOAD DATA
  // ===================================================

  const loadRooms = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await api.get(
          "/hospital-structure/rooms",
        );

        const payload = response.data;

        const records: Room[] =
          Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.items)
              ? payload.items
              : Array.isArray(payload?.data)
                ? payload.data
                : [];

        setRooms(records);
      } catch (err: any) {
        console.error(
          "Unable to load rooms:",
          err,
        );

        setError(
          err?.response?.data?.detail ||
            "Unable to load rooms. Please check that the backend is running.",
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
    void loadRooms();
  }, [loadRooms]);

  // ===================================================
  // FILTER
  // ===================================================

  const filteredRooms = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    return rooms.filter((room) => {
      const active = isRoomActive(
        room.is_active,
      );

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" && active) ||
        (statusFilter === "Inactive" && !active);

      if (!matchesStatus) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return (
        String(room.room_number ?? "")
          .toLowerCase()
          .includes(keyword) ||
        String(room.room_type ?? "")
          .toLowerCase()
          .includes(keyword) ||
        String(room.ward_name ?? "")
          .toLowerCase()
          .includes(keyword) ||
        String(room.floor_name ?? "")
          .toLowerCase()
          .includes(keyword) ||
        String(room.department_name ?? "")
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [
    rooms,
    search,
    statusFilter,
  ]);

  // ===================================================
  // STATISTICS
  // ===================================================

  const statistics = useMemo(() => {
    const total = rooms.length;

    const active = rooms.filter(
      (room) =>
        isRoomActive(room.is_active),
    ).length;

    const inactive = total - active;

    const capacity = rooms.reduce(
      (totalCapacity, room) =>
        totalCapacity +
        Number(room.capacity || 0),
      0,
    );

    return {
      total,
      active,
      inactive,
      capacity,
    };
  }, [rooms]);

  // ===================================================
  // ADD
  // ===================================================

  const openAdd = () => {
    setEditingRoom(null);

    setForm({
      room_number: "",
      room_type: "General",
      ward_id: "",
    });

    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  // ===================================================
  // EDIT
  // ===================================================

  const openEdit = (room: Room) => {
    setEditingRoom(room);

    setForm({
      room_number: room.room_number || "",
      room_type: room.room_type || "General",
      ward_id:
        room.ward_id !== null &&
        room.ward_id !== undefined
          ? String(room.ward_id)
          : "",
    });

    setError("");
    setSuccess("");
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
    setEditingRoom(null);

    setForm({
      room_number: "",
      room_type: "General",
      ward_id: "",
    });

    setError("");
  };

  // ===================================================
  // SAVE
  // ===================================================

  const saveRoom = async () => {
    const roomNumber =
      form.room_number.trim();

    const roomType =
      form.room_type.trim() ||
      "General";

    const wardId =
      form.ward_id.trim();

    if (!roomNumber) {
      setError("Room number is required.");
      return;
    }

    if (!wardId) {
      setError("Ward ID is required.");
      return;
    }

    const numericWardId =
      Number(wardId);

    if (
      !Number.isInteger(
        numericWardId,
      ) ||
      numericWardId <= 0
    ) {
      setError(
        "Ward ID must be a valid positive number.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        room_number: roomNumber,
        room_type: roomType,
        ward_id: numericWardId,
      };

      if (editingRoom) {
        await api.put(
          `/hospital-structure/rooms/${editingRoom.id}`,
          payload,
        );

        setSuccess(
          "Room updated successfully.",
        );
      } else {
        await api.post(
          "/hospital-structure/rooms",
          payload,
        );

        setSuccess(
          "Room created successfully.",
        );
      }

      setModalOpen(false);
      setEditingRoom(null);

      setForm({
        room_number: "",
        room_type: "General",
        ward_id: "",
      });

      await loadRooms(true);

      window.setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err: any) {
      console.error(
        "Unable to save room:",
        err,
      );

      setError(
        err?.response?.data?.detail ||
          "Unable to save room.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ===================================================
  // DELETE
  // ===================================================

  const deleteRoom = async (room: Room) => {
    const confirmed =
      window.confirm(
        `Delete room "${room.room_number}"? This action cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await api.delete(
        `/hospital-structure/rooms/${room.id}`,
      );

      setSuccess(
        "Room deleted successfully.",
      );

      await loadRooms(true);

      window.setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err: any) {
      console.error(
        "Unable to delete room:",
        err,
      );

      setError(
        err?.response?.data?.detail ||
          "Unable to delete room.",
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
              <DoorOpen size={19} />
            </div>

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
                  Rooms
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
                Rooms
              </h1>

              <p
                className="
                  hidden
                  text-xs
                  text-slate-500
                  sm:block
                "
              >
                Manage hospital rooms and
                their operational structure.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() =>
                void loadRooms(true)
              }
              disabled={refreshing}
              title="Refresh rooms"
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
                hover:border-violet-200
                hover:bg-violet-50
                hover:text-violet-600
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
                hover:bg-violet-600
                focus:outline-none
                focus:ring-4
                focus:ring-violet-100
              "
            >
              <Plus size={15} />

              <span className="hidden sm:inline">
                Add Room
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
          {error && (
            <Alert
              type="error"
              message={error}
              onClose={() =>
                setError("")
              }
            />
          )}

          {success && (
            <Alert
              type="success"
              message={success}
              onClose={() =>
                setSuccess("")
              }
            />
          )}

          {/* =================================================
              STATISTICS
          ================================================= */}

          <section
            className="
              grid
              shrink-0
              grid-cols-2
              gap-3
              xl:grid-cols-4
            "
          >
            <StatCard
              label="Rooms"
              value={statistics.total}
              description="Registered rooms"
              icon={DoorOpen}
              iconClass="bg-violet-50 text-violet-600"
            />

            <StatCard
              label="Active"
              value={statistics.active}
              description="Currently operational"
              icon={CheckCircle2}
              iconClass="bg-emerald-50 text-emerald-600"
            />

            <StatCard
              label="Inactive"
              value={statistics.inactive}
              description="Currently unavailable"
              icon={XCircle}
              iconClass="bg-amber-50 text-amber-600"
            />

            <StatCard
              label="Capacity"
              value={statistics.capacity}
              description="Configured capacity"
              icon={BedDouble}
              iconClass="bg-blue-50 text-blue-600"
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
                    Room Directory
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
                    {filteredRooms.length}
                  </span>
                </div>

                <p
                  className="
                    mt-0.5
                    text-[11px]
                    text-slate-400
                  "
                >
                  {filteredRooms.length} of{" "}
                  {rooms.length} rooms
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
                    placeholder="Search rooms..."
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

            <div
              className="
                min-h-0
                flex-1
                overflow-auto
              "
            >
              {loading ? (
                <LoadingState />
              ) : filteredRooms.length === 0 ? (
                <EmptyState
                  search={search}
                  statusFilter={statusFilter}
                  onAdd={openAdd}
                />
              ) : (
                <RoomTable
                  rooms={filteredRooms}
                  onEdit={openEdit}
                  onDelete={deleteRoom}
                />
              )}
            </div>

            {!loading &&
              filteredRooms.length > 0 && (
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
                        filteredRooms.length
                      }
                    </span>{" "}
                    rooms
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

      {modalOpen && (
        <RoomModal
          editingRoom={editingRoom}
          form={form}
          saving={saving}
          error={error}
          onChange={(field, value) =>
            setForm((current) => ({
              ...current,
              [field]: value,
            }))
          }
          onClose={closeModal}
          onSave={() =>
            void saveRoom()
          }
        />
      )}
    </div>
  );
}

// =====================================================
// ROOM TABLE
// =====================================================

function RoomTable({
  rooms,
  onEdit,
  onDelete,
}: {
  rooms: Room[];
  onEdit: (room: Room) => void;
  onDelete: (room: Room) => void;
}) {
  return (
    <table
      className="
        w-full
        min-w-[1050px]
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
            Room
          </TableHeader>

          <TableHeader>
            Type
          </TableHeader>

          <TableHeader>
            Ward
          </TableHeader>

          <TableHeader>
            Floor
          </TableHeader>

          <TableHeader>
            Department
          </TableHeader>

          <TableHeader>
            Capacity
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
        {rooms.map((room) => {
          const active =
            isRoomActive(
              room.is_active,
            );

          return (
            <tr
              key={room.id}
              className="
                border-b
                border-slate-100
                transition
                hover:bg-slate-50/70
              "
            >
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
                    <DoorOpen size={16} />
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
                      Room{" "}
                      {room.room_number}
                    </p>

                    <p
                      className="
                        mt-0.5
                        text-[10px]
                        text-slate-400
                      "
                    >
                      ID #{room.id}
                    </p>
                  </div>
                </div>
              </td>

              <td className="px-5 py-3.5">
                <span
                  className="
                    inline-flex
                    whitespace-nowrap
                    rounded-md
                    bg-violet-50
                    px-2
                    py-1
                    text-[10px]
                    font-bold
                    text-violet-700
                  "
                >
                  {room.room_type ||
                    "General"}
                </span>
              </td>

              <td className="px-5 py-3.5">
                <div>
                  <p
                    className="
                      whitespace-nowrap
                      text-xs
                      font-semibold
                      text-slate-700
                    "
                  >
                    {room.ward_name ||
                      (room.ward_id
                        ? `Ward #${room.ward_id}`
                        : "—")}
                  </p>

                  {room.ward_id && (
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      ID #{room.ward_id}
                    </p>
                  )}
                </div>
              </td>

              <td className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <Layers3
                    size={14}
                    className="shrink-0 text-slate-400"
                  />

                  <span
                    className="
                      whitespace-nowrap
                      text-xs
                      font-medium
                      text-slate-600
                    "
                  >
                    {room.floor_name ||
                      "—"}
                  </span>
                </div>
              </td>

              <td className="px-5 py-3.5">
                <p
                  className="
                    max-w-[180px]
                    truncate
                    text-xs
                    font-medium
                    text-slate-600
                  "
                >
                  {room.department_name ||
                    "—"}
                </p>
              </td>

              <td className="px-5 py-3.5">
                <div className="flex items-center gap-1.5">
                  <BedDouble
                    size={14}
                    className="text-slate-400"
                  />

                  <span
                    className="
                      text-xs
                      font-semibold
                      text-slate-700
                    "
                  >
                    {Number(
                      room.capacity || 0,
                    )}
                  </span>
                </div>
              </td>

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
                      active
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
                        active
                          ? "bg-emerald-500"
                          : "bg-slate-400"
                      }
                    `}
                  />

                  {active
                    ? "Active"
                    : "Inactive"}
                </span>
              </td>

              <td className="px-5 py-3.5">
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onEdit(room)
                    }
                    title="Edit room"
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
                      hover:border-violet-200
                      hover:bg-violet-50
                      hover:text-violet-600
                    "
                  >
                    <Edit3 size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onDelete(room)
                    }
                    title="Delete room"
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
                    <Trash2 size={13} />
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// =====================================================
// ROOM MODAL
// =====================================================

function RoomModal({
  editingRoom,
  form,
  saving,
  error,
  onChange,
  onClose,
  onSave,
}: {
  editingRoom: Room | null;
  form: RoomFormData;
  saving: boolean;
  error: string;
  onChange: (
    field: keyof RoomFormData,
    value: string,
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
              <DoorOpen size={17} />
            </div>

            <div>
              <h2
                className="
                  text-sm
                  font-bold
                  text-slate-900
                "
              >
                {editingRoom
                  ? "Edit Room"
                  : "Add New Room"}
              </h2>

              <p
                className="
                  mt-0.5
                  text-[10px]
                  text-slate-400
                "
              >
                Configure room information.
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
              disabled:opacity-50
            "
          >
            <X size={17} />
          </button>
        </div>

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
            <FormField
              label="Room Number"
              required
            >
              <input
                value={form.room_number}
                onChange={(event) =>
                  onChange(
                    "room_number",
                    event.target.value,
                  )
                }
                placeholder="e.g. 101"
                autoFocus
                maxLength={50}
                className={inputClass}
              />
            </FormField>

            <FormField label="Room Type">
              <select
                value={form.room_type}
                onChange={(event) =>
                  onChange(
                    "room_type",
                    event.target.value,
                  )
                }
                className={inputClass}
              >
                {ROOM_TYPES.map(
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

            <div className="sm:col-span-2">
              <FormField
                label="Ward ID"
                required
              >
                <input
                  type="number"
                  min={1}
                  value={form.ward_id}
                  onChange={(event) =>
                    onChange(
                      "ward_id",
                      event.target.value,
                    )
                  }
                  placeholder="Enter ward ID"
                  className={inputClass}
                />

                <div
                  className="
                    mt-2
                    flex
                    items-start
                    gap-2
                    rounded-lg
                    bg-slate-50
                    px-3
                    py-2
                  "
                >
                  <Hospital
                    size={13}
                    className="
                      mt-0.5
                      shrink-0
                      text-slate-400
                    "
                  />

                  <p className="text-[10px] leading-4 text-slate-400">
                    Enter the ID of the
                    ward this room belongs
                    to.
                  </p>
                </div>
              </FormField>
            </div>
          </div>

          {error && (
            <div
              className="
                rounded-xl
                border
                border-red-200
                bg-red-50
                px-3
                py-2.5
                text-xs
                font-medium
                text-red-600
              "
            >
              {error}
            </div>
          )}
        </div>

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
              disabled:opacity-50
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

                {editingRoom
                  ? "Save Changes"
                  : "Create Room"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// STAT CARD
// =====================================================

function StatCard({
  label,
  value,
  description,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: number;
  description: string;
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

          <p
            className="
              mt-0.5
              truncate
              text-[10px]
              text-slate-400
            "
          >
            {description}
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
        ${
          align === "right"
            ? "text-right"
            : "text-left"
        }
      `}
    >
      {children}
    </th>
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
// ALERT
// =====================================================

function Alert({
  type,
  message,
  onClose,
}: {
  type: "error" | "success";
  message: string;
  onClose: () => void;
}) {
  const isError =
    type === "error";

  return (
    <div
      className={`
        flex
        shrink-0
        items-center
        justify-between
        gap-3
        rounded-xl
        border
        px-4
        py-2.5
        text-xs
        font-medium
        ${
          isError
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
        }
      `}
    >
      <span>{message}</span>

      <button
        type="button"
        onClick={onClose}
        className={`
          rounded-lg
          p-1
          transition
          ${
            isError
              ? "hover:bg-red-100"
              : "hover:bg-emerald-100"
          }
        `}
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
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
        Loading rooms...
      </p>

      <p
        className="
          mt-1
          text-[11px]
          text-slate-400
        "
      >
        Fetching room registry
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
          bg-violet-50
          text-violet-600
        "
      >
        <DoorOpen size={24} />
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
          ? "No rooms found"
          : "No rooms registered"}
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
          : "Create your first room to start building the hospital structure."}
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
          Add Room
        </button>
      )}
    </div>
  );
}

// =====================================================
// INPUT CLASS
// =====================================================

const inputClass = `
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
`;
