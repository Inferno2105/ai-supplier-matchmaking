import { useEffect, useState, useCallback } from "react";
import { MessageCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getInterestsWithChats } from "../api/resources";
import InitialAvatar from "../components/InitialAvatar";
import WithdrawnBadge from "../components/WithdrawnBadge";
import EmptyState from "../components/EmptyState";
import DetailSlideOver from "../components/DetailSlideOver";
import ChatPanel from "../components/ChatPanel";
import { getRoleAccent } from "../roleTheme";

export default function ChatsPage() {
  const { user } = useAuth();
  const accent = getRoleAccent(user?.role);
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState({ open: false, type: null, id: null });
  const [chat, setChat] = useState({ open: false, interestId: null, counterpartName: null });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await getInterestsWithChats();
    setInterests(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Chats</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Every accepted interest you've exchanged at least one message on.
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {loading && <p className="p-6 text-sm text-slate-400 dark:text-slate-500">Loading…</p>}
        {!loading && interests.length === 0 && (
          <div className="p-6">
            <EmptyState
              icon={MessageCircle}
              title="No chats yet"
              description="Start a chat from an accepted interest on the Past Interest page — it'll show up here once you exchange a message."
            />
          </div>
        )}
        {!loading && interests.length > 0 && (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {interests.map((i) => (
              <div key={i.id} className={`flex items-center justify-between gap-4 p-4 ${accent.cardBorder}`}>
                <button
                  type="button"
                  onClick={() =>
                    setDetail({
                      open: true,
                      type: user.role === "client" ? "supplier" : "client",
                      id: user.role === "client" ? i.supplier_id : i.client_id,
                    })
                  }
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <InitialAvatar name={i.counterpart_name} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 hover:text-indigo-600 hover:underline dark:text-slate-100 dark:hover:text-indigo-400">
                        {i.counterpart_name ?? "Unknown"}
                      </span>
                      {i.counterpart_is_active === false && <WithdrawnBadge />}
                    </div>
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">{i.counterpart_product}</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setChat({ open: true, interestId: i.id, counterpartName: i.counterpart_name })}
                  title="Open chat"
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${accent.button}`}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Open Chat
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <DetailSlideOver
        open={detail.open}
        type={detail.type}
        id={detail.id}
        onClose={() => setDetail({ open: false, type: null, id: null })}
      />

      <ChatPanel
        open={chat.open}
        interestId={chat.interestId}
        counterpartName={chat.counterpartName}
        onClose={() => setChat({ open: false, interestId: null, counterpartName: null })}
      />
    </div>
  );
}
