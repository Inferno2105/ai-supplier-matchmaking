// Small shared helpers so the theme toggle lives in one place — the
// pre-paint <script> in index.html handles the initial class before React
// mounts; this just keeps subsequent toggles/reads consistent with it.

export function getInitialTheme() {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // localStorage unavailable — theme just won't persist across reloads.
  }
}
