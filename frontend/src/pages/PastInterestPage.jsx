import { useEffect, useState, useCallback } from "react";
import { Check, X, Handshake, MessageCirclePlus, MessageCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getMyInterests, acceptInterest, declineInterest } from "../api/resources";
import InitialAvatar from "../components/InitialAvatar";
import InterestStatusBadge from "../components/InterestStatusBadge";
import WithdrawnBadge from "../components/WithdrawnBadge";
import EmptyState from "../components/EmptyState";
import DetailSlideOver from "../components/DetailSlideOver";
import ChatPanel from "../components/ChatPanel";
import { getRoleAccent } from "../roleTheme";

export default function PastInterestPage() {
  const { user } = useAuth();
  const accent = getRoleAccent(user?.role);
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [detail, setDetail] = useState({ open: false, type: null, id: null });
  const [chat, setChat] = useState({ open: false, interestId: null, counterpartName: null });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await getMyInterests();
    setInterests(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRespond = async (id, action) => {
    setActionError("");
    try {
      if (action === "accept") await acceptInterest(id);
      else await declineInterest(id);
      await load();
    } catch (err) {
      setActionError(err.response?.data?.detail ?? "Could not update interest.");
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Past Interest</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Interest you've expressed or received, independent of match scores.
      </p>

      {actionError && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{actionError}</p>}

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {loading && <p className="p-6 text-sm text-slate-400 dark:text-slate-500">Loading…</p>}
        {!loading && interests.length === 0 && (
          <div className="p-6">
            <EmptyState
              icon={Handshake}
              title="No interest expressed yet"
              description="Interest you send or receive, on either side, will show up here."
            />
          </div>
        )}
        {!loading && interests.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Counterpart</th>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Proposed by</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Chat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {interests.map((i) => {
                  const canRespond = i.status === "proposed" && i.initiated_by !== user.role;
                  return (
                    <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                      <td className={`px-4 py-3 ${accent.cardBorder}`}>
                        <button
                          type="button"
                          onClick={() =>
                            setDetail({
                              open: true,
                              type: user.role === "client" ? "supplier" : "client",
                              id: user.role === "client" ? i.supplier_id : i.client_id,
                            })
                          }
                          className="flex items-center gap-3 text-left"
                        >
                          <InitialAvatar name={i.counterpart_name} />
                          <span className="font-medium text-slate-900 hover:text-indigo-600 hover:underline dark:text-slate-100 dark:hover:text-indigo-400">
                            {i.counterpart_name ?? "Unknown"}
                          </span>
                          {i.counterpart_is_active === false && <WithdrawnBadge />}
                        </button>
                      </td>
                      <td
                        className="max-w-xs truncate px-4 py-3 text-slate-600 dark:text-slate-400"
                        title={i.counterpart_product}
                      >
                        {i.counterpart_product}
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-600 dark:text-slate-400">
                        {i.initiated_by === user.role ? "You" : i.counterpart_name}
                      </td>
                      <td className="px-4 py-3">
                        <InterestStatusBadge status={i.status} />
                      </td>
                      <td className="px-4 py-3">
                        {canRespond ? (
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              title="Accept"
                              onClick={() => handleRespond(i.id, "accept")}
                              className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Decline"
                              onClick={() => handleRespond(i.id, "decline")}
                              className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/60"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {i.status === "accepted" ? (
                          <button
                            type="button"
                            onClick={() =>
                              setChat({ open: true, interestId: i.id, counterpartName: i.counterpart_name })
                            }
                            title={i.has_messages ? "Open chat" : "Start chat"}
                            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${accent.button}`}
                          >
                            {i.has_messages ? (
                              <MessageCircle className="h-3.5 w-3.5" />
                            ) : (
                              <MessageCirclePlus className="h-3.5 w-3.5" />
                            )}
                            {i.has_messages ? "Open Chat" : "Start Chat"}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
