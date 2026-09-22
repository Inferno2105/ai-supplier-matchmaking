import { useState } from "react";

const FACTORS = [
  { key: "semantic", label: "Semantic similarity", weight: "35%" },
  { key: "price", label: "Price fit", weight: "25%" },
  { key: "location", label: "Location", weight: "20%" },
  { key: "timeline", label: "Delivery timeline", weight: "12%" },
  { key: "quantity", label: "Quantity fit", weight: "8%" },
];

export default function ScoreBreakdown({ breakdown, quantityFulfilledRatio }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
      >
        {open ? "Hide breakdown" : "Why this match?"}
      </button>

      {open && (
        <div className="mt-2 space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
          {FACTORS.map((f) => (
            <div key={f.key} className="flex items-center gap-2">
              <span className="w-36 shrink-0 text-xs text-slate-600">
                {f.label} <span className="text-slate-400">({f.weight})</span>
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${breakdown[f.key]}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-right text-xs font-medium text-slate-700">
                {breakdown[f.key].toFixed(0)}
              </span>
            </div>
          ))}

          {quantityFulfilledRatio < 1 && (
            <p className="pt-1 text-xs text-amber-700">
              Partial stock ({Math.round(quantityFulfilledRatio * 100)}% of required quantity available)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
