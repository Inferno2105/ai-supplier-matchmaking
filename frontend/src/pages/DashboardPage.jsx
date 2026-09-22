import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getMyRequirements,
  getMyOfferings,
  getMatchesForClient,
  getMatchesForSupplier,
  getDashboardOverview,
  getMyInterests,
  expressInterest,
  acceptInterest,
  declineInterest,
} from "../api/resources";
import OverviewStats from "../components/OverviewStats";
import MatchCard from "../components/MatchCard";
import InterestStatusBadge from "../components/InterestStatusBadge";

const interestKey = (clientId, supplierId) => `${clientId}::${supplierId}`;

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]); // client requirements or supplier offerings
  const [matchesByItem, setMatchesByItem] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rightTab, setRightTab] = useState("matches"); // "matches" | "interests"
  const [interests, setInterests] = useState([]);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    getDashboardOverview().then(setStats);
  }, []);

  const loadInterests = useCallback(async () => {
    if (!user) return;
    const data = await getMyInterests();
    setInterests(data);
  }, [user]);

  useEffect(() => {
    loadInterests();
  }, [loadInterests]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const data = user.role === "client" ? await getMyRequirements() : await getMyOfferings();
      setItems(data);
      if (data.length > 0) setSelectedId(data[0].id);
      setLoading(false);
    };
    load();
  }, [user]);

  useEffect(() => {
    if (!selectedId || !user) return;
    const loadMatches = async () => {
      const data =
        user.role === "client"
          ? await getMatchesForClient(selectedId)
          : await getMatchesForSupplier(selectedId);
      setMatchesByItem((prev) => ({ ...prev, [selectedId]: data }));
    };
    loadMatches();
  }, [selectedId, user]);

  if (!user) return null;

  const isClient = user.role === "client";
  const itemLabel = isClient ? "requirement" : "offering";
  const currentMatches = matchesByItem[selectedId] ?? [];

  const interestedPairs = new Set(
    interests
      .filter((i) => i.status !== "declined")
      .map((i) => interestKey(i.client_id, i.supplier_id))
  );

  const handleExpressInterest = async (match) => {
    setActionError("");
    try {
      await expressInterest(match.client_id, match.supplier_id);
      await loadInterests();
    } catch (err) {
      setActionError(err.response?.data?.detail ?? "Could not send interest.");
    }
  };

  const handleRespond = async (interestId, action) => {
    setActionError("");
    try {
      if (action === "accept") await acceptInterest(interestId);
      else await declineInterest(interestId);
      await loadInterests();
    } catch (err) {
      setActionError(err.response?.data?.detail ?? "Could not update interest.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <Link
          to={isClient ? "/client/new" : "/supplier/new"}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New {itemLabel}
        </Link>
      </div>

      <div className="mt-6">
        <OverviewStats stats={stats} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Your {itemLabel}s
          </h2>
          {loading && <p className="mt-3 text-sm text-slate-400">Loading…</p>}
          {!loading && items.length === 0 && (
            <p className="mt-3 text-sm text-slate-400">
              No {itemLabel}s yet. Submit one to see matches here.
            </p>
          )}
          <div className="mt-3 space-y-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`w-full rounded-lg border p-3 text-left text-sm transition ${
                  selectedId === item.id
                    ? "border-indigo-400 bg-indigo-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <p className="font-medium text-slate-900">
                  {isClient ? item.company_name : item.supplier_name}
                </p>
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                  {isClient ? item.product_requirement : item.product_offered}
                </p>
                <p className="mt-1 text-xs text-slate-400">{item.category}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center gap-4 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setRightTab("matches")}
              className={`border-b-2 pb-2 text-sm font-semibold uppercase tracking-wide ${
                rightTab === "matches"
                  ? "border-indigo-500 text-slate-900"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Ranked matches
            </button>
            <button
              type="button"
              onClick={() => setRightTab("interests")}
              className={`border-b-2 pb-2 text-sm font-semibold uppercase tracking-wide ${
                rightTab === "interests"
                  ? "border-indigo-500 text-slate-900"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Past Interest
            </button>
          </div>

          {actionError && <p className="mt-3 text-sm text-rose-600">{actionError}</p>}

          {rightTab === "matches" && (
            <>
              {!selectedId && (
                <p className="mt-3 text-sm text-slate-400">
                  Select a {itemLabel} on the left to see its matches.
                </p>
              )}
              {selectedId && currentMatches.length === 0 && (
                <p className="mt-3 text-sm text-slate-400">
                  No matches yet for this {itemLabel}. Matches appear automatically once a{" "}
                  {isClient ? "supplier" : "client"} in the same category is submitted.
                </p>
              )}
              <div className="mt-3 space-y-3">
                {currentMatches.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    interested={interestedPairs.has(interestKey(m.client_id, m.supplier_id))}
                    onExpressInterest={() => handleExpressInterest(m)}
                  />
                ))}
              </div>
            </>
          )}

          {rightTab === "interests" && (
            <>
              {interests.length === 0 && (
                <p className="mt-3 text-sm text-slate-400">
                  No interest expressed yet, on either side.
                </p>
              )}
              <div className="mt-3 space-y-3">
                {interests.map((i) => {
                  const canRespond = i.status === "proposed" && i.initiated_by !== user.role;
                  return (
                    <div key={i.id} className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">
                            {i.counterpart_name ?? "Unknown"}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">
                            {i.counterpart_product}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {i.initiated_by === user.role ? "You" : i.counterpart_name} proposed this
                            interest
                          </p>
                        </div>
                        <InterestStatusBadge status={i.status} />
                      </div>
                      {canRespond && (
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleRespond(i.id, "accept")}
                            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRespond(i.id, "decline")}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
