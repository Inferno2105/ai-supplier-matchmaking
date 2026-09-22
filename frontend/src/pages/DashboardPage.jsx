import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Users, Building2, Handshake, Percent, FilePlus, Inbox, MousePointerClick } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getMyRequirements,
  getMyOfferings,
  getMatchesForClient,
  getMatchesForSupplier,
  getDashboardOverview,
  getMyInterests,
  expressInterest,
} from "../api/resources";
import StatCard from "../components/StatCard";
import MatchCard from "../components/MatchCard";
import EmptyState from "../components/EmptyState";
import DetailSlideOver from "../components/DetailSlideOver";

const interestKey = (clientId, supplierId) => `${clientId}::${supplierId}`;

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]); // client requirements or supplier offerings
  const [matchesByItem, setMatchesByItem] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [interests, setInterests] = useState([]);
  const [actionError, setActionError] = useState("");
  const [detail, setDetail] = useState({ open: false, type: null, id: null });

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

  const openCounterpartDetail = (match) => {
    setDetail({
      open: true,
      type: isClient ? "supplier" : "client",
      id: isClient ? match.supplier_id : match.client_id,
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <Link
          to={isClient ? "/client/new" : "/supplier/new"}
          className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <FilePlus className="h-4 w-4" />
          New {itemLabel}
        </Link>
      </div>

      {stats && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={Building2} label="Total clients" value={stats.total_clients} variant="indigo" />
          <StatCard icon={Users} label="Total suppliers" value={stats.total_suppliers} variant="violet" />
          <StatCard icon={Handshake} label="Total matches" value={stats.total_matches} variant="emerald" />
          <StatCard
            icon={Percent}
            label="Avg. match score"
            value={`${stats.average_match_score.toFixed(1)}%`}
            variant="amber"
          />
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Your {itemLabel}s
          </h2>
          {loading && <p className="mt-3 text-sm text-slate-400">Loading…</p>}
          {!loading && items.length === 0 && (
            <div className="mt-3">
              <EmptyState
                icon={Inbox}
                title={`No ${itemLabel}s yet`}
                description={`Submit one to see matches here.`}
              />
            </div>
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

          {actionError && <p className="mt-3 text-sm text-rose-600">{actionError}</p>}

          {!selectedId && (
            <div className="mt-3">
              <EmptyState
                icon={MousePointerClick}
                title={`Select a ${itemLabel}`}
                description={`Choose one on the left to see its matches.`}
              />
            </div>
          )}
          {selectedId && currentMatches.length === 0 && (
            <div className="mt-3">
              <EmptyState
                icon={Inbox}
                title="No matches yet"
                description={`Matches appear automatically once a ${
                  isClient ? "supplier" : "client"
                } in the same category is submitted.`}
              />
            </div>
          )}
          <div className="mt-3 space-y-3">
            {currentMatches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                interested={interestedPairs.has(interestKey(m.client_id, m.supplier_id))}
                onExpressInterest={() => handleExpressInterest(m)}
                onNameClick={() => openCounterpartDetail(m)}
              />
            ))}
          </div>
        </div>
      </div>

      <DetailSlideOver
        open={detail.open}
        type={detail.type}
        id={detail.id}
        onClose={() => setDetail({ open: false, type: null, id: null })}
      />
    </div>
  );
}
