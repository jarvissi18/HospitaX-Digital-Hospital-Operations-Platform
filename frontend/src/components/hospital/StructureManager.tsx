import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ElementType,
} from "react";

import {
  ArrowLeft,
  Building2,
  ChevronRight,
  DoorOpen,
  Layers3,
  Hospital,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  toast,
} from "react-toastify";

import {
  getDepartments,
  getFloors,
  getRooms,
  getWards,
} from "../../services/hospitalStructureApi";

import type {
  Department,
  Floor,
  Ward,
  Room,
} from "../../types/hospitalStructure";

import StructureFormModal, {
  type StructureEntity,
} from "./StructureFormModal";

import api from "../../services/api";

// =====================================================
// TYPES
// =====================================================

type StructureRecord =
  | Department
  | Floor
  | Ward
  | Room;

interface StructureManagerProps {
  entity: StructureEntity;
  title: string;
  subtitle: string;
}

type AccentKey =
  | "blue"
  | "violet"
  | "emerald"
  | "orange";

interface EntityConfig {
  icon: ElementType;
  accent: AccentKey;
  singular: string;
  columns: string[];
}

// =====================================================
// ENTITY CONFIGURATION
// =====================================================

const ENTITY_CONFIG: Partial<
  Record<StructureEntity, EntityConfig>
> = {
  department: {
    icon: Building2,
    accent: "blue",
    singular: "Department",
    columns: [
      "Department",
      "Code",
      "Description",
      "Status",
    ],
  },

  floor: {
    icon: Layers3,
    accent: "violet",
    singular: "Floor",
    columns: [
      "Floor",
      "Level",
      "Department",
      "Status",
    ],
  },

  ward: {
    icon: Hospital,
    accent: "emerald",
    singular: "Ward",
    columns: [
      "Ward",
      "Type",
      "Floor",
      "Status",
    ],
  },

  room: {
    icon: DoorOpen,
    accent: "orange",
    singular: "Room",
    columns: [
      "Room",
      "Type",
      "Capacity",
      "Status",
    ],
  },
};

// =====================================================
// ACCENT STYLES
// =====================================================

const ACCENT_STYLES: Record<
  AccentKey,
  {
    icon: string;
    iconStrong: string;
    text: string;
    glow: string;
  }
> = {
  blue: {
    icon:
      "bg-blue-50 text-blue-600",
    iconStrong:
      "bg-blue-600 text-white",
    text:
      "text-blue-500",
    glow:
      "bg-blue-500/10",
  },

  violet: {
    icon:
      "bg-violet-50 text-violet-600",
    iconStrong:
      "bg-violet-600 text-white",
    text:
      "text-violet-500",
    glow:
      "bg-violet-500/10",
  },

  emerald: {
    icon:
      "bg-emerald-50 text-emerald-600",
    iconStrong:
      "bg-emerald-600 text-white",
    text:
      "text-emerald-500",
    glow:
      "bg-emerald-500/10",
  },

  orange: {
    icon:
      "bg-orange-50 text-orange-600",
    iconStrong:
      "bg-orange-500 text-white",
    text:
      "text-orange-500",
    glow:
      "bg-orange-500/10",
  },
};

// =====================================================
// API ENDPOINTS
// =====================================================

const DELETE_ENDPOINTS: Partial<
  Record<StructureEntity, string>
> = {
  department: "/departments",
  floor: "/floors",
  ward: "/wards",
  room: "/rooms",
};

// =====================================================
// SAFE FIELD ACCESS
// =====================================================

