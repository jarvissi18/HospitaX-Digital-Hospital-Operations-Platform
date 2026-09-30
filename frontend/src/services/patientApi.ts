import api from "./api";
import type { Patient } from "../types/patient";

/* =====================================================
   PATIENT ASSIGNMENT TYPES
===================================================== */

export type PatientAssignmentStatus =
  | "Active"
  | "Released"
  | "Transferred"
  | "Cancelled";

export type PatientAssignmentType =
  | "Patient Allocation"
  | "Doctor Assignment"
  | "Nurse Assignment"
  | "Ward Assignment"
  | "Bed Assignment";

export interface PatientAssignment {
  id: number;

  patient_id: number;

  department_id: number | null;
  doctor_id: number | null;
  nurse_id: number | null;
  ward_id: number | null;
  bed_id: number | null;

  assignment_type: PatientAssignmentType;
  status: PatientAssignmentStatus;

  notes: string | null;

  assigned_by: number | null;
  assigned_at: string | null;
  released_at: string | null;
}

export interface PatientAssignmentCreate {
  patient_id: number;

  department_id?: number | null;
  doctor_id?: number | null;
  nurse_id?: number | null;
  ward_id?: number | null;
  bed_id?: number | null;

  assignment_type?: PatientAssignmentType;
  status?: PatientAssignmentStatus;

  notes?: string | null;
}

export interface PatientAssignmentUpdate {
  department_id?: number | null;
  doctor_id?: number | null;
  nurse_id?: number | null;
  ward_id?: number | null;
  bed_id?: number | null;

  assignment_type?: PatientAssignmentType;
  status?: PatientAssignmentStatus;

  notes?: string | null;
}

/* =====================================================
   GET ALL PATIENTS
===================================================== */

export const getPatients = async (): Promise<Patient[]> => {
  const response = await api.get("/patients/");
  return response.data;
};

/* =====================================================
   GET SINGLE PATIENT
===================================================== */

export const getPatient = async (
  id: number
): Promise<Patient> => {
  const response = await api.get(`/patients/${id}`);
  return response.data;
};

/* =====================================================
   DASHBOARD STATS
===================================================== */

export interface DashboardStats {
  todayPatients: number;
  voiceStatus: string;
  totalPatients: number;
  activeCases: number;
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await api.get("/dashboard/stats");
  return response.data;
};

/* =====================================================
   ANALYTICS SUMMARY
===================================================== */

export interface AnalyticsSummary {
  totalPatients: number;
  todayPatients: number;
  malePatients: number;
  femalePatients: number;
}

export const getAnalyticsSummary =
  async (): Promise<AnalyticsSummary> => {
    const response = await api.get("/analytics/summary");
    return response.data;
  };

/* =====================================================
   WEEKLY ANALYTICS
===================================================== */

export interface WeeklyAnalytics {
  day: string;
  patients: number;
}

export const getWeeklyAnalytics =
  async (): Promise<WeeklyAnalytics[]> => {
    const response = await api.get("/analytics/weekly");
    return response.data;
  };

/* =====================================================
   TOP DISEASES
===================================================== */

export interface TopDisease {
  disease: string;
  patients: number;
}

export const getTopDiseases = async (): Promise<TopDisease[]> => {
  const response = await api.get("/analytics/top-diseases");
  return response.data;
};

/* =====================================================
   MONTHLY PATIENTS
===================================================== */

export interface MonthlyPatient {
  month: string;
  patients: number;
}

export const getMonthlyPatients = async (): Promise<MonthlyPatient[]> => {
  const response = await api.get("/analytics/monthly");
  return response.data;
};

/* =====================================================
   CREATE PATIENT
===================================================== */

export const createPatient = async (
  patient: Omit<Patient, "id">
): Promise<Patient> => {
  const response = await api.post("/patients/", patient);
  return response.data;
};

/* =====================================================
   UPDATE PATIENT
===================================================== */

export const updatePatient = async (
  id: number,
  patient: Omit<Patient, "id">
): Promise<Patient> => {
  const response = await api.put(
    `/patients/${id}`,
    patient
  );

  return response.data;
};

/* =====================================================
   DELETE PATIENT
===================================================== */

export const deletePatient = async (
  id: number
): Promise<void> => {
  await api.delete(`/patients/${id}`);
};

/* =====================================================
   GET PATIENT ASSIGNMENT HISTORY
===================================================== */

export const getPatientAssignments = async (
  patientId: number
): Promise<PatientAssignment[]> => {
  const response = await api.get(
    `/patients/${patientId}/assignments`
  );

  return response.data;
};

/* =====================================================
   GET ACTIVE PATIENT ASSIGNMENT
===================================================== */

export const getActivePatientAssignment = async (
  patientId: number
): Promise<PatientAssignment | null> => {
  const response = await api.get(
    `/patients/${patientId}/assignments/active`
  );

  return response.data ?? null;
};

/* =====================================================
   CREATE PATIENT ASSIGNMENT
===================================================== */

export const createPatientAssignment = async (
  patientId: number,
  assignment: PatientAssignmentCreate
): Promise<PatientAssignment> => {
  const response = await api.post(
    `/patients/${patientId}/assignments`,
    assignment
  );

  return response.data;
};

/* =====================================================
   UPDATE PATIENT ASSIGNMENT
===================================================== */

export const updatePatientAssignment = async (
  patientId: number,
  assignmentId: number,
  assignment: PatientAssignmentUpdate
): Promise<PatientAssignment> => {
  const response = await api.put(
    `/patients/${patientId}/assignments/${assignmentId}`,
    assignment
  );

  return response.data;
};

/* =====================================================
   RELEASE PATIENT ASSIGNMENT
===================================================== */

export const releasePatientAssignment = async (
  patientId: number,
  assignmentId: number
): Promise<PatientAssignment> => {
  const response = await api.post(
    `/patients/${patientId}/assignments/${assignmentId}/release`
  );

  return response.data;
};

/* =====================================================
   VOICE AI
===================================================== */

export const parseVoice = async (
  transcript: string
) => {
  const response = await api.post("/voice/parse", {
    transcript,
  });

  return response.data;
};