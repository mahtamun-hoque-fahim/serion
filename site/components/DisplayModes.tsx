"use client";

import { useEffect, useRef, useState } from "react";
import { Monitor } from "lucide-react";
import { Laptop } from "./Laptop";

const modes = [
  {
    name: "Hidden",
    body: "Nothing on screen. Open the dashboard from the tray.",
  },
  {
    name: "Icon",
    body: "Just the mark and today's time, when you want the nudge.",
  },
  {
    name: "Full",
    body: "The whole pill, with today's total.",
  },
] as const;

export function DisplayModes() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [mode, setMode] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const desktop = window.matchMedia("(min-width: 901px)");
    let cleanup = () => {};

    const onScroll = () => {
      const scrollable = section.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const progress = Math.min(1, Math.max(0, -section.getBoundingClientRect().top / scrollable));
      setMode(progress < 1 / 3 ? 0 : progress < 2 / 3 ? 1 : 2);
    };

    const setup = () => {
      cleanup();
      if (desktop.matches) {
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        onScroll();
        cleanup = () => {
          window.removeEventListener("scroll", onScroll);
          window.removeEventListener("resize", onScroll);
        };
        return;
      }

      const rows = Array.from(section.querySelectorAll<HTMLElement>("[data-mode-row]"));
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setMode(Number((entry.target as HTMLElement).dataset.modeRow) as 0 | 1 | 2);
            }
          }
        },
        { rootMargin: "-42% 0px -42% 0px" },
      );
      rows.forEach((row) => observer.observe(row));
      cleanup = () => observer.disconnect();
    };

    setup();
    desktop.addEventListener("change", setup);
    return () => {
      cleanup();
      desktop.removeEventListener("change", setup);
    };
  }, []);

  const goTo = (index: 0 | 1 | 2) => {
    const section = sectionRef.current;
    if (!section) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = reduce ? "auto" : "smooth";

    if (!window.matchMedia("(min-width: 901px)").matches) {
      document
        .getElementById(`display-mode-${index}`)
        ?.scrollIntoView({ behavior, block: "center" });
      return;
    }

    const scrollable = section.offsetHeight - window.innerHeight;
    const progress = (index + 0.5) / 3;
    window.scrollTo({ top: section.offsetTop + progress * scrollable, behavior });
  };

  return (
    <section className="display" ref={sectionRef} id="display">
      <div className="display-sticky">
        <div className="container display-grid">
          <div className="display-intro">
            <h2>There when you look. Gone when you don&rsquo;t.</h2>
            <p className="display-lede">
              Serion starts hidden. It counts from the tray by the clock and never covers your
              work.
            </p>
          </div>

          <div className="laptop-col">
            <Laptop mode={mode} />
          </div>

          <div className="display-modes">
            <div className="modes">
              {modes.map((item, index) => {
                const active = mode === index;
                return (
                  <button
                    key={item.name}
                    type="button"
                    className={active ? "mode-row is-active" : "mode-row"}
                    onClick={() => goTo(index as 0 | 1 | 2)}
                    aria-pressed={active}
                    data-mode-row={index}
                    id={`display-mode-${index}`}
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

            <p className="display-note">
              <Monitor size={15} strokeWidth={1.75} aria-hidden="true" />
              It also steps aside during fullscreen video and games, and stays out of screen
              recordings and screenshots if you ask it to.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
