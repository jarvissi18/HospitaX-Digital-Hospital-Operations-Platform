import api from "./api";

// =====================================================
// TYPES
// =====================================================

export type FollowUpStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "MISSED";

export type FollowUpType =
  | "ROUTINE"
  | "SPECIALIST"
  | "POST_DISCHARGE"
  | "MEDICATION_REVIEW"
  | "DIAGNOSTIC_REVIEW"
  | "OTHER";

export type FollowUpPriority =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "URGENT";


// =====================================================
// FOLLOW-UP
// =====================================================

export interface FollowUp {
  id: number;

  patient_id: number;
  patient_name: string | null;

  encounter_id: number;

  discharge_id: number | null;

  doctor_id: number | null;
  doctor_name: string | null;

  follow_up_type: FollowUpType;
  priority: FollowUpPriority;
  status: FollowUpStatus;

  scheduled_at: string;

  reason: string | null;
  clinical_summary: string | null;
  instructions: string | null;
  notes: string | null;

  completed_at: string | null;
  cancelled_at: string | null;

  created_at: string | null;
  updated_at: string | null;
}


// =====================================================
// CREATE
// =====================================================

export interface FollowUpCreate {
  patient_id: number;
  encounter_id: number;

  discharge_id?: number | null;

  follow_up_type?: FollowUpType;
  priority?: FollowUpPriority;

  scheduled_at: string;

  reason?: string | null;
  clinical_summary?: string | null;
  instructions?: string | null;
  notes?: string | null;
}


// =====================================================
// UPDATE
// =====================================================

export interface FollowUpUpdate {
  discharge_id?: number | null;

  follow_up_type?: FollowUpType;
  priority?: FollowUpPriority;

  scheduled_at?: string;

  reason?: string | null;
  clinical_summary?: string | null;
  instructions?: string | null;
  notes?: string | null;
}


// =====================================================
// STATUS UPDATE
// =====================================================

export interface FollowUpStatusUpdate {
  status: FollowUpStatus;
  notes?: string | null;
}


// =====================================================
// API ERROR
// =====================================================

type ApiError = {
  detail?: string;
};


function getApiErrorMessage(
  error: any,
  fallback: string,
): string {
  const apiError =
    error?.response?.data as ApiError | undefined;

  return (
    apiError?.detail ||
    error?.message ||
    fallback
  );
}


// =====================================================
// CREATE FOLLOW-UP
// =====================================================

export async function createFollowUp(
  payload: FollowUpCreate,
): Promise<FollowUp> {
  try {
    const response =
      await api.post<FollowUp>(
        "/followups",
        payload,
      );

    return response.data;
  } catch (error: any) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Failed to create follow-up.",
      ),
    );
  }
}


// =====================================================
// GET FOLLOW-UP
// =====================================================

export async function getFollowUp(
  followUpId: number,
): Promise<FollowUp> {
  try {
    const response =
      await api.get<FollowUp>(
        `/followups/${followUpId}`,
      );

    return response.data;
  } catch (error: any) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Failed to load follow-up.",
      ),
    );
  }
}


// =====================================================
// GET ALL FOLLOW-UPS
// =====================================================

export async function getFollowUps(
  params?: {
  patient_id?: number;
  encounter_id?: number;
  discharge_id?: number;
  doctor_id?: number;
  status_filter?: FollowUpStatus;
},
): Promise<FollowUp[]> {
  try {
    const response =
      await api.get<FollowUp[]>(
        "/followups",
        {
          params,
        },
      );

    return response.data;
  } catch (error: any) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Failed to load follow-ups.",
      ),
    );
  }
}


// =====================================================
// GET PATIENT FOLLOW-UPS
// =====================================================

export async function getPatientFollowUps(
  patientId: number,
  statusFilter?: FollowUpStatus,
): Promise<FollowUp[]> {
  try {
    const response =
      await api.get<FollowUp[]>(
        `/followups/patient/${patientId}`,
        {
          params: statusFilter
            ? {
                status_filter:
                  statusFilter,
              }
            : undefined,
        },
      );

    return response.data;
  } catch (error: any) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Failed to load patient follow-ups.",
      ),
    );
  }
}


// =====================================================
// GET ENCOUNTER FOLLOW-UPS
// =====================================================

export async function getEncounterFollowUps(
  encounterId: number,
): Promise<FollowUp[]> {
  try {
    const response =
      await api.get<FollowUp[]>(
        `/followups/encounter/${encounterId}`,
      );

    return response.data;
  } catch (error: any) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Failed to load encounter follow-ups.",
      ),
    );
  }
}


// =====================================================
// UPDATE FOLLOW-UP
// =====================================================

export async function updateFollowUp(
  followUpId: number,
  payload: FollowUpUpdate,
): Promise<FollowUp> {
  try {
    const response =
      await api.put<FollowUp>(
        `/followups/${followUpId}`,
        payload,
      );

    return response.data;
  } catch (error: any) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Failed to update follow-up.",
      ),
    );
  }
}


// =====================================================
// UPDATE FOLLOW-UP STATUS
// =====================================================

export async function updateFollowUpStatus(
  followUpId: number,
  payload: FollowUpStatusUpdate,
): Promise<FollowUp> {
  try {
    const response =
      await api.patch<FollowUp>(
        `/followups/${followUpId}/status`,
        payload,
      );

    return response.data;
  } catch (error: any) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Failed to update follow-up status.",
      ),
    );
  }
}