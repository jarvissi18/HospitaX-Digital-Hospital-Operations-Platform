
import { useEffect, useRef, useState } from "react";
import {
  User,
  LogOut,
  ChevronUp,
  ShieldCheck,
  Bell,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getUnreadNotificationCount } from "../../services/api";

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Refresh unread count periodically while authenticated.
  useEffect(() => {
    let active = true;

    const refreshUnreadCount = async () => {
      try {
        const result = await getUnreadNotificationCount();

        if (active) {
          setUnreadCount(result.unread_count);
        }
      } catch (error) {
        // Keep the profile menu usable if notifications are unavailable.
        console.error("Unable to refresh notification count.", error);
      }
    };

    void refreshUnreadCount();

    const intervalId = window.setInterval(() => {
      void refreshUnreadCount();
    }, 30000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  // Close dropdown when clicking outside.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const initials =
    user?.full_name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const openProfile = () => {
    setOpen(false);
    navigate("/profile");
  };

  const openNotifications = () => {
    setOpen(false);
    navigate("/notifications");
  };



  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div ref={menuRef} className="relative w-full">
      {/* Profile button */}
      <button
        type="button"
        aria-label="Open profile menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all duration-200 ${
          open
            ? "border-blue-500/30 bg-blue-500/[0.10] shadow-lg shadow-blue-950/10"
            : "border-white/[0.07] bg-white/[0.035] hover:border-white/[0.12] hover:bg-white/[0.055]"
        }`}
      >
        {/* Avatar */}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-blue-900/20">
          {initials}

          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#08111F] bg-emerald-400 shadow-sm shadow-emerald-400/50" />

          {unreadCount > 0 && (
            <span
              className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#08111F] bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-md"
              aria-label={`${unreadCount} unread notifications`}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>

        {/* User information */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-slate-100">
            {user?.full_name || "User"}
          </p>
          <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500">
            {user?.role || "Hospital Staff"}
          </p>
        </div>

        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition group-hover:text-slate-300">
          <ChevronUp
            size={16}
            className={`transition-transform duration-200 ${
              open ? "rotate-180 text-blue-400" : "rotate-0"
            }`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-[calc(100%+10px)] left-0 z-[200] w-full min-w-[250px] origin-bottom animate-profileMenu">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.22)] ring-1 ring-black/5">
            {/* Profile header */}
            <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-sm font-bold text-white shadow-md shadow-blue-500/20">
                  {initials}
                  <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {user?.full_name || "User"}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">
                    {user?.email || "No email"}
                  </p>
                </div>
              </div>

              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1">
                <ShieldCheck size={12} className="text-blue-600" />
                <span className="text-[10px] font-bold text-blue-700">
                  {user?.role || "Hospital Staff"}
                </span>
              </div>
            </div>

            {/* Menu actions */}
            <div className="p-2">
              <button
                type="button"
                onClick={openProfile}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 hover:bg-slate-50"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition group-hover:bg-blue-100">
                  <User size={15} />
                </span>
                <span>
                  <span className="block text-xs font-semibold text-slate-800">
                    My Profile
                  </span>
                  <span className="mt-0.5 block text-[10px] text-slate-400">
                    Manage your account
                  </span>
                </span>
              </button>

              {/* Notifications */}
              <button
                type="button"
                onClick={openNotifications}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 hover:bg-blue-50"
              >
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-100">
                  <Bell size={15} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-white bg-red-500" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                        {unreadCount > 99 ? "99+" : unreadCount} new
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-slate-400">
                    View your notifications
                  </span>
                </span>
              </button>

            

              <div className="my-2 h-px bg-slate-100" />

              <button
                type="button"
                onClick={handleLogout}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 hover:bg-red-50"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500 transition group-hover:bg-red-100">
                  <LogOut size={15} />
                </span>
                <span>
                  <span className="block text-xs font-semibold text-red-600">
                    Sign out
                  </span>
                  <span className="mt-0.5 block text-[10px] text-red-400">
                    End your current session
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
