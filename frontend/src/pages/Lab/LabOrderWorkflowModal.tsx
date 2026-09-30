import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FlaskConical,
  Loader2,
  PackageCheck,
  Plus,
  RotateCcw,
  Save,
  TestTube2,
  X,
  XCircle,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  collectLabSample,
  createLabSample,
  getLabOrderItems,
  getLabResultForOrderItem,
  getLabSamplesForOrder,
  processLabSample,
  receiveLabSample,
  rejectLabSample,
} from "../../services/labApi";

import type {
  LabOrder,
  LabOrderItem,
  LabSample,
  LabSampleStatus,
  LabTest,
} from "../../types/lab";

import LabResultEntryModal from "./LabResultEntryModal";
import LabResultValidationModal from "./LabResultValidationModal";
import LabResultDoctorReviewModal from "./LabResultDoctorReviewModal";
import LabResultFinalizeModal from "./LabResultFinalizeModal";

/* -------------------------------------------------------------------------- */
/* Props                                                                      */
/* -------------------------------------------------------------------------- */

interface LabOrderWorkflowModalProps {
  open: boolean;
  order: LabOrder | null;
  labTests: LabTest[];

  userRole?: string;

  onClose: () => void;
  onUpdated?: () => Promise<void> | void;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const getErrorMessage = (
  error: unknown,
): string => {
  const axiosError = error as {
    response?: {
      data?: {
        detail?: string;
      };
    };
    message?: string;
  };

  return (
    axiosError?.response?.data?.detail ||
    axiosError?.message ||
    "Something went wrong. Please try again."
  );
};

const formatSampleStatus = (
  status: LabSampleStatus,
) => {
  switch (status) {
    case "Pending":
      return "Pending";

    case "Collected":
      return "Collected";

    case "Received":
      return "Received";

    case "Processed":
      return "Processed";

    case "Rejected":
      return "Rejected";

    default:
      return status;
  }
};

const getSampleStatusStyle = (
  status: LabSampleStatus,
) => {
  switch (status) {
    case "Pending":
      return {
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-700",
        dot: "bg-amber-500",
      };

    case "Collected":
      return {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-700",
        dot: "bg-blue-500",
      };

    case "Received":
      return {
        bg: "bg-violet-50",
        border: "border-violet-200",
        text: "text-violet-700",
        dot: "bg-violet-500",
      };

    case "Processed":
      return {
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        text: "text-emerald-700",
        dot: "bg-emerald-500",
      };

    case "Rejected":
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

const formatDateTime = (
  value?: string | null,
) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/* -------------------------------------------------------------------------- */
/* Status Badge                                                               */
/* -------------------------------------------------------------------------- */

function SampleStatusBadge({
  status,
}: {
  status: LabSampleStatus;
}) {
  const style = getSampleStatusStyle(status);

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border",
        "px-2.5 py-1 text-[10px] font-semibold",
        "whitespace-nowrap",
        style.bg,
        style.border,
        style.text,
      ].join(" ")}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
      />

      {formatSampleStatus(status)}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Workflow Step                                                              */
/* -------------------------------------------------------------------------- */

function WorkflowStep({
  label,
  active,
  completed,
}: {
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center">
      <div className="flex min-w-0 items-center gap-2">
        <div
          className={[
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
            "border text-[10px] font-bold transition",
            completed
              ? "border-emerald-500 bg-emerald-500 text-white"
              : active
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-200 bg-white text-slate-400",
          ].join(" ")}
        >
          {completed ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <span>•</span>
          )}
        </div>

        <span
          className={[
            "truncate text-[10px] font-semibold",
            active || completed
              ? "text-slate-700"
              : "text-slate-400",
          ].join(" ")}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Result Status Helpers                                                      */
/* -------------------------------------------------------------------------- */

const formatItemStatus = (
  status?: string | null,
) => {
  if (!status) {
    return "Pending";
  }

  return status.replaceAll(
    "_",
    " ",
  );
};

const getItemStatusStyle = (
  status?: string | null,
) => {
  switch (status) {
    case "RESULT_ENTERED":
      return {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-700",
      };

    case "TECHNICALLY_VALIDATED":
      return {
        bg: "bg-violet-50",
        border: "border-violet-200",
        text: "text-violet-700",
      };

    case "DOCTOR_REVIEW":
      return {
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-700",
      };

    case "FINALIZED":
      return {
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        text: "text-emerald-700",
      };

    case "CANCELLED":
    case "REJECTED":
      return {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-700",
      };

    default:
      return {
        bg: "bg-slate-50",
        border: "border-slate-200",
        text: "text-slate-600",
      };
  }
};

/* -------------------------------------------------------------------------- */
/* Main Component                                                             */
/* -------------------------------------------------------------------------- */

export default function LabOrderWorkflowModal({
  open,
  order,
  labTests,
  userRole,
  onClose,
  onUpdated,
}: LabOrderWorkflowModalProps) {
  const [samples, setSamples] =
    useState<LabSample[]>([]);

  const [orderItems, setOrderItems] =
    useState<LabOrderItem[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [itemsLoading, setItemsLoading] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState<number | null>(null);

  const [error, setError] =
    useState("");

  const [showCreateSample, setShowCreateSample] =
    useState(false);

  const [specimenType, setSpecimenType] =
    useState("");

  const [sampleNotes, setSampleNotes] =
    useState("");

  const [creatingSample, setCreatingSample] =
    useState(false);

  const [rejectingSampleId, setRejectingSampleId] =
    useState<number | null>(null);

  const [rejectionReason, setRejectionReason] =
    useState("");

  const [rejectionNotes, setRejectionNotes] =
    useState("");

  /* ------------------------------------------------------------------------ */
  /* Result Entry State                                                       */
  /* ------------------------------------------------------------------------ */

  const [resultItem, setResultItem] =
    useState<LabOrderItem | null>(null);

  const [resultTest, setResultTest] =
    useState<LabTest | null>(null);

  /* ------------------------------------------------------------------------ */
  /* Technical Validation State                                              */
  /* ------------------------------------------------------------------------ */

  const [validationItem, setValidationItem] =
    useState<LabOrderItem | null>(null);

  const [validationTest, setValidationTest] =
    useState<LabTest | null>(null);

  /* ------------------------------------------------------------------------ */
  /* Doctor Review State                                                      */
  /* ------------------------------------------------------------------------ */

  const [reviewItem, setReviewItem] =
    useState<LabOrderItem | null>(null);

  const [reviewTest, setReviewTest] =
    useState<LabTest | null>(null);

  /* ------------------------------------------------------------------------ */
  /* Finalization State                                                       */
  /* ------------------------------------------------------------------------ */

  const [finalizeItem, setFinalizeItem] =
    useState<LabOrderItem | null>(null);

  const [finalizeTest, setFinalizeTest] =
    useState<LabTest | null>(null);

  /* ------------------------------------------------------------------------ */
  /* Permissions                                                              */
  /* ------------------------------------------------------------------------ */

  const canCollect =
    userRole === "Doctor" ||
    userRole === "Nurse" ||
    userRole === "Administrator";

  const canOperate =
    userRole === "Doctor" ||
    userRole === "Administrator";

  const canReview =
    userRole === "Doctor";

  const orderClosed =
    order?.status === "FINALIZED" ||
    order?.status === "CANCELLED" ||
    order?.status === "REJECTED";

  /* ------------------------------------------------------------------------ */
  /* Specimen Options                                                         */
  /* ------------------------------------------------------------------------ */

  const specimenOptions = useMemo(() => {
    if (!order) return [];

    const specimenTypes = order.items
      .map((item) => {
        const test = labTests.find(
          (labTest) =>
            labTest.id === item.lab_test_id,
        );

        return test?.specimen_type;
      })
      .filter(
        (
          specimen,
        ): specimen is string =>
          Boolean(specimen),
      );

    return Array.from(
      new Set(specimenTypes),
    );
  }, [order, labTests]);

  /* ------------------------------------------------------------------------ */
  /* Processed Sample Detection                                               */
  /* ------------------------------------------------------------------------ */

  const hasProcessedSample =
    samples.some(
      (sample) =>
        sample.status ===
        "Processed",
    );

  /* ------------------------------------------------------------------------ */
  /* Load Samples                                                             */
  /* ------------------------------------------------------------------------ */

  const loadSamples = async () => {
    if (!order) return;

    try {
      setLoading(true);
      setError("");

      const response =
        await getLabSamplesForOrder(
          order.id,
        );

      setSamples(
        Array.isArray(response)
          ? response
          : [],
      );
    } catch (err) {
      console.error(
        "Failed to load lab samples:",
        err,
      );

      setError(
        getErrorMessage(err),
      );
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Load Order Items                                                         */
  /* ------------------------------------------------------------------------ */

  const loadOrderItems = async () => {
    if (!order) return;

    try {
      setItemsLoading(true);

      const response =
        await getLabOrderItems(
          order.id,
        );

      setOrderItems(
        Array.isArray(response)
          ? response
          : [],
      );
    } catch (err) {
      console.error(
        "Failed to load laboratory order items:",
        err,
      );

      setError(
        getErrorMessage(err),
      );
    } finally {
      setItemsLoading(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Load Workflow Data                                                       */
  /* ------------------------------------------------------------------------ */

  const loadWorkflowData =
    async () => {
      if (!order) return;

      setError("");

      await Promise.all([
        loadSamples(),
        loadOrderItems(),
      ]);
    };

  /* ------------------------------------------------------------------------ */
  /* Reset On Open                                                             */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!open || !order) {
      return;
    }

    setError("");
    setShowCreateSample(false);
    setSpecimenType("");
    setSampleNotes("");
    setRejectingSampleId(null);
    setRejectionReason("");
    setRejectionNotes("");

    setResultItem(null);
    setResultTest(null);
    setValidationItem(null);
    setValidationTest(null);
    setReviewItem(null);
    setReviewTest(null);
    setFinalizeItem(null);
    setFinalizeTest(null);

    void loadWorkflowData();
  }, [open, order?.id]);

  /* ------------------------------------------------------------------------ */
  /* Create Sample                                                            */
  /* ------------------------------------------------------------------------ */

  const handleCreateSample = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!order) return;

    const cleanedSpecimen =
      specimenType.trim();

    if (!cleanedSpecimen) {
      setError(
        "Specimen type is required.",
      );
      return;
    }

    try {
      setCreatingSample(true);
      setError("");

      await createLabSample(
        order.id,
        {
          specimen_type:
            cleanedSpecimen,
          notes:
            sampleNotes.trim() ||
            null,
        },
      );

      setSpecimenType("");
      setSampleNotes("");
      setShowCreateSample(false);

      await loadWorkflowData();

      await onUpdated?.();
    } catch (err) {
      console.error(
        "Failed to create lab sample:",
        err,
      );

      setError(
        getErrorMessage(err),
      );
    } finally {
      setCreatingSample(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Collect Sample                                                           */
  /* ------------------------------------------------------------------------ */

  const handleCollect = async (
    sample: LabSample,
  ) => {
    try {
      setActionLoading(sample.id);
      setError("");

      await collectLabSample(
        sample.id,
        {},
      );

      await loadWorkflowData();

      await onUpdated?.();
    } catch (err) {
      console.error(
        "Failed to collect lab sample:",
        err,
      );

      setError(
        getErrorMessage(err),
      );
    } finally {
      setActionLoading(null);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Receive Sample                                                           */
  /* ------------------------------------------------------------------------ */

  const handleReceive = async (
    sample: LabSample,
  ) => {
    try {
      setActionLoading(sample.id);
      setError("");

      await receiveLabSample(
        sample.id,
        {},
      );

      await loadWorkflowData();

      await onUpdated?.();
    } catch (err) {
      console.error(
        "Failed to receive lab sample:",
        err,
      );

      setError(
        getErrorMessage(err),
      );
    } finally {
      setActionLoading(null);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Process Sample                                                           */
  /* ------------------------------------------------------------------------ */

  const handleProcess = async (
    sample: LabSample,
  ) => {
    try {
      setActionLoading(sample.id);
      setError("");

      await processLabSample(
        sample.id,
      );

      await loadWorkflowData();

      await onUpdated?.();
    } catch (err) {
      console.error(
        "Failed to process lab sample:",
        err,
      );

      setError(
        getErrorMessage(err),
      );
    } finally {
      setActionLoading(null);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Reject Sample                                                            */
  /* ------------------------------------------------------------------------ */

  const handleReject = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!rejectingSampleId) {
      return;
    }

    const reason =
      rejectionReason.trim();

    if (!reason) {
      setError(
        "Rejection reason is required.",
      );
      return;
    }

    try {
      setActionLoading(
        rejectingSampleId,
      );

      setError("");

      await rejectLabSample(
        rejectingSampleId,
        {
          rejection_reason: reason,
          notes:
            rejectionNotes.trim() ||
            null,
        },
      );

      setRejectingSampleId(null);
      setRejectionReason("");
      setRejectionNotes("");

      await loadWorkflowData();

      await onUpdated?.();
    } catch (err) {
      console.error(
        "Failed to reject lab sample:",
        err,
      );

      setError(
        getErrorMessage(err),
      );
    } finally {
      setActionLoading(null);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Open Result Entry                                                        */
  /* ------------------------------------------------------------------------ */

  const handleOpenResultEntry = (
    item: LabOrderItem,
  ) => {
    if (!canOperate) {
      return;
    }

    if (!hasProcessedSample) {
      setError(
        "A processed sample is required before entering a laboratory result.",
      );
      return;
    }

    if (
      item.status === "FINALIZED" ||
      item.status === "CANCELLED" ||
      item.status === "REJECTED"
    ) {
      return;
    }

    const test =
      labTests.find(
        (labTest) =>
          labTest.id ===
          item.lab_test_id,
      );

    if (!test) {
      setError(
        "Laboratory test definition could not be found.",
      );
      return;
    }

    setError("");
    setResultItem(item);
    setResultTest(test);
  };

  /* ------------------------------------------------------------------------ */
  /* Open Technical Validation                                               */
  /* ------------------------------------------------------------------------ */

  const handleOpenValidation = async (
    item: LabOrderItem,
  ) => {
    if (!canOperate) {
      return;
    }

    if (item.status !== "RESULT_ENTERED") {
      return;
    }

    if (orderClosed) {
      return;
    }

    const test = labTests.find(
      (labTest) => labTest.id === item.lab_test_id,
    );

    if (!test) {
      setError(
        "Laboratory test definition could not be found.",
      );
      return;
    }

    try {
      setError("");

      const result =
        await getLabResultForOrderItem(item.id);

      if (!result) {
        setError(
          "Laboratory result could not be found for this test.",
        );
        return;
      }

      if (result.status !== "RESULT_ENTERED") {
        setError(
          `This result is currently ${formatItemStatus(result.status)} and cannot be technically validated from this stage.`,
        );
        await loadWorkflowData();
        return;
      }

      setValidationItem(item);
      setValidationTest(test);
    } catch (err) {
      console.error(
        "Failed to load laboratory result for validation:",
        err,
      );

      setError(getErrorMessage(err));
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Close Technical Validation                                              */
  /* ------------------------------------------------------------------------ */

  const handleCloseValidation = () => {
    setValidationItem(null);
    setValidationTest(null);
  };

  /* ------------------------------------------------------------------------ */
  /* Technical Validation Success                                             */
  /* ------------------------------------------------------------------------ */

  const handleValidationSuccess = async () => {
    setValidationItem(null);
    setValidationTest(null);

    await loadWorkflowData();
    await onUpdated?.();
  };

  /* ------------------------------------------------------------------------ */
  /* Open Doctor Review                                                       */
  /* ------------------------------------------------------------------------ */

  const handleOpenDoctorReview = async (
    item: LabOrderItem,
  ) => {
    if (!canReview) {
      return;
    }

    if (item.status !== "TECHNICALLY_VALIDATED") {
      return;
    }

    if (orderClosed) {
      return;
    }

    const test = labTests.find(
      (labTest) => labTest.id === item.lab_test_id,
    );

    if (!test) {
      setError(
        "Laboratory test definition could not be found.",
      );
      return;
    }

    try {
      setError("");

      const result =
        await getLabResultForOrderItem(item.id);

      if (!result) {
        setError(
          "Laboratory result could not be found for this test.",
        );
        return;
      }

      if (result.status !== "TECHNICALLY_VALIDATED") {
        setError(
          `This result is currently ${formatItemStatus(
            result.status,
          )} and cannot be sent for doctor review from this stage.`,
        );
        await loadWorkflowData();
        return;
      }

      setReviewItem(item);
      setReviewTest(test);
    } catch (err) {
      console.error(
        "Failed to load laboratory result for doctor review:",
        err,
      );

      setError(getErrorMessage(err));
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Close Doctor Review                                                      */
  /* ------------------------------------------------------------------------ */

  const handleCloseDoctorReview = () => {
    setReviewItem(null);
    setReviewTest(null);
  };

  /* ------------------------------------------------------------------------ */
  /* Doctor Review Success                                                    */
  /* ------------------------------------------------------------------------ */

  const handleDoctorReviewSuccess = async () => {
    setReviewItem(null);
    setReviewTest(null);

    await loadWorkflowData();
    await onUpdated?.();
  };

  /* ------------------------------------------------------------------------ */
  /* Open Finalization                                                        */
  /* ------------------------------------------------------------------------ */

  const handleOpenFinalization = async (
    item: LabOrderItem,
  ) => {
    if (!canReview) {
      return;
    }

    if (item.status !== "DOCTOR_REVIEW") {
      return;
    }

    if (orderClosed) {
      return;
    }

    const test = labTests.find(
      (labTest) => labTest.id === item.lab_test_id,
    );

    if (!test) {
      setError(
        "Laboratory test definition could not be found.",
      );
      return;
    }

    try {
      setError("");

      const result =
        await getLabResultForOrderItem(item.id);

      if (!result) {
        setError(
          "Laboratory result could not be found for this test.",
        );
        return;
      }

      if (result.status !== "DOCTOR_REVIEW") {
        setError(
          `This result is currently ${formatItemStatus(
            result.status,
          )} and cannot be finalized from this stage.`,
        );
        await loadWorkflowData();
        return;
      }

      setFinalizeItem(item);
      setFinalizeTest(test);
    } catch (err) {
      console.error(
        "Failed to load laboratory result for finalization:",
        err,
      );

      setError(getErrorMessage(err));
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Close Finalization                                                       */
  /* ------------------------------------------------------------------------ */

  const handleCloseFinalization = () => {
    setFinalizeItem(null);
    setFinalizeTest(null);
  };

  /* ------------------------------------------------------------------------ */
  /* Finalization Success                                                     */
  /* ------------------------------------------------------------------------ */

  const handleFinalizationSuccess = async () => {
    setFinalizeItem(null);
    setFinalizeTest(null);

    await loadWorkflowData();
    await onUpdated?.();
  };

  /* ------------------------------------------------------------------------ */
  /* Close Result Entry                                                       */
  /* ------------------------------------------------------------------------ */

  const handleCloseResultEntry =
    () => {
      setResultItem(null);
      setResultTest(null);
    };

  /* ------------------------------------------------------------------------ */
  /* Result Success                                                           */
  /* ------------------------------------------------------------------------ */

  const handleResultSuccess =
    async () => {
      setResultItem(null);
      setResultTest(null);

      await loadWorkflowData();

      await onUpdated?.();
    };

  /* ------------------------------------------------------------------------ */
  /* Early Return                                                             */
  /* ------------------------------------------------------------------------ */

  if (!open || !order) {
    return null;
  }

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
        <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {/* ---------------------------------------------------------------- */}
          {/* Header                                                           */}
          {/* ---------------------------------------------------------------- */}

          <div className="shrink-0 border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950">
                  <TestTube2 className="h-5 w-5 text-white" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">
                      Laboratory
                    </span>

                    <span className="text-slate-300">
                      /
                    </span>

                    <span className="text-[10px] font-semibold text-slate-400">
                      Workflow
                    </span>
                  </div>

                  <h2 className="mt-1 truncate text-lg font-bold tracking-tight text-slate-900">
                    LAB-
                    {String(
                      order.id,
                    ).padStart(
                      5,
                      "0",
                    )}
                  </h2>

                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Patient #
                    {order.patient_id}
                    {" • "}
                    Encounter #
                    {order.encounter_id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Workflow */}
            <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex items-center gap-2 overflow-x-auto">
                <WorkflowStep
                  label="Ordered"
                  active={
                    order.status ===
                      "ORDERED" ||
                    order.status ===
                      "SAMPLE_PENDING"
                  }
                  completed={
                    order.status !==
                      "ORDERED" &&
                    order.status !==
                      "SAMPLE_PENDING"
                  }
                />

                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />

                <WorkflowStep
                  label="Collected"
                  active={
                    order.status ===
                    "COLLECTED"
                  }
                  completed={[
                    "PROCESSING",
                    "RESULT_ENTERED",
                    "TECHNICALLY_VALIDATED",
                    "DOCTOR_REVIEW",
                    "FINALIZED",
                  ].includes(
                    order.status,
                  )}
                />

                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />

                <WorkflowStep
                  label="Processing"
                  active={
                    order.status ===
                    "PROCESSING"
                  }
                  completed={[
                    "RESULT_ENTERED",
                    "TECHNICALLY_VALIDATED",
                    "DOCTOR_REVIEW",
                    "FINALIZED",
                  ].includes(
                    order.status,
                  )}
                />

                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />

                <WorkflowStep
                  label="Result"
                  active={
                    order.status ===
                    "RESULT_ENTERED"
                  }
                  completed={[
                    "TECHNICALLY_VALIDATED",
                    "DOCTOR_REVIEW",
                    "FINALIZED",
                  ].includes(
                    order.status,
                  )}
                />

                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />

                <WorkflowStep
                  label="Validation"
                  active={
                    order.status ===
                    "TECHNICALLY_VALIDATED"
                  }
                  completed={[
                    "DOCTOR_REVIEW",
                    "FINALIZED",
                  ].includes(
                    order.status,
                  )}
                />

                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />

                <WorkflowStep
                  label="Doctor Review"
                  active={
                    order.status ===
                    "DOCTOR_REVIEW"
                  }
                  completed={
                    order.status ===
                    "FINALIZED"
                  }
                />

                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />

                <WorkflowStep
                  label="Finalized"
                  active={
                    order.status ===
                    "FINALIZED"
                  }
                  completed={
                    order.status ===
                    "FINALIZED"
                  }
                />
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Body                                                             */}
          {/* ---------------------------------------------------------------- */}

          <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] p-5 sm:p-6">
            {/* Error */}
            {error && (
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />

                <p className="flex-1 text-xs font-medium leading-5 text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setError("")
                  }
                  className="text-red-400 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Order Summary */}
            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Order Status
                </p>

                <div className="mt-2">
                  <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
                    {order.status.replaceAll(
                      "_",
                      " ",
                    )}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Priority
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {order.priority}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Tests
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {order.items?.length ??
                    0}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Ordered
                </p>

                <p className="mt-2 text-xs font-semibold text-slate-700">
                  {formatDateTime(
                    order.ordered_at,
                  )}
                </p>
              </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Samples Section                                                  */}
            {/* ---------------------------------------------------------------- */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-blue-600" />

                    <h3 className="text-sm font-bold text-slate-900">
                      Sample Management
                    </h3>

                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      {samples.length}
                    </span>
                  </div>

                  <p className="mt-1 text-[11px] text-slate-400">
                    Register and track specimens through the laboratory workflow.
                  </p>
                </div>

                {canCollect &&
                  !orderClosed && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowCreateSample(
                          (value) =>
                            !value,
                        )
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                    >
                      <Plus className="h-3.5 w-3.5" />

                      Register Sample
                    </button>
                  )}
              </div>

              {/* Create Sample */}
              {showCreateSample &&
                canCollect &&
                !orderClosed && (
                  <form
                    onSubmit={
                      handleCreateSample
                    }
                    className="border-b border-slate-100 bg-slate-50/70 p-5"
                  >
                    <div className="mb-4 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                        <Plus className="h-4 w-4 text-blue-600" />
                      </div>

                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Register New Sample
                        </p>

                        <p className="text-[10px] text-slate-400">
                          Select the specimen associated with this order.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Specimen Type
                        </label>

                        {specimenOptions.length >
                        0 ? (
                          <select
                            value={
                              specimenType
                            }
                            onChange={(
                              event,
                            ) =>
                              setSpecimenType(
                                event
                                  .target
                                  .value,
                              )
                            }
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                          >
                            <option value="">
                              Select specimen type
                            </option>

                            {specimenOptions.map(
                              (
                                specimen,
                              ) => (
                                <option
                                  key={
                                    specimen
                                  }
                                  value={
                                    specimen
                                  }
                                >
                                  {
                                    specimen
                                  }
                                </option>
                              ),
                            )}
                          </select>
                        ) : (
                          <input
                            value={
                              specimenType
                            }
                            onChange={(
                              event,
                            ) =>
                              setSpecimenType(
                                event
                                  .target
                                  .value,
                              )
                            }
                            placeholder="e.g. Blood, Urine, Serum"
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                          />
                        )}
                      </div>

                      <div>
                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Notes
                        </label>

                        <input
                          value={
                            sampleNotes
                          }
                          onChange={(
                            event,
                          ) =>
                            setSampleNotes(
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder="Optional collection notes"
                          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setShowCreateSample(
                            false,
                          )
                        }
                        className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={
                          creatingSample
                        }
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {creatingSample ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}

                        Register Sample
                      </button>
                    </div>
                  </form>
                )}

              {/* Sample List */}
              {loading ? (
                <div className="flex min-h-[220px] items-center justify-center">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading samples...
                  </div>
                </div>
              ) : samples.length ===
                0 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                    <TestTube2 className="h-5 w-5 text-slate-400" />
                  </div>

                  <p className="mt-4 text-sm font-semibold text-slate-800">
                    No samples registered
                  </p>

                  <p className="mt-1 max-w-sm text-[11px] leading-5 text-slate-400">
                    Register a specimen to begin the collection and laboratory processing workflow.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {samples.map(
                    (sample) => {
                      const busy =
                        actionLoading ===
                        sample.id;

                      return (
                        <div
                          key={
                            sample.id
                          }
                          className="p-5 transition hover:bg-slate-50/50"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50">
                                <TestTube2 className="h-4 w-4 text-blue-600" />
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-bold text-slate-800">
                                    {
                                      sample.sample_code
                                    }
                                  </p>

                                  <SampleStatusBadge
                                    status={
                                      sample.status
                                    }
                                  />
                                </div>

                                <p className="mt-1 text-xs font-medium text-slate-600">
                                  {
                                    sample.specimen_type
                                  }
                                </p>

                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400">
                                  <span>
                                    Created{" "}
                                    {formatDateTime(
                                      sample.created_at,
                                    )}
                                  </span>

                                  {sample.collected_at && (
                                    <span>
                                      Collected{" "}
                                      {formatDateTime(
                                        sample.collected_at,
                                      )}
                                    </span>
                                  )}

                                  {sample.received_at && (
                                    <span>
                                      Received{" "}
                                      {formatDateTime(
                                        sample.received_at,
                                      )}
                                    </span>
                                  )}
                                </div>

                                {sample.notes && (
                                  <p className="mt-2 max-w-2xl text-[11px] leading-5 text-slate-500">
                                    <span className="font-semibold text-slate-600">
                                      Note:
                                    </span>{" "}
                                    {
                                      sample.notes
                                    }
                                  </p>
                                )}

                                {sample.rejection_reason && (
                                  <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                                    <span className="font-semibold">
                                      Rejection:
                                    </span>{" "}
                                    {
                                      sample.rejection_reason
                                    }
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                              {sample.status ===
                                "Pending" &&
                                canCollect &&
                                !orderClosed && (
                                  <button
                                    type="button"
                                    disabled={
                                      busy
                                    }
                                    onClick={() =>
                                      handleCollect(
                                        sample,
                                      )
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {busy ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <PackageCheck className="h-3.5 w-3.5" />
                                    )}

                                    Collect
                                  </button>
                                )}

                              {sample.status ===
                                "Collected" &&
                                canOperate &&
                                !orderClosed && (
                                  <button
                                    type="button"
                                    disabled={
                                      busy
                                    }
                                    onClick={() =>
                                      handleReceive(
                                        sample,
                                      )
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {busy ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <PackageCheck className="h-3.5 w-3.5" />
                                    )}

                                    Receive
                                  </button>
                                )}

                              {sample.status ===
                                "Received" &&
                                canOperate &&
                                !orderClosed && (
                                  <button
                                    type="button"
                                    disabled={
                                      busy
                                    }
                                    onClick={() =>
                                      handleProcess(
                                        sample,
                                      )
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {busy ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    )}

                                    Process
                                  </button>
                                )}

                              {[
                                "Pending",
                                "Collected",
                                "Received",
                              ].includes(
                                sample.status,
                              ) &&
                                canOperate &&
                                !orderClosed && (
                                  <button
                                    type="button"
                                    disabled={
                                      busy
                                    }
                                    onClick={() => {
                                      setRejectingSampleId(
                                        sample.id,
                                      );
                                      setRejectionReason(
                                        "",
                                      );
                                      setRejectionNotes(
                                        "",
                                      );
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />

                                    Reject
                                  </button>
                                )}

                              {sample.status ===
                                "Processed" && (
                                <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Sample Processed
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Rejection Form */}
                          {rejectingSampleId ===
                            sample.id && (
                            <form
                              onSubmit={
                                handleReject
                              }
                              className="mt-4 rounded-xl border border-red-100 bg-red-50/60 p-4"
                            >
                              <div className="mb-3 flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-red-600" />

                                <p className="text-xs font-bold text-red-800">
                                  Reject Sample
                                </p>
                              </div>

                              <div className="grid gap-3 lg:grid-cols-2">
                                <div>
                                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-red-700">
                                    Rejection Reason
                                  </label>

                                  <input
                                    value={
                                      rejectionReason
                                    }
                                    onChange={(
                                      event,
                                    ) =>
                                      setRejectionReason(
                                        event
                                          .target
                                          .value,
                                      )
                                    }
                                    placeholder="e.g. Hemolyzed specimen"
                                    className="h-10 w-full rounded-lg border border-red-200 bg-white px-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-red-300 focus:ring-4 focus:ring-red-100"
                                  />
                                </div>

                                <div>
                                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-red-700">
                                    Additional Notes
                                  </label>

                                  <input
                                    value={
                                      rejectionNotes
                                    }
                                    onChange={(
                                      event,
                                    ) =>
                                      setRejectionNotes(
                                        event
                                          .target
                                          .value,
                                      )
                                    }
                                    placeholder="Optional details"
                                    className="h-10 w-full rounded-lg border border-red-200 bg-white px-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-red-300 focus:ring-4 focus:ring-red-100"
                                  />
                                </div>
                              </div>

                              <div className="mt-3 flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRejectingSampleId(
                                      null,
                                    )
                                  }
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                  Cancel
                                </button>

                                <button
                                  type="submit"
                                  disabled={
                                    busy
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {busy ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <XCircle className="h-3.5 w-3.5" />
                                  )}

                                  Confirm Rejection
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </section>

            {/* ---------------------------------------------------------------- */}
            {/* Test Results Section                                             */}
            {/* ---------------------------------------------------------------- */}

            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-violet-600" />

                    <h3 className="text-sm font-bold text-slate-900">
                      Test Results
                    </h3>

                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      {orderItems.length}
                    </span>
                  </div>

                  <p className="mt-1 text-[11px] text-slate-400">
                    Enter and track results for each ordered laboratory test.
                  </p>
                </div>

                {hasProcessedSample && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Sample Processed
                  </span>
                )}
              </div>

              {itemsLoading ? (
                <div className="flex min-h-[180px] items-center justify-center">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading laboratory tests...
                  </div>
                </div>
              ) : orderItems.length ===
                0 ? (
                <div className="flex min-h-[180px] flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                    <FlaskConical className="h-5 w-5 text-slate-400" />
                  </div>

                  <p className="mt-3 text-sm font-semibold text-slate-800">
                    No order items found
                  </p>

                  <p className="mt-1 max-w-sm text-[11px] leading-5 text-slate-400">
                    Laboratory tests associated with this order will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {orderItems.map(
                    (item) => {
                      const test =
                        labTests.find(
                          (
                            labTest,
                          ) =>
                            labTest.id ===
                            item.lab_test_id,
                        );

                      const itemClosed =
                        item.status ===
                          "FINALIZED" ||
                        item.status ===
                          "CANCELLED" ||
                        item.status ===
                          "REJECTED";

                      const resultLifecycleStarted = [
                        "RESULT_ENTERED",
                        "TECHNICALLY_VALIDATED",
                        "DOCTOR_REVIEW",
                        "FINALIZED",
                      ].includes(
                        item.status ?? "",
                      );

                      const canEnterResult =
                        canOperate &&
                        hasProcessedSample &&
                        !orderClosed &&
                        !itemClosed &&
                        !resultLifecycleStarted;

                      const canSendForDoctorReview =
                        canReview &&
                        item.status ===
                          "TECHNICALLY_VALIDATED" &&
                        !orderClosed;

                      const itemStyle =
                        getItemStatusStyle(
                          item.status,
                        );

                      return (
                        <div
                          key={item.id}
                          className="p-5 transition hover:bg-slate-50/50"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-violet-50">
                                <FlaskConical className="h-4 w-4 text-violet-600" />
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-bold text-slate-800">
                                    {test?.name ??
                                      `Test #${item.lab_test_id}`}
                                  </p>

                                  {test?.code && (
                                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                      {
                                        test.code
                                      }
                                    </span>
                                  )}

                                  <span
                                    className={[
                                      "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                                      itemStyle.bg,
                                      itemStyle.border,
                                      itemStyle.text,
                                    ].join(
                                      " ",
                                    )}
                                  >
                                    {formatItemStatus(
                                      item.status,
                                    )}
                                  </span>
                                </div>

                                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400">
                                  <span>
                                    Result Type:{" "}
                                    <span className="font-semibold text-slate-500">
                                      {test?.result_type ??
                                        "—"}
                                    </span>
                                  </span>

                                  <span>
                                    Specimen:{" "}
                                    <span className="font-semibold text-slate-500">
                                      {test?.specimen_type ??
                                        "—"}
                                    </span>
                                  </span>

                                  {test?.unit && (
                                    <span>
                                      Unit:{" "}
                                      <span className="font-semibold text-slate-500">
                                        {
                                          test.unit
                                        }
                                      </span>
                                    </span>
                                  )}
                                </div>

                                {item.notes && (
                                  <p className="mt-2 text-[11px] leading-5 text-slate-500">
                                    <span className="font-semibold text-slate-600">
                                      Note:
                                    </span>{" "}
                                    {
                                      item.notes
                                    }
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              {item.status ===
                                "FINALIZED" && (
                                <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Finalized
                                </span>
                              )}

                              {item.status ===
                                "RESULT_ENTERED" && (
                                <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-semibold text-blue-700">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Result Entered
                                </span>
                              )}

                              {item.status ===
                                "RESULT_ENTERED" &&
                                canOperate &&
                                !orderClosed && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleOpenValidation(item)
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-violet-700"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Validate Result
                                </button>
                              )}

                              {item.status ===
                                "TECHNICALLY_VALIDATED" && (
                                <>
                                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] font-semibold text-violet-700">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Validated
                                  </span>

                                  {canSendForDoctorReview && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleOpenDoctorReview(
                                          item,
                                        )
                                      }
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-amber-700"
                                    >
                                      <ClipboardCheck className="h-3.5 w-3.5" />
                                      Review Result
                                    </button>
                                  )}
                                </>
                              )}

                              {item.status ===
                                "DOCTOR_REVIEW" && (
                                <>
                                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Doctor Review
                                  </span>

                                  {canReview &&
                                    !orderClosed && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void handleOpenFinalization(
                                            item,
                                          )
                                        }
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                                      >
                                        <ClipboardCheck className="h-3.5 w-3.5" />
                                        Finalize Result
                                      </button>
                                    )}
                                </>
                              )}

                              {canEnterResult && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenResultEntry(
                                      item,
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3.5 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-slate-800"
                                >
                                  <Save className="h-3.5 w-3.5" />
                                  Enter Result
                                </button>
                              )}

                              {!hasProcessedSample &&
                                !itemClosed && (
                                  <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-700">
                                    Process sample first
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </section>

            {/* ---------------------------------------------------------------- */}
            {/* Next Stage                                                       */}
            {/* ---------------------------------------------------------------- */}

            <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
              <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

              <div>
                <p className="text-xs font-bold text-blue-800">
                  Next workflow stage
                </p>

                <p className="mt-0.5 text-[11px] leading-5 text-blue-700/80">
                  After technical validation, the doctor reviews the laboratory result. A reviewed result can then be finalized and locked.
                </p>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Footer                                                           */}
          {/* ---------------------------------------------------------------- */}

          <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-white px-5 py-3 sm:px-6">
            <div className="text-[10px] text-slate-400">
              HospitaX Laboratory Workflow
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* RESULT ENTRY MODAL                                                  */}
      {/* ================================================================== */}

      <LabResultEntryModal
        open={
          resultItem !== null &&
          resultTest !== null
        }
        item={resultItem}
        test={resultTest}
        onClose={
          handleCloseResultEntry
        }
        onSuccess={
          handleResultSuccess
        }
      />

      <LabResultValidationModal
        open={
          validationItem !== null &&
          validationTest !== null
        }
        item={validationItem}
        test={validationTest}
        onClose={handleCloseValidation}
        onSuccess={handleValidationSuccess}
      />

      <LabResultDoctorReviewModal
        open={
          reviewItem !== null &&
          reviewTest !== null
        }
        item={reviewItem}
        test={reviewTest}
        onClose={handleCloseDoctorReview}
        onSuccess={handleDoctorReviewSuccess}
      />

      <LabResultFinalizeModal
        open={
          finalizeItem !== null &&
          finalizeTest !== null
        }
        item={finalizeItem}
        test={finalizeTest}
        onClose={handleCloseFinalization}
        onSuccess={handleFinalizationSuccess}
      />
    </>
  );
}