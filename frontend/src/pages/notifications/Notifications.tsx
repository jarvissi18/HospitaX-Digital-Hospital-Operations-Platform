
import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  ClipboardList,
  Clock,
  RefreshCw,
  AlertCircle,
  Inbox,
} from "lucide-react";

import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../../services/api";

import type {
  NotificationItem,
} from "../../services/api";

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      setError("");

      const [notificationResponse, countResponse] = await Promise.all([
        getNotifications(),
        getUnreadNotificationCount(),
      ]);

      setNotifications(notificationResponse);
      setUnreadCount(countResponse.unread_count);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setError("Unable to load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const handleMarkRead = async (id: number) => {
    try {
      setProcessingId(id);
      await markNotificationAsRead(id);

      setNotifications((current) =>
        current.map((item) =>
          item.id === id ? { ...item, is_read: true } : item
        )
      );

      setUnreadCount((current) =>
        Math.max(
          0,
          current - (notifications.find((item) => item.id === id)?.is_read ? 0 : 1)
        )
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      setError("Unable to update notification. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      await markAllNotificationsAsRead();

      setNotifications((current) =>
        current.map((item) => ({ ...item, is_read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      setError("Unable to mark all notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  };

  const formatDate = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getNotificationStyle = (type: string) => {
    switch (type) {
      case "task_assigned":
        return {
          label: "Task Assigned",
          icon: <ClipboardList size={19} />,
          color: "text-blue-600 bg-blue-50",
        };
      case "task_completed":
        return {
          label: "Task Completed",
          icon: <CheckCheck size={19} />,
          color: "text-emerald-600 bg-emerald-50",
        };
      default:
        return {
          label: type.replaceAll("_", " "),
          icon: <Bell size={19} />,
          color: "text-violet-600 bg-violet-50",
        };
    }
  };

  return (
    <div className="min-h-full space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <Bell size={16} />
            <span>Workspace</span>
            <span>/</span>
            <span>Notifications</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Notifications
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Stay updated on your hospital operations and assigned work.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void loadNotifications()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            disabled={unreadCount === 0 || markingAll}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck size={16} />
            {markingAll ? "Updating..." : "Mark all as read"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">
              Total Notifications
            </p>
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
              <Inbox size={20} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900">
            {notifications.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">
              Unread Notifications
            </p>
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
              <Bell size={20} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900">
            {unreadCount}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">
              Read Notifications
            </p>
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <Check size={20} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900">
            {notifications.filter((item) => item.is_read).length}
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button
            type="button"
            onClick={() => setError("")}
            className="font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-semibold text-gray-900">
              Recent Activity
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Your latest updates and alerts
            </p>
          </div>

          {unreadCount > 0 && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {unreadCount} unread
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-4 p-6">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex animate-pulse gap-4">
                <div className="h-11 w-11 rounded-xl bg-gray-100" />
                <div className="flex-1 space-y-3 py-1">
                  <div className="h-4 w-1/3 rounded bg-gray-100" />
                  <div className="h-3 w-3/4 rounded bg-gray-100" />
                  <div className="h-3 w-1/4 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="rounded-2xl bg-gray-50 p-5 text-gray-400">
              <Inbox size={32} />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-gray-900">
              You're all caught up
            </h3>
            <p className="mt-2 max-w-sm text-sm text-gray-500">
              There are no notifications to display right now. New activity
              will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => {
              const style = getNotificationStyle(
                notification.notification_type
              );

              return (
                <div
                  key={notification.id}
                  className={`flex flex-col gap-4 px-5 py-5 transition hover:bg-gray-50/70 sm:flex-row sm:items-start sm:px-6 ${
                    notification.is_read ? "bg-white" : "bg-blue-50/40"
                  }`}
                >
                  <div className="relative shrink-0">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${style.color}`}
                    >
                      {style.icon}
                    </div>
                    {!notification.is_read && (
                      <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-blue-600" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={`text-sm ${
                          notification.is_read
                            ? "font-medium text-gray-800"
                            : "font-semibold text-gray-900"
                        }`}
                      >
                        {notification.title}
                      </h3>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${style.color}`}
                      >
                        {style.label}
                      </span>

                      {!notification.is_read && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          New
                        </span>
                      )}
                    </div>

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
                      {notification.message}
                    </p>

                    <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
                      <Clock size={13} />
                      {formatDate(notification.created_at)}
                    </p>
                  </div>

                  {!notification.is_read && (
                    <button
                      type="button"
                      onClick={() => void handleMarkRead(notification.id)}
                      disabled={processingId === notification.id}
                      className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 sm:self-center"
                    >
                      <Check size={14} />
                      {processingId === notification.id
                        ? "Updating..."
                        : "Mark as read"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
