import api from "./api";

// =====================================================
// TYPES
// =====================================================

export type ReferralStatus =
  | "PENDING"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export type ReferralPriority =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "URGENT";

export type ReferralType =
  | "SPECIALIST"
  | "DEPARTMENT"
  | "SECOND_OPINION"
  | "FOLLOW_UP"
  | "OTHER";

// =====================================================
// REFERRAL
// =====================================================

export interface Referral {
  id: number;

  patient_id: number;
  patient_name: string | null;

  encounter_id: number;

  referred_by_id: number;
  referring_doctor_name: string | null;

  referred_to_id: number | null;
  receiving_doctor_name: string | null;

  department_id: number | null;
  department_name: string | null;

  specialty: string | null;
  referral_type: ReferralType;

  reason: string;
  clinical_summary: string | null;

  priority: ReferralPriority;
  status: ReferralStatus;

  notes: string | null;

  referred_at: string | null;
  updated_at: string | null;

  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
}

// =====================================================
// CREATE
// =====================================================

export interface ReferralCreate {
  patient_id: number;
  encounter_id: number;

  referred_to_id?: number | null;
  department_id?: number | null;

  specialty?: string | null;
  referral_type: ReferralType;

  reason: string;
  clinical_summary?: string | null;

  priority?: ReferralPriority;
  notes?: string | null;
}

// =====================================================
// UPDATE
// =====================================================

export interface ReferralUpdate {
  specialty?: string | null;
  referral_type?: ReferralType;
  reason?: string;
  clinical_summary?: string | null;
  priority?: ReferralPriority;
  notes?: string | null;
}

// =====================================================
// STATUS UPDATE
// =====================================================

export interface ReferralStatusUpdate {
  status: ReferralStatus;
  notes?: string | null;
}

// =====================================================
// API RESPONSE HELPERS
// =====================================================

type ApiError = {
  detail?: string;
};

function getApiErrorMessage(
  error: any,
  fallback: string,
): string {
  const apiError = error?.response?.data as ApiError | undefined;

  return (
    apiError?.detail ||
    error?.message ||
    fallback
  );
}

// =====================================================
// CREATE REFERRAL
// =====================================================

export async function createReferral(
  payload: ReferralCreate,
): Promise<Referral> {
  try {
    const response = await api.post<Referral>(
      "/referrals",
      payload,
    );

    return response.data;
  } catch (error: any) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Failed to create referral.",
      ),
    );
  }
}

// =====================================================
// GET REFERRAL
// =====================================================

export async function getReferral(
  referralId: number,
): Promise<Referral> {
  try {
    const response = await api.get<Referral>(
      `/referrals/${referralId}`,
    );

    return response.data;
  } catch (error: any) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Failed to load referral.",
      ),
    );
  }
}

// =====================================================
// GET PATIENT REFERRALS
// =====================================================

export async function getPatientReferrals(
  patientId: number,
): Promise<Referral[]> {
  try {
    const response = await api.get<Referral[]>(
      `/referrals/patient/${patientId}`,
    );

    return response.data;
  } catch (error: any) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Failed to load patient referrals.",
      ),
    );
  }
}

// =====================================================
// GET ENCOUNTER REFERRALS
// =====================================================

export async function getEncounterReferrals(
  encounterId: number,
): Promise<Referral[]> {
  try {
    const response = await api.get<Referral[]>(
      `/referrals/encounter/${encounterId}`,
    );

    return response.data;
  } catch (error: any) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Failed to load encounter referrals.",
      ),
    );
  }
}

// =====================================================
// GET MY REFERRALS
// =====================================================

export async function getMyReferrals(): Promise<Referral[]> {
  try {
    const response = await api.get<Referral[]>(
      "/referrals/my",
    );

    return response.data;
  } catch (error: any) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Failed to load your referrals.",
      ),
    );
  }
}

// =====================================================
// UPDATE REFERRAL
// =====================================================

export async function updateReferral(
  referralId: number,
  payload: ReferralUpdate,
): Promise<Referral> {
  try {
    const response = await api.put<Referral>(
      `/referrals/${referralId}`,
      payload,
    );

    return response.data;
  } catch (error: any) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Failed to update referral.",
      ),
    );
  }
}

// =====================================================
// ACCEPT REFERRAL
// =====================================================

export async function acceptReferral(
  referralId: number,
  notes?: string | null,
): Promise<Referral> {
  try {
    const response = await api.post<Referral>(
      `/referrals/${referralId}/accept`,
      {
        status: "ACCEPTED",
        ...(notes?.trim()
          ? { notes: notes.trim() }
          : {}),
      },
    );

    return response.data;
  } catch (error: any) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Failed to accept referral.",
      ),
    );
  }
}

// =====================================================
// START REFERRAL
// =====================================================

export async function startReferral(
  referralId: number,
  notes?: string | null,
): Promise<Referral> {
  try {
    const response = await api.post<Referral>(
      `/referrals/${referralId}/start`,
      {
        status: "IN_PROGRESS",
        ...(notes?.trim()
          ? { notes: notes.trim() }
          : {}),
      },
    );

    return response.data;
  } catch (error: any) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Failed to start referral.",
      ),
    );
  }
}

// =====================================================
// COMPLETE REFERRAL
// =====================================================

export async function completeReferral(
  referralId: number,
  notes?: string | null,
): Promise<Referral> {
  try {
    const response = await api.post<Referral>(
      `/referrals/${referralId}/complete`,
      {
        status: "COMPLETED",
        ...(notes?.trim()
          ? { notes: notes.trim() }
          : {}),
      },
    );

    return response.data;
  } catch (error: any) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Failed to complete referral.",
      ),
    );
  }
}

// =====================================================
// REJECT REFERRAL
// =====================================================

export async function rejectReferral(
  referralId: number,
  notes?: string | null,
): Promise<Referral> {
  try {
    const response = await api.post<Referral>(
      `/referrals/${referralId}/reject`,
      {
        status: "REJECTED",
        ...(notes?.trim()
          ? { notes: notes.trim() }
          : {}),
      },
    );

    return response.data;
  } catch (error: any) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Failed to reject referral.",
      ),
    );
  }
}

// =====================================================
// CANCEL REFERRAL
// =====================================================

export async function cancelReferral(
  referralId: number,
  notes?: string | null,
): Promise<Referral> {
  try {
    const response = await api.post<Referral>(
      `/referrals/${referralId}/cancel`,
      {
        status: "CANCELLED",
        ...(notes?.trim()
          ? { notes: notes.trim() }
          : {}),
      },
    );

    return response.data;
  } catch (error: any) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Failed to cancel referral.",
      ),
    );
  }
}
