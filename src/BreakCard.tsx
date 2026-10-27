import type { CSSProperties } from "react";
import { Check, Dumbbell, EyeClosed, GlassWater, X } from "lucide-react";
import { BreakArt } from "./BreakArt";
import { formatClock, formatSeconds, type BreakKind } from "./types";
import "./BreakCard.css";

export const BREAK_ICON = { water: GlassWater, stretch: Dumbbell, eyes: EyeClosed };

const COPY: Record<BreakKind, { title: string; line: string }> = {
  water: { title: "Water break", line: "Drink a glass of water." },
  stretch: { title: "Stretch break", line: "Stand up, do some jumping jacks." },
  eyes: { title: "Rest your eyes", line: "Look at something far away." },
};

/** What the card is showing. */
export type BreakView =
  | { mode: "offer"; offers: { kind: BreakKind; seconds: number }[] }
  | { mode: "starting" | "active" | "done"; kind: BreakKind; leftMs: number; totalMs: number };

/** Wider than the other panels, so a break's name and its buttons fit on one row. */
export const BREAK_CARD_W = 260;

// Heights in CSS px; App.tsx sizes the window from breakCardHeight().
const PAD = 12;
const OFFER_TITLE_H = 24;
const OFFER_ROW_H = 46;
const RUNNING_H = 156;

/** Tallest the card gets: all three breaks offered, or a running break. */
export const BREAK_CARD_MAX_H = Math.max(PAD * 2 + 2 + OFFER_TITLE_H + 3 * OFFER_ROW_H, RUNNING_H);

export function breakCardHeight(view: BreakView) {
  return view.mode === "offer" ? PAD * 2 + 2 + OFFER_TITLE_H + view.offers.length * OFFER_ROW_H : RUNNING_H;
}

type Props = {
  open: boolean;
  view: BreakView;
  onStart: (kind: BreakKind) => void;
  onSkip: (kind: BreakKind) => void;
  onDone: () => void;
};

/**
 * The break card under the pill. Offer: Start or Skip each due break.
 * Starting: a tick draws in, then the break's animation takes over.
 * Active: animation, countdown, Done. Done: a check, then it closes.
 */
export function BreakCard({ open, view, onStart, onSkip, onDone }: Props) {
  const classes = ["panel", "break-card", `mode-${view.mode}`, open && "open"].filter(Boolean).join(" ");

  if (view.mode === "offer") {
    return (
      <div id="break-card" className={classes} style={{ height: breakCardHeight(view) }} role="dialog" aria-label="Break" inert={!open}>
        <p className="panel-title">{view.offers.length > 1 ? "Breaks are due, pick one" : "Time for a break"}</p>
        <ul className="offer-list">
          {view.offers.map(({ kind, seconds }, i) => {
            const Icon = BREAK_ICON[kind];
            return (
              <li key={kind} className="offer-row" style={{ "--i": i } as CSSProperties}>
                <span className="offer-icon">
                  <Icon size={16} aria-hidden />
                </span>
                <span className="offer-text">
                  {COPY[kind].title}
                  <small>{formatSeconds(seconds)}</small>
                </span>
                <button
                  type="button"
                  className="offer-skip"
                  aria-label={`Skip ${COPY[kind].title.toLowerCase()}`}
                  title="Skip for now"
                  onClick={() => onSkip(kind)}
                >
                  <X size={14} strokeWidth={2.5} aria-hidden />
                </button>
                <button type="button" className="offer-start" onClick={() => onStart(kind)}>
                  Start
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  const { kind, leftMs, totalMs, mode } = view;
  const left = mode === "done" ? 0 : leftMs;
  const progress = totalMs > 0 ? 1 - left / totalMs : 1;
  const showsCheck = mode === "starting" || mode === "done";

  return (
    <div id="break-card" className={classes} style={{ height: RUNNING_H }} role="dialog" aria-label={COPY[kind].title} inert={!open}>
      <div className="break-main">
        <div className="break-ring">
          <svg viewBox="0 0 76 76" className="ring" aria-hidden>
            <circle className="ring-track" cx="38" cy="38" r="35" />
            {/* Fills up as the break runs, like the ring on the pill. */}
            <circle className="ring-fill" cx="38" cy="38" r="35" pathLength={1} style={{ strokeDashoffset: 1 - progress }} />
          </svg>
          {/* Remounted after the start tick, so the art pops in fresh. */}
          {!showsCheck && <BreakArt key={kind} kind={kind} fill={progress} />}
          {showsCheck && <Check className="break-check" size={34} strokeWidth={3} aria-hidden />}
        </div>
        <div className="break-text">
          <p className="break-title">{mode === "done" ? "Nice one" : mode === "starting" ? "Break started" : COPY[kind].title}</p>
          <p className="break-line">{COPY[kind].line}</p>
          <p className="break-time">
            {mode === "done" ? "Back to it" : formatClock(left)}
            {mode !== "done" && <span title="Screen time is not counted during a break">not counted</span>}
          </p>
        </div>
      </div>
      <div className="break-actions">
        <button type="button" className="break-btn primary" disabled={mode === "done"} onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
