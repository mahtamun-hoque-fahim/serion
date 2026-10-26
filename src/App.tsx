import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { Eye, Hand, Moon, Settings } from "lucide-react";
import "@fontsource/google-sans/latin-700.css";
import { SettingsPanel, loadTheme, saveTheme } from "./Settings";
import "./App.css";

/** Matches the `Tick` struct the Rust loop emits every second. */
type Tick = {
  text: string;
  state: "active" | "idle" | "hold";
};

const STATE_LABEL: Record<Tick["state"], string> = {
  active: "Counting",
  idle: "Paused: idle",
  hold: "On hold: no app in front",
};

/**
 * Each state shows its own icon in the circle. The moon is filled (fill set to
 * the stroke color); the eye and hand stay outlines because filling them hides
 * the pupil and closes the gaps between the fingers.
 */
const STATE_ICON = {
  active: { Icon: Eye, fill: "none" },
  idle: { Icon: Moon, fill: "currentColor" },
  hold: { Icon: Hand, fill: "none" },
};

// Window sizes in CSS pixels. These must match the sizes in App.css.
const PILL_W = 168;
const PILL_H = 50;
const GAP = 8;
const BUTTON = 50;
const PANEL_H = 132;
const WIDE = PILL_W + GAP + BUTTON;
const TALL = PILL_H + GAP + PANEL_H;
/** Longest exit transition in App.css; the window shrinks only after it. */
const EXIT_MS = 220;

/** Draws its lines in when mounted; remount it to replay. */
function StateIcon({ state }: { state: Tick["state"] }) {
  const ref = useRef<SVGSVGElement>(null);
  const { Icon, fill } = STATE_ICON[state];

  // Give every line a length of 1 so the CSS draw animation runs all of them
  // at the same pace, whatever their real length. Runs before the first paint.
  useLayoutEffect(() => {
    ref.current
      ?.querySelectorAll("path, circle, line, rect, polyline, ellipse")
      .forEach((shape) => shape.setAttribute("pathLength", "1"));
  }, []);

  return (
    <Icon ref={ref} className="state-icon" size={18} fill={fill} aria-hidden data-tauri-drag-region />
  );
}

export default function App() {
  const [tick, setTick] = useState<Tick>({ text: "0m", state: "hold" });
  const [hover, setHover] = useState(false);
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(loadTheme);
  const windowSize = useRef({ w: PILL_W, h: PILL_H });

  useEffect(() => {
    const unlisten = listen<Tick>("tick", (event) => setTick(event.payload));
    return () => {
      unlisten.then((stop) => stop());
    };
  }, []);

  // A widget has no use for the browser's own right-click menu
  // (Back, Refresh, Inspect). The pill handles right-click itself.
  useEffect(() => {
    const block = (event: MouseEvent) => event.preventDefault();
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--theme", theme);
    saveTheme(theme);
  }, [theme]);

  // The transparent window still catches clicks, so it only grows while the
  // button or panel is shown. It grows right and down from its top-left
  // corner, so the pill never moves. Growing happens at once, before the
  // enter animation; shrinking waits for the exit animation to finish.
  useEffect(() => {
    const w = hover || open ? WIDE : PILL_W;
    const h = open ? TALL : PILL_H;
    const shrinking = w < windowSize.current.w || h < windowSize.current.h;
    const timer = setTimeout(() => {
      windowSize.current = { w, h };
      getCurrentWindow().setSize(new LogicalSize(w, h));
    }, shrinking ? EXIT_MS : 0);
    return () => clearTimeout(timer);
  }, [hover, open]);

  // Close on Esc, and when you click anywhere outside the widget.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    const onBlur = () => setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", onBlur);
    };
  }, [open]);

  return (
    <div className="bar" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div
        className="pill"
        data-tauri-drag-region
        title={`${STATE_LABEL[tick.state]}. Right-click to quit.`}
        onContextMenu={(event) => {
          event.preventDefault();
          invoke("quit");
        }}
      >
        {/* key = state: a state change mounts a fresh circle and icon, which
            replays the pop and then the draw. */}
        <div key={tick.state} className="logo" data-tauri-drag-region aria-label={STATE_LABEL[tick.state]}>
          <StateIcon state={tick.state} />
        </div>
        <span className="time" data-tauri-drag-region>
          {tick.text}
        </span>
      </div>

      <button
        type="button"
        className={hover || open ? "settings-btn show" : "settings-btn"}
        aria-label="Settings"
        aria-expanded={open}
        aria-controls="settings"
        tabIndex={hover || open ? 0 : -1}
        onClick={() => setOpen((o) => !o)}
      >
        <Settings className="gear" size={20} aria-hidden />
      </button>

      <SettingsPanel open={open} theme={theme} onTheme={setTheme} onQuit={() => invoke("quit")} />
    </div>
  );
}
