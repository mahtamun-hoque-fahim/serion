"use client";

import { useEffect, useRef } from "react";


const BODY =
  "A computer counts from the moment you log in until you shut down. That number is easy to look at and hard to trust. Serion counts the time you are actually there, and takes back the minutes you spent away.";

/**
 * On wide screens this section pins: a full white screen with the title on top
 * and the description under it, both centred. Scrolling shrinks it into the
 * gray band and moves both into their two columns (title right-aligned on the
 * left, description on the right) while the blue section slides up under it.
 * Title lines slide one by one; the description has a centred and an aligned
 * copy that blur out and in, since text wrapping cannot animate. The distances
 * are measured here.
 */
export function Problem() {
  const grid = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const measure = () => {
      const g = grid.current;
      if (!g) return;
      const h = g.querySelector<HTMLElement>(".problem-h");
      const p = g.querySelector<HTMLElement>(".problem-p");
      const text = p?.querySelector<HTMLElement>(".problem-end");
      if (!h || !p || !text) return;
      const pad = parseFloat(getComputedStyle(text).paddingTop) || 0;
      const gap = 24;
      const titleH = h.offsetHeight;
      const bodyH = text.offsetHeight - pad;
      const stackTop = g.clientHeight / 2 - (titleH + gap + bodyH) / 2;
      const mid = g.clientWidth / 2;
      // Each title line slides to the centre on its own, so it stays one piece of text.
      g.querySelectorAll<HTMLElement>(".t-line").forEach((line) => {
        const centre = h.offsetLeft + line.offsetLeft + line.offsetWidth / 2;
        line.style.setProperty("--lx", `${mid - centre}px`);
      });
      g.style.setProperty("--hy", `${stackTop - h.offsetTop}px`);
      g.style.setProperty("--px", `${mid - (p.offsetLeft + p.offsetWidth / 2)}px`);
      g.style.setProperty("--py", `${stackTop + titleH + gap - pad - p.offsetTop}px`);
    };
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <section className="problem" id="counts" data-scroll>
      <div className="problem-stage">
        <div className="problem-band">
          <div className="container problem-grid" ref={grid}>
            <div className="problem-h" data-reveal>
              <h2>
                <span className="t-line">Screen is on</span>
                <span className="t-line">
                  Doesn&rsquo;t mean <em>you&rsquo;re using</em>
                </span>
              </h2>
            </div>
            <div className="problem-p" data-reveal="1">
              <p className="problem-end">{BODY}</p>
              <div className="problem-start problem-body" aria-hidden="true">
                {BODY}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
