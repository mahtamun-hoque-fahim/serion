"use client";

import { type RefObject, useEffect, useState } from "react";

/* Same query as the pinned layouts in globals.css. */
export const PINNED = "(min-width: 1101px) and (prefers-reduced-motion: no-preference)";

/**
 * Which of `count` steps a scroll scene is on. Pinned (wide screens): the
 * section's scroll span is split evenly. Unpinned: the steps advance as `list`
 * crosses the middle of the screen. `choose` scrolls to a step when pinned and
 * sets it directly otherwise.
 */
export function useScrollStep<S extends HTMLElement, L extends HTMLElement>(
  section: RefObject<S | null>,
  list: RefObject<L | null>,
  count: number,
) {
  const [step, setStep] = useState(0);

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
        p = (vh * 0.8 - list.current.getBoundingClientRect().top) / (vh * 0.5);
      } else return;
      setStep(Math.min(count - 1, Math.max(0, Math.floor(p * count))));
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
  }, [section, list, count]);

  const choose = (index: number) => {
    const el = section.current;
    if (el && window.matchMedia(PINNED).matches) {
      const span = el.offsetHeight - window.innerHeight;
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + ((index + 0.5) / count) * span, behavior: "smooth" });
    } else {
      setStep(index);
    }
  };

  return [step, choose] as const;
}
