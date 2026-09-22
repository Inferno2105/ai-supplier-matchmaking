import { useEffect, useState, useCallback } from "react";
import { Search, Handshake, CheckCircle2, Store } from "lucide-react";
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
import InitialAvatar from "../components/InitialAvatar";
import EmptyState from "../components/EmptyState";
import DetailSlideOver from "../components/DetailSlideOver";
import WithdrawnBadge from "../components/WithdrawnBadge";

export default function MarketplacePage() {
  const { user } = useAuth();
  const isClient = user?.role === "client";

  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState({});
  const [category, setCategory] = useState("");
  const [state, setState] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myProfiles, setMyProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [error, setError] = useState("");
  const [detail, setDetail] = useState({ open: false, type: null, id: null });

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

  // Debounce the free-text search so every keystroke doesn't hit the API.
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    const filters = {};
    if (category) filters.category = category;
    if (state) filters.state = state;
    if (search) filters.search = search;
    const data = isClient ? await getMarketplaceSuppliers(filters) : await getMarketplaceClients(filters);
    setItems(data);
    setLoading(false);
  }, [category, state, search, isClient]);

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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        Browse {isClient ? "suppliers" : "clients"}
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
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

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Search</label>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={isClient ? "Search suppliers or products…" : "Search clients or requirements…"}
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:w-96">
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
      </div>

      {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {loading && <p className="p-6 text-sm text-slate-400 dark:text-slate-500">Loading…</p>}
        {!loading && items.length === 0 && (
          <div className="p-6">
            <EmptyState
              icon={Store}
              title="No listings match these filters"
              description="Try a different category, state, or search term."
            />
          </div>
        )}
        {!loading && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">{isClient ? "Supplier" : "Client"}</th>
                  <th className="px-4 py-3 font-medium">{isClient ? "Product offered" : "Requirement"}</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">{isClient ? "Price range" : "Budget range"}</th>
                  <th className="px-4 py-3 font-medium">{isClient ? "Delivery" : "Timeline"}</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {items.map((item) => {
                  const name = isClient ? item.supplier_name : item.company_name;
                  const product = isClient ? item.product_offered : item.product_requirement;
                  const priceMin = isClient ? item.price_min : item.budget_min;
                  const priceMax = isClient ? item.price_max : item.budget_max;
                  const days = isClient ? item.delivery_days_capable : item.delivery_days_needed;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            setDetail({ open: true, type: isClient ? "supplier" : "client", id: item.id })
                          }
                          className="flex items-center gap-3 text-left hover:text-indigo-600"
                        >
                          <InitialAvatar name={name} />
                          <span className="font-medium text-slate-900 hover:text-indigo-600 hover:underline dark:text-slate-100 dark:hover:text-indigo-400">
                            {name}
                          </span>
                          {item.is_active === false && <WithdrawnBadge />}
                        </button>
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-slate-600 dark:text-slate-400" title={product}>
                        {product}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{item.category}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {item.city}, {item.state}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        ₹{priceMin.toLocaleString()}–₹{priceMax.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{days} days</td>
                      <td className="px-4 py-3">
                        {item.already_interested ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-400 dark:bg-slate-700 dark:text-slate-500">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Interest sent
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleExpressInterest(item.id)}
                            title="Express interest"
                            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                          >
                            <Handshake className="h-3.5 w-3.5" />
                            Express Interest
                          </button>
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
    </div>
  );
}
