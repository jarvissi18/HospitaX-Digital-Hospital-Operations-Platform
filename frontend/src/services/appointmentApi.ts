import api from "./api";

/* =====================================================
   TYPES
===================================================== */

export type AppointmentType =
  | "Scheduled"
  | "Walk-in";

export type AppointmentStatus =
  | "Scheduled"
  | "Checked-in"
  | "In Queue"
  | "Completed"
  | "Cancelled"
  | "No-show";


export type Appointment = {
  id: number;

  patient_id: number;
  department_id: number;
  doctor_id: number | null;

  scheduled_at: string;

  appointment_type: AppointmentType;
  status: AppointmentStatus;

  reason: string | null;
  notes: string | null;

  created_by: number | null;

  cancelled_at: string | null;

  created_at: string | null;
  updated_at: string | null;
};


/* =====================================================
   PAYLOADS
===================================================== */

export type CreateAppointmentPayload = {
  patient_id: number;
  department_id: number;

  doctor_id?: number | null;

  scheduled_at: string;

  appointment_type?: AppointmentType;

  reason?: string | null;
  notes?: string | null;
};


export type UpdateAppointmentPayload = {
  patient_id?: number;

  department_id?: number;

  doctor_id?: number | null;

  scheduled_at?: string;

  appointment_type?: AppointmentType;

  status?: AppointmentStatus;

  reason?: string | null;
  notes?: string | null;
};


/* =====================================================
   FILTERS
===================================================== */

export type AppointmentFilters = {
  patient_id?: number;
  department_id?: number;
  doctor_id?: number;
  status?: AppointmentStatus;
};


/* =====================================================
   GET ALL APPOINTMENTS
===================================================== */

export async function getAppointments(
  filters?: AppointmentFilters,
): Promise<Appointment[]> {
  const response = await api.get<Appointment[]>(
    "/appointments",
    {
      params: filters,
    },
  );

  return response.data;
}


/* =====================================================
   GET MY APPOINTMENTS
   Doctor only
===================================================== */

export async function getMyAppointments(): Promise<
  Appointment[]
> {
  const response =
    await api.get<Appointment[]>(
      "/appointments/my",
    );

  return response.data;
}


/* =====================================================
   GET PATIENT APPOINTMENTS
===================================================== */

export async function getPatientAppointments(
  patientId: number,
): Promise<Appointment[]> {
  const response =
    await api.get<Appointment[]>(
      `/appointments/patient/${patientId}`,
    );

  return response.data;
}


/* =====================================================
   GET SINGLE APPOINTMENT
===================================================== */

export async function getAppointment(
  appointmentId: number,
): Promise<Appointment> {
  const response =
    await api.get<Appointment>(
      `/appointments/${appointmentId}`,
    );

  return response.data;
}


/* =====================================================
   CREATE APPOINTMENT
===================================================== */

export async function createAppointment(
  payload: CreateAppointmentPayload,
): Promise<Appointment> {
  const response =
    await api.post<Appointment>(
      "/appointments",
      payload,
    );

  return response.data;
}


/* =====================================================
   UPDATE APPOINTMENT
===================================================== */

export async function updateAppointment(
  appointmentId: number,
  payload: UpdateAppointmentPayload,
): Promise<Appointment> {
  const response =
    await api.put<Appointment>(
      `/appointments/${appointmentId}`,
      payload,
    );

  return response.data;
}


/* =====================================================
   CHECK-IN APPOINTMENT
===================================================== */

export async function checkInAppointment(
  appointmentId: number,
): Promise<Appointment> {
  const response =
    await api.post<Appointment>(
      `/appointments/${appointmentId}/check-in`,
    );

  return response.data;
}


/* =====================================================
   MOVE APPOINTMENT TO QUEUE
===================================================== */

export async function queueAppointment(
  appointmentId: number,
): Promise<Appointment> {
  const response =
    await api.post<Appointment>(
      `/appointments/${appointmentId}/queue`,
    );

  return response.data;
}


/* =====================================================
   COMPLETE APPOINTMENT
===================================================== */

export async function completeAppointment(
  appointmentId: number,
): Promise<Appointment> {
  const response =
    await api.post<Appointment>(
      `/appointments/${appointmentId}/complete`,
    );

  return response.data;
}


/* =====================================================
   CANCEL APPOINTMENT
===================================================== */

export async function cancelAppointment(
  appointmentId: number,
): Promise<Appointment> {
  const response =
    await api.post<Appointment>(
      `/appointments/${appointmentId}/cancel`,
    );

  return response.data;
}


/* =====================================================
   MARK APPOINTMENT AS NO-SHOW
===================================================== */

export async function markAppointmentNoShow(
  appointmentId: number,
): Promise<Appointment> {
  const response =
    await api.post<Appointment>(
      `/appointments/${appointmentId}/no-show`,
    );

  return response.data;
}