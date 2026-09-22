import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { getMyNotifications } from "../api/resources";
import NotificationPanel from "./NotificationPanel";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getMyNotifications();
      setNotifications(data);
    } catch {
      // silent — notification bell isn't critical path
    }
  }, [user]);

  useEffect(() => {
    refresh();
    // Light polling so new matches show up without a full page reload.
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-semibold text-slate-900">
          Matchmaking Platform
        </Link>

        {user && (
          <div className="flex items-center gap-5">
            <Link
              to="/dashboard"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Dashboard
            </Link>
            <Link
              to="/marketplace"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Browse
            </Link>
            {user.role === "client" && (
              <Link
                to="/client/new"
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                New Requirement
              </Link>
            )}
            {user.role === "supplier" && (
              <Link
                to="/supplier/new"
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                New Offering
              </Link>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setPanelOpen((o) => !o)}
                className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100"
                aria-label="Notifications"
              >
                <BellIcon />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-semibold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {panelOpen && (
                <NotificationPanel
                  notifications={notifications}
                  onClose={() => setPanelOpen(false)}
                  onRefresh={refresh}
                />
              )}
            </div>

            <span className="text-sm text-slate-400">{user.email}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
      />
    </svg>
  );
}
