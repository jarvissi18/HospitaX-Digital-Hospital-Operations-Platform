import api from "./api";

// ============================================================
// TYPES
// ============================================================

export type PatientQueueStatus =
  | "Waiting"
  | "Called"
  | "In Triage"
  | "Ready"
  | "Completed"
  | "Cancelled"
  | "No-show";

export type TriagePriority =
  | "Normal"
  | "Urgent"
  | "Emergency";

export type TriageStatus =
  | "Pending"
  | "Completed";

// ============================================================
// PATIENT QUEUE
// ============================================================

export type PatientQueue = {
  id: number;
  appointment_id: number;
  patient_id: number;
  department_id: number;

  queue_number: number;

  status: PatientQueueStatus;

  triage_priority: TriagePriority;
  triage_status: TriageStatus;

  triage_notes: string | null;

  triaged_by: number | null;
  triaged_at: string | null;

  queued_at: string;
  called_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;

  created_at: string | null;
  updated_at: string | null;
};

// ============================================================
// CREATE QUEUE
// ============================================================

export type CreatePatientQueuePayload = {
  appointment_id: number;
};

// ============================================================
// UPDATE QUEUE
// ============================================================

export type UpdatePatientQueuePayload = {
  status?: PatientQueueStatus;
  triage_priority?: TriagePriority;
  triage_status?: TriageStatus;
  triage_notes?: string;
};

// ============================================================
// QUEUE FILTERS
// ============================================================

export type PatientQueueFilters = {
  department_id?: number;
  queue_status?: PatientQueueStatus;
  triage_status?: TriageStatus;
  triage_priority?: TriagePriority;
};

// ============================================================
// GET ALL QUEUE
// ============================================================

export async function getPatientQueue(
  filters?: PatientQueueFilters
): Promise<PatientQueue[]> {
  const response = await api.get<PatientQueue[]>(
    "/patient-queue",
    {
      params: {
        department_id:
          filters?.department_id,
        queue_status:
          filters?.queue_status,
        triage_status:
          filters?.triage_status,
        triage_priority:
          filters?.triage_priority,
      },
    }
  );

  return response.data;
}

// ============================================================
// GET SINGLE QUEUE ENTRY
// ============================================================

export async function getPatientQueueEntry(
  queueId: number
): Promise<PatientQueue> {
  const response =
    await api.get<PatientQueue>(
      `/patient-queue/${queueId}`
    );

  return response.data;
}

// ============================================================
// GET QUEUE BY APPOINTMENT
// ============================================================

export async function getQueueByAppointment(
  appointmentId: number
): Promise<PatientQueue> {
  const response =
    await api.get<PatientQueue>(
      `/patient-queue/appointment/${appointmentId}`
    );

  return response.data;
}

// ============================================================
// GET PATIENT QUEUE HISTORY
// ============================================================

export async function getPatientQueueHistory(
  patientId: number
): Promise<PatientQueue[]> {
  const response =
    await api.get<PatientQueue[]>(
      `/patient-queue/patient/${patientId}`
    );

  return response.data;
}

// ============================================================
// CREATE PATIENT QUEUE
// ============================================================

export async function createPatientQueue(
  payload: CreatePatientQueuePayload
): Promise<PatientQueue> {
  const response =
    await api.post<PatientQueue>(
      "/patient-queue",
      payload
    );

  return response.data;
}

// ============================================================
// UPDATE PATIENT QUEUE
// ============================================================

export async function updatePatientQueue(
  queueId: number,
  payload: UpdatePatientQueuePayload
): Promise<PatientQueue> {
  const response =
    await api.put<PatientQueue>(
      `/patient-queue/${queueId}`,
      payload
    );

  return response.data;
}

// ============================================================
// CALL PATIENT
// ============================================================

export async function callPatient(
  queueId: number
): Promise<PatientQueue> {
  const response =
    await api.post<PatientQueue>(
      `/patient-queue/${queueId}/call`
    );

  return response.data;
}

// ============================================================
// START TRIAGE
// ============================================================

export async function startPatientTriage(
  queueId: number
): Promise<PatientQueue> {
  const response =
    await api.post<PatientQueue>(
      `/patient-queue/${queueId}/triage/start`
    );

  return response.data;
}

// ============================================================
// COMPLETE TRIAGE
// ============================================================

export async function completePatientTriage(
  queueId: number,
  payload: {
    triage_priority: TriagePriority;
    triage_status: "Completed";
    triage_notes?: string;
  }
): Promise<PatientQueue> {
  const response =
    await api.post<PatientQueue>(
      `/patient-queue/${queueId}/triage/complete`,
      payload
    );

  return response.data;
}

// ============================================================
// MARK READY
// ============================================================

export async function markPatientReady(
  queueId: number
): Promise<PatientQueue> {
  const response =
    await api.post<PatientQueue>(
      `/patient-queue/${queueId}/ready`
    );

  return response.data;
}

// ============================================================
// COMPLETE QUEUE
// ============================================================

export async function completePatientQueue(
  queueId: number
): Promise<PatientQueue> {
  const response =
    await api.post<PatientQueue>(
      `/patient-queue/${queueId}/complete`
    );

  return response.data;
}

// ============================================================
// CANCEL QUEUE
// ============================================================

export async function cancelPatientQueue(
  queueId: number
): Promise<PatientQueue> {
  const response =
    await api.post<PatientQueue>(
      `/patient-queue/${queueId}/cancel`
    );

  return response.data;
}

// ============================================================
// MARK NO-SHOW
// ============================================================

export async function markPatientNoShow(
  queueId: number
): Promise<PatientQueue> {
  const response =
    await api.post<PatientQueue>(
      `/patient-queue/${queueId}/no-show`
    );

  return response.data;
}