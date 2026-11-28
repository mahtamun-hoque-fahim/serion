"use client";

import { useEffect, useState } from "react";

/**
 * The privacy page's "On this page" list. The part being read is marked with
 * aria-current: the last part whose top has passed 160px from the top of the
 * window, or the last part once the page bottom is reached.
 */
export function PolicyToc({ items }: { items: { id: string; title: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const parts = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    let frame = 0;
    const update = () => {
      frame = 0;
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      let current = parts[0]?.id;
      for (const part of parts) {
        if (part.getBoundingClientRect().top <= 160) current = part.id;
      }
      setActive(atEnd ? parts[parts.length - 1]?.id : current);
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
  }, [items]);

  return (
    <nav className="policy-toc" aria-label="On this page">
      <p>On this page</p>
      <ol>
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} aria-current={item.id === active ? "location" : undefined}>
              {item.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