function getField(
  item: StructureRecord,
  field: string,
): unknown {
  return (
    item as unknown as Record<
      string,
      unknown
    >
  )[field];
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function StructureManager({
  entity,
  title,
  subtitle,
}: StructureManagerProps) {
  const navigate = useNavigate();

  // ===================================================
  // CONFIG
  // ===================================================

  const config =
    ENTITY_CONFIG[entity] ??
    ENTITY_CONFIG.department!;

  const Icon = config.icon;

  const colors =
    ACCENT_STYLES[config.accent];

  const singularTitle =
    config.singular;

  // ===================================================
  // DATA STATE
  // ===================================================

  const [data, setData] =
    useState<StructureRecord[]>([]);

  const [departments, setDepartments] =
    useState<Department[]>([]);

  const [floors, setFloors] =
    useState<Floor[]>([]);

  const [wards, setWards] =
    useState<Ward[]>([]);

  const [rooms, setRooms] =
    useState<Room[]>([]);

  // ===================================================
  // UI STATE
  // ===================================================

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [modalOpen, setModalOpen] =
    useState(false);

  const [selectedRecord, setSelectedRecord] =
    useState<StructureRecord | null>(
      null,
    );

  // ===================================================
  // LOAD DATA
  // ===================================================

  const loadData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const [
          departmentData,
          floorData,
          wardData,
          roomData,
        ] = await Promise.all([
          getDepartments(),
          getFloors(),
          getWards(),
          getRooms(),
        ]);

        const safeDepartments: Department[] =
          Array.isArray(departmentData)
            ? departmentData
            : [];

        const safeFloors: Floor[] =
          Array.isArray(floorData)
            ? floorData
            : [];

        const safeWards: Ward[] =
          Array.isArray(wardData)
            ? wardData
            : [];

        const safeRooms: Room[] =
          Array.isArray(roomData)
            ? roomData
            : [];

        setDepartments(
          safeDepartments,
        );

        setFloors(
          safeFloors,
        );

        setWards(
          safeWards,
        );

        setRooms(
          safeRooms,
        );

        let currentData:
          StructureRecord[] = [];

        switch (entity) {
          case "department":
            currentData =
              safeDepartments;
            break;

          case "floor":
            currentData =
              safeFloors;
            break;

          case "ward":
            currentData =
              safeWards;
            break;

          case "room":
            currentData =
              safeRooms;
            break;

          default:
            currentData = [];
        }

        setData(currentData);
      } catch (error) {
        console.error(
          "Hospital structure loading error:",
          error,
        );

        toast.error(
          `Unable to load ${title.toLowerCase()}.`,
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [entity, title],
  );

  // ===================================================
  // INITIAL LOAD
  // ===================================================

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // ===================================================
  // SEARCH FILTER
  // ===================================================

  const filteredData = useMemo(() => {
    const keyword =
      search
        .trim()
        .toLowerCase();

    if (!keyword) {
      return data;
    }

    return data.filter(
      (item) => {
        switch (entity) {
          case "department":
            return [
              getField(item, "name"),
              getField(item, "code"),
              getField(
                item,
                "description",
              ),
            ].some((value) =>
              String(value ?? "")
                .toLowerCase()
                .includes(keyword),
            );

          case "floor":
            return [
              getField(item, "name"),
              getField(
                item,
                "floor_number",
              ),
              getField(
                item,
                "department_id",
              ),
            ].some((value) =>
              String(value ?? "")
                .toLowerCase()
                .includes(keyword),
            );

          case "ward":
            return [
              getField(item, "name"),
              getField(
                item,
                "ward_type",
              ),
              getField(
                item,
                "floor_id",
              ),
            ].some((value) =>
              String(value ?? "")
                .toLowerCase()
                .includes(keyword),
            );

          case "room":
            return [
              getField(
                item,
                "room_number",
              ),
              getField(
                item,
                "room_type",
              ),
              getField(
                item,
                "capacity",
              ),
            ].some((value) =>
              String(value ?? "")
                .toLowerCase()
                .includes(keyword),
            );

          default:
            return true;
        }
      },
    );
  }, [
    data,
    entity,
    search,
  ]);

  // ===================================================
  // MODAL
  // ===================================================

  const openAdd = () => {
    setSelectedRecord(null);
    setModalOpen(true);
  };

  const openEdit = (
    record: StructureRecord,
  ) => {
    setSelectedRecord(record);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedRecord(null);
  };

  // ===================================================
  // DELETE
  // ===================================================

  const deleteRecord = async (
    id: unknown,
  ) => {
    if (
      id === null ||
      id === undefined
    ) {
      toast.error(
        `Unable to delete ${singularTitle.toLowerCase()}: invalid record ID.`,
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Delete this ${singularTitle.toLowerCase()}?\n\nThis action cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    const baseEndpoint =
      DELETE_ENDPOINTS[entity];

    if (!baseEndpoint) {
      toast.error(
        "Invalid hospital structure type.",
      );
      return;
    }

    try {
      await api.delete(
        `${baseEndpoint}/${id}`,
      );

      toast.success(
        `${singularTitle} deleted successfully.`,
      );

      await loadData(true);
    } catch (error: unknown) {
      console.error(
        "Structure delete error:",
        error,
      );

      const apiError =
        error as {
          response?: {
            data?: {
              detail?: string;
            };
          };
        };

      toast.error(
        apiError.response?.data?.detail ??
          `Unable to delete ${singularTitle.toLowerCase()}.`,
      );
    }
  };

  // ===================================================
  // REFRESH
  // ===================================================

  const handleRefresh = async () => {
    await loadData(true);
  };

  // ===================================================
  // NAVIGATION
  // ===================================================

  const handleBack = () => {
    navigate(
      "/hospital-structure",
    );
  };

  // ===================================================
  // DISPLAY HELPERS
  // ===================================================

  const getPrimaryText = (
    item: StructureRecord,
  ): string => {
    switch (entity) {
      case "department":
        return (
          String(
            getField(item, "name") ?? "",
          ) ||
          "Unnamed Department"
        );

      case "floor":
        return (
          String(
            getField(item, "name") ?? "",
          ) ||
          `Floor ${String(
            getField(
              item,
              "floor_number",
            ) ?? "—",
          )}`
        );

      case "ward":
        return (
          String(
            getField(item, "name") ?? "",
          ) ||
          "Unnamed Ward"
        );

      case "room":
        return getField(
          item,
          "room_number",
        )
          ? `Room ${String(
              getField(
                item,
                "room_number",
              ),
            )}`
          : "Unnamed Room";

      default:
        return "Record";
    }
  };

  const getSecondaryText = (
    item: StructureRecord,
  ): string => {
    switch (entity) {
      case "department":
        return (
          String(
            getField(item, "code") ??
              "",
          ) ||
          "No department code"
        );

      case "floor":
        return `Level ${String(
          getField(
            item,
            "floor_number",
          ) ?? "—",
        )}`;

      case "ward":
        return (
          String(
            getField(
              item,
              "ward_type",
            ) ?? "",
          ) ||
          "General Ward"
        );

      case "room":
        return (
          String(
            getField(
              item,
              "room_type",
            ) ?? "",
          ) ||
          "Standard Room"
        );

      default:
        return "";
    }
  };

  const getThirdValue = (
    item: StructureRecord,
  ): string => {
    switch (entity) {
      case "department":
        return (
          String(
            getField(
              item,
              "description",
            ) ?? "",
          ) ||
          "No description"
        );

      case "floor":
        return getField(
          item,
          "department_id",
        )
          ? `Department #${String(
              getField(
                item,
                "department_id",
              ),
            )}`
          : "No department assigned";

      case "ward":
        return getField(
          item,
          "floor_id",
        )
          ? `Floor #${String(
              getField(
                item,
                "floor_id",
              ),
            )}`
          : "No floor assigned";

      case "room": {
        const capacity =
          getField(
            item,
            "capacity",
          );

        return capacity !== null &&
          capacity !== undefined
          ? `${String(
              capacity,
            )} beds`
          : "Capacity not set";
      }

      default:
        return "—";
    }
  };

  // ===================================================
  // ACTIVE STATUS
  // ===================================================

  const isRecordActive = (
    item: StructureRecord,
  ): boolean => {
    const value =
      getField(
        item,
        "is_active",
      );

    return (
      value === true ||
      value === 1 ||
      value === "true"
    );
  };

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div
      className="
        page-enter
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
          pb-5
        "
      >
        <div
          className="
            flex
            items-start
            justify-between
            gap-4
          "
        >
          {/* LEFT */}

          <div
            className="
              flex
              min-w-0
              items-start
              gap-3
            "
          >
            {/* BACK */}

            <button
              type="button"
              onClick={handleBack}
              title="Back to Hospital Structure"
              className="
                mt-1
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-slate-200
                bg-white
                text-slate-600
                shadow-sm
                transition-all
                duration-200
                hover:-translate-x-0.5
                hover:border-blue-200
                hover:bg-blue-50
                hover:text-blue-600
                hover:shadow-md
              "
            >
              <ArrowLeft
                size={18}
                strokeWidth={2}
              />
            </button>

            {/* ICON */}

            <div
              className="
                mt-1
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-slate-200
                bg-white
                shadow-sm
              "
            >
              <div
                className={`
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-lg
                  ${colors.icon}
                `}
              >
                <Icon
                  size={17}
                  strokeWidth={2}
                />
              </div>
            </div>

            {/* TITLE */}

            <div className="min-w-0">
              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >
                <span
                  className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.22em]
                    text-slate-400
                  "
                >
                  Hospital Infrastructure
                </span>

                <ChevronRight
                  size={12}
                  className="text-slate-300"
                />

                <span
                  className={`
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.15em]
                    ${colors.text}
                  `}
                >
                  {singularTitle}
                </span>
              </div>

              <h1
                className="
                  mt-1.5
                  text-3xl
                  font-bold
                  tracking-tight
                  text-slate-950
                "
              >
                {title}
              </h1>

              <p
                className="
                  mt-1
                  max-w-2xl
                  text-sm
                  text-slate-500
                "
              >
                {subtitle}
              </p>
            </div>
          </div>

          {/* ACTIONS */}

          <div
            className="
              flex
              shrink-0
              items-center
              gap-2
            "
          >
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh"
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                border
                border-slate-200
                bg-white
                text-slate-600
                shadow-sm
                transition-all
                hover:border-slate-300
                hover:bg-slate-50
                hover:shadow-md
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />
            </button>

            <button
              type="button"
              onClick={openAdd}
              className="
                group
                flex
                items-center
                gap-2
                rounded-xl
                bg-gradient-to-r
                from-blue-600
                to-indigo-600
                px-4
                py-2.5
                text-sm
                font-semibold
                text-white
                shadow-lg
                shadow-blue-500/20
                transition-all
                duration-200
                hover:-translate-y-0.5
                hover:shadow-xl
                active:translate-y-0
              "
            >
              <Plus
                size={17}
                className="
                  transition-transform
                  duration-200
                  group-hover:rotate-90
                "
              />

              Add {singularTitle}
            </button>
          </div>
        </div>
      </header>

      {/* =================================================
          MAIN REGISTRY CARD
      ================================================= */}

      <section
        className="
          relative
          min-h-0
          flex-1
          overflow-hidden
          rounded-3xl
          border
          border-slate-200
          bg-white
          shadow-[0_10px_40px_rgba(15,23,42,0.05)]
        "
      >
        {/* DECORATIVE GLOW */}

        <div
          className={`
            pointer-events-none
            absolute
            -right-20
            -top-20
            h-48
            w-48
            rounded-full
            blur-3xl
            ${colors.glow}
          `}
        />

        {/* =================================================
            TOOLBAR
        ================================================= */}

        <div
          className="
            relative
            flex
            shrink-0
            flex-col
            gap-4
            border-b
            border-slate-100
            bg-white/90
            p-4
            backdrop-blur
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          {/* REGISTRY INFO */}

          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            <div
              className={`
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                ${colors.icon}
              `}
            >
              <Icon size={18} />
            </div>

            <div>
              <div
                className="
                  flex
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
                  {title} Registry
                </h2>

                <span
                  className="
                    rounded-full
                    bg-slate-100
                    px-2
                    py-0.5
                    text-[10px]
                    font-bold
                    text-slate-500
                  "
                >
                  {data.length}
                </span>
              </div>

              <p
                className="
                  mt-0.5
                  text-[11px]
                  text-slate-400
                "
              >
                {filteredData.length}{" "}
                visible of{" "}
                {data.length} total records
              </p>
            </div>
          </div>

          {/* SEARCH */}

          <div
            className="
              relative
              w-full
              sm:w-72
            "
          >
            <Search
              size={16}
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
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder={`Search ${title.toLowerCase()}...`}
              className="
                h-10
                w-full
                rounded-xl
                border
                border-slate-200
                bg-slate-50
                pl-9
                pr-9
                text-sm
                text-slate-800
                outline-none
                transition-all
                placeholder:text-slate-400
                focus:border-blue-400
                focus:bg-white
                focus:ring-4
                focus:ring-blue-500/10
              "
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
                title="Clear search"
                className="
                  absolute
                  right-2
                  top-1/2
                  flex
                  h-6
                  w-6
                  -translate-y-1/2
                  items-center
                  justify-center
                  rounded-md
                  text-slate-400
                  transition
                  hover:bg-slate-100
                  hover:text-slate-600
                "
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* =================================================
            TABLE CONTENT
        ================================================= */}

        <div
          className="
            h-[calc(100%-81px)]
            min-h-0
            overflow-auto
          "
        >
          {/* LOADING */}

          {loading ? (
            <LoadingState
              title={title}
            />
          ) : filteredData.length ===
            0 ? (
            <EmptyState
              title={title}
              singularTitle={
                singularTitle
              }
              search={search}
              Icon={Icon}
              onAdd={openAdd}
              onClear={() =>
                setSearch("")
              }
            />
          ) : (
            <StructureTable
              entity={entity}
              columns={
                config.columns
              }
              data={
                filteredData
              }
              Icon={Icon}
              colors={colors}
              getPrimaryText={
                getPrimaryText
              }
              getSecondaryText={
                getSecondaryText
              }
              getThirdValue={
                getThirdValue
              }
              isRecordActive={
                isRecordActive
              }
              onEdit={openEdit}
              onDelete={
                deleteRecord
              }
              singularTitle={
                singularTitle
              }
            />
          )}
        </div>
      </section>

      {/* =================================================
          FORM MODAL
      ================================================= */}

      <StructureFormModal
        open={modalOpen}
        entity={entity}
        record={selectedRecord}
        departments={departments}
        floors={floors}
        wards={wards}
        rooms={rooms}
        onClose={closeModal}
        onSuccess={async () => {
          closeModal();
          await loadData(true);
        }}
      />
    </div>
  );
}

