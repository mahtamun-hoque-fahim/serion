import type { CSSProperties } from "react";
import { BookOpen } from "lucide-react";
import type { Tick } from "./types";

// Panel layout in CSS pixels; App.tsx sizes the window from appsPanelHeight().
const PADDING = 12;
const TITLE_H = 26;
const ROW_H = 30;
/** The reading switch and the gap above it. */
const READING_H = 44 + 10;

/** Height of the panel for `count` apps (an empty list still shows one row). */
export function appsPanelHeight(count: number) {
  return PADDING * 2 + 2 + TITLE_H + Math.max(count, 1) * ROW_H + READING_H;
}

type Props = {
  open: boolean;
  top: Tick["top"];
  reading: boolean;
  onReading: (on: boolean) => void;
};

/** Today's most used apps, opened from the pill when you click it. */
export function TopAppsPanel({ open, top, reading, onReading }: Props) {
  const longest = top[0]?.ms || 1;

  return (
    <div
      id="top-apps"
      className={open ? "panel apps-panel open" : "panel apps-panel"}
      style={{ height: appsPanelHeight(top.length) }}
      role="dialog"
      aria-label="Most used apps today"
      inert={!open}
    >
      <p className="panel-title">Today</p>
      {top.length === 0 ? (
        <p className="apps-empty">No app time yet today.</p>
      ) : (
        <ol className="apps-list">
          {top.map((app, i) => (
            <li
              key={app.name}
              className="apps-row"
              style={{ "--i": i, "--share": app.ms / longest } as CSSProperties}
            >
              <span className="apps-name" title={app.name}>
                {app.name}
              </span>
              <span className="apps-time">{app.text}</span>
            </li>
          ))}
        </ol>
      )}
      {/* Reading mode: keeps counting through long reads, for the app in front.
          A big accent switch: the book knob slides across when it is on. */}
      <button
        type="button"
        role="switch"
        aria-checked={reading}
        className="reading-cta"
        title="Idle after 20 min instead of 5, for the app in front. Ends when you switch apps or after an hour."
        onClick={() => onReading(!reading)}
      >
        <span className="reading-knob" aria-hidden>
          <BookOpen size={16} />
        </span>
        <span className="reading-text">
          Reading mode
          <small>{reading ? "On" : "Off"}</small>
        </span>
      </button>
    </div>
  );
}
