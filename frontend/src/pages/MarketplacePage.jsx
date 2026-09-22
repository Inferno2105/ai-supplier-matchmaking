import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getCategories,
  getLocations,
  getMarketplaceSuppliers,
  getMarketplaceClients,
  getMyRequirements,
  getMyOfferings,
  expressInterest,
} from "../api/resources";
import { SelectField } from "../components/FormFields";

export default function MarketplacePage() {
  const { user } = useAuth();
  const isClient = user?.role === "client";

  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState({});
  const [category, setCategory] = useState("");
  const [state, setState] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myProfiles, setMyProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getCategories().then(setCategories);
    getLocations().then(setLocations);
  }, []);

  useEffect(() => {
    if (!user) return;
    const loadProfiles = async () => {
      const data = isClient ? await getMyRequirements() : await getMyOfferings();
      setMyProfiles(data);
      if (data.length > 0) setSelectedProfileId(data[0].id);
    };
    loadProfiles();
  }, [user, isClient]);

  const load = useCallback(async () => {
    setLoading(true);
    const filters = {};
    if (category) filters.category = category;
    if (state) filters.state = state;
    const data = isClient ? await getMarketplaceSuppliers(filters) : await getMarketplaceClients(filters);
    setItems(data);
    setLoading(false);
  }, [category, state, isClient]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExpressInterest = async (counterpartId) => {
    setError("");
    if (!selectedProfileId) {
      setError(`Submit a ${isClient ? "requirement" : "offering"} first before expressing interest.`);
      return;
    }
    try {
      const clientId = isClient ? selectedProfileId : counterpartId;
      const supplierId = isClient ? counterpartId : selectedProfileId;
      await expressInterest(clientId, supplierId);
      await load();
    } catch (err) {
      setError(err.response?.data?.detail ?? "Could not send interest.");
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-900">
        Browse {isClient ? "suppliers" : "clients"}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Every {isClient ? "supplier offering" : "client requirement"} on the platform, not
        just same-category matches.
      </p>

      {myProfiles.length > 1 && (
        <div className="mt-4 max-w-xs">
          <SelectField
            label="Express interest as"
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
          >
            {myProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {isClient ? p.company_name : p.supplier_name}
              </option>
            ))}
          </SelectField>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>
        <SelectField label="State" value={state} onChange={(e) => setState(e.target.value)}>
          <option value="">All states</option>
          {Object.keys(locations).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectField>
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {loading && <p className="text-sm text-slate-400">Loading…</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-slate-400">No listings match these filters.</p>
        )}
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="font-medium text-slate-900">
              {isClient ? item.supplier_name : item.company_name}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {isClient ? item.product_offered : item.product_requirement}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {item.category} · {item.city}, {item.state}
            </p>
            <button
              type="button"
              disabled={item.already_interested}
              onClick={() => handleExpressInterest(item.id)}
              className={`mt-3 rounded-md px-3 py-1.5 text-xs font-medium ${
                item.already_interested
                  ? "cursor-not-allowed bg-slate-100 text-slate-400"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {item.already_interested ? "Interest sent" : "Express Interest"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
