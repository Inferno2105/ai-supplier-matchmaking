import { useEffect, useState } from "react";
import { X, MapPin, Calendar, Package, IndianRupee, Tag, FileText } from "lucide-react";
import { getClientById, getSupplierById } from "../api/resources";
import WithdrawnBadge from "./WithdrawnBadge";

export default function DetailSlideOver({ open, type, id, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !id || !type) return;
    setLoading(true);
    setError("");
    setData(null);
    const fetcher = type === "client" ? getClientById : getSupplierById;
    fetcher(id)
      .then(setData)
      .catch((err) => setError(err.response?.data?.detail ?? "Could not load details."))
      .finally(() => setLoading(false));
  }, [open, id, type]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isClient = type === "client";
  const name = data && (isClient ? data.company_name : data.supplier_name);
  const product = data && (isClient ? data.product_requirement : data.product_offered);
  const quantity = data && (isClient ? data.quantity_required : data.available_quantity);
  const priceMin = data && (isClient ? data.budget_min : data.price_min);
  const priceMax = data && (isClient ? data.budget_max : data.price_max);
  const days = data && (isClient ? data.delivery_days_needed : data.delivery_days_capable);

  return (
    <>
      <div className="fixed inset-0 z-30 bg-slate-900/30" onClick={onClose} />
      <div className="fixed right-0 top-0 z-40 flex h-full w-full max-w-md flex-col bg-white shadow-xl dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {isClient ? "Client details" : "Supplier details"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loading && <p className="text-sm text-slate-400 dark:text-slate-500">Loading…</p>}
          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

          {data && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{name}</p>
                  {data.is_active === false && <WithdrawnBadge />}
                </div>
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  <Tag className="h-3 w-3" />
                  {data.category}
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {isClient ? "Product requirement" : "Product offered"}
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{product}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <Package className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {isClient ? "Quantity required" : "Available quantity"}
                    </p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{quantity}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <IndianRupee className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {isClient ? "Budget range" : "Price range"}
                    </p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      ₹{priceMin.toLocaleString()}–₹{priceMax.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Location</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {data.city}, {data.state}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {isClient ? "Delivery needed within" : "Delivery capability"}
                    </p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{days} days</p>
                  </div>
                </div>
              </div>

              {data.notes && (
                <div>
                  <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    <FileText className="h-3.5 w-3.5" />
                    Notes
                  </p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{data.notes}</p>
                </div>
              )}

              <p className="text-xs text-slate-400 dark:text-slate-500">
                Submitted {new Date(data.created_at).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
