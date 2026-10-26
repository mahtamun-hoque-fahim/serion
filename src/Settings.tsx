import type { CSSProperties } from "react";
import { Check, Power } from "lucide-react";

/** Pill colors to choose from. All keep white text readable. */
export const THEMES = [
  { name: "Blue", color: "#0047ff" },
  { name: "Graphite", color: "#1f1f1f" },
  { name: "Violet", color: "#6d28d9" },
  { name: "Emerald", color: "#047857" },
  { name: "Coral", color: "#e5484d" },
  { name: "Amber", color: "#c2410c" },
] as const;

export const DEFAULT_THEME: string = THEMES[0].color;

const THEME_KEY = "serion.theme";

/** Saved theme, or the default when nothing valid is stored. */
export function loadTheme(): string {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return THEMES.some((t) => t.color === saved) ? saved! : DEFAULT_THEME;
  } catch {
    // Storage can be unavailable; the default is fine.
    return DEFAULT_THEME;
  }
}

export function saveTheme(color: string) {
  try {
    localStorage.setItem(THEME_KEY, color);
  } catch {
    // Not saved this time; the choice still applies until quit.
  }
}

type Props = {
  open: boolean;
  theme: string;
  onTheme: (color: string) => void;
  onQuit: () => void;
};

export function SettingsPanel({ open, theme, onTheme, onQuit }: Props) {
  return (
    <div id="settings" className={open ? "panel open" : "panel"} role="dialog" aria-label="Settings" inert={!open}>
      <p className="panel-title">Theme</p>
      <div className="swatches" role="radiogroup" aria-label="Theme color">
        {THEMES.map((t, i) => (
          <button
            key={t.color}
            type="button"
            role="radio"
            aria-checked={t.color === theme}
            aria-label={t.name}
            title={t.name}
            className="swatch"
            style={{ "--swatch": t.color, "--i": i } as CSSProperties}
            onClick={() => onTheme(t.color)}
          >
            <Check className="swatch-check" size={14} strokeWidth={3} aria-hidden />
          </button>
        ))}
      </div>
      <button type="button" className="panel-row" onClick={onQuit}>
        <Power size={14} aria-hidden />
        Quit serion
      </button>
    </div>
  );
}
