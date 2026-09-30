import api from "./api";

// =====================================================
// TYPES
// =====================================================

export type StaffRole =
  | "Administrator"
  | "Doctor"
  | "Nurse"
  | "Receptionist"
  | "Housekeeper";

export interface User {
  id: number;

  full_name: string;

  email?: string | null;

  role: StaffRole | string;

  is_active: string;

  employee_id?: string | null;

  mobile?: string | null;

  shift?: string | null;
}

export interface CreateUserRequest {
  // ---------------------------------------------------
  // BASIC INFORMATION
  // ---------------------------------------------------

  full_name: string;

  // Optional.
  // Staff can be created without an email address.
  email?: string;

  // Optional.
  // If provided, backend validates and hashes it.
  password?: string;

  // Mandatory security credential.
  pin: string;

  // ---------------------------------------------------
  // ROLE
  // ---------------------------------------------------

  role:
    | "Doctor"
    | "Nurse"
    | "Receptionist"
    | "Housekeeper";

  // ---------------------------------------------------
  // STAFF DETAILS
  // ---------------------------------------------------
  //
  // Employee ID is intentionally optional.
  // Backend automatically generates it when omitted.
  //

  employee_id?: string;

  // Optional for ALL staff roles.
  mobile?: string;

  // Optional.
  shift?: string;
}

export interface UpdateUserRequest {
  full_name: string;

  // Email remains optional during update.
  email?: string;
}

export interface UpdateUserStatusRequest {
  is_active: "true" | "false";
}

export interface MessageResponse {
  message: string;
}

// =====================================================
// GET ALL USERS
// =====================================================

export const getUsers = async (): Promise<
  User[]
> => {
  const response =
    await api.get<User[]>(
      "/users",
    );

  return response.data;
};

// =====================================================
// GET ACTIVE DOCTORS
// =====================================================
//
// Used by Appointment Management.
// Backend endpoint:
// GET /users/doctors
//
// This endpoint is accessible to:
// Administrator, Receptionist and Doctor.
//
// It returns only active users whose role is Doctor.
//

export const getDoctors = async (): Promise<
  User[]
> => {
  const response =
    await api.get<User[]>(
      "/users/doctors",
    );

  return response.data;
};

// =====================================================
// CREATE USER
// =====================================================

export const createUser = async (
  data: CreateUserRequest,
): Promise<User> => {
  const response =
    await api.post<User>(
      "/users",
      data,
    );

  return response.data;
};

// =====================================================
// UPDATE USER
// =====================================================

export const updateUser = async (
  userId: number,
  data: UpdateUserRequest,
): Promise<User> => {
  const response =
    await api.put<User>(
      `/users/${userId}`,
      data,
    );

  return response.data;
};

// =====================================================
// UPDATE USER STATUS
// =====================================================

export const updateUserStatus = async (
  userId: number,
  data: UpdateUserStatusRequest,
): Promise<User> => {
  const response =
    await api.patch<User>(
      `/users/${userId}/status`,
      data,
    );

  return response.data;
};

// =====================================================
// DELETE USER
// =====================================================

export const deleteUser = async (
  userId: number,
): Promise<MessageResponse> => {
  const response =
    await api.delete<MessageResponse>(
      `/users/${userId}`,
    );

  return response.data;
};