// =====================================================
// TABLE
// =====================================================

interface StructureTableProps {
  entity: StructureEntity;
  columns: string[];
  data: StructureRecord[];
  Icon: ElementType;
  colors: {
    icon: string;
    iconStrong: string;
    text: string;
    glow: string;
  };
  getPrimaryText: (
    item: StructureRecord,
  ) => string;
  getSecondaryText: (
    item: StructureRecord,
  ) => string;
  getThirdValue: (
    item: StructureRecord,
  ) => string;
  isRecordActive: (
    item: StructureRecord,
  ) => boolean;
  onEdit: (
    item: StructureRecord,
  ) => void;
  onDelete: (
    id: unknown,
  ) => void;
  singularTitle: string;
}

function StructureTable({
  entity,
  columns,
  data,
  Icon,
  colors,
  getPrimaryText,
  getSecondaryText,
  getThirdValue,
  isRecordActive,
  onEdit,
  onDelete,
  singularTitle,
}: StructureTableProps) {
  return (
    <div
      className="
        h-full
        min-w-[850px]
      "
    >
      <table
        className="
          w-full
          border-collapse
        "
      >
        {/* HEADER */}

        <thead
          className="
            sticky
            top-0
            z-20
            bg-slate-50/95
            backdrop-blur
          "
        >
          <tr
            className="
              border-b
              border-slate-100
            "
          >
            {columns.map(
              (column) => (
                <th
                  key={column}
                  className="
                    whitespace-nowrap
                    px-6
                    py-3.5
                    text-left
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.12em]
                    text-slate-400
                  "
                >
                  {column}
                </th>
              ),
            )}

            <th
              className="
                px-6
                py-3.5
                text-right
                text-[10px]
                font-bold
                uppercase
                tracking-[0.12em]
                text-slate-400
              "
            >
              Actions
            </th>
          </tr>
        </thead>

        {/* BODY */}

        <tbody>
          {data.map(
            (item, index) => {
              const recordId =
                item.id ??
                `${entity}-${index}`;

              const active =
                isRecordActive(
                  item,
                );

              return (
                <tr
                  key={String(
                    recordId,
                  )}
                  className="
                    group
                    border-b
                    border-slate-100
                    transition-colors
                    duration-150
                    hover:bg-slate-50/80
                  "
                >
                  {/* PRIMARY */}

                  <td
                    className="
                      px-6
                      py-4
                    "
                  >
                    <div
                      className="
                        flex
                        items-center
                        gap-3
                      "
                    >
                      <div
                        className={`
                          flex
                          h-10
                          w-10
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          transition-transform
                          duration-200
                          group-hover:scale-105
                          ${colors.icon}
                        `}
                      >
                        <Icon
                          size={17}
                          strokeWidth={2}
                        />
                      </div>

                      <div
                        className="
                          min-w-0
                        "
                      >
                        <p
                          className="
                            truncate
                            text-sm
                            font-bold
                            text-slate-800
                          "
                        >
                          {
                            getPrimaryText(
                              item,
                            )
                          }
                        </p>

                        <p
                          className="
                            mt-0.5
                            text-[10px]
                            font-medium
                            text-slate-400
                          "
                        >
                          {
                            getSecondaryText(
                              item,
                            )
                          }
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* SECOND */}

                  <td
                    className="
                      px-6
                      py-4
                    "
                  >
                    <span
                      className="
                        inline-flex
                        rounded-lg
                        bg-slate-50
                        px-2.5
                        py-1.5
                        text-xs
                        font-semibold
                        text-slate-600
                        ring-1
                        ring-slate-100
                      "
                    >
                      {getSecondColumn(
                        entity,
                        item,
                      )}
                    </span>
                  </td>

                  {/* THIRD */}

                  <td
                    className="
                      max-w-[280px]
                      px-6
                      py-4
                    "
                  >
                    <span
                      className="
                        block
                        truncate
                        text-sm
                        text-slate-500
                      "
                      title={getThirdValue(
                        item,
                      )}
                    >
                      {getThirdValue(
                        item,
                      )}
                    </span>
                  </td>

                  {/* STATUS */}

                  <td
                    className="
                      px-6
                      py-4
                    "
                  >
                    <StatusBadge
                      active={active}
                    />
                  </td>

                  {/* ACTIONS */}

                  <td
                    className="
                      px-6
                      py-4
                    "
                  >
                    <div
                      className="
                        flex
                        items-center
                        justify-end
                        gap-2
                      "
                    >
                      <button
                        type="button"
                        onClick={() =>
                          onEdit(item)
                        }
                        title={`Edit ${singularTitle}`}
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
                          text-slate-500
                          shadow-sm
                          transition-all
                          hover:border-blue-200
                          hover:bg-blue-50
                          hover:text-blue-600
                          hover:shadow
                        "
                      >
                        <Pencil
                          size={14}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onDelete(
                            item.id,
                          )
                        }
                        title={`Delete ${singularTitle}`}
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
                          text-slate-500
                          shadow-sm
                          transition-all
                          hover:border-red-200
                          hover:bg-red-50
                          hover:text-red-600
                          hover:shadow
                        "
                      >
                        <Trash2
                          size={14}
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
    </div>
  );
}

// =====================================================
// SECOND COLUMN
// =====================================================

function getSecondColumn(
  entity: StructureEntity,
  item: StructureRecord,
): string {
  switch (entity) {
    case "department":
      return String(
        getField(item, "code") ??
          "—",
      );

    case "floor":
      return `Level ${String(
        getField(
          item,
          "floor_number",
        ) ?? "—",
      )}`;

    case "ward":
      return String(
        getField(
          item,
          "ward_type",
        ) ?? "—",
      );

    case "room":
      return String(
        getField(
          item,
          "room_type",
        ) ?? "—",
      );

    default:
      return "—";
  }
}

// =====================================================
// STATUS BADGE
// =====================================================

function StatusBadge({
  active,
}: {
  active: boolean;
}) {
  return (
    <span
      className={`
        inline-flex
        items-center
        gap-1.5
        rounded-full
        px-2.5
        py-1.5
        text-[10px]
        font-bold
        ${
          active
            ? `
              bg-emerald-50
              text-emerald-700
              ring-1
              ring-emerald-100
            `
            : `
              bg-slate-100
              text-slate-500
              ring-1
              ring-slate-200
            `
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
              ? `
                bg-emerald-500
                shadow-sm
                shadow-emerald-400/50
              `
              : "bg-slate-400"
          }
        `}
      />

      {active
        ? "Active"
        : "Inactive"}
    </span>
  );
}

// =====================================================
// LOADING STATE
// =====================================================

function LoadingState({
  title,
}: {
  title: string;
}) {
  return (
    <div
      className="
        flex
        h-full
        min-h-[350px]
        flex-col
        items-center
        justify-center
      "
    >
      <div
        className="
          flex
          h-12
          w-12
          items-center
          justify-center
          rounded-2xl
          bg-blue-50
          text-blue-600
        "
      >
        <RefreshCw
          size={20}
          className="animate-spin"
        />
      </div>

      <p
        className="
          mt-4
          text-sm
          font-semibold
          text-slate-700
        "
      >
        Loading{" "}
        {title.toLowerCase()}...
      </p>

      <p
        className="
          mt-1
          text-xs
          text-slate-400
        "
      >
        Fetching hospital
        infrastructure data
      </p>
    </div>
  );
}

// =====================================================
// EMPTY STATE
// =====================================================

function EmptyState({
  title,
  singularTitle,
  search,
  Icon,
  onAdd,
  onClear,
}: {
  title: string;
  singularTitle: string;
  search: string;
  Icon: ElementType;
  onAdd: () => void;
  onClear: () => void;
}) {
  return (
    <div
      className="
        flex
        h-full
        min-h-[350px]
        flex-col
        items-center
        justify-center
        px-6
        text-center
      "
    >
      <div
        className="
          relative
          flex
          h-16
          w-16
          items-center
          justify-center
          rounded-2xl
          bg-slate-50
          text-slate-400
          ring-1
          ring-slate-200
        "
      >
        <Icon size={27} />

        <span
          className="
            absolute
            -right-1
            -top-1
            h-3
            w-3
            rounded-full
            bg-blue-500
            ring-4
            ring-white
          "
        />
      </div>

      <h3
        className="
          mt-5
          text-base
          font-bold
          text-slate-800
        "
      >
        {search
          ? `No ${title.toLowerCase()} found`
          : `No ${title.toLowerCase()} yet`}
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
          ? "Try changing your search term or clear the search."
          : `Create your first ${singularTitle.toLowerCase()} to start managing your hospital structure.`}
      </p>

      {search ? (
        <button
          type="button"
          onClick={onClear}
          className="
            mt-5
            rounded-xl
            border
            border-slate-200
            bg-white
            px-4
            py-2
            text-xs
            font-semibold
            text-slate-700
            shadow-sm
            transition
            hover:bg-slate-50
          "
        >
          Clear Search
        </button>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          className="
            mt-5
            flex
            items-center
            gap-2
            rounded-xl
            bg-slate-900
            px-4
            py-2.5
            text-xs
            font-semibold
            text-white
            shadow-lg
            transition
            hover:-translate-y-0.5
            hover:bg-slate-800
          "
        >
          <Plus size={15} />
          Add {singularTitle}
        </button>
      )}
    </div>
  );
}