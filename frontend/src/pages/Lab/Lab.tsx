import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  ClipboardList,
  FlaskConical,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  TestTube2,
  UserRound,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

import { useAuth } from "../../context/AuthContext";

import {
  getLabOrders,
  getLabTests,
} from "../../services/labApi";

import type {
  LabOrder,
  LabOrderStatus,
  LabTest,
} from "../../types/lab";

import NewLabOrderModal from "./NewLabOrderModal";
import LabOrderWorkflowModal from "./LabOrderWorkflowModal";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const ORDER_STATUSES: Array<{
  value: "ALL" | LabOrderStatus;
  label: string;
}> = [
  { value: "ALL", label: "All" },
  { value: "ORDERED", label: "Ordered" },
  { value: "SAMPLE_PENDING", label: "Sample Pending" },
  { value: "COLLECTED", label: "Collected" },
  { value: "PROCESSING", label: "Processing" },
  { value: "RESULT_ENTERED", label: "Result Entered" },
  { value: "TECHNICALLY_VALIDATED", label: "Validated" },
  { value: "DOCTOR_REVIEW", label: "Doctor Review" },
  { value: "FINALIZED", label: "Finalized" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REJECTED", label: "Rejected" },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const formatStatus = (status?: string) => {
  if (!status) return "Unknown";

  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDate = (date?: string | null) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (date?: string | null) => {
  if (!date) return "";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusStyle = (status?: string) => {
  switch (status) {
    case "FINALIZED":
      return {
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        text: "text-emerald-700",
        dot: "bg-emerald-500",
      };

    case "TECHNICALLY_VALIDATED":
      return {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-700",
        dot: "bg-blue-500",
      };

    case "DOCTOR_REVIEW":
      return {
        bg: "bg-violet-50",
        border: "border-violet-200",
        text: "text-violet-700",
        dot: "bg-violet-500",
      };

    case "RESULT_ENTERED":
      return {
        bg: "bg-cyan-50",
        border: "border-cyan-200",
        text: "text-cyan-700",
        dot: "bg-cyan-500",
      };

    case "PROCESSING":
      return {
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-700",
        dot: "bg-amber-500",
      };

    case "COLLECTED":
      return {
        bg: "bg-indigo-50",
        border: "border-indigo-200",
        text: "text-indigo-700",
        dot: "bg-indigo-500",
      };

    case "SAMPLE_PENDING":
      return {
        bg: "bg-orange-50",
        border: "border-orange-200",
        text: "text-orange-700",
        dot: "bg-orange-500",
      };

    case "CANCELLED":
    case "REJECTED":
      return {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-700",
        dot: "bg-red-500",
      };

    default:
      return {
        bg: "bg-slate-50",
        border: "border-slate-200",
        text: "text-slate-600",
        dot: "bg-slate-400",
      };
  }
};

const getPriorityStyle = (priority?: string) => {
  switch (priority) {
    case "STAT":
      return {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-700",
        dot: "bg-red-500",
      };

    case "Urgent":
      return {
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-700",
        dot: "bg-amber-500",
      };

    default:
      return {
        bg: "bg-slate-50",
        border: "border-slate-200",
        text: "text-slate-600",
        dot: "bg-slate-400",
      };
  }
};

/* -------------------------------------------------------------------------- */
/* Status Badge                                                               */
/* -------------------------------------------------------------------------- */

function StatusBadge({
  status,
}: {
  status?: string;
}) {
  const style = getStatusStyle(status);

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        "text-[10px] font-semibold whitespace-nowrap",
        style.bg,
        style.border,
        style.text,
      ].join(" ")}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
      />

      {formatStatus(status)}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Priority Badge                                                             */
/* -------------------------------------------------------------------------- */

function PriorityBadge({
  priority,
}: {
  priority?: string;
}) {
  const style = getPriorityStyle(priority);

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1",
        "text-[10px] font-bold uppercase tracking-wide whitespace-nowrap",
        style.bg,
        style.border,
        style.text,
      ].join(" ")}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
      />

      {priority || "Routine"}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Metric Card                                                                */
/* -------------------------------------------------------------------------- */

function MetricCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_6px_24px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(15,23,42,0.07)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}
        >
          <Icon
            className={`h-5 w-5 ${iconColor}`}
            strokeWidth={2}
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Loading Rows                                                               */
/* -------------------------------------------------------------------------- */

