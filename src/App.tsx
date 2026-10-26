import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, LogicalSize, PhysicalPosition } from "@tauri-apps/api/window";
import { Dumbbell, Eye, EyeClosed, GlassWater, Hand, Moon, Settings } from "lucide-react";
import "@fontsource/google-sans/latin-700.css";
import { SIZES, SettingsPanel, THEMES, loadSize, loadTheme, saveTheme } from "./Settings";
import { TopAppsPanel, appsPanelHeight } from "./TopApps";
import { BREAK_CARD_H, BreakCard } from "./BreakCard";
import { SerionMark } from "./SerionMark";
import { useMagneticDrag } from "./drag";
import { useAppearance } from "./appearance";
import { EMPTY_TICK, formatClock, type BreakKind, type Tick } from "./types";
import "./App.css";

/** What the circle shows: the counting state, or a running break. */
type Shown = Tick["state"] | BreakKind;

const STATE_LABEL: Record<Shown, string> = {
  active: "Counting",
  idle: "Paused: idle",
  hold: "On hold: no app in front",
  water: "Water break. Click for the break card",
  stretch: "Stretch break. Click for the break card",
  eyes: "Rest your eyes. Click for the break card",
};

/**
 * Each state shows its own icon in the circle. The moon is filled (fill set to
 * the stroke color); the others stay outlines because filling hides their
 * detail (the pupil, the gaps between fingers, the water line).
 */
const STATE_ICON = {
  active: { Icon: Eye, fill: "none" },
  idle: { Icon: Moon, fill: "currentColor" },
  hold: { Icon: Hand, fill: "none" },
  water: { Icon: GlassWater, fill: "none" },
  stretch: { Icon: Dumbbell, fill: "none" },
  eyes: { Icon: EyeClosed, fill: "none" },
};

/** The break card tucks back into the pill after this long, unless hovered. */
const BREAK_TUCK_MS = 8000;
/** After a break runs out, the check shows this long before the card closes. */
const BREAK_DONE_MS = 1400;

// Window sizes in CSS pixels at Large size. These must match App.css; the
// pill and its button scale with the chosen size, the panels do not.
const PILL_W = 168;
const PILL_H = 50;
const GAP = 8;
const BUTTON = 50;
const PANEL_W = 226;
const SETTINGS_H = 172;
/** Longest exit transition in App.css; the window shrinks only after it. */
const EXIT_MS = 220;
/** How long the launch shows the Serion mark before it opens into the pill. */
const INTRO_MS = 1000;
/** How long the pill stays red after a timer fires. */
const ALERT_MS = 5000;
const ALERT_COLOR = "#e11d48";

type Panel = "none" | "settings" | "apps" | "break";

