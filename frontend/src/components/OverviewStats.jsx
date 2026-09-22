export default function OverviewStats({ stats }) {
  if (!stats) return null;

  const items = [
    { label: "Total clients", value: stats.total_clients },
    { label: "Total suppliers", value: stats.total_suppliers },
    { label: "Total matches", value: stats.total_matches },
    { label: "Avg. match score", value: `${stats.average_match_score.toFixed(1)}%` },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-2xl font-semibold text-slate-900">{item.value}</p>
          <p className="mt-1 text-xs text-slate-500">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
