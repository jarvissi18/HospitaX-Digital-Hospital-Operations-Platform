import api from "./api";

// =====================================================
// ATTENDANCE TYPES
// =====================================================

export interface AttendanceRecord {
  id: number;
  user_id: number;
  attendance_date: string;
  shift: string;
  check_in?: string | null;
  check_out?: string | null;
  status: string;
  work_duration_minutes?: number | null;
  notes?: string | null;
}

export interface AttendanceSummary {
  date?: string;
  total_staff?: number;
  present?: number;
  late?: number;
  absent?: number;
  leave?: number;
  available_for_assignment?: number;
}

export interface AttendanceAvailability {
  user_id: number;
  employee_id?: string | null;
  full_name?: string;
  role?: string;
  shift?: string | null;
  attendance_status?: string | null;
  is_available?: boolean;
}

export interface AttendanceCreateRequest {
  user_id: number;
  attendance_date: string;
  shift: string;
  check_in?: string | null;
  check_out?: string | null;
  status: string;
  work_duration_minutes?: number | null;
  notes?: string | null;
}

export interface AttendanceUpdateRequest {
  attendance_date?: string;
  shift?: string;
  check_in?: string | null;
  check_out?: string | null;
  status?: string;
  work_duration_minutes?: number | null;
  notes?: string | null;
}

export interface AttendanceCheckInRequest {
  user_id: number;
  attendance_date: string;
  shift: string;
  notes?: string | null;
}

export interface AttendanceCheckOutRequest {
  user_id: number;
  attendance_date: string;
  notes?: string | null;
}

export interface AvailableStaff {
  id: number;
  employee_id?: string | null;
  full_name: string;
  email?: string | null;
  mobile?: string | null;
  role: string;
  shift?: string | null;
  is_active?: string;
}


// =====================================================
// GET ALL ATTENDANCE
// =====================================================

export const getAttendance = async (): Promise<
  AttendanceRecord[]
> => {
  const response = await api.get<AttendanceRecord[]>(
    "/attendance",
  );

  return response.data;
};


// =====================================================
// GET TODAY'S ATTENDANCE
// =====================================================

export const getTodayAttendance = async (): Promise<
  AttendanceRecord[]
> => {
  const response =
    await api.get<AttendanceRecord[]>(
      "/attendance/today",
    );

  return response.data;
};


// =====================================================
// GET MY TODAY'S ATTENDANCE
// =====================================================

export const getMyAttendance = async (): Promise<
  AttendanceRecord
> => {
  const response =
    await api.get<AttendanceRecord>(
      "/attendance/me",
    );

  return response.data;
};


// =====================================================
// GET MY ATTENDANCE HISTORY
// STAFF SELF-SERVICE
// =====================================================

export const getMyAttendanceHistory = async (): Promise<
  AttendanceRecord[]
> => {
  const response =
    await api.get<AttendanceRecord[]>(
      "/attendance/me/history",
    );

  return response.data;
};


// =====================================================
// GET ATTENDANCE SUMMARY
// =====================================================

export const getAttendanceSummary =
  async (): Promise<AttendanceSummary> => {
    const response =
      await api.get<AttendanceSummary>(
        "/attendance/summary",
      );

    return response.data;
  };


// =====================================================
// GET STAFF AVAILABILITY
// =====================================================

export const getAttendanceAvailability =
  async (): Promise<
    AttendanceAvailability[]
  > => {
    const response =
      await api.get<AttendanceAvailability[]>(
        "/attendance/availability",
      );

    return response.data;
  };


// =====================================================
// GET AVAILABLE STAFF
// =====================================================

export const getAvailableStaff = async (
  role?: string,
): Promise<AvailableStaff[]> => {
  const response =
    await api.get<AvailableStaff[]>(
      "/attendance/available-staff",
      {
        params: role
          ? { role }
          : undefined,
      },
    );

  return response.data;
};


// =====================================================
// CREATE ATTENDANCE
// ADMIN ONLY
// =====================================================

export const createAttendance = async (
  data: AttendanceCreateRequest,
): Promise<AttendanceRecord> => {
  const response =
    await api.post<AttendanceRecord>(
      "/attendance",
      data,
    );

  return response.data;
};


// =====================================================
// ADMIN CHECK-IN
// =====================================================

export const checkIn = async (
  data: AttendanceCheckInRequest,
): Promise<AttendanceRecord> => {
  const response =
    await api.post<AttendanceRecord>(
      "/attendance/check-in",
      data,
    );

  return response.data;
};


// =====================================================
// ADMIN CHECK-OUT
// =====================================================

export const checkOut = async (
  data: AttendanceCheckOutRequest,
): Promise<AttendanceRecord> => {
  const response =
    await api.post<AttendanceRecord>(
      "/attendance/check-out",
      data,
    );

  return response.data;
};


// =====================================================
// STAFF SELF-SERVICE CHECK-IN
// =====================================================

export const checkInSelf = async (): Promise<
  AttendanceRecord
> => {
  const response =
    await api.post<AttendanceRecord>(
      "/attendance/me/check-in",
      {},
    );

  return response.data;
};


// =====================================================
// STAFF SELF-SERVICE CHECK-OUT
// =====================================================

export const checkOutSelf = async (): Promise<
  AttendanceRecord
> => {
  const response =
    await api.post<AttendanceRecord>(
      "/attendance/me/check-out",
      {},
    );

  return response.data;
};


// =====================================================
// GET ATTENDANCE BY ID
// ADMIN ONLY
// =====================================================

export const getAttendanceById = async (
  attendanceId: number,
): Promise<AttendanceRecord> => {
  const response =
    await api.get<AttendanceRecord>(
      `/attendance/${attendanceId}`,
    );

  return response.data;
};


// =====================================================
// UPDATE ATTENDANCE
// ADMIN ONLY
// =====================================================

export const updateAttendance = async (
  attendanceId: number,
  data: AttendanceUpdateRequest,
): Promise<AttendanceRecord> => {
  const response =
    await api.put<AttendanceRecord>(
      `/attendance/${attendanceId}`,
      data,
    );

  return response.data;
};


// =====================================================
// DELETE ATTENDANCE
// ADMIN ONLY
// =====================================================

export const deleteAttendance = async (
  attendanceId: number,
): Promise<void> => {
  await api.delete(
    `/attendance/${attendanceId}`,
  );
};