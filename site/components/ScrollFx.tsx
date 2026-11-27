"use client";

import { useEffect } from "react";

/**
 * Page-wide scroll effects, no library:
 * - `[data-reveal]` elements fade in from a blur once they enter the viewport.
 * - `[data-scroll]` sections get `--p` (0 to 1, how far the viewport has moved
 *   through them) and `--e` (the same, eased) for pinned scroll scenes.
 * The `fx` class on <html> (set in layout.tsx before paint) gates the hidden
 * start state, so the page stays readable without JavaScript.
 */
export function ScrollFx() {
  useEffect(() => {
    (window as unknown as { __fx: boolean }).__fx = true;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0 },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

    const scenes = Array.from(document.querySelectorAll<HTMLElement>("[data-scroll]"));
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      for (const el of scenes) {
        const rect = el.getBoundingClientRect();
        const span = rect.height - vh;
        const p = span > 0 ? Math.min(1, Math.max(0, -rect.top / span)) : 1;
        el.style.setProperty("--p", p.toFixed(4));
        el.style.setProperty("--e", (p * p * (3 - 2 * p)).toFixed(4));
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    // Drift: give each piece of [data-drift] art its own random reach, speed
    // and starting point. The motion itself is CSS (globals.css, Drift), so it
    // runs on the compositor and stays smooth.
    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    document.querySelectorAll<HTMLElement>("[data-drift]").forEach((el) => {
      const tx = rand(7, 12);
      const ty = rand(9, 15);
      el.style.setProperty("--dx", `${rand(8, 14).toFixed(1)}px`);
      el.style.setProperty("--dy", `${rand(8, 14).toFixed(1)}px`);
      el.style.setProperty("--tx", `${tx.toFixed(2)}s`);
      el.style.setProperty("--ty", `${ty.toFixed(2)}s`);
      el.style.setProperty("--ox", `${(-rand(0, tx)).toFixed(2)}s`);
      el.style.setProperty("--oy", `${(-rand(0, ty)).toFixed(2)}s`);
    });

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return null;
}
