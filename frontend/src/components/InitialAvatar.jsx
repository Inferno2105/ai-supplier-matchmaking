// Full literal classes per slot — Tailwind's JIT scanner needs the
// complete class string in source, not a template-built one.
const PALETTE = [
  { bg: "bg-indigo-100", text: "text-indigo-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-cyan-100", text: "text-cyan-700" },
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
