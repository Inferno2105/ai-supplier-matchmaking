import ScoreBadge from "./ScoreBadge";
import ScoreBreakdown from "./ScoreBreakdown";

export default function MatchCard({ match }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">{match.counterpart_name ?? "Unknown"}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">
            {match.counterpart_product}
          </p>
        </div>
        <ScoreBadge score={match.score_total} label={match.score_label} />
      </div>
      <ScoreBreakdown
        breakdown={match.score_breakdown}
        quantityFulfilledRatio={match.quantity_fulfilled_ratio}
      />
    </div>
  );
}
