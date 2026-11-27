"use client";

import { useRef } from "react";
import { Eye } from "lucide-react";
import { Laptop } from "./Laptop";
import { useScrollStep } from "@/lib/useScrollStep";

/* Scroll order: Full, then Icon, then Hidden. `pill` is the data-mode the CSS reads. */
const modes = [
  {
    name: "Full",
    body: "The whole pill, with today’s total.",
    pill: 2,
  },
  {
    name: "Icon",
    body: "Just the mark and today’s time, when you want the nudge.",
    pill: 1,
  },
  {
    name: "Hidden",
    body: "Nothing on screen. Open the dashboard from the tray.",
    pill: 0,
  },
] as const;

export function DisplayModes() {
  const section = useRef<HTMLElement>(null);
  const list = useRef<HTMLDivElement>(null);
  // Phones: the laptop sits above the rows and cycles the modes on its own.
  const [mode, choose] = useScrollStep(section, list, modes.length, "(max-width: 720px)");

  return (
    <section className="display" id="display" ref={section}>
      <div className="display-stage">
        <div className="container display-grid">
          <div className="display-copy">
            <h2 data-reveal>
              Counts when you work
              <span>Gone when you don&rsquo;t.</span>
            </h2>
            <p className="display-lede" data-reveal="1">
              Serion starts hidden. It counts from the tray by the clock and never covers
              your work.
            </p>

            <div
              className="modes"
              role="group"
              aria-label="Pill display modes"
              ref={list}
              data-reveal="2"
            >
              {modes.map((item, index) => {
                const active = mode === index;
                return (
                  <button
                    key={item.name}
                    type="button"
                    className={active ? "mode-row is-active" : "mode-row"}
                    onClick={() => choose(index)}
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

          <Laptop className="display-laptop" reveal="1">
            <div className="pill-screen" data-mode={modes[mode].pill}>
              <div className="scr-pill">
                <span className="scr-pill-icon">
                  <Eye strokeWidth={1.9} />
                </span>
                <span className="scr-pill-time">2.9h</span>
              </div>
              {/* Hidden: nothing of Serion on screen, just what you are watching. */}
              <div className="scr-hidden-art">
                <img src="/hidden-movie.png" alt="" width={729} height={383} loading="lazy" />
              </div>
            </div>
          </Laptop>
        </div>
      </div>
    </section>
  );
}
