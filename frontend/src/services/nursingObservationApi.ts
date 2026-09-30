import api from "./api";


// =====================================================
// TYPES
// =====================================================

export type NursingCareStatus =
  | "Stable"
  | "Under Observation"
  | "Needs Attention"
  | "Critical";

export type NursingObservation = {
  id: number;
  patient_id: number;
  nurse_id: number;

  blood_pressure: string | null;
  pulse: number | null;
  temperature: number | null;
  oxygen_saturation: number | null;
  respiratory_rate: number | null;
  weight: number | null;

  nursing_notes: string | null;
  care_status: NursingCareStatus;

  recorded_at: string;
  updated_at: string | null;
};


// =====================================================
// CREATE
// =====================================================

export type CreateNursingObservationPayload = {
  patient_id: number;

  blood_pressure?: string;
  pulse?: number;
  temperature?: number;
  oxygen_saturation?: number;
  respiratory_rate?: number;
  weight?: number;

  nursing_notes?: string;
  care_status?: NursingCareStatus;
};


// =====================================================
// UPDATE
// =====================================================

export type UpdateNursingObservationPayload = {
  blood_pressure?: string;
  pulse?: number;
  temperature?: number;
  oxygen_saturation?: number;
  respiratory_rate?: number;
  weight?: number;

  nursing_notes?: string;
  care_status?: NursingCareStatus;
};


// =====================================================
// CREATE NURSING OBSERVATION
// =====================================================

export async function createNursingObservation(
  payload: CreateNursingObservationPayload
): Promise<NursingObservation> {
  const response = await api.post<NursingObservation>(
    "/nursing-observations/",
    payload
  );

  return response.data;
}


// =====================================================
// GET MY OBSERVATIONS
// =====================================================

export async function getMyNursingObservations(): Promise<
  NursingObservation[]
> {
  const response = await api.get<NursingObservation[]>(
    "/nursing-observations/my"
  );

  return response.data;
}


// =====================================================
// GET PATIENT NURSING HISTORY
// =====================================================

export async function getPatientNursingHistory(
  patientId: number
): Promise<NursingObservation[]> {
  const response = await api.get<NursingObservation[]>(
    `/nursing-observations/patient/${patientId}`
  );

  return response.data;
}


// =====================================================
// GET SINGLE OBSERVATION
// =====================================================

export async function getNursingObservation(
  observationId: number
): Promise<NursingObservation> {
  const response = await api.get<NursingObservation>(
    `/nursing-observations/${observationId}`
  );

  return response.data;
}


// =====================================================
// UPDATE OBSERVATION
// =====================================================

export async function updateNursingObservation(
  observationId: number,
  payload: UpdateNursingObservationPayload
): Promise<NursingObservation> {
  const response = await api.put<NursingObservation>(
    `/nursing-observations/${observationId}`,
    payload
  );

  return response.data;
}