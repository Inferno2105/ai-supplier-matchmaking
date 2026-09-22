import { useEffect, useState, useCallback } from "react";
import { Check, X, Handshake } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getMyInterests, acceptInterest, declineInterest } from "../api/resources";
import InitialAvatar from "../components/InitialAvatar";
import InterestStatusBadge from "../components/InterestStatusBadge";
import EmptyState from "../components/EmptyState";

export default function PastInterestPage() {
  const { user } = useAuth();
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");

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
      <h1 className="text-xl font-semibold text-slate-900">Past Interest</h1>
      <p className="mt-1 text-sm text-slate-500">
        Interest you've expressed or received, independent of match scores.
      </p>

      {actionError && <p className="mt-3 text-sm text-rose-600">{actionError}</p>}

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading && <p className="p-6 text-sm text-slate-400">Loading…</p>}
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
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Counterpart</th>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Proposed by</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {interests.map((i) => {
                  const canRespond = i.status === "proposed" && i.initiated_by !== user.role;
                  return (
                    <tr key={i.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <InitialAvatar name={i.counterpart_name} />
                          <span className="font-medium text-slate-900">
                            {i.counterpart_name ?? "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-slate-600" title={i.counterpart_product}>
                        {i.counterpart_product}
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-600">
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
                              className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Decline"
                              onClick={() => handleRespond(i.id, "decline")}
                              className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-100 text-rose-700 hover:bg-rose-200"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
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
    </div>
  );
}
