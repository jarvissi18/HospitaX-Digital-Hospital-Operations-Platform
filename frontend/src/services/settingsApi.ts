import api from "./api";

// =====================================================
// TYPES
// =====================================================

export interface Settings {
  id: number;

  hospital_name: string;
  hospital_address: string;
  hospital_phone: string;
  hospital_email: string;

  admin_name: string;
  admin_email: string;
  admin_phone: string;
  admin_role: string;
}

// =====================================================
// UPDATE PAYLOAD
// =====================================================

export type SettingsUpdate = Omit<
  Settings,
  "id"
>;

// =====================================================
// GET SETTINGS
// =====================================================

export const getSettings = async (): Promise<Settings> => {
  try {
    const response = await api.get<Settings>(
      "/settings/"
    );

    console.log(
      "GET /settings/ SUCCESS:",
      response.data
    );

    return response.data;
  } catch (error: any) {
    console.error(
      "GET /settings/ FAILED"
    );

    console.error(
      "Status:",
      error?.response?.status
    );

    console.error(
      "Response:",
      error?.response?.data
    );

    console.error(
      "Message:",
      error?.message
    );

    throw error;
  }
};

// =====================================================
// UPDATE SETTINGS
// =====================================================

export const updateSettings = async (
  settings: SettingsUpdate
): Promise<Settings> => {
  try {
    const response = await api.put<Settings>(
      "/settings/",
      settings
    );

    console.log(
      "PUT /settings/ SUCCESS:",
      response.data
    );

    return response.data;
  } catch (error: any) {
    console.error(
      "PUT /settings/ FAILED"
    );

    console.error(
      "Status:",
      error?.response?.status
    );

    console.error(
      "Response:",
      error?.response?.data
    );

    console.error(
      "Message:",
      error?.message
    );

    throw error;
  }
};