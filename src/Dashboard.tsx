import { useEffect, useLayoutEffect, useMemo, useState, type CSSProperties } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Monitor, Moon, Power, Sun, Trash2, X } from "lucide-react";
import { useAppearance, type Appearance } from "./appearance";
import "@fontsource/google-sans/latin-700.css";
import { BarChart, type Bar } from "./BarChart";
import { SerionMark } from "./SerionMark";
import { THEMES, ThemeSwatches, loadSize, loadTheme, saveSize, saveTheme, useAutostart } from "./Settings";
import { EMPTY_TICK, formatClock, formatHM, type Battery, type BreakConfig, type Day, type Settings, type Tick } from "./types";
import "./Dashboard.css";

/** Chart ranges in days. Only those within the kept history are offered. */
const RANGES = [
  { days: 7, label: "7D" },
  { days: 30, label: "30D" },
  { days: 90, label: "90D" },
  { days: 365, label: "1Y" },
  { days: 1825, label: "5Y" },
];

/** Must match RETENTION_CHOICES in src-tauri/src/history.rs. */
const RETENTION = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "3 months" },
  { days: 180, label: "6 months" },
  { days: 365, label: "1 year" },
  { days: 730, label: "2 years" },
  { days: 1825, label: "5 years" },
];

const MODES: { value: Appearance; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "Match Windows", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

const COUNTDOWN_PRESETS = [15, 25, 45, 60];
/** The near-black theme; dark mode swaps its marks for light gray (Dashboard.css). */
const GRAPHITE = THEMES[1].color;
const REFRESH_MS = 30_000;
const CONFIRM_MS = 3000;

const dateOf = (day: string) => new Date(`${day}T00:00:00`);
const fmtDate = (day: string, opts: Intl.DateTimeFormatOptions) => dateOf(day).toLocaleDateString(undefined, opts);

/**
 * One bar per day up to 90 days; beyond that, one bar per week (1Y) or per
 * 30 days (5Y), showing the average per day in that period so the axis stays
 * "time per day" at every range.
 */
function toBars(days: Day[]): Bar[] {
  const size = days.length <= 90 ? 1 : days.length <= 365 ? 7 : 30;
  const bars: Bar[] = [];
  for (let i = 0; i < days.length; i += size) {
    const group = days.slice(i, i + size);
    const first = group[0].day;
    const ms = group.reduce((sum, d) => sum + d.total_ms, 0) / group.length;
    bars.push({
      key: first,
      ms,
      label:
        size === 1 && days.length <= 7
          ? fmtDate(first, { weekday: "short" })
          : fmtDate(first, size === 30 ? { month: "short", year: "2-digit" } : { month: "short", day: "numeric" }),
      title:
        size === 1
          ? fmtDate(first, { weekday: "long", month: "short", day: "numeric" })
          : `${size === 7 ? "Week of" : "30 days from"} ${fmtDate(first, { month: "short", day: "numeric", year: "numeric" })}, per day`,
    });
  }
  return bars;
}

/** Apps summed over the range, most used first. */
function topApps(days: Day[], n: number) {
  const totals = new Map<string, { name: string; ms: number }>();
  for (const day of days) {
    for (const [exe, app] of Object.entries(day.apps)) {
      const entry = totals.get(exe) ?? { name: app.name, ms: 0 };
      entry.ms += app.ms;
      totals.set(exe, entry);
    }
  }
  return [...totals.values()].sort((a, b) => b.ms - a.ms).slice(0, n);
}

export default function Dashboard() {
  const [tick, setTick] = useState<Tick>(EMPTY_TICK);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [range, setRange] = useState(7);
  const [days, setDays] = useState<Day[]>([]);
  const [theme, setTheme] = useState(loadTheme);
  const [version, setVersion] = useState(0);
  const [appearance, setAppearance] = useAppearance();

  useLayoutEffect(() => {
    document.documentElement.style.setProperty("--theme", theme);
    document.documentElement.dataset.graphite = String(theme === GRAPHITE);
  }, [theme]);
  // The pill's settings change the theme through shared storage.
  useEffect(() => {
    const onStorage = () => setTheme(loadTheme());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const unlisten = listen<Tick>("tick", (event) => setTick(event.payload));
    invoke<Settings>("get_settings").then(setSettings);
    return () => {
      unlisten.then((stop) => stop());
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const load = () => invoke<Day[]>("get_history", { days: range }).then((d) => alive && setDays(d));
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [range, version]);

  const retention = settings?.retention_days ?? 30;
  const ranges = RANGES.filter((r) => r.days <= Math.max(retention, 7));
  useEffect(() => {
    if (range > retention) setRange(ranges[ranges.length - 1].days);
  }, [range, retention, ranges]);

  const bars = useMemo(() => (days.length ? toBars(days) : []), [days]);
  const apps = useMemo(() => topApps(days, 8), [days]);
  const rangeTotal = days.reduce((sum, d) => sum + d.total_ms, 0);
  const activeDays = days.filter((d) => d.total_ms > 0).length;
  const average = activeDays ? rangeTotal / activeDays : 0;
  const rangeIndex = Math.max(ranges.findIndex((r) => r.days === range), 0);

  const win = getCurrentWindow();

  return (
    <div className="shell">
      <div className="card">
        <header className="titlebar" data-tauri-drag-region>
          <div className="brand" data-tauri-drag-region>
            <span className="brand-mark" data-tauri-drag-region>
              <SerionMark size={16} />
            </span>
            Serion
          </div>

          <div className="tabs" role="tablist" aria-label="Range" style={{ "--i": rangeIndex } as CSSProperties}>
            <span className="tab-indicator" aria-hidden />
            {ranges.map((r) => (
              <button
                key={r.days}
                type="button"
                role="tab"
                aria-selected={r.days === range}
                className="tab"
                onClick={() => setRange(r.days)}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="window-buttons">
            <div
              className="mode-switch"
              role="radiogroup"
              aria-label="Appearance"
              style={{ "--i": MODES.findIndex((m) => m.value === appearance) } as CSSProperties}
            >
              <span className="mode-indicator" aria-hidden />
              {MODES.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={appearance === value}
                  aria-label={label}
                  title={label}
                  className="mode-btn"
                  onClick={() => setAppearance(value)}
                >
                  <Icon size={14} aria-hidden />
                </button>
              ))}
            </div>
            <button type="button" className="icon-btn" aria-label="Minimize" onClick={() => win.minimize()}>
              <Minus size={16} aria-hidden />
            </button>
            <button type="button" className="icon-btn close" aria-label="Close" onClick={() => win.close()}>
              <X size={16} aria-hidden />
            </button>
          </div>
        </header>

        <main className="content">
          <section className="tiles">
            <div className="tile" style={{ "--i": 0 } as CSSProperties}>
              <span className="tile-label">Today</span>
              <strong className="tile-value">{formatHM(tick.total_ms)}</strong>
            </div>
            <div className="tile" style={{ "--i": 1 } as CSSProperties}>
              <span className="tile-label">Daily average</span>
              <strong className="tile-value">{formatHM(average)}</strong>
              <span className="tile-note">
                {activeDays} active {activeDays === 1 ? "day" : "days"}
              </span>
            </div>
            <div className="tile" style={{ "--i": 2 } as CSSProperties}>
              <span className="tile-label">Most used</span>
              <strong className="tile-value tile-app" title={apps[0]?.name}>
                {apps[0]?.name ?? "None yet"}
              </strong>
              {apps[0] && <span className="tile-note">{formatHM(apps[0].ms)}</span>}
            </div>
          </section>

          <section className="block">
            <h2>{range <= 90 ? "Screen time per day" : "Average screen time per day"}</h2>
            {bars.length > 0 && <BarChart key={range} bars={bars} caption="Screen time per day" />}
          </section>

          <div className="columns">
            <div className="stack">
              <section className="block">
                <h2>Top apps</h2>
                {apps.length === 0 ? (
                  <p className="muted">No app time in this range yet.</p>
                ) : (
                  <ol className="app-bars">
                    {apps.map((app, i) => (
                      <li
                        key={app.name}
                        style={{ "--i": i, "--share": app.ms / apps[0].ms } as CSSProperties}
                      >
                        <span className="app-name" title={app.name}>
                          {app.name}
                        </span>
                        <span className="app-time">
                          {formatHM(app.ms)}
                          <small>{rangeTotal ? Math.round((app.ms / rangeTotal) * 100) : 0}%</small>
                        </span>
                        <span className="app-track" aria-hidden>
                          <span className="app-fill" />
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
              <SettingsBlock
                theme={theme}
                onTheme={(color) => {
                  saveTheme(color);
                  setTheme(color);
                }}
                settings={settings}
                onSettings={setSettings}
              />
            </div>

            <div className="stack">
              <Timers tick={tick} settings={settings} onSettings={setSettings} />
              <BreaksBlock settings={settings} onSettings={setSettings} />
              <DataBlock
                settings={settings}
                onSettings={setSettings}
                onCleared={() => setVersion((v) => v + 1)}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Timers({
  tick,
  settings,
  onSettings,
}: {
  tick: Tick;
  settings: Settings | null;
  onSettings: (s: Settings) => void;
}) {
  const limit = settings?.limit_ms ?? null;
  const [hours, setHours] = useState(2);
  const [minutes, setMinutes] = useState(0);
  const [custom, setCustom] = useState(30);
  const running = tick.countdown_ms !== null;

  async function saveLimit(total: number | null) {
    onSettings(await invoke<Settings>("set_limit", { minutes: total }));
  }

  const progress = limit ? Math.min(tick.total_ms / limit, 1) : 0;

  return (
    <section className="block">
      <h2>Timers</h2>

      <div className="timer">
        <div className="timer-head">
          <span>Daily limit</span>
          {limit !== null && (
            <button type="button" className="text-btn" onClick={() => saveLimit(null)}>
              Turn off
            </button>
          )}
        </div>
        {limit !== null ? (
          <>
            <div className="meter" style={{ "--p": progress } as CSSProperties}>
              <span className="meter-fill" />
            </div>
            <p className="muted">
              {formatHM(tick.total_ms)} of {formatHM(limit)}
              {tick.total_ms >= limit && " - reached"}
            </p>
          </>
        ) : (
          <form
            className="timer-row"
            onSubmit={(e) => {
              e.preventDefault();
              const total = hours * 60 + minutes;
              if (total > 0) saveLimit(Math.min(total, 1440));
            }}
          >
            <label className="field">
              <input
                type="number"
                min={0}
                max={24}
                value={hours}
                onChange={(e) => setHours(clamp(e.target.valueAsNumber, 0, 24))}
              />
              h
            </label>
            <label className="field">
              <input
                type="number"
                min={0}
                max={59}
                step={5}
                value={minutes}
                onChange={(e) => setMinutes(clamp(e.target.valueAsNumber, 0, 59))}
              />
              m
            </label>
            <button type="submit" className="btn" disabled={hours * 60 + minutes === 0}>
              Set limit
            </button>
          </form>
        )}
      </div>

      <div className="timer">
        <div className="timer-head">
          <span>Countdown</span>
          {running && (
            <button type="button" className="text-btn" onClick={() => invoke("cancel_countdown")}>
              Cancel
            </button>
          )}
        </div>
        {running ? (
          <p className="countdown">{formatClock(tick.countdown_ms ?? 0)}</p>
        ) : (
          <div className="timer-row">
            {COUNTDOWN_PRESETS.map((m) => (
              <button key={m} type="button" className="chip" onClick={() => invoke("start_countdown", { minutes: m })}>
                {m}m
              </button>
            ))}
            <form
              className="timer-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (custom > 0) invoke("start_countdown", { minutes: custom });
              }}
            >
              <label className="field">
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={custom}
                  aria-label="Custom minutes"
                  onChange={(e) => setCustom(clamp(e.target.valueAsNumber, 1, 1440))}
                />
                m
              </label>
              <button type="submit" className="btn">
                Start
              </button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}

const BATTERY_LEVELS = [10, 15, 20, 30];
const BATTERY_REFRESH_MS = 30_000;

/** The pill's settings plus the detailed ones that only live here. */
function SettingsBlock({
  theme,
  onTheme,
  settings,
  onSettings,
}: {
  theme: string;
  onTheme: (color: string) => void;
  settings: Settings | null;
  onSettings: (s: Settings) => void;
}) {
  const autostart = useAutostart();
  const [battery, setBattery] = useState<Battery | undefined>(undefined);
  const [size, setSize] = useState(loadSize);
  const [monitors, setMonitors] = useState(1);
  useEffect(() => {
    invoke<number>("monitor_count").then(setMonitors);
  }, []);
  const overFullscreen = settings?.show_over_fullscreen ?? false;
  // Unset means automatic: on while more than one screen is connected.
  const otherScreens = settings?.other_screens ?? monitors > 1;
  const hideFromCapture = settings?.hide_from_capture ?? false;
  const saveDisplay = async (showOverFullscreen: boolean, other: boolean | null, hide = hideFromCapture) =>
    onSettings(await invoke<Settings>("set_display", { showOverFullscreen, otherScreens: other, hideFromCapture: hide }));

  useEffect(() => {
    const read = () => invoke<Battery>("get_battery").then(setBattery);
    read();
    const timer = setInterval(read, BATTERY_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  const batteryOn = settings?.battery_quit ?? false;
  const level = settings?.battery_threshold ?? 20;
  const saveBattery = async (enabled: boolean, threshold: number) =>
    onSettings(await invoke<Settings>("set_battery_quit", { enabled, threshold }));

  return (
    <section className="block">
      <h2>Settings</h2>

      <p className="setting-label">Theme</p>
      <ThemeSwatches theme={theme} onTheme={onTheme} />

      <p className="setting-label spaced">Notch size</p>
      <div
        className="tabs size-tabs"
        role="radiogroup"
        aria-label="Notch size"
        style={{ "--i": size === "small" ? 0 : 1 } as CSSProperties}
      >
        <span className="tab-indicator" aria-hidden />
        {(["small", "large"] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={size === s}
            className="tab"
            onClick={() => {
              saveSize(s);
              setSize(s);
            }}
          >
            {s === "small" ? "Small" : "Large"}
          </button>
        ))}
      </div>

      <div className="setting-list">
        <button
          type="button"
          role="switch"
          aria-checked={autostart.on}
          className="setting-row"
          disabled={!autostart.available}
          title={autostart.available ? undefined : "Available in the installed app"}
          onClick={autostart.toggle}
        >
          <span>
            Start at login
            {!autostart.available && <small>Available in the installed app</small>}
          </span>
          <span className="switch" aria-hidden>
            <span className="switch-knob" />
          </span>
        </button>

        <button
          type="button"
          role="switch"
          aria-checked={overFullscreen}
          className="setting-row"
          disabled={!settings}
          onClick={() => saveDisplay(!overFullscreen, settings?.other_screens ?? null)}
        >
          <span>
            Show over fullscreen apps
            <small>Off: the pill hides during videos and games, and peeks when a break is due.</small>
          </span>
          <span className="switch" aria-hidden>
            <span className="switch-knob" />
          </span>
        </button>

        <button
          type="button"
          role="switch"
          aria-checked={hideFromCapture}
          className="setting-row"
          disabled={!settings}
          onClick={() => saveDisplay(overFullscreen, settings?.other_screens ?? null, !hideFromCapture)}
        >
          <span>
            Hide Serion from recordings & screenshots
            <small>You still see the pill; OBS, screen sharing and screenshots do not. Your own screenshots will not show it either.</small>
          </span>
          <span className="switch" aria-hidden>
            <span className="switch-knob" />
          </span>
        </button>

        <button
          type="button"
          role="switch"
          aria-checked={otherScreens}
          className="setting-row"
          disabled={!settings}
          onClick={() => saveDisplay(overFullscreen, !otherScreens)}
        >
          <span>
            Count apps on other screens
            <small>
              {settings?.other_screens == null
                ? `Automatic: ${monitors > 1 ? "on" : "off"}, ${monitors} ${monitors === 1 ? "screen" : "screens"} connected`
                : "The app on top of each other screen gets time too."}
            </small>
          </span>
          <span className="switch" aria-hidden>
            <span className="switch-knob" />
          </span>
        </button>

        <div className="setting-group">
          <button
            type="button"
            role="switch"
            aria-checked={batteryOn}
            className="setting-row"
            disabled={battery === null}
            onClick={() => saveBattery(!batteryOn, level)}
          >
            <span>
              Quit Serion when battery is low
              <small>
                {battery === undefined
                  ? "Reading battery..."
                  : battery === null
                    ? "No battery found on this computer"
                    : `Battery ${battery.percent}%, ${battery.plugged ? "plugged in" : "on battery"}`}
              </small>
            </span>
            <span className="switch" aria-hidden>
              <span className="switch-knob" />
            </span>
          </button>
          <label className={batteryOn ? "select-row reveal open" : "select-row reveal"}>
            Low means
            <select
              value={level}
              disabled={!batteryOn}
              onChange={(e) => saveBattery(batteryOn, Number(e.target.value))}
            >
              {BATTERY_LEVELS.map((p) => (
                <option key={p} value={p}>
                  {p}% or less
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <button type="button" className="quit-btn" onClick={() => invoke("quit")}>
        <Power size={14} aria-hidden />
        Quit Serion
      </button>
    </section>
  );
}

/** Must match EVERY_RANGE and SECONDS_RANGE in src-tauri/src/breaks.rs. */
const EVERY_MIN = 5;
const EVERY_MAX = 240;
const SECONDS_MIN = 10;
const SECONDS_MAX = 1800;

const BREAK_ROWS = [
  { kind: "water", label: "Water break", note: "Drink a glass of water.", every: "water_every", seconds: "water_seconds", start: 45 },
  { kind: "stretch", label: "Stretch break", note: "Stand up and move.", every: "stretch_every", seconds: "stretch_seconds", start: 60 },
  { kind: "eyes", label: "Rest your eyes", note: "Look at something far away.", every: "eye_every", seconds: "eye_seconds", start: 25 },
] as const;

/**
 * Breaks card: each break you switch on is offered after its own amount of
 * screen time, then waits on the pill until you start it. Two breaks that
 * are on cannot share an interval.
 */
function BreaksBlock({ settings, onSettings }: { settings: Settings | null; onSettings: (s: Settings) => void }) {
  const [clash, setClash] = useState<{ kind: string; text: string } | null>(null);
  const config = settings?.breaks;
  if (!config) return null;

  const save = async (patch: Partial<BreakConfig>) => {
    setClash(null);
    onSettings(await invoke<Settings>("set_breaks", { config: { ...config, ...patch } }));
  };

  /** The other switched-on break using `minutes`, if any. */
  const takenBy = (minutes: number, self: string) =>
    BREAK_ROWS.find((r) => r.kind !== self && config[r.every] === minutes);

  const setEvery = (row: (typeof BREAK_ROWS)[number], minutes: number) => {
    const other = takenBy(minutes, row.kind);
    if (other) {
      setClash({ kind: row.kind, text: `${other.label} already comes every ${minutes} min. Pick another time.` });
      return;
    }
    save({ [row.every]: minutes });
  };

  /** Switching on picks the usual time, or the next free one. */
  const toggle = (row: (typeof BREAK_ROWS)[number]) => {
    if (config[row.every] !== null) return save({ [row.every]: null });
    let minutes = row.start;
    while (takenBy(minutes, row.kind)) minutes += 5;
    save({ [row.every]: minutes });
  };

  return (
    <section className="block">
      <h2>Breaks</h2>
      <p className="muted breaks-intro">
        Each break is offered after its amount of screen time. Start it from the pill; screen time pauses while it
        runs.
      </p>
      <div className="setting-list">
        {BREAK_ROWS.map((row) => {
          const every = config[row.every];
          const on = every !== null;
          return (
            <div key={row.kind} className="setting-group">
              <button type="button" role="switch" aria-checked={on} className="setting-row" onClick={() => toggle(row)}>
                <span>
                  {row.label}
                  <small>{row.note}</small>
                </span>
                <span className="switch" aria-hidden>
                  <span className="switch-knob" />
                </span>
              </button>
              <div className={on ? "break-options reveal open" : "break-options reveal"} inert={!on}>
                Every
                <NumberInput
                  label={`${row.label} interval in minutes`}
                  value={every ?? row.start}
                  min={EVERY_MIN}
                  max={EVERY_MAX}
                  onCommit={(m) => setEvery(row, m)}
                />
                min of screen time, for
                <DurationInput
                  label={`${row.label} length`}
                  seconds={config[row.seconds]}
                  onCommit={(s) => save({ [row.seconds]: s })}
                />
              </div>
              {clash?.kind === row.kind && on && (
                <p className="clash" role="alert">
                  {clash.text}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Number field that edits freely and saves a clamped value on Enter or leaving it. */
function NumberInput({
  label,
  value,
  min,
  max,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (n: number) => void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const n = clamp(Number(text), min, max);
    setText(String(n));
    if (n !== value) onCommit(n);
  };
  return (
    <input
      type="number"
      min={min}
      max={max}
      aria-label={label}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
    />
  );
}

/** A length in seconds, entered as seconds or minutes. */
function DurationInput({ label, seconds, onCommit }: { label: string; seconds: number; onCommit: (s: number) => void }) {
  const [unit, setUnit] = useState<"sec" | "min">(seconds >= 60 && seconds % 60 === 0 ? "min" : "sec");
  const factor = unit === "min" ? 60 : 1;
  const commit = (amount: number, inUnit = factor) =>
    onCommit(clamp(amount * inUnit, SECONDS_MIN, SECONDS_MAX));
  return (
    <>
      <NumberInput
        label={label}
        value={Math.round(seconds / factor)}
        min={unit === "min" ? 1 : SECONDS_MIN}
        max={SECONDS_MAX / factor}
        onCommit={(n) => commit(n)}
      />
      <select
        aria-label={`${label} unit`}
        value={unit}
        onChange={(e) => {
          const next = e.target.value as "sec" | "min";
          setUnit(next);
          // Keep the same number, now read in the new unit (20 sec -> 20 min).
          commit(Math.round(seconds / factor), next === "min" ? 60 : 1);
        }}
      >
        <option value="sec">sec</option>
        <option value="min">min</option>
      </select>
    </>
  );
}

function DataBlock({
  settings,
  onSettings,
  onCleared,
}: {
  settings: Settings | null;
  onSettings: (s: Settings) => void;
  onCleared: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  // The confirm state expires, so a stray second click later does nothing.
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [confirming]);

  return (
    <section className="block">
      <h2>Data</h2>
      <label className="select-row">
        Keep history for
        <select
          value={settings?.retention_days ?? 30}
          onChange={async (e) => onSettings(await invoke<Settings>("set_retention", { days: Number(e.target.value) }))}
        >
          {RETENTION.map((r) => (
            <option key={r.days} value={r.days}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <p className="muted">Older days are deleted. Saved as JSON files in Serion's app data folder.</p>
      <button
        type="button"
        className={confirming ? "danger-btn confirming" : "danger-btn"}
        onClick={async () => {
          if (!confirming) return setConfirming(true);
          await invoke("clear_history");
          setConfirming(false);
          onCleared();
        }}
      >
        <Trash2 size={14} aria-hidden />
        {confirming ? "Click again to delete everything" : "Clear all data"}
      </button>
    </section>
  );
}

function clamp(value: number, min: number, max: number) {
  return Number.isFinite(value) ? Math.min(Math.max(Math.round(value), min), max) : min;
}
