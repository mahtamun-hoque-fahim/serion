import { useEffect, useState } from "react";

/** "system" follows Windows; the other two override it. */
export type Appearance = "system" | "light" | "dark";

const KEY = "serion.appearance";
const systemDark = matchMedia("(prefers-color-scheme: dark)");

export function loadAppearance(): Appearance {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

/** Marks the page data-mode="dark" or "light"; the CSS colors key off it. */
function apply(choice: Appearance) {
  const dark = choice === "dark" || (choice === "system" && systemDark.matches);
  document.documentElement.dataset.mode = dark ? "dark" : "light";
}

/** Apply the saved choice before the first render, so nothing flashes. */
export function applyAppearance() {
  apply(loadAppearance());
}

/**
 * The appearance choice, kept in sync with Windows (while on "system") and
 * with the other Serion windows (shared storage).
 */
export function useAppearance() {
  const [choice, setChoice] = useState(loadAppearance);

  useEffect(() => {
    apply(choice);
    const onSystemChange = () => apply(choice);
    systemDark.addEventListener("change", onSystemChange);
    return () => systemDark.removeEventListener("change", onSystemChange);
  }, [choice]);

  useEffect(() => {
    const onStorage = () => setChoice(loadAppearance());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function choose(next: Appearance) {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Not saved; it still applies to this window until it closes.
    }
    setChoice(next);
  }

  return [choice, choose] as const;
}
