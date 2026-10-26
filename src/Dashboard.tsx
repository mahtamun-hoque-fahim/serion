import { useEffect, useLayoutEffect, useMemo, useState, type CSSProperties } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Monitor, Moon, Sun, Trash2, X } from "lucide-react";
import { useAppearance, type Appearance } from "./appearance";
import "@fontsource/google-sans/latin-700.css";
import { BarChart, type Bar } from "./BarChart";
import { SerionMark } from "./SerionMark";
import { THEMES, loadTheme } from "./Settings";
import { EMPTY_TICK, formatClock, formatHM, type Day, type Settings, type Tick } from "./types";
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

            <div className="stack">
              <Timers tick={tick} settings={settings} onSettings={setSettings} />
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
