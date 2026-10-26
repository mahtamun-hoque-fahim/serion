/** Matches the `Tick` struct the Rust loop emits every second. */
export type Tick = {
  text: string;
  state: "active" | "idle" | "hold";
  total_ms: number;
  top: { name: string; ms: number; text: string }[];
  /** Time left on the countdown, when one runs. */
  countdown_ms: number | null;
  limit_ms: number | null;
};

/** One day from the history files (src-tauri/src/history.rs). */
export type Day = {
  day: string;
  total_ms: number;
  apps: Record<string, { name: string; ms: number }>;
};

export type Settings = {
  retention_days: number;
  limit_ms: number | null;
};

export const EMPTY_TICK: Tick = {
  text: "0m",
  state: "hold",
  total_ms: 0,
  top: [],
  countdown_ms: null,
  limit_ms: null,
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
