import { useEffect, useState, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Store,
  FilePlus,
  Handshake,
  Bell,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getMyNotifications } from "../api/resources";
import NotificationPanel from "./NotificationPanel";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "true");
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

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem("sidebarCollapsed", String(!c));
      return !c;
    });
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const isClient = user.role === "client";

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/marketplace", label: "Browse Marketplace", icon: Store },
    {
      to: isClient ? "/client/new" : "/supplier/new",
      label: isClient ? "New Requirement" : "New Offering",
      icon: FilePlus,
    },
    { to: "/past-interest", label: "Past Interest", icon: Handshake },
  ];

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-all ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-4">
        {!collapsed && (
          <span className="truncate text-base font-semibold text-slate-900">Matchmaking</span>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? "Expand" : "Collapse"}
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "border-l-2 border-indigo-600 bg-indigo-50 text-indigo-700"
                  : "border-l-2 border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setPanelOpen((o) => !o)}
            title={collapsed ? "Notifications" : undefined}
            className="relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            <Bell className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Notifications</span>}
            {unreadCount > 0 && (
              <span
                className={`flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white ${
                  collapsed ? "absolute -right-0.5 -top-0.5" : "ml-auto"
                }`}
              >
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

        {!collapsed && (
          <div className="mt-2 px-3">
            <p className="truncate text-xs text-slate-500">{user.email}</p>
            <span className="mt-1 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-600">
              {user.role}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? "Log out" : undefined}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
}
