/** Matches the `Tick` struct the Rust loop emits every second. */
export type Tick = {
  text: string;
  state: "active" | "idle" | "hold";
  total_ms: number;
  top: { name: string; ms: number; text: string }[];
  /** Time left on the countdown, when one runs. */
  countdown_ms: number | null;
  limit_ms: number | null;
  /** The running break: its kind, time left and full length. */
  break_kind: BreakKind | null;
  break_ms: number | null;
  break_total_ms: number | null;
  /** Due breaks waiting on the pill for Start or Skip, with their lengths. */
  break_offers: { kind: BreakKind; seconds: number }[];
  /** Today's date (YYYY-MM-DD); it changing means midnight passed. */
  day: string;
  reading: boolean;
  /** A fullscreen app is in front and the pill should stay out of its way. */
  hide_for_fullscreen: boolean;
  /** The data folder could not be written last time. */
  storage_problem: boolean;
};

export type BreakKind = "water" | "stretch" | "eyes";

/** Matches breaks::Config in src-tauri/src/breaks.rs. */
export type BreakConfig = {
  /** Minutes of screen time between breaks; null when off. */
  water_every: number | null;
  stretch_every: number | null;
  eye_every: number | null;
  /** How long each break lasts, in seconds. */
  water_seconds: number;
  stretch_seconds: number;
  eye_seconds: number;
};

/** "20 s", "1 min", "2 min 30 s". */
export function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m} min ${s} s` : `${m} min`;
}

/** One day from the history files (src-tauri/src/history.rs). */
export type Day = {
  day: string;
  total_ms: number;
  apps: Record<string, { name: string; ms: number }>;
};

export type Settings = {
  retention_days: number;
  limit_ms: number | null;
  battery_quit: boolean;
  battery_threshold: number;
  breaks: BreakConfig;
  show_over_fullscreen: boolean;
  /** null: automatic, on while more than one screen is connected. */
  other_screens: boolean | null;
  hide_from_capture: boolean;
};

/** Current battery; null on machines without one. */
export type Battery = { percent: number; plugged: boolean } | null;

export const EMPTY_TICK: Tick = {
  text: "0m",
  state: "hold",
  total_ms: 0,
  top: [],
  countdown_ms: null,
  limit_ms: null,
  break_kind: null,
  break_ms: null,
  break_total_ms: null,
  break_offers: [],
  day: "",
  reading: false,
  hide_for_fullscreen: false,
  storage_problem: false,
};

/** Precise duration for the dashboard: "3h 12m", "42m", "0m". */
export function formatHM(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Countdown display: "24:59", or "1:04:59" from one hour up. */
export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
