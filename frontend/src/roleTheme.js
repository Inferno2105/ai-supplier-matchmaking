// Role-based accent colors: client = indigo, supplier = violet — matching
// the color-coding StatCard already uses for "Total clients" vs. "Total
// suppliers" on the dashboard, so this isn't a new palette, just applying
// an existing distinction more consistently. Neither color is used by
// ScoreBadge (emerald/lime/amber/rose, by match quality) or
// InterestStatusBadge (amber/emerald/rose, by status) — those carry
// independent meaning and must stay untouched by role.
//
// Full literal classes per role — Tailwind's JIT scanner needs the
// complete class string in source, not a template-built one.
const ROLE_THEMES = {
  client: {
    navActive: "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
    button: "bg-indigo-600 text-white hover:bg-indigo-700",
    buttonOutline:
      "border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-950/40",
    cardBorder: "border-l-4 border-l-indigo-400 dark:border-l-indigo-500",
    cardBorderSelected: "border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/40",
    badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    link: "text-indigo-600 hover:underline dark:text-indigo-400",
    // Neutral text that turns the accent color on hover — for secondary
    // actions (e.g. Edit) that shouldn't look like a primary button.
    hoverText: "hover:text-indigo-600 dark:hover:text-indigo-400",
    focusRing: "focus:border-indigo-500 focus:ring-indigo-500",
  },
  supplier: {
    navActive: "border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
    button: "bg-violet-600 text-white hover:bg-violet-700",
    buttonOutline:
      "border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-950/40",
    cardBorder: "border-l-4 border-l-violet-400 dark:border-l-violet-500",
    cardBorderSelected: "border-violet-400 bg-violet-50 dark:border-violet-500 dark:bg-violet-950/40",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    link: "text-violet-600 hover:underline dark:text-violet-400",
    hoverText: "hover:text-violet-600 dark:hover:text-violet-400",
    focusRing: "focus:border-violet-500 focus:ring-violet-500",
  },
};

export function getRoleAccent(role) {
  return ROLE_THEMES[role] ?? ROLE_THEMES.client;
}
