import api from "./api";

/* ============================================================================
 * Transfer Types
 * ========================================================================== */

export type TransferType =
  | "WARD_TRANSFER"
  | "DEPARTMENT_TRANSFER"
  | "ROOM_TRANSFER"
  | "BED_TRANSFER"
  | "ICU_TRANSFER"
  | "EMERGENCY_TRANSFER"
  | "OTHER";

export type TransferPriority =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "URGENT";

export type TransferStatus =
  | "REQUESTED"
  | "APPROVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export type TransferTransportMode =
  | "WALKING"
  | "WHEELCHAIR"
  | "STRETCHER"
  | "BED"
  | "AMBULANCE"
  | "OTHER";

/* ============================================================================
 * Transfer Interfaces
 * ========================================================================== */

export interface PatientTransfer {
  id: number;

  patient_id: number;
  patient_name?: string | null;

  encounter_id: number;

  requested_by_id: number;
  requesting_doctor_name?: string | null;

  approved_by_id?: number | null;
  approving_doctor_name?: string | null;

  completed_by_id?: number | null;
  completing_doctor_name?: string | null;

  transfer_type: TransferType;
  priority: TransferPriority;
  status: TransferStatus;

  /* --------------------------------------------------------------------------
   * Source Location
   * ------------------------------------------------------------------------ */

  source_department_id?: number | null;
  source_department_name?: string | null;

  source_ward_id?: number | null;
  source_ward_name?: string | null;

  source_room_id?: number | null;
  source_room_name?: string | null;

  source_bed_id?: number | null;
  source_bed_name?: string | null;

  /* --------------------------------------------------------------------------
   * Destination Location
   * ------------------------------------------------------------------------ */

  destination_department_id?: number | null;
  destination_department_name?: string | null;

  destination_ward_id?: number | null;
  destination_ward_name?: string | null;

  destination_room_id?: number | null;
  destination_room_name?: string | null;

  destination_bed_id?: number | null;
  destination_bed_name?: string | null;

  /* --------------------------------------------------------------------------
   * Clinical / Transfer Information
   * ------------------------------------------------------------------------ */

  reason: string;

  clinical_summary?: string | null;

  handover_notes?: string | null;

  transport_mode?: TransferTransportMode | null;

  notes?: string | null;

  /* --------------------------------------------------------------------------
   * Timestamps
   * ------------------------------------------------------------------------ */

  requested_at?: string | null;
  updated_at?: string | null;

  approved_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  rejected_at?: string | null;
  cancelled_at?: string | null;
}

/* ============================================================================
 * Create
 * ========================================================================== */

export interface TransferCreate {
  patient_id: number;
  encounter_id: number;

  transfer_type: TransferType;
  priority?: TransferPriority;

  /* Source */
  source_department_id?: number | null;
  source_ward_id?: number | null;
  source_room_id?: number | null;
  source_bed_id?: number | null;

  /* Destination */
  destination_department_id?: number | null;
  destination_ward_id?: number | null;
  destination_room_id?: number | null;
  destination_bed_id?: number | null;

  /* Clinical information */
  reason: string;
  clinical_summary?: string | null;
  handover_notes?: string | null;

  transport_mode?: TransferTransportMode | null;

  notes?: string | null;
}

/* ============================================================================
 * Update
 *
 * Only REQUESTED transfers can be edited by the backend.
 * ========================================================================== */

export interface TransferUpdate {
  transfer_type?: TransferType;
  priority?: TransferPriority;

  source_department_id?: number | null;
  source_ward_id?: number | null;
  source_room_id?: number | null;
  source_bed_id?: number | null;

  destination_department_id?: number | null;
  destination_ward_id?: number | null;
  destination_room_id?: number | null;
  destination_bed_id?: number | null;

  reason?: string;
  clinical_summary?: string | null;
  handover_notes?: string | null;

  transport_mode?: TransferTransportMode | null;

  notes?: string | null;
}

/* ============================================================================
 * Status Update
 * ========================================================================== */

export interface TransferStatusUpdate {
  status: TransferStatus;
  notes?: string | null;
}

/* ============================================================================
 * API Functions
 * ========================================================================== */

/**
 * Create a new patient transfer request.
 *
 * POST /transfers
 */
export const createTransfer = async (
  payload: TransferCreate
): Promise<PatientTransfer> => {
  const response = await api.post<PatientTransfer>(
    "/transfers",
    payload
  );

  return response.data;
};

