// Full literal classes per variant — Tailwind's JIT scanner needs the
// complete class string in source, not a template-built one.
const VARIANTS = {
  indigo: { bg: "bg-indigo-50 dark:bg-indigo-950/50", text: "text-indigo-600 dark:text-indigo-400" },
  violet: { bg: "bg-violet-50 dark:bg-violet-950/50", text: "text-violet-600 dark:text-violet-400" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/50", text: "text-emerald-600 dark:text-emerald-400" },
  amber: { bg: "bg-amber-50 dark:bg-amber-950/50", text: "text-amber-600 dark:text-amber-400" },
};

export default function StatCard({ icon: Icon, label, value, variant = "indigo" }) {
  const colors = VARIANTS[variant] ?? VARIANTS.indigo;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors.bg}`}>
        <Icon className={`h-5 w-5 ${colors.text}`} />
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
