"use client";

import { useState } from "react";
import { LaptopMockup, DisplayScreen } from "./Laptop";

const modes = [
  {
    name: "Hidden",
    body: "Nothing on screen. Open the dashboard from the tray.",
  },
  {
    name: "Icon",
    body: "A dot in the taskbar, next to the clock.",
  },
  {
    name: "Full",
    body: "The whole pill, with today\u2019s total.",
  },
] as const;

export function DisplayModes() {
  const [mode, setMode] = useState<0 | 1 | 2>(2);

  return (
    <section className="display" id="display">
      <div className="container display-grid">
        <div className="display-copy">
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

        <div className="display-device">
          {/* Screen slot: replace DisplayScreen with the provided laptop mockup. */}
          <LaptopMockup variant="display" screen={<DisplayScreen mode={mode} />} />
        </div>
      </div>
    </section>
  );
}