function LoadingRows() {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: 6 }).map(
        (_, index) => (
          <div
            key={index}
            className="grid min-w-[1000px] grid-cols-[1.35fr_1fr_0.8fr_1.15fr_1.1fr_0.9fr] items-center gap-4 px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-100" />

              <div className="space-y-2">
                <div className="h-3.5 w-24 animate-pulse rounded bg-slate-100" />

                <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
              </div>
            </div>

            <div className="h-3.5 w-24 animate-pulse rounded bg-slate-100" />

            <div className="h-6 w-16 animate-pulse rounded-md bg-slate-100" />

            <div className="h-6 w-24 animate-pulse rounded-full bg-slate-100" />

            <div className="h-3.5 w-20 animate-pulse rounded bg-slate-100" />

            <div className="h-3.5 w-20 animate-pulse rounded bg-slate-100" />
          </div>
        ),
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty State                                                                */
/* -------------------------------------------------------------------------- */

function EmptyState({
  filtered,
  onClear,
}: {
  filtered: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
        <FlaskConical className="h-6 w-6 text-blue-600" />
      </div>

      <h3 className="mt-5 text-base font-semibold text-slate-900">
        {filtered
          ? "No matching orders"
          : "No lab orders yet"}
      </h3>

      <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-500">
        {filtered
          ? "Try another search or status filter."
          : "Laboratory orders will appear here once created."}
      </p>

      {filtered && (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Lab Order Row                                                              */
/* -------------------------------------------------------------------------- */

function LabOrderRow({
  order,
  onClick,
}: {
  order: LabOrder;
  onClick: () => void;
}) {
  const itemCount =
    order.items?.length ?? 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group grid w-full min-w-[1000px] grid-cols-[1.35fr_1fr_0.8fr_1.15fr_1.1fr_0.9fr] items-center gap-4 border-b border-slate-100 px-5 py-4 text-left transition-colors last:border-0 hover:bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-200"
    >
      {/* Order */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 transition group-hover:border-blue-200 group-hover:bg-blue-100">
          <TestTube2 className="h-4 w-4 text-blue-600" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">
            LAB-
            {String(order.id).padStart(
              5,
              "0",
            )}
          </p>

          <p className="mt-0.5 text-[11px] text-slate-400">
            Encounter #{order.encounter_id}
          </p>
        </div>
      </div>

      {/* Patient */}
      <div className="flex min-w-0 items-center gap-2">
        <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />

        <span className="truncate text-sm text-slate-600">
          Patient #{order.patient_id}
        </span>
      </div>

      {/* Priority */}
      <div>
        <PriorityBadge
          priority={order.priority}
        />
      </div>

      {/* Status */}
      <div>
        <StatusBadge
          status={order.status}
        />
      </div>

      {/* Tests */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100">
            <FlaskConical className="h-3.5 w-3.5 text-slate-500" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-700">
              {itemCount}{" "}
              {itemCount === 1
                ? "test"
                : "tests"}
            </p>

            {order.clinical_indication && (
              <p className="truncate text-[11px] text-slate-400">
                {order.clinical_indication}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Date */}
      <div>
        <p className="text-xs font-medium text-slate-600">
          {formatDate(
            order.ordered_at,
          )}
        </p>

        <p className="mt-0.5 text-[11px] text-slate-400">
          {formatTime(
            order.ordered_at,
          )}
        </p>
      </div>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Main Page                                                                  */
/* -------------------------------------------------------------------------- */

export default function Lab() {
  const { user } = useAuth();

  const [orders, setOrders] =
    useState<LabOrder[]>([]);

  const [tests, setTests] =
    useState<LabTest[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<
      "ALL" | LabOrderStatus
    >("ALL");

  const [createOpen, setCreateOpen] =
    useState(false);

  /*
   * We store only the selected order ID.
   *
   * The actual order is derived from the latest `orders` state.
   * This is important because when a sample is collected/received/
   * processed, the backend may change the LabOrder status.
   */
  const [selectedOrderId, setSelectedOrderId] =
    useState<number | null>(null);

  /* ------------------------------------------------------------------------ */
  /* Load Data                                                                */
  /* ------------------------------------------------------------------------ */

  const loadData = useCallback(
    async (refresh = false) => {
      try {
        setError("");

        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const [
          ordersResponse,
          testsResponse,
        ] = await Promise.all([
          getLabOrders(),
          getLabTests(true),
        ]);

        setOrders(
          Array.isArray(
            ordersResponse,
          )
            ? ordersResponse
            : [],
        );

        setTests(
          Array.isArray(
            testsResponse,
          )
            ? testsResponse
            : [],
        );
      } catch (err) {
        console.error(
          "Failed to load laboratory data:",
          err,
        );

        setError(
          "Unable to load laboratory data.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ------------------------------------------------------------------------ */
  /* Selected Order                                                            */
  /* ------------------------------------------------------------------------ */

  const selectedOrder = useMemo(() => {
    if (selectedOrderId === null) {
      return null;
    }

    return (
      orders.find(
        (order) =>
          order.id ===
          selectedOrderId,
      ) ?? null
    );
  }, [
    orders,
    selectedOrderId,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Filtered Orders                                                          */
  /* ------------------------------------------------------------------------ */

  const filteredOrders =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return orders.filter(
        (order) => {
          if (
            statusFilter !==
              "ALL" &&
            order.status !==
              statusFilter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const searchable = [
            order.id,
            order.patient_id,
            order.encounter_id,
            order.ordered_by_id,
            order.priority,
            order.status,
            order.clinical_indication,
            order.notes,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchable.includes(
            query,
          );
        },
      );
    }, [
      orders,
      search,
      statusFilter,
    ]);

  /* ------------------------------------------------------------------------ */
  /* Metrics                                                                  */
  /* ------------------------------------------------------------------------ */

  const metrics =
    useMemo(() => {
      const pending =
        orders.filter(
          (order) =>
            [
              "ORDERED",
              "SAMPLE_PENDING",
              "COLLECTED",
              "PROCESSING",
            ].includes(
              order.status,
            ),
        ).length;

      const review =
        orders.filter(
          (order) =>
            [
              "RESULT_ENTERED",
              "TECHNICALLY_VALIDATED",
              "DOCTOR_REVIEW",
            ].includes(
              order.status,
            ),
        ).length;

      const finalized =
        orders.filter(
          (order) =>
            order.status ===
            "FINALIZED",
        ).length;

      return {
        total: orders.length,
        pending,
        review,
        finalized,
      };
    }, [orders]);

  /* ------------------------------------------------------------------------ */
  /* Clear Filters                                                            */
  /* ------------------------------------------------------------------------ */

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
  };

  /* ------------------------------------------------------------------------ */
  /* Roles                                                                    */
  /* ------------------------------------------------------------------------ */

  const isDoctor =
    user?.role === "Doctor";

  const isAdministrator =
    user?.role ===
    "Administrator";

  /* ------------------------------------------------------------------------ */
  /* Page                                                                     */
  /* ------------------------------------------------------------------------ */

  return (
    <>
      <div className="h-full min-h-0 overflow-y-auto bg-[#f6f8fb]">
        <div className="mx-auto w-full max-w-[1700px] px-4 py-5 sm:px-6 lg:px-8">
          {/* ---------------------------------------------------------------- */}
          {/* Header                                                           */}
          {/* ---------------------------------------------------------------- */}

          <header className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-500/5 blur-3xl" />

            <div className="relative flex flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 shadow-lg shadow-slate-900/10">
                  <FlaskConical
                    className="h-6 w-6 text-white"
                    strokeWidth={1.8}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">
                      HospitaX
                    </span>

                    <span className="h-1 w-1 rounded-full bg-slate-300" />

                    <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">
                      {isDoctor
                        ? "Clinical"
                        : isAdministrator
                          ? "Operations"
                          : "Laboratory"}
                    </span>
                  </div>

                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                    Laboratory
                  </h1>

                  <p className="mt-1 text-xs text-slate-500">
                    Diagnostic orders and result workflow
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 sm:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Operational
                </span>

                {/* Doctor-only order creation */}
                {isDoctor && (
                  <button
                    type="button"
                    onClick={() =>
                      setCreateOpen(
                        true,
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]"
                  >
                    <Plus className="h-3.5 w-3.5" />

                    New Lab Order
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    loadData(true)
                  }
                  disabled={
                    refreshing
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {refreshing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}

                  Refresh
                </button>
              </div>
            </div>
          </header>

          {/* ---------------------------------------------------------------- */}
          {/* Metrics                                                          */}
          {/* ---------------------------------------------------------------- */}

          <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard
              label="Total Orders"
              value={metrics.total}
              icon={
                ClipboardList
              }
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
            />

            <MetricCard
              label="Pending"
              value={
                metrics.pending
              }
              icon={Clock3}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
            />

            <MetricCard
              label="Review"
              value={
                metrics.review
              }
              icon={
                ShieldCheck
              }
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
            />

            <MetricCard
              label="Finalized"
              value={
                metrics.finalized
              }
              icon={
                CheckCircle2
              }
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
            />
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* Orders                                                           */}
          {/* ---------------------------------------------------------------- */}

          <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            {/* Toolbar */}
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-slate-400" />

                    <h2 className="text-sm font-bold text-slate-900">
                      Laboratory
                      Orders
                    </h2>

                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      {
                        filteredOrders.length
                      }
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-400">
                    Track diagnostic
                    orders by
                    status
                  </p>
                </div>

                <div className="relative w-full xl:w-[280px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    value={search}
                    onChange={(
                      event,
                    ) =>
                      setSearch(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Search orders..."
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-4 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </div>

              {/* Status Filters */}
              <div className="mt-4 overflow-x-auto pb-1">
                <div className="flex min-w-max gap-1.5">
                  {ORDER_STATUSES.map(
                    (status) => {
                      const active =
                        statusFilter ===
                        status.value;

                      const count =
                        status.value ===
                        "ALL"
                          ? orders.length
                          : orders.filter(
                              (
                                order,
                              ) =>
                                order.status ===
                                status.value,
                            ).length;

                      return (
                        <button
                          key={
                            status.value
                          }
                          type="button"
                          onClick={() =>
                            setStatusFilter(
                              status.value as
                                | "ALL"
                                | LabOrderStatus,
                            )
                          }
                          className={[
                            "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition",
                            active
                              ? "bg-slate-950 text-white"
                              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
                          ].join(
                            " ",
                          )}
                        >
                          {
                            status.label
                          }

                          <span
                            className={[
                              "rounded px-1.5 py-0.5 text-[10px] font-bold",
                              active
                                ? "bg-white/15 text-white"
                                : "bg-slate-100 text-slate-400",
                            ].join(
                              " ",
                            )}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mx-5 mt-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 sm:mx-6">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />

                <p className="flex-1 text-xs font-medium text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    loadData()
                  }
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm ring-1 ring-red-200 hover:bg-red-50"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Table */}
            <div className="mt-4 overflow-x-auto">
              <div className="min-w-[1000px]">
                {/* Table Header */}
                <div className="grid grid-cols-[1.35fr_1fr_0.8fr_1.15fr_1.1fr_0.9fr] items-center gap-4 border-y border-slate-100 bg-slate-50/70 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span>
                    Order
                  </span>

                  <span>
                    Patient
                  </span>

                  <span>
                    Priority
                  </span>

                  <span>
                    Status
                  </span>

                  <span>
                    Tests
                  </span>

                  <span>
                    Ordered
                  </span>
                </div>

                {loading ? (
                  <LoadingRows />
                ) : filteredOrders.length ===
                  0 ? (
                  <EmptyState
                    filtered={Boolean(
                      search ||
                        statusFilter !==
                          "ALL",
                    )}
                    onClear={
                      clearFilters
                    }
                  />
                ) : (
                  <div className="max-h-[600px] overflow-y-auto">
                    {filteredOrders.map(
                      (order) => (
                        <LabOrderRow
                          key={
                            order.id
                          }
                          order={
                            order
                          }
                          onClick={() =>
                            setSelectedOrderId(
                              order.id,
                            )
                          }
                        />
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            {!loading &&
              filteredOrders.length >
                0 && (
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/40 px-5 py-3 text-[11px] text-slate-400 sm:px-6">
                  <span>
                    Showing{" "}
                    <span className="font-semibold text-slate-600">
                      {
                        filteredOrders.length
                      }
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-600">
                      {
                        orders.length
                      }
                    </span>
                  </span>

                  <span className="hidden items-center gap-1.5 sm:flex">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                    Laboratory
                    active
                  </span>
                </div>
              )}
          </section>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* NEW LAB ORDER                                                        */}
      {/* ==================================================================== */}

      {isDoctor && (
        <NewLabOrderModal
          open={createOpen}
          labTests={tests}
          onClose={() =>
            setCreateOpen(false)
          }
          onSuccess={async () => {
            await loadData();
          }}
        />
      )}

      {/* ==================================================================== */}
      {/* LAB ORDER WORKFLOW                                                   */}
      {/* ==================================================================== */}

      <LabOrderWorkflowModal
        open={
          selectedOrder !==
          null
        }
        order={
          selectedOrder
        }
        labTests={tests}
        userRole={
          user?.role
        }
        onClose={() =>
          setSelectedOrderId(
            null,
          )
        }
        onUpdated={async () => {
          /*
           * Refresh orders after every sample action.
           *
           * selectedOrder is derived from the fresh orders state,
           * so the modal automatically receives the latest status.
           */
          await loadData(
            true,
          );
        }}
      />
    </>
  );
}