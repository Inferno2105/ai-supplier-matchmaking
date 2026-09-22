import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getMyRequirements,
  getMyOfferings,
  getMatchesForClient,
  getMatchesForSupplier,
  getDashboardOverview,
} from "../api/resources";
import OverviewStats from "../components/OverviewStats";
import MatchCard from "../components/MatchCard";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]); // client requirements or supplier offerings
  const [matchesByItem, setMatchesByItem] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardOverview().then(setStats);
  }, []);

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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Ranked matches
          </h2>
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
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
