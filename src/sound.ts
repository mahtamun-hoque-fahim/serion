import { invoke } from "@tauri-apps/api/core";

const SOUNDS_KEY = "serion.sounds";

/** Sounds are on unless turned off in the dashboard. */
export function loadSounds(): boolean {
  try {
    return localStorage.getItem(SOUNDS_KEY) !== "off";
  } catch {
    return true;
  }
}

export function saveSounds(on: boolean) {
  try {
    localStorage.setItem(SOUNDS_KEY, on ? "on" : "off");
  } catch {
    // Not saved; it still applies until quit.
  }
}

/**
 * A short chime: "alert" (daily limit, countdown) is higher and firmer;
 * "break" (offers, break done) is softer. Rust plays it through the OS
 * (src-tauri/src/sound.rs): the webview may block sound until the page has
 * been clicked, and the pill often never is. Volume follows Windows.
 */
export function chime(kind: "alert" | "break") {
  if (!loadSounds()) return;
  invoke("play_chime", { kind }).catch(() => {
    // No audio device: stay silent.
  });
}
