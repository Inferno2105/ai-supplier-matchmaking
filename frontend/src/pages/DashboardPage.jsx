import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  Building2,
  Handshake,
  Percent,
  FilePlus,
  Inbox,
  MousePointerClick,
  Pencil,
  Ban,
  RotateCcw,
  Bell,
  Target,
  Clock,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getMyRequirements,
  getMyOfferings,
  getMatchesForClient,
  getMatchesForSupplier,
  getDashboardOverview,
  getMyInterests,
  expressInterest,
  withdrawClientRequirement,
  reactivateClientRequirement,
  withdrawSupplierOffering,
  reactivateSupplierOffering,
  getActivity,
} from "../api/resources";
import StatCard from "../components/StatCard";
import MatchCard from "../components/MatchCard";
import EmptyState from "../components/EmptyState";
import DetailSlideOver from "../components/DetailSlideOver";
import WithdrawnBadge from "../components/WithdrawnBadge";
import { timeAgo } from "../utils/timeAgo";

const interestKey = (clientId, supplierId) => `${clientId}::${supplierId}`;

const ACTIVITY_ICONS = {
  notification: Bell,
  interest: Handshake,
  match: Target,
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]); // client requirements or supplier offerings
  const [matchesByItem, setMatchesByItem] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [interests, setInterests] = useState([]);
  const [actionError, setActionError] = useState("");
  const [itemsError, setItemsError] = useState("");
  const [detail, setDetail] = useState({ open: false, type: null, id: null });
  const [activity, setActivity] = useState([]);

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

  const loadActivity = useCallback(async () => {
    if (!user) return;
    const data = await getActivity();
    setActivity(data);
  }, [user]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const isClient = user?.role === "client";

  const loadItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = isClient ? await getMyRequirements() : await getMyOfferings();
    setItems(data);
    setSelectedId((prev) => (prev && data.some((d) => d.id === prev) ? prev : data[0]?.id ?? null));
    setLoading(false);
  }, [user, isClient]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

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

  const handleEdit = (item) => {
    navigate(isClient ? `/client/edit/${item.id}` : `/supplier/edit/${item.id}`);
  };

  const handleWithdraw = async (item) => {
    const name = isClient ? item.company_name : item.supplier_name;
    if (!window.confirm(`Withdraw "${name}"? It will stop appearing in the marketplace and future matching runs.`)) {
      return;
    }
    setItemsError("");
    try {
      if (isClient) await withdrawClientRequirement(item.id);
      else await withdrawSupplierOffering(item.id);
      await loadItems();
    } catch (err) {
      setItemsError(err.response?.data?.detail ?? "Could not withdraw.");
    }
  };

  const handleReactivate = async (item) => {
    setItemsError("");
    try {
      if (isClient) await reactivateClientRequirement(item.id);
      else await reactivateSupplierOffering(item.id);
      await loadItems();
    } catch (err) {
      setItemsError(err.response?.data?.detail ?? "Could not reactivate.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Dashboard</h1>
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

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Your {itemLabel}s
          </h2>
          {itemsError && <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{itemsError}</p>}
          {loading && <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">Loading…</p>}
          {!loading && items.length === 0 && (
            <div className="mt-3">
              <EmptyState icon={Inbox} title={`No ${itemLabel}s yet`} description="Submit one to see matches here." />
            </div>
          )}
          <div className="mt-3 space-y-2">
            {items.map((item) => {
              const withdrawn = item.is_active === false;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full cursor-pointer rounded-lg border p-3 text-left text-sm transition ${
                    selectedId === item.id
                      ? "border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/40"
                      : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {isClient ? item.company_name : item.supplier_name}
                    </p>
                    {withdrawn && <WithdrawnBadge />}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                    {isClient ? item.product_requirement : item.product_offered}
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{item.category}</p>

                  <div
                    className="mt-2 flex gap-3 border-t border-slate-100 pt-2 dark:border-slate-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {withdrawn ? (
                      <button
                        type="button"
                        onClick={() => handleReactivate(item)}
                        className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reactivate
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWithdraw(item)}
                          className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Withdraw
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Ranked matches
          </h2>

          {actionError && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{actionError}</p>}

          {!selectedId && (
            <div className="mt-3">
              <EmptyState
                icon={MousePointerClick}
                title={`Select a ${itemLabel}`}
                description="Choose one on the left to see its matches."
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

        <div className="lg:col-span-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Recent Activity
          </h2>
          {activity.length === 0 && (
            <div className="mt-3">
              <EmptyState icon={Clock} title="Nothing yet" description="Activity shows up here as it happens." />
            </div>
          )}
          <div className="mt-3 space-y-2">
            {activity.map((item, i) => {
              const Icon = ACTIVITY_ICONS[item.type] ?? Bell;
              return (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-700 dark:text-slate-300">{item.message}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                      {timeAgo(item.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
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
