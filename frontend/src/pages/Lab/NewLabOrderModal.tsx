import {
  AlertCircle,
  Beaker,
  Check,
  ChevronDown,
  ClipboardList,
  FlaskConical,
  Loader2,
  Search,
  TestTube2,
  UserRound,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createLabOrder,
} from "../../services/labApi";

import {
  getMyClinicalEncounters,
} from "../../services/clinicalEncounterApi";

import {
  getPatients,
} from "../../services/patientApi";

import type {
  ClinicalEncounter,
} from "../../services/clinicalEncounterApi";

import type {
  Patient,
} from "../../types/patient";

import type {
  CreateLabOrderPayload,
  LabOrderPriority,
  LabTest,
} from "../../types/lab";

// =====================================================
// TYPES
// =====================================================

interface Props {
  open: boolean;
  labTests: LabTest[];
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

type FormErrors = {
  patient: string;
  encounter: string;
  tests: string;
  indication: string;
  notes: string;
};

const INITIAL_ERRORS: FormErrors = {
  patient: "",
  encounter: "",
  tests: "",
  indication: "",
  notes: "",
};

const PRIORITIES: LabOrderPriority[] = [
  "Routine",
  "Urgent",
  "STAT",
];

// =====================================================
// HELPERS
// =====================================================

function getApiError(
  error: unknown,
  fallback: string,
) {
  const response = (
    error as {
      response?: {
        data?: {
          detail?: string;
        };
      };
    }
  )?.response;

  return (
    response?.data?.detail ||
    fallback
  );
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}


// =====================================================
// MAIN MODAL
// =====================================================

export default function NewLabOrderModal({
  open,
  labTests,
  onClose,
  onSuccess,
}: Props) {
  // ===================================================
  // DATA
  // ===================================================

  const [patients, setPatients] =
    useState<Patient[]>([]);

  const [encounters, setEncounters] =
    useState<ClinicalEncounter[]>([]);

  const [loadingData, setLoadingData] =
    useState(false);

  // ===================================================
  // FORM
  // ===================================================

  const [selectedPatientId, setSelectedPatientId] =
    useState<number | null>(null);

  const [selectedEncounterId, setSelectedEncounterId] =
    useState<number | null>(null);

  const [selectedTestIds, setSelectedTestIds] =
    useState<number[]>([]);

  const [priority, setPriority] =
    useState<LabOrderPriority>("Routine");

  const [clinicalIndication, setClinicalIndication] =
    useState("");

  const [notes, setNotes] =
    useState("");

  // ===================================================
  // SEARCH
  // ===================================================

  const [patientSearch, setPatientSearch] =
    useState("");

  const [testSearch, setTestSearch] =
    useState("");

  const [patientDropdownOpen, setPatientDropdownOpen] =
    useState(false);

  const [testDropdownOpen, setTestDropdownOpen] =
    useState(false);

  // ===================================================
  // UI STATE
  // ===================================================

  const [errors, setErrors] =
    useState<FormErrors>({
      ...INITIAL_ERRORS,
    });

  const [submitting, setSubmitting] =
    useState(false);

  const [submitError, setSubmitError] =
    useState("");

  // ===================================================
  // RESET / LOAD DATA
  // ===================================================

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedPatientId(null);
    setSelectedEncounterId(null);
    setSelectedTestIds([]);
    setPriority("Routine");
    setClinicalIndication("");
    setNotes("");
    setPatientSearch("");
    setTestSearch("");
    setPatientDropdownOpen(false);
    setTestDropdownOpen(false);
    setErrors({
      ...INITIAL_ERRORS,
    });
    setSubmitError("");
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const loadData = async () => {
      try {
        setLoadingData(true);

        const [
          patientResponse,
          encounterResponse,
        ] = await Promise.all([
          getPatients(),
          getMyClinicalEncounters(),
        ]);

        setPatients(
          Array.isArray(patientResponse)
            ? patientResponse
            : [],
        );

        setEncounters(
          Array.isArray(encounterResponse)
            ? encounterResponse
            : [],
        );
      } catch (error) {
        console.error(
          "New lab order data loading error:",
          error,
        );

        setSubmitError(
          getApiError(
            error,
            "Unable to load patients and clinical encounters.",
          ),
        );
      } finally {
        setLoadingData(false);
      }
    };

    void loadData();
  }, [open]);

  // ===================================================
  // SELECTED RECORDS
  // ===================================================

  const selectedPatient = useMemo(
    () =>
      patients.find(
        (patient) =>
          patient.id ===
          selectedPatientId,
      ) ?? null,
    [
      patients,
      selectedPatientId,
    ],
  );

  const selectedEncounter = useMemo(
    () =>
      encounters.find(
        (encounter) =>
          encounter.id ===
          selectedEncounterId,
      ) ?? null,
    [
      encounters,
      selectedEncounterId,
    ],
  );

  // ===================================================
  // PATIENT FILTER
  // ===================================================

  const filteredPatients = useMemo(() => {
    const query =
      patientSearch
        .trim()
        .toLowerCase();

    if (!query) {
      return patients.slice(0, 8);
    }

    return patients
      .filter((patient) => {
        return (
          patient.name
            .toLowerCase()
            .includes(query) ||
          String(patient.id)
            .includes(query) ||
          patient.mobile
            .toLowerCase()
            .includes(query) ||
          patient.disease
            .toLowerCase()
            .includes(query)
        );
      })
      .slice(0, 8);
  }, [
    patients,
    patientSearch,
  ]);

  // ===================================================
  // ENCOUNTERS FOR PATIENT
  // ===================================================

  const patientEncounters = useMemo(() => {
    if (!selectedPatientId) {
      return [];
    }

    return encounters
      .filter(
        (encounter) =>
          encounter.patient_id ===
            selectedPatientId &&
          encounter.status !==
            "Cancelled",
      )
      .sort((a, b) => {
        const first = new Date(
          a.created_at,
        ).getTime();

        const second = new Date(
          b.created_at,
        ).getTime();

        return second - first;
      });
  }, [
    encounters,
    selectedPatientId,
  ]);

  // ===================================================
  // TEST FILTER
  // ===================================================

  const filteredTests = useMemo(() => {
    const query =
      testSearch
        .trim()
        .toLowerCase();

    const availableTests =
      labTests.filter(
        (test) =>
          !selectedTestIds.includes(
            test.id,
          ),
      );

    if (!query) {
      return availableTests.slice(
        0,
        10,
      );
    }

    return availableTests
      .filter((test) => {
        return (
          test.name
            .toLowerCase()
            .includes(query) ||
          test.code
            .toLowerCase()
            .includes(query) ||
          test.category
            .toLowerCase()
            .includes(query) ||
          test.specimen_type
            .toLowerCase()
            .includes(query)
        );
      })
      .slice(0, 10);
  }, [
    labTests,
    selectedTestIds,
    testSearch,
  ]);

  // ===================================================
  // SELECTED TESTS
  // ===================================================

  const selectedTests = useMemo(
    () =>
      selectedTestIds
        .map(
          (id) =>
            labTests.find(
              (test) =>
                test.id === id,
            ) ?? null,
        )
        .filter(
          (
            test,
          ): test is LabTest =>
            test !== null,
        ),
    [
      labTests,
      selectedTestIds,
    ],
  );

  // ===================================================
  // PATIENT SELECTION
  // ===================================================

  const handlePatientSelect = (
    patient: Patient,
  ) => {
    setSelectedPatientId(
      patient.id,
    );

    setSelectedEncounterId(
      null,
    );

    setPatientSearch(
      patient.name,
    );

    setPatientDropdownOpen(
      false,
    );

    setErrors((previous) => ({
      ...previous,
      patient: "",
      encounter: "",
    }));
  };

  // ===================================================
  // ENCOUNTER SELECTION
  // ===================================================

  const handleEncounterSelect = (
    encounterId: number,
  ) => {
    setSelectedEncounterId(
      encounterId,
    );

    setErrors((previous) => ({
      ...previous,
      encounter: "",
    }));
  };

  // ===================================================
  // TEST SELECTION
  // ===================================================

  const handleTestSelect = (
    testId: number,
  ) => {
    setSelectedTestIds(
      (previous) => [
        ...previous,
        testId,
      ],
    );

    setTestSearch("");

    setErrors((previous) => ({
      ...previous,
      tests: "",
    }));
  };

  // ===================================================
  // REMOVE TEST
  // ===================================================

  const handleRemoveTest = (
    testId: number,
  ) => {
    setSelectedTestIds(
      (previous) =>
        previous.filter(
          (id) =>
            id !== testId,
        ),
    );
  };

  // ===================================================
  // VALIDATION
  // ===================================================

  const validate = () => {
    const nextErrors: FormErrors = {
      ...INITIAL_ERRORS,
    };

    let valid = true;

    if (!selectedPatientId) {
      nextErrors.patient =
        "Please select a patient.";

      valid = false;
    }

    if (!selectedEncounterId) {
      nextErrors.encounter =
        "Please select a clinical encounter.";

      valid = false;
    }

    if (
      selectedTestIds.length === 0
    ) {
      nextErrors.tests =
        "Select at least one laboratory test.";

      valid = false;
    }

    if (
      clinicalIndication.length >
      2000
    ) {
      nextErrors.indication =
        "Clinical indication cannot exceed 2000 characters.";

      valid = false;
    }

    if (
      notes.length > 2000
    ) {
      nextErrors.notes =
        "Notes cannot exceed 2000 characters.";

      valid = false;
    }

    setErrors(
      nextErrors,
    );

    return valid;
  };

  // ===================================================
  // CREATE ORDER
  // ===================================================

  const handleSubmit = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    setSubmitError("");

    if (!validate()) {
      return;
    }

    if (
      !selectedPatientId ||
      !selectedEncounterId
    ) {
      return;
    }

    try {
      setSubmitting(true);

      const payload: CreateLabOrderPayload =
        {
          patient_id:
            selectedPatientId,

          encounter_id:
            selectedEncounterId,

          priority,

          clinical_indication:
            clinicalIndication.trim() ||
            null,

          notes:
            notes.trim() ||
            null,

          items:
            selectedTestIds.map(
              (testId) => ({
                lab_test_id:
                  testId,
              }),
            ),
        };

      await createLabOrder(
        payload,
      );

      await onSuccess();

      onClose();
    } catch (error) {
      console.error(
        "Create laboratory order error:",
        error,
      );

      setSubmitError(
        getApiError(
          error,
          "Unable to create laboratory order. Please try again.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ===================================================
  // CLOSED
  // ===================================================

  if (!open) {
    return null;
  }

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div
        className="
          flex
          max-h-[94vh]
          w-full
          max-w-[920px]
          flex-col
          overflow-hidden
          rounded-3xl
          border
          border-white/60
          bg-white
          shadow-2xl
        "
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-6 py-5 lg:px-7">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <FlaskConical
                size={21}
                strokeWidth={2}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  New Lab Order
                </h2>

                <span className="rounded-md bg-blue-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-blue-600">
                  Clinical
                </span>
              </div>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Create a laboratory investigation
                order for a clinical encounter.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-xl
              text-slate-400
              transition
              hover:bg-slate-100
              hover:text-slate-700
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            <X size={18} />
          </button>
        </div>

        {/* =================================================
            BODY
        ================================================= */}

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          <div className="space-y-6 px-6 py-6 lg:px-7">
            {/* =============================================
                ERROR
            ============================================= */}

            {submitError && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5">
                <AlertCircle
                  size={17}
                  className="mt-0.5 shrink-0 text-red-500"
                />

                <div className="min-w-0">
                  <p className="text-xs font-bold text-red-800">
                    Unable to create lab order
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-red-600">
                    {submitError}
                  </p>
                </div>
              </div>
            )}

            {/* =============================================
                PATIENT + ENCOUNTER
            ============================================= */}

            <section>
              <SectionHeading
                number="01"
                title="Clinical Context"
                description="Select the patient and encounter associated with this order."
              />

              <div className="mt-4 grid gap-5 lg:grid-cols-2">
                {/* PATIENT */}

                <div className="relative">
                  <FieldLabel
                    label="Patient"
                    required
                  />

                  <div className="relative">
                    <UserRound
                      size={16}
                      className="
                        pointer-events-none
                        absolute
                        left-3.5
                        top-1/2
                        z-10
                        -translate-y-1/2
                        text-slate-400
                      "
                    />

                    <input
                      value={patientSearch}
                      onChange={(event) => {
                        setPatientSearch(
                          event.target.value,
                        );

                        setPatientDropdownOpen(
                          true,
                        );

                        if (
                          selectedPatientId
                        ) {
                          setSelectedPatientId(
                            null,
                          );

                          setSelectedEncounterId(
                            null,
                          );
                        }
                      }}
                      onFocus={() =>
                        setPatientDropdownOpen(
                          true,
                        )
                      }
                      placeholder={
                        loadingData
                          ? "Loading patients..."
                          : "Search patient by name, ID or mobile"
                      }
                      disabled={loadingData}
                      className={`
                        h-11
                        w-full
                        rounded-xl
                        border
                        bg-slate-50
                        pl-10
                        pr-10
                        text-xs
                        text-slate-800
                        outline-none
                        transition
                        placeholder:text-slate-400
                        focus:bg-white
                        focus:ring-4
                        ${
                          errors.patient
                            ? "border-red-300 focus:border-red-400 focus:ring-red-500/10"
                            : "border-slate-200 focus:border-blue-400 focus:ring-blue-500/10"
                        }
                      `}
                    />

                    <ChevronDown
                      size={15}
                      className="
                        pointer-events-none
                        absolute
                        right-3.5
                        top-1/2
                        -translate-y-1/2
                        text-slate-400
                      "
                    />
                  </div>

                  {patientDropdownOpen &&
                    !loadingData && (
                      <div className="absolute left-0 right-0 top-[76px] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                        <div className="max-h-64 overflow-y-auto">
                          {filteredPatients.length >
                          0 ? (
                            filteredPatients.map(
                              (
                                patient,
                              ) => (
                                <button
                                  key={
                                    patient.id
                                  }
                                  type="button"
                                  onClick={() =>
                                    handlePatientSelect(
                                      patient,
                                    )
                                  }
                                  className="
                                    flex
                                    w-full
                                    items-center
                                    gap-3
                                    border-b
                                    border-slate-100
                                    px-4
                                    py-3
                                    text-left
                                    transition
                                    last:border-b-0
                                    hover:bg-blue-50/60
                                  "
                                >
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
                                    {patient.name
                                      .trim()
                                      .charAt(
                                        0,
                                      )
                                      .toUpperCase()}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-bold text-slate-800">
                                      {
                                        patient.name
                                      }
                                    </p>

                                    <p className="mt-0.5 text-[10px] text-slate-400">
                                      #{patient.id}{" "}
                                      •{" "}
                                      {
                                        patient.gender
                                      }{" "}
                                      •{" "}
                                      {
                                        patient.age
                                      }{" "}
                                      yrs
                                    </p>
                                  </div>

                                  {selectedPatientId ===
                                    patient.id && (
                                    <Check
                                      size={
                                        16
                                      }
                                      className="text-blue-600"
                                    />
                                  )}
                                </button>
                              ),
                            )
                          ) : (
                            <div className="px-4 py-8 text-center">
                              <Search
                                size={20}
                                className="mx-auto text-slate-300"
                              />

                              <p className="mt-2 text-xs font-semibold text-slate-600">
                                No patients found
                              </p>

                              <p className="mt-1 text-[10px] text-slate-400">
                                Try another search.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  {errors.patient && (
                    <FieldError
                      message={
                        errors.patient
                      }
                    />
                  )}

                  {selectedPatient && (
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
                      <span>
                        {selectedPatient.mobile}
                      </span>

                      <span>•</span>

                      <span>
                        {selectedPatient.disease ||
                          "No condition recorded"}
                      </span>
                    </div>
                  )}
                </div>

                {/* ENCOUNTER */}

                <div>
                  <FieldLabel
                    label="Clinical Encounter"
                    required
                  />

                  <div className="relative">
                    <ClipboardList
                      size={16}
                      className="
                        pointer-events-none
                        absolute
                        left-3.5
                        top-1/2
                        z-10
                        -translate-y-1/2
                        text-slate-400
                      "
                    />

                    <select
                      value={
                        selectedEncounterId ??
                        ""
                      }
                      onChange={(event) => {
                        const value =
                          Number(
                            event.target.value,
                          );

                        handleEncounterSelect(
                          value,
                        );
                      }}
                      disabled={
                        !selectedPatientId ||
                        patientEncounters.length ===
                          0
                      }
                      className={`
                        h-11
                        w-full
                        appearance-none
                        rounded-xl
                        border
                        bg-slate-50
                        pl-10
                        pr-10
                        text-xs
                        text-slate-800
                        outline-none
                        transition
                        focus:bg-white
                        focus:ring-4
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                        ${
                          errors.encounter
                            ? "border-red-300 focus:border-red-400 focus:ring-red-500/10"
                            : "border-slate-200 focus:border-blue-400 focus:ring-blue-500/10"
                        }
                      `}
                    >
                      <option value="">
                        {!selectedPatientId
                          ? "Select patient first"
                          : patientEncounters.length ===
                              0
                            ? "No active encounters"
                            : "Select clinical encounter"}
                      </option>

                      {patientEncounters.map(
                        (
                          encounter,
                        ) => (
                          <option
                            key={
                              encounter.id
                            }
                            value={
                              encounter.id
                            }
                          >
                            Encounter #
                            {
                              encounter.id
                            }{" "}
                            —{" "}
                            {
                              encounter.status
                            }{" "}
                            —{" "}
                            {formatDate(
                              encounter.created_at,
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
                        right-3.5
                        top-1/2
                        -translate-y-1/2
                        text-slate-400
                      "
                    />
                  </div>

                  {errors.encounter && (
                    <FieldError
                      message={
                        errors.encounter
                      }
                    />
                  )}

                  {selectedEncounter && (
                    <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2.5">
                      <p className="text-[10px] font-semibold text-slate-500">
                        Encounter #
                        {
                          selectedEncounter.id
                        }
                      </p>

                      <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-400">
                        {selectedEncounter.chief_complaint ||
                          selectedEncounter.diagnosis ||
                          "Clinical encounter"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* =============================================
                TESTS
            ============================================= */}

            <section>
              <SectionHeading
                number="02"
                title="Laboratory Investigations"
                description="Select one or more tests for this order."
              />

              <div className="mt-4">
                <div className="relative">
                  <Search
                    size={16}
                    className="
                      pointer-events-none
                      absolute
                      left-3.5
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                    "
                  />

                  <input
                    value={testSearch}
                    onChange={(event) => {
                      setTestSearch(
                        event.target.value,
                      );

                      setTestDropdownOpen(
                        true,
                      );
                    }}
                    onFocus={() =>
                      setTestDropdownOpen(
                        true,
                      )
                    }
                    placeholder="Search test by name, code, category or specimen..."
                    className={`
                      h-11
                      w-full
                      rounded-xl
                      border
                      bg-slate-50
                      pl-10
                      pr-4
                      text-xs
                      text-slate-800
                      outline-none
                      transition
                      placeholder:text-slate-400
                      focus:bg-white
                      focus:ring-4
                      ${
                        errors.tests
                          ? "border-red-300 focus:border-red-400 focus:ring-red-500/10"
                          : "border-slate-200 focus:border-blue-400 focus:ring-blue-500/10"
                      }
                    `}
                  />
                </div>

                {testDropdownOpen && (
                  <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                    <div className="max-h-60 overflow-y-auto">
                      {filteredTests.length >
                      0 ? (
                        filteredTests.map(
                          (test) => (
                            <button
                              key={
                                test.id
                              }
                              type="button"
                              onClick={() =>
                                handleTestSelect(
                                  test.id,
                                )
                              }
                              className="
                                flex
                                w-full
                                items-center
                                gap-3
                                border-b
                                border-slate-100
                                px-4
                                py-3
                                text-left
                                transition
                                last:border-b-0
                                hover:bg-blue-50/60
                              "
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                                <TestTube2
                                  size={
                                    16
                                  }
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-xs font-bold text-slate-800">
                                    {
                                      test.name
                                    }
                                  </p>

                                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-500">
                                    {
                                      test.code
                                    }
                                  </span>
                                </div>

                                <p className="mt-1 text-[10px] text-slate-400">
                                  {
                                    test.category
                                  }{" "}
                                  •{" "}
                                  {
                                    test.specimen_type
                                  }{" "}
                                  •{" "}
                                  {
                                    test.result_type
                                  }
                                </p>
                              </div>

                              <span className="text-[10px] font-semibold text-blue-600">
                                Add
                              </span>
                            </button>
                          ),
                        )
                      ) : (
                        <div className="px-4 py-7 text-center">
                          <Beaker
                            size={20}
                            className="mx-auto text-slate-300"
                          />

                          <p className="mt-2 text-xs font-semibold text-slate-600">
                            No available tests
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedTests.length >
                  0 && (
                  <div className="mt-3 space-y-2">
                    {selectedTests.map(
                      (test) => (
                        <div
                          key={
                            test.id
                          }
                          className="
                            flex
                            items-center
                            gap-3
                            rounded-xl
                            border
                            border-slate-200
                            bg-white
                            px-3
                            py-3
                          "
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <TestTube2
                              size={
                                14
                              }
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-xs font-bold text-slate-800">
                                {
                                  test.name
                                }
                              </p>

                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold text-slate-500">
                                {
                                  test.code
                                }
                              </span>
                            </div>

                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {
                                test.specimen_type
                              }{" "}
                              •{" "}
                              {
                                test.result_type
                              }
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveTest(
                                test.id,
                              )
                            }
                            className="
                              flex
                              h-8
                              w-8
                              shrink-0
                              items-center
                              justify-center
                              rounded-lg
                              text-slate-400
                              transition
                              hover:bg-red-50
                              hover:text-red-500
                            "
                          >
                            <X
                              size={
                                15
                              }
                            />
                          </button>
                        </div>
                      ),
                    )}
                  </div>
                )}

                {errors.tests && (
                  <FieldError
                    message={
                      errors.tests
                    }
                  />
                )}
              </div>
            </section>

            {/* =============================================
                PRIORITY
            ============================================= */}

            <section>
              <SectionHeading
                number="03"
                title="Order Priority"
                description="Choose the urgency level for this investigation."
              />

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {PRIORITIES.map(
                  (option) => {
                    const active =
                      priority ===
                      option;

                    const styles =
                      option ===
                      "STAT"
                        ? {
                            active:
                              "border-red-300 bg-red-50 ring-4 ring-red-500/10",
                            icon:
                              "bg-red-100 text-red-600",
                            title:
                              "text-red-800",
                          }
                        : option ===
                            "Urgent"
                          ? {
                              active:
                                "border-amber-300 bg-amber-50 ring-4 ring-amber-500/10",
                              icon:
                                "bg-amber-100 text-amber-600",
                              title:
                                "text-amber-800",
                            }
                          : {
                              active:
                                "border-blue-300 bg-blue-50 ring-4 ring-blue-500/10",
                              icon:
                                "bg-blue-100 text-blue-600",
                              title:
                                "text-blue-800",
                            };

                    return (
                      <button
                        key={
                          option
                        }
                        type="button"
                        onClick={() =>
                          setPriority(
                            option,
                          )
                        }
                        className={`
                          rounded-2xl
                          border
                          p-4
                          text-left
                          transition
                          ${
                            active
                              ? styles.active
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                              active
                                ? styles.icon
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {option ===
                            "STAT" ? (
                              <AlertCircle
                                size={
                                  16
                                }
                              />
                            ) : option ===
                              "Urgent" ? (
                              <ClipboardList
                                size={
                                  16
                                }
                              />
                            ) : (
                              <Check
                                size={
                                  16
                                }
                              />
                            )}
                          </div>

                          <div>
                            <p
                              className={`text-xs font-bold ${
                                active
                                  ? styles.title
                                  : "text-slate-800"
                              }`}
                            >
                              {
                                option
                              }
                            </p>

                            <p className="mt-0.5 text-[9px] text-slate-400">
                              {option ===
                              "STAT"
                                ? "Immediate attention"
                                : option ===
                                    "Urgent"
                                  ? "Priority processing"
                                  : "Standard workflow"}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            </section>

            {/* =============================================
                CLINICAL DETAILS
            ============================================= */}

            <section>
              <SectionHeading
                number="04"
                title="Clinical Details"
                description="Provide context to help the laboratory interpret the order."
              />

              <div className="mt-4 grid gap-5">
                <div>
                  <FieldLabel
                    label="Clinical Indication"
                  />

                  <textarea
                    value={
                      clinicalIndication
                    }
                    onChange={(event) =>
                      setClinicalIndication(
                        event.target.value,
                      )
                    }
                    maxLength={2000}
                    rows={3}
                    placeholder="Why is this investigation being ordered?"
                    className={`
                      w-full
                      resize-none
                      rounded-xl
                      border
                      bg-slate-50
                      px-4
                      py-3
                      text-xs
                      leading-5
                      text-slate-800
                      outline-none
                      transition
                      placeholder:text-slate-400
                      focus:bg-white
                      focus:ring-4
                      ${
                        errors.indication
                          ? "border-red-300 focus:border-red-400 focus:ring-red-500/10"
                          : "border-slate-200 focus:border-blue-400 focus:ring-blue-500/10"
                      }
                    `}
                  />

                  <div className="mt-1 flex justify-between">
                    {errors.indication ? (
                      <FieldError
                        message={
                          errors.indication
                        }
                      />
                    ) : (
                      <span />
                    )}

                    <span className="text-[9px] text-slate-400">
                      {
                        clinicalIndication.length
                      }
                      /2000
                    </span>
                  </div>
                </div>

                <div>
                  <FieldLabel
                    label="Additional Notes"
                  />

                  <textarea
                    value={notes}
                    onChange={(event) =>
                      setNotes(
                        event.target.value,
                      )
                    }
                    maxLength={2000}
                    rows={3}
                    placeholder="Additional instructions or laboratory notes..."
                    className={`
                      w-full
                      resize-none
                      rounded-xl
                      border
                      bg-slate-50
                      px-4
                      py-3
                      text-xs
                      leading-5
                      text-slate-800
                      outline-none
                      transition
                      placeholder:text-slate-400
                      focus:bg-white
                      focus:ring-4
                      ${
                        errors.notes
                          ? "border-red-300 focus:border-red-400 focus:ring-red-500/10"
                          : "border-slate-200 focus:border-blue-400 focus:ring-blue-500/10"
                      }
                    `}
                  />

                  <div className="mt-1 flex justify-between">
                    {errors.notes ? (
                      <FieldError
                        message={
                          errors.notes
                        }
                      />
                    ) : (
                      <span />
                    )}

                    <span className="text-[9px] text-slate-400">
                      {notes.length}/2000
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* =============================================
                ORDER SUMMARY
            ============================================= */}

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Order Summary
                  </p>

                  <p className="mt-1 text-[10px] text-slate-400">
                    Review before creating the laboratory order.
                  </p>
                </div>

                <span className="rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600 shadow-sm">
                  {selectedTests.length}{" "}
                  {selectedTests.length ===
                  1
                    ? "Test"
                    : "Tests"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <SummaryItem
                  label="Patient"
                  value={
                    selectedPatient?.name ||
                    "Not selected"
                  }
                />

                <SummaryItem
                  label="Encounter"
                  value={
                    selectedEncounter
                      ? `#${selectedEncounter.id}`
                      : "Not selected"
                  }
                />

                <SummaryItem
                  label="Priority"
                  value={
                    priority
                  }
                />
              </div>
            </section>
          </div>

          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="sticky bottom-0 flex shrink-0 items-center justify-between gap-4 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur-md lg:px-7">
            <div className="hidden text-[10px] text-slate-400 sm:block">
              The authenticated doctor will be recorded automatically.
            </div>

            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="
                  h-10
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-4
                  text-xs
                  font-semibold
                  text-slate-600
                  transition
                  hover:bg-slate-50
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  submitting ||
                  loadingData
                }
                className="
                  inline-flex
                  h-10
                  items-center
                  gap-2
                  rounded-xl
                  bg-slate-900
                  px-5
                  text-xs
                  font-semibold
                  text-white
                  shadow-lg
                  shadow-slate-900/10
                  transition
                  hover:bg-slate-800
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {submitting ? (
                  <>
                    <Loader2
                      size={15}
                      className="animate-spin"
                    />

                    Creating...
                  </>
                ) : (
                  <>
                    <Beaker
                      size={15}
                    />

                    Create Lab Order
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// =====================================================
// SECTION HEADING
// =====================================================

function SectionHeading({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[9px] font-bold text-white">
        {number}
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-900">
          {title}
        </h3>

        <p className="mt-0.5 text-[10px] leading-4 text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

// =====================================================
// FIELD LABEL
// =====================================================

function FieldLabel({
  label,
  required = false,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <label className="mb-2 block text-[11px] font-bold text-slate-700">
      {label}

      {required && (
        <span className="ml-1 text-red-500">
          *
        </span>
      )}
    </label>
  );
}

// =====================================================
// FIELD ERROR
// =====================================================

function FieldError({
  message,
}: {
  message: string;
}) {
  return (
    <p className="mt-1.5 text-[10px] font-medium text-red-500">
      {message}
    </p>
  );
}

// =====================================================
// SUMMARY ITEM
// =====================================================

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-[11px] font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}