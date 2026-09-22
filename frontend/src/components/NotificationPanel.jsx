import { markNotificationRead } from "../api/resources";

export default function NotificationPanel({ notifications, onClose, onRefresh }) {
  const handleMarkRead = async (id) => {
    await markNotificationRead(id);
    onRefresh();
  };

  return (
    <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <span className="text-sm font-semibold text-slate-800">Notifications</span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-700"
        >
          Close
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 && (
          <p className="p-4 text-sm text-slate-400">No notifications yet.</p>
        )}
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`border-b border-slate-50 px-3 py-2.5 text-sm ${
              n.read ? "text-slate-400" : "bg-indigo-50/50 text-slate-800"
            }`}
          >
            <p>{n.message}</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {new Date(n.created_at).toLocaleString()}
              </span>
              {!n.read && (
                <button
                  type="button"
                  onClick={() => handleMarkRead(n.id)}
                  className="text-[11px] font-medium text-indigo-600 hover:underline"
                >
                  Mark read
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