/** Draws its lines in when mounted; remount it to replay. */
function StateIcon({ state }: { state: Shown }) {
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
  const [size, setSize] = useState(loadSize);
  const zoom = SIZES[size];
  const pillW = PILL_W * zoom;
  const pillH = PILL_H * zoom;
  const wide = Math.max(pillW + GAP + BUTTON * zoom, PANEL_W);
  // Starts at the window size in tauri.conf.json (the Large pill).
  const windowSize = useRef({ w: PILL_W, h: PILL_H });
  const placedWidth = useRef(PILL_W);
  const togglePanel = (p: Panel) => setPanel((current) => (current === p ? "none" : p));
  // During a break a tap opens or tucks the break card; otherwise it opens today's top apps.
  const { dragging, handlers } = useMagneticDrag(pillW, pillH, () =>
    togglePanel(tick.break_kind ? "break" : "apps"),
  );
  const hoverRef = useRef(false);
  hoverRef.current = hover;
  // The last break, kept so the card can show its ending after the break is over.
  const [lastBreak, setLastBreak] = useState<{ kind: BreakKind; total: number; pauses: boolean } | null>(null);
  const [breakDone, setBreakDone] = useState(false);
  const previousBreak = useRef<BreakKind | null>(null);

  // A break starting opens its card, which tucks back into the pill after a
  // while (later if you are hovering it). A break running out shows the check,
  // then closes the card.
  useEffect(() => {
    const was = previousBreak.current;
    const now = tick.break_kind;
    previousBreak.current = now;
    if (now && now !== was) {
      setLastBreak({ kind: now, total: tick.break_total_ms ?? 0, pauses: tick.break_pauses ?? true });
      setBreakDone(false);
      setPanel("break");
      let timer = 0;
      const tuck = () => {
        if (hoverRef.current) timer = window.setTimeout(tuck, 1500);
        else setPanel((p) => (p === "break" ? "none" : p));
      };
      timer = window.setTimeout(tuck, BREAK_TUCK_MS);
      return () => clearTimeout(timer);
    }
    if (!now && was) {
      setBreakDone(true);
      const timer = window.setTimeout(() => setPanel((p) => (p === "break" ? "none" : p)), BREAK_DONE_MS);
      return () => clearTimeout(timer);
    }
  }, [tick.break_kind, tick.break_total_ms, tick.break_pauses]);

  /** Done or Snooze: the card closes straight away, no check animation. */
  const endBreak = (command: "finish_break" | "snooze_break") => {
    previousBreak.current = null;
    setPanel("none");
    invoke(command);
  };
  // Light/dark for the panels: follows the dashboard's switcher and Windows.
  useAppearance();

  // While you hold the pill it shows the hand at once, without waiting for
  // the next tick (Serion in front counts as hold anyway). A break shows its
  // own icon and counts down instead of showing today's total.
  const shownState: Shown = dragging ? "hold" : (tick.break_kind ?? tick.state);
  const shownText = tick.break_kind ? formatClock(tick.break_ms ?? 0) : tick.text;
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

  // The dashboard changes theme and size through shared storage; follow live.
  useEffect(() => {
    const onStorage = () => {
      setTheme(loadTheme());
      setSize(loadSize());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // A new size keeps the pill's center where it was (so a docked pill stays
  // centered). The pill sits at the window's left edge, so the window moves
  // by half the width change. Also runs at launch when Small is saved.
  useEffect(() => {
    const change = placedWidth.current - pillW;
    if (change === 0) return;
    placedWidth.current = pillW;
    const win = getCurrentWindow();
    Promise.all([win.outerPosition(), win.scaleFactor()]).then(([pos, scale]) =>
      win.setPosition(new PhysicalPosition(Math.round(pos.x + (change * scale) / 2), pos.y)),
    );
  }, [pillW]);

  useLayoutEffect(() => {
    document.documentElement.style.setProperty("--zoom", String(zoom));
  }, [zoom]);

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
  const panelH =
    panel === "settings"
      ? SETTINGS_H
      : panel === "apps"
        ? appsPanelHeight(tick.top.length)
        : panel === "break"
          ? BREAK_CARD_H
          : 0;
  useEffect(() => {
    const w = showButton || panel !== "none" ? wide : pillW;
    const h = panel === "none" ? pillH : pillH + GAP + panelH;
    const shrinking = w < windowSize.current.w || h < windowSize.current.h;
    const timer = setTimeout(() => {
      windowSize.current = { w, h };
      getCurrentWindow().setSize(new LogicalSize(w, h));
    }, shrinking ? EXIT_MS : 0);
    return () => clearTimeout(timer);
  }, [showButton, panel, panelH, pillW, pillH, wide]);

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

  const pillClass = ["pill", intro && "intro", dragging && "dragging", alert && "alert", tick.break_kind && "on-break"].filter(Boolean).join(" ");

  return (
    <div className="bar" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div
        className={pillClass}
        title={tick.break_kind ? `${STATE_LABEL[shownState]}.` : `${STATE_LABEL[shownState]}. Click for your top apps, right-click to quit.`}
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
        <span className="time">{shownText}</span>
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
      {lastBreak && (
        <BreakCard
          open={panel === "break"}
          kind={lastBreak.kind}
          leftMs={tick.break_ms}
          totalMs={tick.break_total_ms ?? lastBreak.total}
          pauses={lastBreak.pauses}
          done={breakDone}
          onDone={() => endBreak("finish_break")}
          onSnooze={() => endBreak("snooze_break")}
        />
      )}
    </div>
  );
}