/**
 * Get a single transfer by ID.
 *
 * GET /transfers/{transfer_id}
 */
export const getTransfer = async (
  transferId: number
): Promise<PatientTransfer> => {
  const response = await api.get<PatientTransfer>(
    `/transfers/${transferId}`
  );

  return response.data;
};

/**
 * Get all transfers for a patient.
 *
 * GET /transfers/patient/{patient_id}
 */
export const getPatientTransfers = async (
  patientId: number
): Promise<PatientTransfer[]> => {
  const response = await api.get<PatientTransfer[]>(
    `/transfers/patient/${patientId}`
  );

  return response.data;
};

/**
 * Get all transfers for a clinical encounter.
 *
 * GET /transfers/encounter/{encounter_id}
 */
export const getEncounterTransfers = async (
  encounterId: number
): Promise<PatientTransfer[]> => {
  const response = await api.get<PatientTransfer[]>(
    `/transfers/encounter/${encounterId}`
  );

  return response.data;
};

/**
 * Get transfers requested by the current user.
 *
 * GET /transfers/my
 */
export const getMyTransfers = async (): Promise<PatientTransfer[]> => {
  const response = await api.get<PatientTransfer[]>(
    "/transfers/my"
  );

  return response.data;
};

/**
 * Update a REQUESTED transfer.
 *
 * PUT /transfers/{transfer_id}
 */
export const updateTransfer = async (
  transferId: number,
  payload: TransferUpdate
): Promise<PatientTransfer> => {
  const response = await api.put<PatientTransfer>(
    `/transfers/${transferId}`,
    payload
  );

  return response.data;
};

/* ============================================================================
 * Lifecycle
 * ========================================================================== */

/**
 * Approve a requested transfer.
 *
 * REQUESTED → APPROVED
 *
 * POST /transfers/{transfer_id}/approve
 */
export const approveTransfer = async (
  transferId: number,
  notes?: string | null
): Promise<PatientTransfer> => {
  const payload: TransferStatusUpdate = {
    status: "APPROVED",
    notes: notes ?? null,
  };

  const response = await api.post<PatientTransfer>(
    `/transfers/${transferId}/approve`,
    payload
  );

  return response.data;
};

/**
 * Start an approved transfer.
 *
 * APPROVED → IN_PROGRESS
 *
 * POST /transfers/{transfer_id}/start
 */
export const startTransfer = async (
  transferId: number,
  notes?: string | null
): Promise<PatientTransfer> => {
  const payload: TransferStatusUpdate = {
    status: "IN_PROGRESS",
    notes: notes ?? null,
  };

  const response = await api.post<PatientTransfer>(
    `/transfers/${transferId}/start`,
    payload
  );

  return response.data;
};

/**
 * Complete an in-progress transfer.
 *
 * IN_PROGRESS → COMPLETED
 *
 * POST /transfers/{transfer_id}/complete
 */
export const completeTransfer = async (
  transferId: number,
  notes?: string | null
): Promise<PatientTransfer> => {
  const payload: TransferStatusUpdate = {
    status: "COMPLETED",
    notes: notes ?? null,
  };

  const response = await api.post<PatientTransfer>(
    `/transfers/${transferId}/complete`,
    payload
  );

  return response.data;
};

/**
 * Reject a requested transfer.
 *
 * REQUESTED → REJECTED
 *
 * POST /transfers/{transfer_id}/reject
 */
export const rejectTransfer = async (
  transferId: number,
  notes?: string | null
): Promise<PatientTransfer> => {
  const payload: TransferStatusUpdate = {
    status: "REJECTED",
    notes: notes ?? null,
  };

  const response = await api.post<PatientTransfer>(
    `/transfers/${transferId}/reject`,
    payload
  );

  return response.data;
};

/**
 * Cancel a requested transfer.
 *
 * REQUESTED → CANCELLED
 *
 * POST /transfers/{transfer_id}/cancel
 */
export const cancelTransfer = async (
  transferId: number,
  notes?: string | null
): Promise<PatientTransfer> => {
  const payload: TransferStatusUpdate = {
    status: "CANCELLED",
    notes: notes ?? null,
  };

  const response = await api.post<PatientTransfer>(
    `/transfers/${transferId}/cancel`,
    payload
  );

  return response.data;
};