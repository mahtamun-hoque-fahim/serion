import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { Eye, Hand, Moon, Settings } from "lucide-react";
import "@fontsource/google-sans/latin-700.css";
import { SettingsPanel, loadTheme, saveTheme } from "./Settings";
import { SerionMark } from "./SerionMark";
import { useMagneticDrag } from "./drag";
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
const PANEL_H = 172;
const WIDE = PILL_W + GAP + BUTTON;
const TALL = PILL_H + GAP + PANEL_H;
/** Longest exit transition in App.css; the window shrinks only after it. */
const EXIT_MS = 220;
/** How long the launch shows the Serion mark before it opens into the pill. */
const INTRO_MS = 1000;

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

  return <Icon ref={ref} className="state-icon" size={18} fill={fill} aria-hidden />;
}

export default function App() {
  const [tick, setTick] = useState<Tick>({ text: "0m", state: "hold" });
  const [intro, setIntro] = useState(true);
  const [hover, setHover] = useState(false);
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(loadTheme);
  const windowSize = useRef({ w: PILL_W, h: PILL_H });
  const { dragging, handlers } = useMagneticDrag(PILL_W);

  // While you hold the pill it shows the hand at once, without waiting for
  // the next tick (Serion in front counts as hold anyway).
  const shownState = dragging ? "hold" : tick.state;
  const showButton = !intro && ((hover && !dragging) || open);

  useEffect(() => {
    const unlisten = listen<Tick>("tick", (event) => setTick(event.payload));
    return () => {
      unlisten.then((stop) => stop());
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIntro(false), INTRO_MS);
    return () => clearTimeout(timer);
  }, []);

  // A widget has no use for the browser's own right-click menu
  // (Back, Refresh, Inspect). The pill handles right-click itself.
  useEffect(() => {
    const block = (event: MouseEvent) => event.preventDefault();
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, []);

  // Layout effect: the saved color is applied before the first paint, so the
  // launch circle never flashes the default blue first.
  useLayoutEffect(() => {
    document.documentElement.style.setProperty("--theme", theme);
    saveTheme(theme);
  }, [theme]);

  // The transparent window still catches clicks, so it only grows while the
  // button or panel is shown. It grows right and down from its top-left
  // corner, so the pill never moves. Growing happens at once, before the
  // enter animation; shrinking waits for the exit animation to finish.
  useEffect(() => {
    const w = showButton ? WIDE : PILL_W;
    const h = open ? TALL : PILL_H;
    const shrinking = w < windowSize.current.w || h < windowSize.current.h;
    const timer = setTimeout(() => {
      windowSize.current = { w, h };
      getCurrentWindow().setSize(new LogicalSize(w, h));
    }, shrinking ? EXIT_MS : 0);
    return () => clearTimeout(timer);
  }, [showButton, open]);

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

  const pillClass = ["pill", intro && "intro", dragging && "dragging"].filter(Boolean).join(" ");

  return (
    <div className="bar" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div
        className={pillClass}
        title={`${STATE_LABEL[shownState]}. Right-click to quit.`}
        onContextMenu={(event) => {
          event.preventDefault();
          invoke("quit");
        }}
        {...handlers}
      >
        {/* Launch: the mark in a theme-colored circle, which then opens into the pill. */}
        <SerionMark size={24} className="intro-mark" />
        {/* key = state: a state change mounts a fresh circle and icon, which
            replays the pop and then the draw. */}
        <div key={shownState} className="logo" aria-label={STATE_LABEL[shownState]}>
          <StateIcon state={shownState} />
        </div>
        <span className="time">{tick.text}</span>
      </div>

      <button
        type="button"
        className={showButton ? "settings-btn show" : "settings-btn"}
        aria-label="Settings"
        aria-expanded={open}
        aria-controls="settings"
        tabIndex={showButton ? 0 : -1}
        onClick={() => setOpen((o) => !o)}
      >
        <Settings className="gear" size={20} aria-hidden />
      </button>

      <SettingsPanel open={open} theme={theme} onTheme={setTheme} onQuit={() => invoke("quit")} />
    </div>
  );
}
