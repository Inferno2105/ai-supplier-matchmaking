// Excellent 80+, Good 60-79, Fair 40-59, Poor <40
const BANDS = [
  {
    min: 80,
    label: "Excellent",
    classes:
      "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700",
  },
  {
    min: 60,
    label: "Good",
    classes: "bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-900/40 dark:text-lime-300 dark:border-lime-700",
  },
  {
    min: 40,
    label: "Fair",
    classes:
      "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700",
  },
  {
    min: 0,
    label: "Poor",
    classes: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700",
  },
];

function bandFor(score) {
  return BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1];
}

export default function ScoreBadge({ score, label }) {
  const band = bandFor(score);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium ${band.classes}`}
    >
      <span className="font-semibold">{score.toFixed(1)}%</span>
      <span className="text-xs opacity-80">{label ?? band.label}</span>
    </span>
  );
}
