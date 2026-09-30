import api from "./api";

// =====================================================
// TYPES
// =====================================================

export interface User {
  id: number;

  employee_id?: string | null;

  full_name: string;

  email?: string | null;

  mobile?: string | null;

  role: string;

  shift?: string | null;

  is_active: string | boolean;
}


// =====================================================
// LOGIN REQUEST
// =====================================================

export interface LoginRequest {
  identifier: string;
  password?: string;
  pin?: string;
}


// =====================================================
// LOGIN RESPONSE
// =====================================================

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}


// =====================================================
// PROFILE UPDATE
// =====================================================

export interface ProfileUpdateRequest {
  full_name: string;
  email: string;
}


// =====================================================
// CHANGE PASSWORD
// =====================================================

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}


// =====================================================
// MESSAGE RESPONSE
// =====================================================

export interface MessageResponse {
  message: string;
}


// =====================================================
// LOGIN
// =====================================================

export const login = async (
  data: LoginRequest
): Promise<LoginResponse> => {
  const response =
    await api.post<LoginResponse>(
      "/auth/login",
      data
    );

  return response.data;
};


// =====================================================
// GET CURRENT USER
// =====================================================

export const getCurrentUser =
  async (): Promise<User> => {
    const response =
      await api.get<User>(
        "/auth/me"
      );

    return response.data;
  };


// =====================================================
// UPDATE PROFILE
// =====================================================

export const updateProfile =
  async (
    data: ProfileUpdateRequest
  ): Promise<User> => {
    const response =
      await api.put<User>(
        "/auth/profile",
        data
      );

    return response.data;
  };


// =====================================================
// CHANGE PASSWORD
// =====================================================

export const changePassword =
  async (
    data: ChangePasswordRequest
  ): Promise<MessageResponse> => {
    const response =
      await api.put<MessageResponse>(
        "/auth/change-password",
        data
      );

    return response.data;
  };