import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// =====================================================
// REQUEST INTERCEPTOR
// =====================================================

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// =====================================================
// RESPONSE INTERCEPTOR
// =====================================================

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (
      status === 401 &&
      window.location.pathname !== "/"
    ) {
      console.warn(
        "Authentication expired or user no longer exists."
      );

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      window.location.href = "/";
    }

    return Promise.reject(error);
  }
);

// =====================================================
// NOTIFICATION TYPES
// =====================================================

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationUnreadCount {
  unread_count: number;
}

// =====================================================
// NOTIFICATION API
// =====================================================

export const getNotifications = async (): Promise<
  NotificationItem[]
> => {
  const response = await api.get<NotificationItem[]>(
    "/notifications"
  );

  return response.data;
};

export const getUnreadNotificationCount = async (): Promise<
  NotificationUnreadCount
> => {
  const response = await api.get<NotificationUnreadCount>(
    "/notifications/unread-count"
  );

  return response.data;
};

export const markNotificationAsRead = async (
  notificationId: number
) => {
  const response = await api.patch(
    `/notifications/${notificationId}/read`
  );

  return response.data;
};

export const markAllNotificationsAsRead = async () => {
  const response = await api.patch(
    "/notifications/read-all"
  );

  return response.data;
};

export default api;
