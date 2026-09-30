import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Plus,
  RefreshCw,
  ShieldAlert,
  UserRound,
  UsersRound,
} from "lucide-react";

import { toast } from "react-toastify";

import type { Patient } from "../../types/patient";

import {
  getPatients,
  deletePatient,
} from "../../services/patientApi";

import PatientSearch from "../../components/patient/PatientSearch";
import PatientTable from "../../components/patient/PatientTable";
import PatientFormModal from "../../components/patient/PatientFormModal";
import LoadingSpinner from "../../components/common/LoadingSpinner";

import { useAuth } from "../../context/AuthContext";

// =====================================================
// PATIENTS PAGE
// =====================================================

export default function Patients() {
  const { user } = useAuth();

  // =====================================================
  // ROLE PERMISSIONS
  // =====================================================

  const role = user?.role;

  const isAdministrator =
    role === "Administrator";

  const isReceptionist =
    role === "Receptionist";

  const canCreatePatient =
    isAdministrator ||
    isReceptionist;

  const canEditPatient =
    isAdministrator ||
    isReceptionist;

  const canDeletePatient =
    isAdministrator;

  // =====================================================
  // STATE
  // =====================================================

  const [patients, setPatients] =
    useState<Patient[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [selectedPatient, setSelectedPatient] =
    useState<Patient | null>(null);

  // =====================================================
  // LOAD PATIENTS
  // =====================================================

  const fetchPatients = useCallback(
    async (showRefreshState = false) => {
      try {
        if (showRefreshState) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const data =
          await getPatients();

        setPatients(
          Array.isArray(data)
            ? data
            : [],
        );
      } catch (err) {
        console.error(
          "Patient loading error:",
          err,
        );

        setError(
          "Unable to load patient records.",
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
    void fetchPatients();
  }, [fetchPatients]);

  // =====================================================
  // SEARCH
  // =====================================================

  const filteredPatients = useMemo(() => {
    const keyword =
      search
        .trim()
        .toLowerCase();

    if (!keyword) {
      return patients;
    }

    return patients.filter(
      (patient) => {
        const name =
          patient.name
            ?.toLowerCase() ?? "";

        const patientId = String(patient.id);

        const mobile =
          patient.mobile
            ?.toLowerCase() ?? "";

        const disease =
          patient.disease
            ?.toLowerCase() ?? "";

        const village =
          patient.village
            ?.toLowerCase() ?? "";

        return (
          name.includes(keyword) ||
          patientId.includes(keyword) ||
          mobile.includes(keyword) ||
          disease.includes(keyword) ||
          village.includes(keyword)
        );
      },
    );
  }, [
    patients,
    search,
  ]);

  // =====================================================
  // ADD PATIENT
  // =====================================================

  const handleAddPatient = () => {
    if (!canCreatePatient) {
      toast.info(
        "You do not have permission to register patients.",
      );

      return;
    }

    setSelectedPatient(null);
    setIsModalOpen(true);
  };

  // =====================================================
  // EDIT PATIENT
  // =====================================================

  const handleEditPatient = (
    patient: Patient,
  ) => {
    if (!canEditPatient) {
      toast.info(
        "You do not have permission to edit patient records.",
      );

      return;
    }

    setSelectedPatient(patient);
    setIsModalOpen(true);
  };

  // =====================================================
  // DELETE PATIENT
  // =====================================================

  const handleDeletePatient = async (
    id: number,
  ) => {
    if (!canDeletePatient) {
      toast.info(
        "Only an administrator can delete patient records.",
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this patient?",
      );

    if (!confirmed) {
      return;
    }

    try {
      await deletePatient(id);

      toast.success(
        "Patient deleted successfully.",
      );

      await fetchPatients();
    } catch (err) {
      console.error(
        "Patient deletion error:",
        err,
      );

      toast.error(
        "Failed to delete patient.",
      );
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-slate-50">
        <LoadingSpinner
          text="Loading patient records..."
        />
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-500">
            <ShieldAlert size={23} />
          </div>

          <h2 className="mt-4 text-lg font-bold text-slate-900">
            Unable to load patients
          </h2>

          <p className="mt-1.5 text-sm leading-5 text-slate-500">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              void fetchPatients()
            }
            className="
              mt-5
              inline-flex
              items-center
              gap-2
              rounded-xl
              bg-slate-950
              px-4
              py-2.5
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-slate-800
              focus:outline-none
              focus:ring-4
              focus:ring-slate-200
            "
          >
            <RefreshCw size={15} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50">

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
            flex-col
            gap-3
            px-5
            py-4
            sm:px-6
            lg:flex-row
            lg:items-center
            lg:justify-between
          "
        >

          {/* TITLE */}

          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <UserRound
                size={14}
                className="text-blue-600"
              />

              <span
                className="
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-[0.16em]
                  text-blue-600
                "
              >
                Patient Management
              </span>
            </div>

            <h1
              className="
                text-2xl
                font-bold
                tracking-tight
                text-slate-950
              "
            >
              Patients
            </h1>

            <p
              className="
                mt-0.5
                text-xs
                text-slate-500
              "
            >
              {isReceptionist
                ? "Register and manage patient demographic records."
                : "Manage hospital patient records and registrations."}
            </p>
          </div>

          {/* ACTIONS */}

          <div className="flex shrink-0 items-center gap-2">

            {/* REFRESH */}

            <button
              type="button"
              onClick={() =>
                void fetchPatients(true)
              }
              disabled={refreshing}
              title="Refresh patient records"
              className="
                inline-flex
                h-9
                items-center
                gap-2
                rounded-lg
                border
                border-slate-200
                bg-white
                px-3
                text-xs
                font-semibold
                text-slate-700
                shadow-sm
                transition
                hover:border-slate-300
                hover:bg-slate-50
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              <RefreshCw
                size={14}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              <span className="hidden sm:inline">
                {refreshing
                  ? "Refreshing..."
                  : "Refresh"}
              </span>
            </button>

            {/* ADD PATIENT */}

            {canCreatePatient && (
              <button
                type="button"
                onClick={
                  handleAddPatient
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
                  hover:bg-blue-600
                  focus:outline-none
                  focus:ring-4
                  focus:ring-blue-100
                "
              >
                <Plus size={15} />
                Add Patient
              </button>
            )}
          </div>
        </div>
      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main
        className="
          min-h-0
          flex-1
          overflow-hidden
        "
      >
        <div
          className="
            mx-auto
            flex
            h-full
            min-h-0
            w-full
            max-w-[1600px]
            flex-col
            gap-4
            overflow-hidden
            p-4
            sm:p-5
          "
        >

          {/* =================================================
              PATIENT SUMMARY
          ================================================= */}

          <section
            className="
              flex
              shrink-0
              items-center
              justify-between
              rounded-xl
              border
              border-slate-200
              bg-white
              px-4
              py-3
              shadow-sm
            "
          >
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
                <UsersRound size={17} />
              </div>

              <div>
                <p
                  className="
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-[0.1em]
                    text-slate-400
                  "
                >
                  Patient Registry
                </p>

                <p
                  className="
                    mt-0.5
                    text-sm
                    font-semibold
                    text-slate-800
                  "
                >
                  {patients.length}{" "}
                  {patients.length === 1
                    ? "patient"
                    : "patients"}{" "}
                  registered
                </p>
              </div>
            </div>

            <div
              className="
                text-right
                text-[11px]
                font-medium
                text-slate-400
              "
            >
              {search.trim()
                ? `${filteredPatients.length} matching ${
                    filteredPatients.length === 1
                      ? "record"
                      : "records"
                  }`
                : "All registered records"}
            </div>
          </section>

          {/* =================================================
              PATIENT REGISTRY
          ================================================= */}

          <section
            className="
              flex
              min-h-0
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

            {/* REGISTRY HEADER */}

            <div
              className="
                flex
                shrink-0
                flex-col
                gap-3
                border-b
                border-slate-100
                px-4
                py-3
                sm:px-5
                lg:flex-row
                lg:items-center
                lg:justify-between
              "
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2
                    className="
                      text-sm
                      font-bold
                      text-slate-900
                    "
                  >
                    Patient Records
                  </h2>

                  <span
                    className="
                      rounded-full
                      bg-emerald-50
                      px-2
                      py-0.5
                      text-[9px]
                      font-bold
                      uppercase
                      tracking-wide
                      text-emerald-600
                    "
                  >
                    Live
                  </span>
                </div>

                <p
                  className="
                    mt-0.5
                    text-[11px]
                    text-slate-400
                  "
                >
                  {isReceptionist
                    ? "Search and manage patient registration records."
                    : "Search, edit or remove patient records."}
                </p>
              </div>

              <div className="w-full lg:w-auto">
                <PatientSearch
                  value={search}
                  onChange={setSearch}
                />
              </div>
            </div>

            {/* =================================================
                TABLE CONTAINER
            ================================================= */}

            <div
              className="
                min-h-0
                flex-1
                overflow-hidden
              "
            >
              <PatientTable
                patients={
                  filteredPatients
                }
                onEdit={
                  handleEditPatient
                }
                onDelete={
                  handleDeletePatient
                }
              />
            </div>
          </section>
        </div>
      </main>

      {/* =================================================
          PATIENT FORM MODAL
      ================================================= */}

      {canCreatePatient ||
      canEditPatient ? (
        <PatientFormModal
          open={isModalOpen}
          patient={selectedPatient}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedPatient(
              null,
            );
          }}
          onSuccess={() =>
            void fetchPatients()
          }
        />
      ) : null}
    </div>
  );
}