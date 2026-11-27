"use client";

import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";

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

/* Same query as the pinned layout in globals.css. */
const PINNED = "(min-width: 1101px) and (prefers-reduced-motion: no-preference)";

export function DisplayModes() {
  const [mode, setMode] = useState<0 | 1 | 2>(0);
  const section = useRef<HTMLElement>(null);
  const list = useRef<HTMLDivElement>(null);

  // Scrolling walks the pill through Hidden, Icon and Full.
  useEffect(() => {
    const pinned = window.matchMedia(PINNED);
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      let p: number;
      if (pinned.matches && section.current) {
        const rect = section.current.getBoundingClientRect();
        p = -rect.top / (rect.height - vh);
      } else if (list.current) {
        // Unpinned: the rows step through as the list crosses the middle of the screen.
        p = (vh * 0.8 - list.current.getBoundingClientRect().top) / (vh * 0.5);
      } else return;
      setMode(Math.min(2, Math.max(0, Math.floor(p * 3))) as 0 | 1 | 2);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const choose = (index: 0 | 1 | 2) => {
    const el = section.current;
    if (el && window.matchMedia(PINNED).matches) {
      const span = el.offsetHeight - window.innerHeight;
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + ((index + 0.5) / 3) * span, behavior: "smooth" });
    } else {
      setMode(index);
    }
  };

  return (
    <section className="display" id="display" ref={section}>
      <div className="display-stage">
        {/* The owner's laptop-on-desk art; the pill sits on its white screen. */}
        <div className="desk" aria-hidden="true" data-reveal>
          <div className="desk-stage" data-mode={modes[mode].pill}>
            <img src="/laptop-desk.png" alt="" width={1816} height={895} loading="lazy" />
            <div className="desk-pill">
              <span className="desk-pill-icon">
                <Eye size={17} strokeWidth={1.9} />
              </span>
              <span className="desk-pill-time">2.9h</span>
            </div>
          </div>
        </div>

        <div className="container display-copy">
          <h2 data-reveal>
            Counts when you work
            <span>Gone when you don&rsquo;t.</span>
          </h2>
          <p className="display-lede" data-reveal="1">
            Serion starts hidden. It counts from the tray by the clock and never covers your
            work.
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
                  onClick={() => choose(index as 0 | 1 | 2)}
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
      </div>
    </section>
  );
}
