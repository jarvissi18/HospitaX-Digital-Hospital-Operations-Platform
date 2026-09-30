import api from "./api";

// =====================================================
// TYPES
// =====================================================

export type DischargeStatus =
  | "PLANNED"
  | "READY"
  | "DISCHARGED"
  | "CANCELLED";

export type DischargeType =
  | "ROUTINE"
  | "LAMA"
  | "REFERRED"
  | "TRANSFERRED"
  | "DECEASED";


// =====================================================
// DISCHARGE
// =====================================================

export interface Discharge {
  id: number;

  patient_id: number;
  patient_name: string | null;

  encounter_id: number;

  discharged_by_id: number;
  doctor_name: string | null;

  status: DischargeStatus;
  discharge_type: DischargeType;

  final_diagnosis: string | null;
  clinical_summary: string | null;
  condition_at_discharge: string | null;

  treatment_summary: string | null;
  discharge_medications: string | null;

  discharge_instructions: string | null;
  diet_instructions: string | null;
  activity_restrictions: string | null;

  warning_signs: string | null;

  follow_up_required: boolean;
  follow_up_date: string | null;
  follow_up_instructions: string | null;

  notes: string | null;

  planned_at: string | null;
  ready_at: string | null;
  discharged_at: string | null;
  cancelled_at: string | null;

  updated_at: string | null;
}


// =====================================================
// CREATE
// =====================================================

export interface DischargeCreate {
  patient_id: number;
  encounter_id: number;

  discharge_type?: DischargeType;

  final_diagnosis?: string | null;
  clinical_summary?: string | null;
  condition_at_discharge?: string | null;

  treatment_summary?: string | null;
  discharge_medications?: string | null;

  discharge_instructions?: string | null;
  diet_instructions?: string | null;
  activity_restrictions?: string | null;

  warning_signs?: string | null;

  follow_up_required?: boolean;
  follow_up_date?: string | null;
  follow_up_instructions?: string | null;

  notes?: string | null;
}


// =====================================================
// UPDATE
// =====================================================

export interface DischargeUpdate {
  discharge_type?: DischargeType;

  final_diagnosis?: string | null;
  clinical_summary?: string | null;
  condition_at_discharge?: string | null;

  treatment_summary?: string | null;
  discharge_medications?: string | null;

  discharge_instructions?: string | null;
  diet_instructions?: string | null;
  activity_restrictions?: string | null;

  warning_signs?: string | null;

  follow_up_required?: boolean;
  follow_up_date?: string | null;
  follow_up_instructions?: string | null;

  notes?: string | null;
}


// =====================================================
// STATUS UPDATE
// =====================================================

export interface DischargeStatusUpdate {
  status: DischargeStatus;
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
// CREATE DISCHARGE
// =====================================================

export async function createDischarge(
  payload: DischargeCreate,
): Promise<Discharge> {
  try {
    const response =
      await api.post<Discharge>(
        "/discharges",
        payload,
      );

    return response.data;
  } catch (error: any) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Failed to create discharge.",
      ),
    );
  }
}


// =====================================================
// GET DISCHARGE
// =====================================================

export async function getDischarge(
  dischargeId: number,
): Promise<Discharge> {
  try {
    const response =
      await api.get<Discharge>(
        `/discharges/${dischargeId}`,
      );

    return response.data;
  } catch (error: any) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Failed to load discharge.",
      ),
    );
  }
}


// =====================================================
// GET ALL DISCHARGES
// =====================================================

export async function getDischarges(
  params?: {
    patient_id?: number;
    encounter_id?: number;
    status_filter?: DischargeStatus;
  },
): Promise<Discharge[]> {
  try {
    const response =
      await api.get<Discharge[]>(
        "/discharges",
        {
          params,
        },
      );

    return response.data;
  } catch (error: any) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Failed to load discharges.",
      ),
    );
  }
}


// =====================================================
// GET PATIENT DISCHARGES
// =====================================================

export async function getPatientDischarges(
  patientId: number,
  statusFilter?: DischargeStatus,
): Promise<Discharge[]> {
  try {
    const response =
      await api.get<Discharge[]>(
        `/discharges/patient/${patientId}`,
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
        "Failed to load patient discharges.",
      ),
    );
  }
}


// =====================================================
// GET ENCOUNTER DISCHARGES
// =====================================================

export async function getEncounterDischarges(
  encounterId: number,
): Promise<Discharge[]> {
  try {
    const response =
      await api.get<Discharge[]>(
        `/discharges/encounter/${encounterId}`,
      );

    return response.data;
  } catch (error: any) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Failed to load encounter discharges.",
      ),
    );
  }
}


// =====================================================
// UPDATE DISCHARGE
// =====================================================

export async function updateDischarge(
  dischargeId: number,
  payload: DischargeUpdate,
): Promise<Discharge> {
  try {
    const response =
      await api.put<Discharge>(
        `/discharges/${dischargeId}`,
        payload,
      );

    return response.data;
  } catch (error: any) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Failed to update discharge.",
      ),
    );
  }
}


// =====================================================
// UPDATE DISCHARGE STATUS
// =====================================================

export async function updateDischargeStatus(
  dischargeId: number,
  payload: DischargeStatusUpdate,
): Promise<Discharge> {
  try {
    const response =
      await api.patch<Discharge>(
        `/discharges/${dischargeId}/status`,
        payload,
      );

    return response.data;
  } catch (error: any) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Failed to update discharge status.",
      ),
    );
  }
}