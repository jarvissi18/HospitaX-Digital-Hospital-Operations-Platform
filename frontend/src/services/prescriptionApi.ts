import api from "./api";



export type PrescriptionStatus =
  | "DRAFT"
  | "ACTIVE"
  | "COMPLETED"
  | "DISCONTINUED"
  | "CANCELLED";

export type PrescriptionDurationUnit =
  | "Days"
  | "Weeks"
  | "Months";

export type PrescriptionDosageForm =
  | "Tablet"
  | "Capsule"
  | "Syrup"
  | "Injection"
  | "Cream"
  | "Ointment"
  | "Drops"
  | "Inhaler"
  | "Powder"
  | "Suspension"
  | "Other";

export type PrescriptionRoute =
  | "Oral"
  | "IV"
  | "IM"
  | "SC"
  | "Topical"
  | "Ophthalmic"
  | "Otic"
  | "Nasal"
  | "Inhalation"
  | "Other";

// =====================================================
// PRESCRIPTION ITEM
// =====================================================

export interface PrescriptionItem {
  id: number;
  prescription_id: number;

  medication_name: string;
  generic_name: string | null;
  strength: string | null;
  dosage_form: string | null;
  route: string | null;
  dose: string | null;
  frequency: string | null;

  duration_value: number | null;
  duration_unit: string | null;

  quantity: string | null;

  is_prn: boolean;

  instructions: string | null;

  created_at: string | null;
  updated_at: string | null;
}

export interface PrescriptionItemCreate {
  medication_name: string;
  generic_name?: string | null;
  strength?: string | null;
  dosage_form?: string | null;
  route?: string | null;
  dose?: string | null;
  frequency?: string | null;

  duration_value?: number | null;
  duration_unit?: string | null;

  quantity?: string | null;

  is_prn?: boolean;

  instructions?: string | null;
}

export interface PrescriptionItemUpdate {
  medication_name?: string;
  generic_name?: string | null;
  strength?: string | null;
  dosage_form?: string | null;
  route?: string | null;
  dose?: string | null;
  frequency?: string | null;

  duration_value?: number | null;
  duration_unit?: string | null;

  quantity?: string | null;

  is_prn?: boolean;

  instructions?: string | null;
}

// =====================================================
// PRESCRIPTION
// =====================================================

export interface Prescription {
  id: number;

  patient_id: number;
  patient_name: string | null;

  encounter_id: number;
  prescribed_by_id: number;
  doctor_name: string | null;

  status: PrescriptionStatus;

  notes: string | null;

  prescribed_at: string | null;
  updated_at: string | null;

  activated_at: string | null;
  completed_at: string | null;
  discontinued_at: string | null;
  cancelled_at: string | null;

  items: PrescriptionItem[];
}

export interface PrescriptionCreate {
  patient_id: number;
  encounter_id: number;

  notes?: string | null;

  items: PrescriptionItemCreate[];
}

export interface PrescriptionUpdate {
  notes?: string | null;
}

// =====================================================
// API RESPONSE HELPERS
// =====================================================

type ApiError = {
  detail?: string;
};

// =====================================================
// CREATE PRESCRIPTION
// =====================================================

export async function createPrescription(
  payload: PrescriptionCreate,
): Promise<Prescription> {
  try {
    const response = await api.post<Prescription>(
      "/prescriptions",
      payload,
    );

    return response.data;
  } catch (error: any) {
    const apiError = error?.response?.data as ApiError | undefined;

    throw new Error(
      apiError?.detail ||
        error?.message ||
        "Failed to create prescription.",
    );
  }
}

// =====================================================
// GET PRESCRIPTION
// =====================================================

export async function getPrescription(
  prescriptionId: number,
): Promise<Prescription> {
  try {
    const response = await api.get<Prescription>(
      `/prescriptions/${prescriptionId}`,
    );

    return response.data;
  } catch (error: any) {
    const apiError = error?.response?.data as ApiError | undefined;

    throw new Error(
      apiError?.detail ||
        error?.message ||
        "Failed to load prescription.",
    );
  }
}

// =====================================================
// GET PATIENT PRESCRIPTIONS
// =====================================================

export async function getPatientPrescriptions(
  patientId: number,
): Promise<Prescription[]> {
  try {
    const response = await api.get<Prescription[]>(
      `/prescriptions/patient/${patientId}`,
    );

    return response.data;
  } catch (error: any) {
    const apiError = error?.response?.data as ApiError | undefined;

    throw new Error(
      apiError?.detail ||
        error?.message ||
        "Failed to load patient prescriptions.",
    );
  }
}

// =====================================================
// GET ENCOUNTER PRESCRIPTIONS
// =====================================================

export async function getEncounterPrescriptions(
  encounterId: number,
): Promise<Prescription[]> {
  try {
    const response = await api.get<Prescription[]>(
      `/prescriptions/encounter/${encounterId}`,
    );

    return response.data;
  } catch (error: any) {
    const apiError = error?.response?.data as ApiError | undefined;

    throw new Error(
      apiError?.detail ||
        error?.message ||
        "Failed to load encounter prescriptions.",
    );
  }
}

