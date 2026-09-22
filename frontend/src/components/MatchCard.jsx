import { Handshake, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getRoleAccent } from "../roleTheme";
import ScoreBadge from "./ScoreBadge";
import ScoreBreakdown from "./ScoreBreakdown";
import WithdrawnBadge from "./WithdrawnBadge";

export default function MatchCard({ match, interested, onExpressInterest, onNameClick }) {
  const { user } = useAuth();
  const accent = getRoleAccent(user?.role);
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 ${accent.cardBorder}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {onNameClick ? (
              <button
                type="button"
                onClick={onNameClick}
                className="font-medium text-slate-900 hover:text-indigo-600 hover:underline dark:text-slate-100 dark:hover:text-indigo-400"
              >
                {match.counterpart_name ?? "Unknown"}
              </button>
            ) : (
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {match.counterpart_name ?? "Unknown"}
              </p>
            )}
            {match.counterpart_is_active === false && <WithdrawnBadge />}
          </div>
          <p className="mt-0.5 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
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
              title={interested ? "Interest sent" : "Express interest"}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
                interested
                  ? "cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
                  : accent.button
              }`}
            >
              {interested ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Handshake className="h-3.5 w-3.5" />}
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
