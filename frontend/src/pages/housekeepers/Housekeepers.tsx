import { useEffect, useMemo, useState } from "react";

import {
  Search,
  Plus,
  RefreshCw,
  UsersRound,
  Phone,
  Mail,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  ShieldCheck,
} from "lucide-react";

import { toast } from "react-toastify";

import type { Housekeeper } from "../../types/housekeeper";

import {
  getHousekeepers,
  deleteHousekeeper,
} from "../../services/housekeeperApi";

import LoadingSpinner from "../../components/common/LoadingSpinner";

import HousekeeperFormModal from "../../components/housekeeper/HousekeeperFormModal";


// =====================================================
// MAIN COMPONENT
// =====================================================

export default function Housekeepers() {

  // =====================================================
  // DATA
  // =====================================================

  const [housekeepers, setHousekeepers] =
    useState<Housekeeper[]>([]);


  // =====================================================
  // PAGE STATE
  // =====================================================

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
      "All" | "Active" | "Inactive"
    >("All");


  // =====================================================
  // MODAL
  // =====================================================

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [selectedHousekeeper, setSelectedHousekeeper] =
    useState<Housekeeper | null>(null);


  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    fetchHousekeepers();
  }, []);


  // =====================================================
  // FETCH HOUSEKEEPERS
  // =====================================================

  async function fetchHousekeepers(
    showRefreshState = false
  ) {

    try {

      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const data =
        await getHousekeepers();

      setHousekeepers(data);

    } catch (err) {

      console.error(
        "Failed to load housekeepers:",
        err
      );

      setError(
        "Unable to load housekeepers. Please try again."
      );

    } finally {

      setLoading(false);
      setRefreshing(false);

    }

  }


  // =====================================================
  // FILTER
  // =====================================================

  const filteredHousekeepers =
    useMemo(() => {

      const keyword =
        search.trim().toLowerCase();


      return housekeepers.filter(
        (housekeeper) => {

          const matchesSearch =
            !keyword ||
            housekeeper.full_name
              .toLowerCase()
              .includes(keyword) ||
            housekeeper.employee_code
              .toLowerCase()
              .includes(keyword) ||
            housekeeper.phone
              .toLowerCase()
              .includes(keyword) ||
            (housekeeper.email ?? "")
              .toLowerCase()
              .includes(keyword);


          const normalizedStatus =
            housekeeper.status
              .toLowerCase();


          const matchesStatus =
            statusFilter === "All" ||
            normalizedStatus ===
              statusFilter.toLowerCase();


          return (
            matchesSearch &&
            matchesStatus
          );

        }
      );

    }, [
      housekeepers,
      search,
      statusFilter,
    ]);


  // =====================================================
  // STATISTICS
  // =====================================================

  const totalHousekeepers =
    housekeepers.length;


  const activeHousekeepers =
    housekeepers.filter(
      (housekeeper) =>
        housekeeper.status
          .toLowerCase() ===
        "active"
    ).length;


  const inactiveHousekeepers =
    totalHousekeepers -
    activeHousekeepers;


  // =====================================================
  // ADD
  // =====================================================

  function handleAdd() {

    setSelectedHousekeeper(null);

    setIsModalOpen(true);

  }


  // =====================================================
  // EDIT
  // =====================================================

  function handleEdit(
    housekeeper: Housekeeper
  ) {

    setSelectedHousekeeper(
      housekeeper
    );

    setIsModalOpen(true);

  }


  // =====================================================
  // DELETE
  // =====================================================

  async function handleDelete(
    housekeeper: Housekeeper
  ) {

    const confirmed =
      window.confirm(
        `Are you sure you want to delete ${housekeeper.full_name}?`
      );


    if (!confirmed) {
      return;
    }


    try {

      await deleteHousekeeper(
        housekeeper.id
      );


      toast.success(
        "Housekeeper deleted successfully."
      );


      await fetchHousekeepers(true);

    } catch (err) {

      console.error(
        "Failed to delete housekeeper:",
        err
      );


      toast.error(
        "Unable to delete housekeeper."
      );

    }

  }


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (
      <div className="flex h-full min-h-0 items-center justify-center">

        <LoadingSpinner
          text="Loading housekeepers..."
        />

      </div>
    );

  }


  // =====================================================
  // ERROR
  // =====================================================

  if (error) {

    return (
      <div className="flex h-full min-h-0 items-center justify-center p-8">

        <div className="w-full max-w-lg rounded-3xl border border-red-100 bg-white p-10 text-center shadow-sm">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">

            <ShieldCheck
              size={30}
              className="text-red-500"
            />

          </div>


          <h2 className="mt-5 text-xl font-bold text-slate-800">

            Unable to load housekeepers

          </h2>


          <p className="mt-2 text-sm leading-6 text-slate-500">

            {error}

          </p>


          <button
            type="button"
            onClick={() =>
              fetchHousekeepers()
            }
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >

            <RefreshCw size={17} />

            Try Again

          </button>

        </div>

      </div>
    );

  }


  // =====================================================
  // MAIN PAGE
  // =====================================================

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-hidden">


      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <section className="flex shrink-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

        <div className="min-w-0">

          <div className="flex items-center gap-2 text-sm font-medium text-blue-600">

            <UsersRound size={17} />

            Hospital Operations

          </div>


          <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-slate-900">

            Housekeepers

          </h1>


          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">

            Manage housekeeping staff and
            maintain hospital room assignments.

          </p>

        </div>


        {/* ACTIONS */}

        <div className="flex shrink-0 items-center gap-3">

          <button
            type="button"
            onClick={() =>
              fetchHousekeepers(true)
            }
            disabled={refreshing}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >

            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh

          </button>


          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700"
          >

            <Plus size={18} />

            Add Housekeeper

          </button>

        </div>

      </section>


      {/* =================================================
          STATISTICS
      ================================================= */}

      <section className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">

        <StatCard
          title="Total Housekeepers"
          value={totalHousekeepers}
          description="Registered housekeeping staff"
          icon={UsersRound}
        />


        <StatCard
          title="Active"
          value={activeHousekeepers}
          description="Currently active staff"
          icon={UserCheck}
        />


        <StatCard
          title="Inactive"
          value={inactiveHousekeepers}
          description="Inactive staff records"
          icon={UserX}
        />

      </section>


      {/* =================================================
          HOUSEKEEPER EXPLORER
          ONLY TABLE RECORD AREA SCROLLS
      ================================================= */}

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">


        {/* =================================================
            SEARCH + FILTER
        ================================================= */}

        <div className="flex shrink-0 flex-col gap-4 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">

          {/* SEARCH */}

          <div className="relative w-full lg:w-96">

            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />


            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search housekeepers..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />

          </div>


          {/* FILTERS */}

          <div className="flex items-center gap-1">

            {(
              [
                "All",
                "Active",
                "Inactive",
              ] as const
            ).map(
              (status) => (

                <button
                  key={status}
                  type="button"
                  onClick={() =>
                    setStatusFilter(
                      status
                    )
                  }
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    statusFilter === status
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >

                  {status}

                </button>

              )
            )}

          </div>

        </div>


        {/* =================================================
            REGISTRY HEADER
        ================================================= */}

        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">

          <div>

            <h2 className="text-sm font-bold text-slate-900">

              Housekeeper Registry

            </h2>


            <p className="mt-0.5 text-xs text-slate-500">

              {filteredHousekeepers.length}{" "}

              {filteredHousekeepers.length === 1
                ? "record"
                : "records"}

              {" "}found

            </p>

          </div>


          <div className="hidden items-center gap-2 text-xs font-medium text-slate-400 sm:flex">

            <UsersRound size={15} />

            Staff management

          </div>

        </div>


        {/* =================================================
            TABLE VIEWPORT
            ONLY THIS SECTION SCROLLS
        ================================================= */}

        <div className="min-h-0 flex-1 overflow-hidden">

          {filteredHousekeepers.length === 0 ? (

            /* =================================================
               EMPTY STATE
            ================================================= */

            <div className="flex h-full min-h-[250px] flex-col items-center justify-center px-6 text-center">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">

                <UsersRound size={27} />

              </div>


              <h3 className="mt-4 text-sm font-semibold text-slate-800">

                No housekeepers found

              </h3>


              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">

                Try changing your search or
                status filter, or add a new
                housekeeper.

              </p>


              <button
                type="button"
                onClick={handleAdd}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
              >

                <Plus size={15} />

                Add Housekeeper

              </button>

            </div>

          ) : (

            /* =================================================
               SCROLL CONTAINER
            ================================================= */

            <div className="h-full overflow-auto">

              <div className="min-w-[900px]">

                <table className="w-full text-left">

                  {/* =================================================
                      STICKY TABLE HEADER
                  ================================================= */}

                  <thead className="sticky top-0 z-20 bg-slate-50">

                    <tr className="border-b border-slate-100">

                      <TableHeader>
                        Housekeeper
                      </TableHeader>


                      <TableHeader>
                        Employee Code
                      </TableHeader>


                      <TableHeader>
                        Contact
                      </TableHeader>


                      <TableHeader>
                        Status
                      </TableHeader>


                      <TableHeader align="right">
                        Actions
                      </TableHeader>

                    </tr>

                  </thead>


                  {/* =================================================
                      RECORDS
                  ================================================= */}

                  <tbody className="divide-y divide-slate-100">

                    {filteredHousekeepers.map(
                      (housekeeper) => {

                        const isActive =
                          housekeeper.status
                            .toLowerCase() ===
                          "active";


                        return (
                          <tr
                            key={
                              housekeeper.id
                            }
                            className="group transition-colors hover:bg-slate-50/70"
                          >

                            {/* =================================================
                                HOUSEKEEPER
                            ================================================= */}

                            <td className="px-6 py-5">

                              <div className="flex items-center gap-3">

                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-sm">

                                  {getInitials(
                                    housekeeper.full_name
                                  )}

                                </div>


                                <div className="min-w-0">

                                  <p className="truncate text-sm font-semibold text-slate-800">

                                    {housekeeper.full_name}

                                  </p>


                                  {housekeeper.notes && (

                                    <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">

                                      {housekeeper.notes}

                                    </p>

                                  )}

                                </div>

                              </div>

                            </td>


                            {/* =================================================
                                EMPLOYEE CODE
                            ================================================= */}

                            <td className="px-6 py-5">

                              <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">

                                {housekeeper.employee_code}

                              </span>

                            </td>


                            {/* =================================================
                                CONTACT
                            ================================================= */}

                            <td className="px-6 py-5">

                              <div className="space-y-1.5">

                                <div className="flex items-center gap-2 text-xs text-slate-600">

                                  <Phone
                                    size={13}
                                    className="shrink-0 text-slate-400"
                                  />

                                  <span>
                                    {housekeeper.phone}
                                  </span>

                                </div>


                                {housekeeper.email && (

                                  <div className="flex items-center gap-2 text-xs text-slate-500">

                                    <Mail
                                      size={13}
                                      className="shrink-0 text-slate-400"
                                    />


                                    <span className="max-w-[240px] truncate">

                                      {housekeeper.email}

                                    </span>

                                  </div>

                                )}

                              </div>

                            </td>


                            {/* =================================================
                                STATUS
                            ================================================= */}

                            <td className="px-6 py-5">

                              <StatusBadge
                                active={
                                  isActive
                                }
                              />

                            </td>


                            {/* =================================================
                                ACTIONS
                            ================================================= */}

                            <td className="px-6 py-5">

                              <div className="flex justify-end gap-2">

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEdit(
                                      housekeeper
                                    )
                                  }
                                  title="Edit housekeeper"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                                >

                                  <Pencil
                                    size={15}
                                  />

                                </button>


                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDelete(
                                      housekeeper
                                    )
                                  }
                                  title="Delete housekeeper"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                >

                                  <Trash2
                                    size={15}
                                  />

                                </button>

                              </div>

                            </td>

                          </tr>
                        );

                      }
                    )}

                  </tbody>

                </table>

              </div>

            </div>

          )}

        </div>

      </section>


      {/* =================================================
          HOUSEKEEPER MODAL
      ================================================= */}

      <HousekeeperFormModal
        open={isModalOpen}
        housekeeper={
          selectedHousekeeper
        }
        onClose={() => {

          setIsModalOpen(false);

          setSelectedHousekeeper(null);

        }}
        onSuccess={async () => {

          await fetchHousekeepers(
            true
          );

        }}
      />

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
  children: React.ReactNode;
  align?: "left" | "right";
}) {

  return (
    <th
      className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${
        align === "right"
          ? "text-right"
          : "text-left"
      }`}
    >

      {children}

    </th>
  );

}


// =====================================================
// STAT CARD
// =====================================================

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof UsersRound;
}) {

  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">

      <div className="flex items-start justify-between">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

          <Icon size={20} />

        </div>


        <span className="text-2xl font-bold tracking-tight text-slate-900">

          {value}

        </span>

      </div>


      <h3 className="mt-3 text-sm font-semibold text-slate-800">

        {title}

      </h3>


      <p className="mt-0.5 truncate text-xs text-slate-500">

        {description}

      </p>

    </div>
  );

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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >

      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active
            ? "bg-emerald-500"
            : "bg-slate-400"
        }`}
      />

      {active
        ? "Active"
        : "Inactive"}

    </span>
  );

}


// =====================================================
// INITIALS
// =====================================================

function getInitials(
  name: string
) {

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(
      (part) =>
        part
          .charAt(0)
          .toUpperCase()
    )
    .join("");

}