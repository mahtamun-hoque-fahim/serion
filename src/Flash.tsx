import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./Flash.css";

/** Matches the animation length in Flash.css. */
const FLASH_MS = 1200;

/**
 * Full-screen alert flash. Lives in its own click-through window (created by
 * Rust in show_flash) and closes that window when the animation ends.
 */
export default function Flash() {
  useEffect(() => {
    const timer = setTimeout(() => getCurrentWindow().close(), FLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  return <div className="flash" />;
}