// =====================================================
// GET MY PRESCRIPTIONS
// =====================================================

export async function getMyPrescriptions(): Promise<
  Prescription[]
> {
  try {
    const response = await api.get<Prescription[]>(
      "/prescriptions/my",
    );

    return response.data;
  } catch (error: any) {
    const apiError = error?.response?.data as ApiError | undefined;

    throw new Error(
      apiError?.detail ||
        error?.message ||
        "Failed to load your prescriptions.",
    );
  }
}

// =====================================================
// UPDATE PRESCRIPTION
// =====================================================

export async function updatePrescription(
  prescriptionId: number,
  payload: PrescriptionUpdate,
): Promise<Prescription> {
  try {
    const response = await api.put<Prescription>(
      `/prescriptions/${prescriptionId}`,
      payload,
    );

    return response.data;
  } catch (error: any) {
    const apiError = error?.response?.data as ApiError | undefined;

    throw new Error(
      apiError?.detail ||
        error?.message ||
        "Failed to update prescription.",
    );
  }
}

// =====================================================
// ADD PRESCRIPTION ITEM
// =====================================================

export async function addPrescriptionItem(
  prescriptionId: number,
  payload: PrescriptionItemCreate,
): Promise<PrescriptionItem> {
  try {
    const response = await api.post<PrescriptionItem>(
      `/prescriptions/${prescriptionId}/items`,
      payload,
    );

    return response.data;
  } catch (error: any) {
    const apiError = error?.response?.data as ApiError | undefined;

    throw new Error(
      apiError?.detail ||
        error?.message ||
        "Failed to add prescription item.",
    );
  }
}

// =====================================================
// UPDATE PRESCRIPTION ITEM
// =====================================================

export async function updatePrescriptionItem(
  itemId: number,
  payload: PrescriptionItemUpdate,
): Promise<PrescriptionItem> {
  try {
    const response = await api.put<PrescriptionItem>(
      `/prescriptions/items/${itemId}`,
      payload,
    );

    return response.data;
  } catch (error: any) {
    const apiError = error?.response?.data as ApiError | undefined;

    throw new Error(
      apiError?.detail ||
        error?.message ||
        "Failed to update prescription item.",
    );
  }
}

// =====================================================
// DELETE PRESCRIPTION ITEM
// =====================================================

export async function deletePrescriptionItem(
  itemId: number,
): Promise<unknown> {
  try {
    const response = await api.delete(
      `/prescriptions/items/${itemId}`,
    );

    return response.data;
  } catch (error: any) {
    const apiError = error?.response?.data as ApiError | undefined;

    throw new Error(
      apiError?.detail ||
        error?.message ||
        "Failed to delete prescription item.",
    );
  }
}

// =====================================================
// ACTIVATE PRESCRIPTION
// =====================================================

export async function activatePrescription(
  prescriptionId: number,
): Promise<Prescription> {
  try {
    const response = await api.post<Prescription>(
      `/prescriptions/${prescriptionId}/activate`,
    );

    return response.data;
  } catch (error: any) {
    const apiError = error?.response?.data as ApiError | undefined;

    throw new Error(
      apiError?.detail ||
        error?.message ||
        "Failed to activate prescription.",
    );
  }
}

// =====================================================
// COMPLETE PRESCRIPTION
// =====================================================

export async function completePrescription(
  prescriptionId: number,
): Promise<Prescription> {
  try {
    const response = await api.post<Prescription>(
      `/prescriptions/${prescriptionId}/complete`,
    );

    return response.data;
  } catch (error: any) {
    const apiError = error?.response?.data as ApiError | undefined;

    throw new Error(
      apiError?.detail ||
        error?.message ||
        "Failed to complete prescription.",
    );
  }
}

// =====================================================
// DISCONTINUE PRESCRIPTION
// =====================================================

export async function discontinuePrescription(
  prescriptionId: number,
): Promise<Prescription> {
  try {
    const response = await api.post<Prescription>(
      `/prescriptions/${prescriptionId}/discontinue`,
    );

    return response.data;
  } catch (error: any) {
    const apiError = error?.response?.data as ApiError | undefined;

    throw new Error(
      apiError?.detail ||
        error?.message ||
        "Failed to discontinue prescription.",
    );
  }
}

// =====================================================
// CANCEL PRESCRIPTION
// =====================================================

export async function cancelPrescription(
  prescriptionId: number,
): Promise<Prescription> {
  try {
    const response = await api.post<Prescription>(
      `/prescriptions/${prescriptionId}/cancel`,
    );

    return response.data;
  } catch (error: any) {
    const apiError = error?.response?.data as ApiError | undefined;

    throw new Error(
      apiError?.detail ||
        error?.message ||
        "Failed to cancel prescription.",
    );
  }
}