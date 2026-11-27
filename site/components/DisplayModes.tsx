"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { SerionMark } from "./SerionMark";

const modes = [
  {
    name: "Hidden",
    body: "Nothing on screen. Open the dashboard from the tray.",
  },
  {
    name: "Icon",
    body: "Just the mark and today’s time, when you want the nudge.",
  },
  {
    name: "Full",
    body: "The whole pill, with today’s total.",
  },
] as const;

export function DisplayModes() {
  const [mode, setMode] = useState<0 | 1 | 2>(2);

  return (
    <section className="display" id="display">
      {/* The owner's laptop-on-desk art; the pill and tray icon sit on its white screen. */}
      <div className="desk" aria-hidden="true">
        <div className="desk-stage" data-mode={mode}>
          <img src="/laptop-desk.png" alt="" width={1816} height={895} loading="lazy" />
          <div className="desk-pill">
            <span className="desk-pill-icon">
              <Eye size={17} strokeWidth={1.9} />
            </span>
            <span className="desk-pill-time">2.9h</span>
          </div>
          <span className="desk-tray">
            <SerionMark size={12} />
          </span>
        </div>
      </div>

      <div className="container display-copy">
        <h2>
          Counts when you work
          <span>Gone when you don&rsquo;t.</span>
        </h2>
        <p className="display-lede">
          Serion starts hidden. It counts from the tray by the clock and never covers your
          work.
        </p>

        <div className="modes" role="group" aria-label="Pill display modes">
          {modes.map((item, index) => {
            const active = mode === index;
            return (
              <button
                key={item.name}
                type="button"
                className={active ? "mode-row is-active" : "mode-row"}
                onClick={() => setMode(index as 0 | 1 | 2)}
                aria-pressed={active}
              >
                <span className="mode-num">0{index + 1}</span>
                <span className="mode-text">
                  <span className="mode-name">{item.name}</span>
                  <span className="mode-body">{item.body}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
