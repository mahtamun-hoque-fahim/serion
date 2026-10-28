import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";
import { BookOpen, CalendarDays, Dumbbell, Grab, Eye, EyeClosed, GlassWater, Hand, Hourglass, Maximize2, Moon, Power } from "lucide-react";
import "@fontsource/google-sans/latin-700.css";
import { SIZES, SettingsPanel, THEMES, loadSize, loadTheme, saveTheme } from "./Settings";
import { TopAppsPanel, appsPanelHeight } from "./TopApps";
import { BREAK_CARD_MAX_H, BREAK_CARD_W, BREAK_ICON, BreakCard, breakCardHeight, type BreakView } from "./BreakCard";
import { SerionMark } from "./SerionMark";
import { useMagneticDrag } from "./drag";
import { DOCKED, panelShift, place, union, type Rect } from "./layout";
import { useAppearance } from "./appearance";
import { chime } from "./sound";
import { EMPTY_TICK, formatClock, type BreakKind, type Tick } from "./types";
import "./App.css";

/** What the circle shows: the counting state, a break, reading mode, or the midnight flip. */
type Shown = Tick["state"] | BreakKind | "reading" | "calendar" | "grab" | "countdown";

const STATE_LABEL: Record<Shown, string> = {
  active: "Counting",
  idle: "Paused: idle",
  hold: "On hold: no app in front",
  water: "Water break. Click for the break card",
  stretch: "Stretch break. Click for the break card",
  eyes: "Rest your eyes. Click for the break card",
  reading: "Reading mode: counting, idle after 20 min",
  calendar: "A new day: the count starts again",
  grab: "Moving the pill, still counting",
  countdown: "Countdown running",
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
  reading: { Icon: BookOpen, fill: "none" },
  calendar: { Icon: CalendarDays, fill: "none" },
  grab: { Icon: Grab, fill: "none" },
  countdown: { Icon: Hourglass, fill: "none" },
};

/** The break card tucks back into the pill after this long, unless hovered. */
const BREAK_TUCK_MS = 8000;
/** After a break runs out, the check shows this long before the card closes. */
const BREAK_DONE_MS = 1400;
/** Start: the tick draws for this long before the break's animation takes over. */
const BREAK_START_MS = 900;
/** A counting state must hold this long before the pill shows it (no flicker on app switches). */
const STEADY_MS = 2000;
/** The midnight calendar flip shows this long. */
const CALENDAR_MS = 3200;
/** In fullscreen with a break due: the pill peeks this long, this often. */
const PEEK_MS = 5000;
const PEEK_EVERY_MS = 20 * 60_000;

