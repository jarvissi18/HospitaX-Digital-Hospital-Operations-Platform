import api from "./api";

// =====================================================
// TYPES
// =====================================================

export type ClinicalEncounterStatus =
  | "Draft"
  | "Completed"
  | "Cancelled";

export type ClinicalEncounter = {
  id: number;
  patient_id: number;
  doctor_id: number;

  status: ClinicalEncounterStatus;

  chief_complaint: string | null;
  symptoms: string | null;
  clinical_notes: string | null;
  diagnosis: string | null;
  treatment_plan: string | null;
  prescription: string | null;

  follow_up_date: string | null;

  created_at: string;
  updated_at: string | null;
};

// =====================================================
// CREATE PAYLOAD
// =====================================================

export type CreateClinicalEncounterPayload = {
  patient_id: number;

  status?: ClinicalEncounterStatus;

  chief_complaint?: string;
  symptoms?: string;
  clinical_notes?: string;
  diagnosis?: string;
  treatment_plan?: string;
  prescription?: string;

  follow_up_date?: string | null;
};

// =====================================================
// UPDATE PAYLOAD
// =====================================================

export type UpdateClinicalEncounterPayload = {
  status?: ClinicalEncounterStatus;

  chief_complaint?: string;
  symptoms?: string;
  clinical_notes?: string;
  diagnosis?: string;
  treatment_plan?: string;
  prescription?: string;

  follow_up_date?: string | null;
};

// =====================================================
// CREATE
// =====================================================

export async function createClinicalEncounter(
  payload: CreateClinicalEncounterPayload,
): Promise<ClinicalEncounter> {
  const response =
    await api.post<ClinicalEncounter>(
      "/clinical-encounters/",
      payload,
    );

  return response.data;
}

// =====================================================
// GET MY ENCOUNTERS
// =====================================================

export async function getMyClinicalEncounters(): Promise<
  ClinicalEncounter[]
> {
  const response =
    await api.get<ClinicalEncounter[]>(
      "/clinical-encounters/my",
    );

  return response.data;
}

// =====================================================
// GET PATIENT CLINICAL HISTORY
// =====================================================

export async function getPatientClinicalHistory(
  patientId: number,
): Promise<ClinicalEncounter[]> {
  const response =
    await api.get<ClinicalEncounter[]>(
      `/clinical-encounters/patient/${patientId}`,
    );

  return response.data;
}

// =====================================================
// GET SINGLE ENCOUNTER
// =====================================================

export async function getClinicalEncounter(
  encounterId: number,
): Promise<ClinicalEncounter> {
  const response =
    await api.get<ClinicalEncounter>(
      `/clinical-encounters/${encounterId}`,
    );

  return response.data;
}

// =====================================================
// UPDATE
// =====================================================

export async function updateClinicalEncounter(
  encounterId: number,
  payload: UpdateClinicalEncounterPayload,
): Promise<ClinicalEncounter> {
  const response =
    await api.put<ClinicalEncounter>(
      `/clinical-encounters/${encounterId}`,
      payload,
    );

  return response.data;
}

// =====================================================
// COMPLETE
// =====================================================

export async function completeClinicalEncounter(
  encounterId: number,
): Promise<ClinicalEncounter> {
  const response =
    await api.post<ClinicalEncounter>(
      `/clinical-encounters/${encounterId}/complete`,
    );

  return response.data;
}

// =====================================================
// CANCEL
// =====================================================

export async function cancelClinicalEncounter(
  encounterId: number,
): Promise<ClinicalEncounter> {
  const response =
    await api.post<ClinicalEncounter>(
      `/clinical-encounters/${encounterId}/cancel`,
    );

  return response.data;
}