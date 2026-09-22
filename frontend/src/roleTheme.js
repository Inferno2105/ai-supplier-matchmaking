// Fixed pastel palettes per role. Client = sage/green, supplier = peach/pink.
// The actual color VALUES live only here and in the matching CSS custom
// properties block in index.css — components never hardcode a hex or a
// Tailwind color-name utility for role theming, they reference
// var(--role-*) through Tailwind arbitrary values instead, so the palette
// can be retuned in exactly one place (this file + the CSS block) without
// touching every component.
export const ROLE_THEMES = {
  client: {
    darkest: "#778873",
    mid: "#A1BC98",
    soft: "#DCCFC0",
    lightest: "#FDF6ED",
  },
  supplier: {
    darkest: "#4A4A4A",
    mid: "#E2B4BD",
    soft: "#F7D6D0",
    lightest: "#FFF5F5",
  },
};

export function getRoleTheme(role) {
  return ROLE_THEMES[role] ?? ROLE_THEMES.client;
}

// --- Contrast verification (WCAG 2.1 relative-luminance formula) ---
// These pastel tiers are inherently low-contrast, so the "obvious" mapping
// (mid = button fill, white text) was checked and REJECTED for both roles:
//   white text on client mid  #A1BC98 -> 2.07:1  (fails)
//   white text on supplier mid #E2B4BD -> 1.83:1  (fails badly)
// `darkest` as the button fill instead:
//   white text on client darkest  #778873 -> 3.78:1
//   white text on supplier darkest #4A4A4A -> 8.87:1
// 3.78:1 clears WCAG's 3:1 threshold for UI components/large text but not
// the 4.5:1 threshold for small body text — it's the best available button
// treatment within this exact fixed palette (the brief asks to prioritize
// legibility over the tier mapping, not to invent new hex values), so
// button labels use font-medium/semibold to maximize practical legibility.
//
// Dark mode needed a second, independent check: `darkest` as an accent
// color directly on the app's dark surfaces (~slate-900, luminance ~0.009):
//   client darkest #778873   -> 4.72:1 (fine)
//   supplier darkest #4A4A4A -> 2.01:1 (fails — a plain dark gray nearly
//     disappears against a dark slate background)
// So dark-mode text/icon accents (nav label, badge text, links) use `mid`
// instead of `darkest` for BOTH roles, since `mid` contrasts well against
// dark surfaces for both:
//   client mid  #A1BC98 vs slate-900 -> 8.64:1
//   supplier mid #E2B4BD vs slate-900 -> 9.78:1
// See index.css's `[data-role]` block, which implements this split as
// separate --role-nav-*/--role-badge-*/--role-link custom properties for
// light vs. dark mode (button fills are unaffected — a solid darkest-filled
// button doesn't depend on the page background, so it's identical in both
// themes).

// Tailwind classes referencing the CSS custom properties defined in
// index.css, scoped per role via the `data-role` attribute App.jsx sets on
// the app shell once the logged-in user's role is known. Same literal
// class string for every role — the color itself is resolved by CSS, not
// picked here, per the "one place to change it" requirement.
export const ROLE_ACCENT_CLASSES = {
  button: "bg-[var(--role-button-bg)] text-[var(--role-button-text)] hover:opacity-90",
  navActive: "border-[var(--role-nav-border)] bg-[var(--role-nav-bg)] text-[var(--role-nav-text)]",
  cardBorder: "border-l-4 border-l-[var(--role-mid)]",
  cardBorderSelected: "border-[var(--role-selected-border)] bg-[var(--role-selected-bg)]",
  badge: "bg-[var(--role-badge-bg)] text-[var(--role-badge-text)]",
  link: "text-[var(--role-link)] hover:underline",
  hoverText: "hover:text-[var(--role-link)]",
  // Same color as `link` (already contrast-checked against both the
  // sidebar's light and dark background) but with no hover/underline
  // decoration — for non-interactive role-colored text, e.g. the sidebar
  // wordmark.
  text: "text-[var(--role-link)]",
};

// getRoleAccent kept as the stable import components already use — its
// return value no longer varies by role (the CSS custom properties do the
// switching), but the name/shape stays so call sites don't need to change.
export function getRoleAccent() {
  return ROLE_ACCENT_CLASSES;
}
