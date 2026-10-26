import { Check } from "lucide-react";
import { BreakArt } from "./BreakArt";
import { formatClock, type BreakKind } from "./types";
import "./BreakCard.css";

/** Card height in CSS px; App.tsx sizes the window from it. */
export const BREAK_CARD_H = 156;

const COPY: Record<BreakKind, { title: string; line: string }> = {
  water: { title: "Water break", line: "Drink a glass of water." },
  stretch: { title: "Stretch break", line: "Stand up, do some jumping jacks." },
  eyes: { title: "Rest your eyes", line: "Look at something far away." },
};

type Props = {
  open: boolean;
  kind: BreakKind;
  /** Time left and full length; null once the break has ended. */
  leftMs: number | null;
  totalMs: number;
  pauses: boolean;
  /** The break ran out: the check draws in before the card closes. */
  done: boolean;
  onDone: () => void;
  onSnooze: () => void;
};

/** The break card that drops out of the pill: illustration in a countdown ring. */
export function BreakCard({ open, kind, leftMs, totalMs, pauses, done, onDone, onSnooze }: Props) {
  const left = done ? 0 : (leftMs ?? 0);
  const progress = totalMs > 0 ? 1 - left / totalMs : 1;
  const { title, line } = COPY[kind];

  return (
    <div
      id="break-card"
      className={["panel", "break-card", open && "open", done && "done"].filter(Boolean).join(" ")}
      style={{ height: BREAK_CARD_H }}
      role="dialog"
      aria-label={title}
      inert={!open}
    >
      <div className="break-main">
        <div className="break-ring">
          <svg viewBox="0 0 76 76" className="ring" aria-hidden>
            <circle className="ring-track" cx="38" cy="38" r="35" />
            {/* Empties as the break runs: full at the start, gone at the end. */}
            <circle className="ring-left" cx="38" cy="38" r="35" pathLength={1} style={{ strokeDashoffset: progress }} />
          </svg>
          <BreakArt kind={kind} fill={progress} />
          <Check className="break-check" size={34} strokeWidth={3} aria-hidden />
        </div>
        <div className="break-text">
          <p className="break-title">{done ? "Nice one" : title}</p>
          <p className="break-line">{line}</p>
          <p className="break-time">
            {done ? "Back to it" : formatClock(left)}
            {!done && (
              <span title={pauses ? "Screen time is not counted during this break" : "Screen time keeps counting"}>
                {pauses ? "not counted" : "reminder"}
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="break-actions">
        <button type="button" className="break-btn primary" onClick={onDone}>
          Done
        </button>
        <button type="button" className="break-btn" onClick={onSnooze}>
          Snooze 5 min
        </button>
      </div>
    </div>
  );
}
