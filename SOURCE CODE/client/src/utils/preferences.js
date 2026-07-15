const STORAGE_KEY = "sb-stocks-prefs";

const DEFAULTS = {
  mode: "dark",       // "dark" | "light"
  accent: "green",    // "green" | "blue" | "purple"
  fontSize: "md",     // "sm" | "md" | "lg"
  highContrast: false,
};

const FONT_SCALES = { sm: 0.9, md: 1, lg: 1.15 };

export function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage unavailable (private mode, etc.) — preferences just won't persist
  }
}

// Applies preferences to the document root as data-attributes / CSS vars.
// index.css reads these to swap the active color palette and font scale.
export function applyPrefs(prefs) {
  const root = document.documentElement;
  root.setAttribute("data-mode", prefs.mode);
  root.setAttribute("data-accent", prefs.accent);
  root.setAttribute("data-contrast", prefs.highContrast ? "high" : "normal");
  root.style.setProperty("--font-scale", FONT_SCALES[prefs.fontSize] ?? 1);
}

export function initPrefs() {
  const prefs = loadPrefs();
  applyPrefs(prefs);
  return prefs;
}
