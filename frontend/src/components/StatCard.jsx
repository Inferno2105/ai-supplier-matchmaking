// Full literal classes per variant — Tailwind's JIT scanner needs the
// complete class string in source, not a template-built one.
const VARIANTS = {
  indigo: { bg: "bg-indigo-50", text: "text-indigo-600" },
  violet: { bg: "bg-violet-50", text: "text-violet-600" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
  amber: { bg: "bg-amber-50", text: "text-amber-600" },
};

export default function StatCard({ icon: Icon, label, value, variant = "indigo" }) {
  const colors = VARIANTS[variant] ?? VARIANTS.indigo;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors.bg}`}>
        <Icon className={`h-5 w-5 ${colors.text}`} />
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}