// Window sizes in CSS pixels at Large size. These must match App.css; the
// pill and its button scale with the chosen size, the panels do not.
const PILL_W = 168;
const PILL_H = 50;
const GAP = 8;
const BUTTON = 50;
const PANEL_W = 226;
const SETTINGS_H = 172;
/** Most apps the top-apps panel lists. Must match TOP_APPS in src-tauri/src/lib.rs. */
const MAX_TOP_APPS = 5;
/** Longest exit transition in App.css; the clickable area shrinks only after it. */
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

  return <Icon ref={ref} className={`state-icon state-${state}`} size={18} fill={fill} aria-hidden />;
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
  const btn = BUTTON * zoom;
  // Space one hover button takes beside the pill.
  const need = GAP + btn;
  // The pill sits at a fixed spot in the window with this much room around it
  // (CSS px): enough for a pair of buttons or a panel on any side, a panel
  // also shifted sideways to stay on screen. See the window effects below.
  const sideRoom = Math.max(2 * need, Math.max(PANEL_W, BREAK_CARD_W) - pillW);
  const upDownRoom = Math.max(GAP + Math.max(SETTINGS_H, appsPanelHeight(MAX_TOP_APPS), BREAK_CARD_MAX_H), 2 * need);
  // Where the window is now: tauri.conf.json's Large pill at the window's top-left.
  const placed = useRef({ x: 0, y: 0, pillW: PILL_W });
  // Total clickable area now (CSS px²); none yet, so the first one applies at once.
  const hitArea = useRef(-1);
  const togglePanel = (p: Panel) => setPanel((current) => (current === p ? "none" : p));
  const offers = tick.break_offers;
  const onBreak = tick.break_kind !== null;
  // A tap opens or tucks the break card while a break is offered or running;
  // otherwise it opens today's top apps.
  const { dragging, handlers } = useMagneticDrag(pillW, pillH, () => placed.current, () =>
    togglePanel(offers.length || onBreak || breakDone ? "break" : "apps"),
  );
  const hoverRef = useRef(false);
  hoverRef.current = hover;
  // Start plays a tick before the break's animation: the kind you started, for that moment.
  const [starting, setStarting] = useState<BreakKind | null>(null);
  // The last break, kept so the card can show its ending after the break is over.
  const [lastBreak, setLastBreak] = useState<{ kind: BreakKind; total: number } | null>(null);
  const [breakDone, setBreakDone] = useState(false);
  const previousBreak = useRef<BreakKind | null>(null);
  const previousOffers = useRef<BreakKind[]>([]);
  const tuckTimer = useRef(0);

  /** Open the break card now; it tucks back into the pill later, unless hovered. */
  const showBreakCard = () => {
    setPanel("break");
    clearTimeout(tuckTimer.current);
    const tuck = () => {
      if (hoverRef.current) tuckTimer.current = window.setTimeout(tuck, 1500);
      else setPanel((p) => (p === "break" ? "none" : p));
    };
    tuckTimer.current = window.setTimeout(tuck, BREAK_TUCK_MS);
  };
  useEffect(() => () => clearTimeout(tuckTimer.current), []);

  // A newly due break opens the card with its offer.
  useEffect(() => {
    const kinds = offers.map((o) => o.kind);
    const fresh = kinds.some((k) => !previousOffers.current.includes(k));
    previousOffers.current = kinds;
    if (fresh) {
      setBreakDone(false);
      showBreakCard();
      if (!tick.hide_for_fullscreen) chime("break");
    }
  }, [offers]);

  // A break running out on its own shows the check, then closes the card.
  useEffect(() => {
    const was = previousBreak.current;
    const now = tick.break_kind;
    previousBreak.current = now;
    if (now) setLastBreak({ kind: now, total: tick.break_total_ms ?? 0 });
    if (!now && was) {
      setBreakDone(true);
      setPanel("break");
      if (!tick.hide_for_fullscreen) chime("break");
      const timer = window.setTimeout(() => {
        setBreakDone(false);
        setPanel((p) => (p === "break" ? "none" : p));
      }, BREAK_DONE_MS);
      return () => clearTimeout(timer);
    }
  }, [tick.break_kind, tick.break_total_ms]);

  const startBreak = (kind: BreakKind) => {
    setStarting(kind);
    window.setTimeout(() => setStarting(null), BREAK_START_MS);
    showBreakCard();
    invoke("start_break", { kind });
  };
  const skipBreak = (kind: BreakKind) => {
    invoke("skip_break", { kind });
    if (offers.length <= 1) setPanel("none");
  };
  /** Done: ends the break at once, no check (you just said you are done). */
  const finishBreak = () => {
    previousBreak.current = null;
    setPanel("none");
    invoke("finish_break");
  };

  const breakView: BreakView | null = starting
    ? { mode: "starting", kind: starting, leftMs: tick.break_ms ?? 0, totalMs: tick.break_total_ms ?? 0 }
    : tick.break_kind
      ? { mode: "active", kind: tick.break_kind, leftMs: tick.break_ms ?? 0, totalMs: tick.break_total_ms ?? 0 }
      : breakDone && lastBreak
        ? { mode: "done", kind: lastBreak.kind, leftMs: 0, totalMs: lastBreak.total }
        : offers.length
          ? { mode: "offer", offers }
          : null;

  // Light/dark for the panels: follows the dashboard's switcher and Windows.
  useAppearance();

  // Counting states (active, idle, hold) show only once they have held for
  // STEADY_MS, so a one-second blip while switching apps never flashes the hand.
  const [steadyState, setSteadyState] = useState<Tick["state"]>(tick.state);
  useEffect(() => {
    if (tick.state === steadyState) return;
    const timer = setTimeout(() => setSteadyState(tick.state), STEADY_MS);
    return () => clearTimeout(timer);
  }, [tick.state, steadyState]);

  // Midnight: a calendar flips in the circle and the time rolls to the new day's count.
  const [newDay, setNewDay] = useState(false);
  const seenDay = useRef("");
  useEffect(() => {
    if (!tick.day) return;
    const first = seenDay.current === "";
    const changed = seenDay.current !== tick.day;
    seenDay.current = tick.day;
    if (first || !changed) return;
    setNewDay(true);
    const timer = setTimeout(() => setNewDay(false), CALENDAR_MS);
    return () => clearTimeout(timer);
  }, [tick.day]);

  // Fullscreen app in front: the pill steps out of the way. A due break
  // still peeks for PEEK_MS, then again every PEEK_EVERY_MS until handled.
  const [peeking, setPeeking] = useState(false);
  const hasOffer = offers.length > 0;
  useEffect(() => {
    if (!tick.hide_for_fullscreen || !hasOffer) return setPeeking(false);
    let hideTimer = 0;
    const peek = () => {
      setPeeking(true);
      hideTimer = window.setTimeout(() => setPeeking(false), PEEK_MS);
    };
    peek();
    const every = window.setInterval(peek, PEEK_EVERY_MS);
    return () => {
      clearInterval(every);
      clearTimeout(hideTimer);
    };
  }, [tick.hide_for_fullscreen, hasOffer]);
  const hidden = tick.hide_for_fullscreen && !peeking;
  useEffect(() => {
    const win = getCurrentWindow();
    (hidden ? win.hide() : win.show()).catch(() => {});
  }, [hidden]);

  // While you drag the pill it shows a grabbing hand at once. That is not
  // hold: with apps open, the app on top keeps the time. A running break
  // shows its icon and counts down; an offered break shows its icon. A
  // running countdown shows the hourglass over counting, idle, hold and reading.
  const shownState: Shown = dragging
    ? "grab"
    : (tick.break_kind ??
      (offers.length === 1
        ? offers[0].kind
        : newDay
          ? "calendar"
          : tick.countdown_ms !== null
            ? "countdown"
            : tick.reading && steadyState === "active"
              ? "reading"
              : steadyState));
  const shownText = onBreak ? formatClock(tick.break_ms ?? 0) : tick.text;
  const breakProgress = onBreak && tick.break_total_ms ? 1 - (tick.break_ms ?? 0) / tick.break_total_ms : 0;

  useEffect(() => {
    const unlisten = listen<Tick>("tick", (event) => setTick(event.payload));
    return () => {
      unlisten.then((stop) => stop());
    };
  }, []);

  // Sounds stay quiet while the pill hides for a fullscreen app (videos, games).
  const fullscreenRef = useRef(false);
  fullscreenRef.current = tick.hide_for_fullscreen;

  // A timer fired: red for ALERT_MS, and a chime. A second alert restarts the clock.
  useEffect(() => {
    let timer = 0;
    const unlisten = listen("alert", () => {
      setAlert(true);
      if (!fullscreenRef.current) chime("alert");
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

  // The window's scale factor (physical px per CSS px); 0 until read. Moving
  // to a screen with another scale redoes the window size and region.
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const win = getCurrentWindow();
    win.scaleFactor().then(setScale);
    const unlisten = win.onScaleChanged(({ payload }) => setScale(payload.scaleFactor));
    return () => {
      unlisten.then((stop) => stop());
    };
  }, []);

  // The window keeps one size, with the pill at a fixed spot in its middle,
  // and never moves when a panel opens or closes: moving or resizing it showed
  // the pill a frame out of place. Only its clickable parts change (below).
  // A new pill size resizes it once, keeping the pill's center where it was
  // (so a docked pill stays centered). Also runs at launch.
  const windowW = 2 * sideRoom + pillW;
  const windowH = 2 * upDownRoom + pillH;
  useEffect(() => {
    if (!scale) return;
    getCurrentWindow()
      .outerPosition()
      .then((pos) => {
        const was = placed.current;
        const pillX = pos.x + (was.x + (was.pillW - pillW) / 2) * scale;
        const pillY = pos.y + was.y * scale;
        placed.current = { x: sideRoom, y: upDownRoom, pillW };
        invoke("set_bounds", {
          x: Math.round(pillX - sideRoom * scale),
          y: Math.round(pillY - upDownRoom * scale),
          width: Math.round(windowW * scale),
          height: Math.round(windowH * scale),
        });
      });
  }, [pillW, scale]);

  // Where the pill is on its screen (CSS px), read again once it stops moving:
  // the buttons and panels go where there is room (layout.ts).
  const [onScreen, setOnScreen] = useState<{ pill: Rect; area: Rect } | null>(null);
  const pillSize = useRef({ w: pillW, h: pillH });
  pillSize.current = { w: pillW, h: pillH };
  useEffect(() => {
    const win = getCurrentWindow();
    const measure = async () => {
      const [pos, monitor, factor] = await Promise.all([win.outerPosition(), currentMonitor(), win.scaleFactor()]);
      if (!monitor) return;
      const { x, y } = placed.current;
      const a = monitor.workArea;
      setOnScreen({
        pill: { x: pos.x / factor + x, y: pos.y / factor + y, w: pillSize.current.w, h: pillSize.current.h },
        area: { x: a.position.x / factor, y: a.position.y / factor, w: a.size.width / factor, h: a.size.height / factor },
      });
    };
    let timer = 0;
    const unlisten = win.onMoved(() => {
      clearTimeout(timer);
      timer = window.setTimeout(measure, 150);
    });
    measure();
    return () => {
      clearTimeout(timer);
      unlisten.then((stop) => stop());
    };
  }, [pillW, scale]);
  const placement = onScreen ? place(onScreen.pill, onScreen.area, need) : DOCKED;
  const column = placement.buttons === "down" || placement.buttons === "up";
  const shift = (width: number) => (onScreen ? panelShift(onScreen.pill, onScreen.area, width) : 0);

  // Hover shows expand and settings. In a column they share the panel's side,
  // so an open panel takes their place there.
  const showButtons = !intro && ((hover && !dragging) || panel === "settings") && !(column && panel !== "none");
  // The two buttons, in window CSS px: [expand, settings].
  const buttonAt = (): [Rect, Rect] => {
    const y = upDownRoom + (pillH - btn) / 2;
    const left = sideRoom - need;
    const right = sideRoom + pillW + GAP;
    const at = (x: number, top: number): Rect => ({ x, y: top, w: btn, h: btn });
    switch (placement.buttons) {
      case "both":
        return [at(left, y), at(right, y)];
      case "right":
        return [at(right, y), at(right + need, y)];
      case "left":
        return [at(left - need, y), at(left, y)];
      default: {
        const x = placement.column === "start" ? sideRoom : sideRoom + pillW - btn;
        const first = placement.buttons === "down" ? upDownRoom + pillH + GAP : upDownRoom - need;
        const step = placement.buttons === "down" ? need : -need;
        return [at(x, first), at(x, first + step)];
      }
    }
  };
  const buttons = buttonAt();
  const pillRect: Rect = { x: sideRoom, y: upDownRoom, w: pillW, h: pillH };

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

  // The transparent window would catch clicks everywhere, so only the pill,
  // its shown buttons and an open panel are clickable (each including the gap
  // to the pill, so the mouse can cross it); elsewhere clicks pass through.
  // The clickable parts grow at once, before the enter animation, and shrink
  // only after the exit animation.
  const panelH =
    panel === "settings"
      ? SETTINGS_H
      : panel === "apps"
        ? appsPanelHeight(tick.top.length)
        : panel === "break" && breakView
          ? breakCardHeight(breakView)
          : 0;
  const panelW = panel === "break" ? BREAK_CARD_W : PANEL_W;
  const panelX = (width: number) => sideRoom + pillW / 2 - width / 2 + shift(width);
  const hits: Rect[] = [showButtons ? union([pillRect, ...buttons]) : pillRect];
  if (panel !== "none") {
    // Reaches over the gap to the pill.
    const y = placement.panelUp ? upDownRoom - GAP - panelH : upDownRoom + pillH;
    hits.push({ x: panelX(panelW), y, w: panelW, h: panelH + GAP });
  }
  const hitKey = hits.map((r) => [r.x, r.y, r.w, r.h].map(Math.round).join(",")).join(";");
  useEffect(() => {
    if (!scale) return;
    const area = hits.reduce((sum, r) => sum + r.w * r.h, 0);
    const shrinking = area < hitArea.current;
    const timer = setTimeout(() => {
      hitArea.current = area;
      invoke("set_hit_area", {
        rects: hits.map((r) => [r.x, r.y, r.w, r.h].map((v) => Math.round(v * scale))),
      });
    }, shrinking ? EXIT_MS : 0);
    return () => clearTimeout(timer);
  }, [hitKey, scale]);

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

  const pillClass = ["pill", intro && "intro", dragging && "dragging", alert && "alert", (onBreak || offers.length > 0) && "on-break"].filter(Boolean).join(" ");

  // A button grows out of the pill: it starts nudged toward it.
  const fromPill = (r: Rect) => {
    const dx = sideRoom + pillW / 2 - (r.x + r.w / 2);
    const dy = upDownRoom + pillH / 2 - (r.y + r.h / 2);
    const nudge = (d: number, other: number) => (Math.abs(d) > Math.abs(other) ? Math.sign(d) * 14 : 0);
    return { "--from-x": `${nudge(dx, dy)}px`, "--from-y": `${nudge(dy, dx)}px` };
  };
  const slot = (r: Rect) => ({ left: r.x, top: r.y, width: r.w, height: r.h });

  return (
    <div
      className={placement.panelUp ? "bar panels-up" : "bar"}
      style={
        {
          width: windowW,
          height: windowH,
          "--panel-x": `${panelX(PANEL_W)}px`,
          "--panel-x-wide": `${panelX(BREAK_CARD_W)}px`,
          "--panel-top": placement.panelUp ? "auto" : `${upDownRoom + pillH + GAP}px`,
          "--panel-bottom": placement.panelUp ? `${windowH - upDownRoom + GAP}px` : "auto",
        } as CSSProperties
      }
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="slot" style={slot(pillRect)}>
        <div
          className={pillClass}
          title={onBreak || offers.length ? `${STATE_LABEL[shownState]}.` : `${STATE_LABEL[shownState]}. Click for your top apps, right-click to quit.`}
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
          <div key={offers.length > 1 && !onBreak ? "offers" : shownState} className="logo" aria-label={STATE_LABEL[shownState]}>
            {offers.length > 1 && !onBreak ? (
              // Two or three breaks due at once: all their icons, you pick in the card.
              <span className="offer-icons">
                {offers.map(({ kind }) => {
                  const Icon = BREAK_ICON[kind];
                  return <Icon key={kind} size={12} strokeWidth={2.5} aria-hidden />;
                })}
              </span>
            ) : (
              <StateIcon state={shownState} />
            )}
            {onBreak && (
              // Fills up around the icon as the break runs.
              <svg className="break-progress" viewBox="0 0 36 36" aria-hidden>
                <circle cx="18" cy="18" r="16" pathLength={1} style={{ strokeDashoffset: 1 - breakProgress }} />
              </svg>
            )}
          </div>
          {/* key = day: at midnight the new count slides in. */}
          <span key={tick.day} className="time">
            {shownText}
          </span>
        </div>
      </div>

      <div className="slot" style={slot(buttons[0])}>
        <button
          type="button"
          className={showButtons ? "pill-btn expand-btn show" : "pill-btn expand-btn"}
          style={fromPill(buttons[0]) as CSSProperties}
          aria-label="Open Serion"
          title="Open Serion"
          tabIndex={showButtons ? 0 : -1}
          onClick={() => {
            setPanel("none");
            invoke("open_dashboard");
          }}
        >
          <Maximize2 size={20} aria-hidden />
        </button>
      </div>
      <div className="slot" style={slot(buttons[1])}>
        <button
          type="button"
          className={showButtons ? "pill-btn power-btn show" : "pill-btn power-btn"}
          style={fromPill(buttons[1]) as CSSProperties}
          aria-label="Settings"
          title="Settings"
          aria-expanded={panel === "settings"}
          aria-controls="settings"
          tabIndex={showButtons ? 0 : -1}
          onClick={() => togglePanel("settings")}
        >
          <Power size={20} aria-hidden />
        </button>
      </div>

      <SettingsPanel
        open={panel === "settings"}
        theme={theme}
        onTheme={setTheme}
        onQuit={() => invoke("quit")}
      />
      <TopAppsPanel
        open={panel === "apps"}
        top={tick.top}
        reading={tick.reading}
        onReading={(on) => invoke("set_reading", { on })}
      />
      {breakView && (
        <BreakCard
          open={panel === "break"}
          view={breakView}
          onStart={startBreak}
          onSkip={skipBreak}
          onDone={finishBreak}
        />
      )}
    </div>
  );
}
