// Full literal classes per slot — Tailwind's JIT scanner needs the
// complete class string in source, not a template-built one.
const PALETTE = [
  { bg: "bg-indigo-100 dark:bg-indigo-900/50", text: "text-indigo-700 dark:text-indigo-300" },
  { bg: "bg-emerald-100 dark:bg-emerald-900/50", text: "text-emerald-700 dark:text-emerald-300" },
  { bg: "bg-amber-100 dark:bg-amber-900/50", text: "text-amber-700 dark:text-amber-300" },
  { bg: "bg-rose-100 dark:bg-rose-900/50", text: "text-rose-700 dark:text-rose-300" },
  { bg: "bg-violet-100 dark:bg-violet-900/50", text: "text-violet-700 dark:text-violet-300" },
  { bg: "bg-cyan-100 dark:bg-cyan-900/50", text: "text-cyan-700 dark:text-cyan-300" },
];

function colorFor(name) {
  const code = (name || "?").charCodeAt(0) || 0;
  return PALETTE[code % PALETTE.length];
}

export default function InitialAvatar({ name }) {
  const colors = colorFor(name);
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${colors.bg} ${colors.text}`}
    >
      {initial}
    </span>
  );
}
