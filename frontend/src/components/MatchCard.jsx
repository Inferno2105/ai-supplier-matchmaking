import ScoreBadge from "./ScoreBadge";
import ScoreBreakdown from "./ScoreBreakdown";

export default function MatchCard({ match, interested, onExpressInterest }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">{match.counterpart_name ?? "Unknown"}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">
            {match.counterpart_product}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <ScoreBadge score={match.score_total} label={match.score_label} />
          {onExpressInterest && (
            <button
              type="button"
              disabled={interested}
              onClick={onExpressInterest}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                interested
                  ? "cursor-not-allowed bg-slate-100 text-slate-400"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {interested ? "Interest sent" : "Express Interest"}
            </button>
          )}
        </div>
      </div>
      <ScoreBreakdown
        breakdown={match.score_breakdown}
        quantityFulfilledRatio={match.quantity_fulfilled_ratio}
      />
    </div>
  );
}
