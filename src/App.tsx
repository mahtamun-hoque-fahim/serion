import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { Eye, Hand, Moon, Settings } from "lucide-react";
import "@fontsource/google-sans/latin-700.css";
import { SettingsPanel, THEMES, loadTheme, saveTheme } from "./Settings";
import { TopAppsPanel, appsPanelHeight } from "./TopApps";
import { SerionMark } from "./SerionMark";
import { useMagneticDrag } from "./drag";
import { useAppearance } from "./appearance";
import { EMPTY_TICK, type Tick } from "./types";
import "./App.css";

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
const SETTINGS_H = 172;
const WIDE = PILL_W + GAP + BUTTON;
/** Longest exit transition in App.css; the window shrinks only after it. */
const EXIT_MS = 220;
/** How long the launch shows the Serion mark before it opens into the pill. */
const INTRO_MS = 1000;
/** How long the pill stays red after a timer fires. */
const ALERT_MS = 5000;
const ALERT_COLOR = "#e11d48";

type Panel = "none" | "settings" | "apps";

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
  const [tick, setTick] = useState<Tick>(EMPTY_TICK);
  const [intro, setIntro] = useState(true);
  const [hover, setHover] = useState(false);
  const [panel, setPanel] = useState<Panel>("none");
  const [theme, setTheme] = useState(loadTheme);
  const [alert, setAlert] = useState(false);
  const windowSize = useRef({ w: PILL_W, h: PILL_H });
  const togglePanel = (p: Panel) => setPanel((current) => (current === p ? "none" : p));
  const { dragging, handlers } = useMagneticDrag(PILL_W, () => togglePanel("apps"));
  // Light/dark for the panels: follows the dashboard's switcher and Windows.
  useAppearance();

  // While you hold the pill it shows the hand at once, without waiting for
  // the next tick (Serion in front counts as hold anyway).
  const shownState = dragging ? "hold" : tick.state;
  const showButton = !intro && ((hover && !dragging) || panel === "settings");

  useEffect(() => {
    const unlisten = listen<Tick>("tick", (event) => setTick(event.payload));
    return () => {
      unlisten.then((stop) => stop());
    };
  }, []);

  // A timer fired: red for ALERT_MS. A second alert restarts the clock.
  useEffect(() => {
    let timer = 0;
    const unlisten = listen("alert", () => {
      setAlert(true);
      clearTimeout(timer);
      timer = window.setTimeout(() => setAlert(false), ALERT_MS);
    });
    return () => {
      clearTimeout(timer);
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

  // The dashboard changes the theme through shared storage; follow it live.
  useEffect(() => {
    const onStorage = () => setTheme(loadTheme());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => saveTheme(theme), [theme]);

  // Layout effect: the color is applied before the first paint, so the
  // launch circle never flashes the default blue first.
  useLayoutEffect(() => {
    document.documentElement.style.setProperty("--theme", alert ? ALERT_COLOR : theme);
    document.documentElement.dataset.graphite = String(!alert && theme === THEMES[1].color);
  }, [theme, alert]);

  // The transparent window still catches clicks, so it only grows while the
  // button or a panel is shown. It grows right and down from its top-left
  // corner, so the pill never moves. Growing happens at once, before the
  // enter animation; shrinking waits for the exit animation to finish.
  const panelH = panel === "settings" ? SETTINGS_H : panel === "apps" ? appsPanelHeight(tick.top.length) : 0;
  useEffect(() => {
    const w = showButton || panel !== "none" ? WIDE : PILL_W;
    const h = panel === "none" ? PILL_H : PILL_H + GAP + panelH;
    const shrinking = w < windowSize.current.w || h < windowSize.current.h;
    const timer = setTimeout(() => {
      windowSize.current = { w, h };
      getCurrentWindow().setSize(new LogicalSize(w, h));
    }, shrinking ? EXIT_MS : 0);
    return () => clearTimeout(timer);
  }, [showButton, panel, panelH]);

  // Close on Esc, and when you click anywhere outside the widget.
  useEffect(() => {
    if (panel === "none") return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setPanel("none");
    const onBlur = () => setPanel("none");
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", onBlur);
    };
  }, [panel]);

  const pillClass = ["pill", intro && "intro", dragging && "dragging", alert && "alert"].filter(Boolean).join(" ");

  return (
    <div className="bar" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div
        className={pillClass}
        title={`${STATE_LABEL[shownState]}. Click for your top apps, right-click to quit.`}
        aria-expanded={panel === "apps"}
        aria-controls="top-apps"
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
        aria-expanded={panel === "settings"}
        aria-controls="settings"
        tabIndex={showButton ? 0 : -1}
        onClick={() => togglePanel("settings")}
      >
        <Settings className="gear" size={20} aria-hidden />
      </button>

      <SettingsPanel
        open={panel === "settings"}
        theme={theme}
        onTheme={setTheme}
        onQuit={() => invoke("quit")}
      />
      <TopAppsPanel
        open={panel === "apps"}
        top={tick.top}
        onExpand={() => {
          setPanel("none");
          invoke("open_dashboard");
        }}
      />
    </div>
  );
}
