import type { CSSProperties } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import type { Tick } from "./types";

// Panel layout in CSS pixels; App.tsx sizes the window from appsPanelHeight().
const PADDING = 12;
const TITLE_H = 26;
const ROW_H = 30;
const READING_H = 40;
const FOOTER_H = 40;

/** Height of the panel for `count` apps (an empty list still shows one row). */
export function appsPanelHeight(count: number) {
  return PADDING * 2 + 2 + TITLE_H + Math.max(count, 1) * ROW_H + READING_H + FOOTER_H;
}

type Props = {
  open: boolean;
  top: Tick["top"];
  reading: boolean;
  onReading: (on: boolean) => void;
  onExpand: () => void;
};

/** Today's most used apps, dropped under the pill when you click it. */
export function TopAppsPanel({ open, top, reading, onReading, onExpand }: Props) {
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
      {/* Reading mode: keeps counting through long reads, for the app in front. */}
      <button
        type="button"
        role="switch"
        aria-checked={reading}
        className="panel-row toggle-row reading-row"
        title="Idle after 20 min instead of 5, for the app in front. Ends when you switch apps or after an hour."
        onClick={() => onReading(!reading)}
      >
        <span className="reading-label">
          <BookOpen size={14} aria-hidden />
          Reading mode
        </span>
        <span className="switch" aria-hidden>
          <span className="switch-knob" />
        </span>
      </button>
      <button type="button" className="expand-btn" aria-label="Open Serion" title="Open Serion" onClick={onExpand}>
        <ChevronDown size={18} aria-hidden />
      </button>
    </div>
  );
}
