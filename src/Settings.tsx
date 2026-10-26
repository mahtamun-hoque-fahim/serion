import { useEffect, useState, type CSSProperties } from "react";
import { Check, Power } from "lucide-react";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";

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
const AUTOSTART_KEY = "serion.autostartChosen";

/**
 * Start at login only works for installed builds: in development it would
 * register the debug exe, which shows a blank window without the dev server.
 */
const CAN_AUTOSTART = import.meta.env.PROD;

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

/** Start-at-login state. On by default the first time an installed build runs. */
export function useAutostart() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!CAN_AUTOSTART) return;
    let firstRun = false;
    try {
      firstRun = localStorage.getItem(AUTOSTART_KEY) === null;
      localStorage.setItem(AUTOSTART_KEY, "1");
    } catch {
      // Without storage we cannot tell a first run apart; leave it as is.
    }
    (firstRun ? enable() : Promise.resolve())
      .then(isEnabled)
      .then(setOn)
      .catch(() => setOn(false));
  }, []);

  async function toggle() {
    try {
      await (on ? disable() : enable());
      setOn(await isEnabled());
    } catch {
      // The OS refused; the switch keeps showing the real state.
    }
  }

  return { on, toggle, available: CAN_AUTOSTART };
}

type Props = {
  open: boolean;
  theme: string;
  onTheme: (color: string) => void;
  onQuit: () => void;
};

export function SettingsPanel({ open, theme, onTheme, onQuit }: Props) {
  const autostart = useAutostart();

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
      <button
        type="button"
        role="switch"
        aria-checked={autostart.on}
        className="panel-row toggle-row"
        disabled={!autostart.available}
        title={autostart.available ? undefined : "Available in the installed app"}
        onClick={autostart.toggle}
      >
        Start at login
        <span className="switch" aria-hidden>
          <span className="switch-knob" />
        </span>
      </button>
      <button type="button" className="panel-row" onClick={onQuit}>
        <Power size={14} aria-hidden />
        Quit serion
      </button>
    </div>
  );
}
