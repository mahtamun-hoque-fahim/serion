import { Eye, Play } from "lucide-react";
import type { ReactNode } from "react";
import { SerionMark } from "./SerionMark";

type LaptopVariant = "hero" | "display" | "cta";

/**
 * The laptop frame is drawn in the page so a provided screen image can be
 * dropped into `.laptop-screen` without changing the composition. The frame is
 * decorative; the section copy carries the meaning.
 */
export function LaptopMockup({
  variant,
  screen,
}: {
  variant: LaptopVariant;
  screen: ReactNode;
}) {
  return (
    <div className={`laptop laptop--${variant}`} aria-hidden="true">
      <div className="laptop-lid">
        <span className="laptop-camera" />
        <div className="laptop-screen">{screen}</div>
      </div>
      <div className="laptop-base">
        <div className="laptop-keyboard" />
        <div className="laptop-trackpad" />
      </div>
    </div>
  );
}

/** Placeholder for the hero and closing laptop screens. */
export function VideoScreen() {
  return (
    <div className="screen-video">
      <span className="screen-video-orb screen-video-orb--a" />
      <span className="screen-video-orb screen-video-orb--b" />
      <span className="screen-play">
        <Play size={30} fill="currentColor" strokeWidth={0} />
      </span>
    </div>
  );
}

/** A light desktop carrying the live pill, used while the display mockups are pending. */
export function DisplayScreen({ mode }: { mode: 0 | 1 | 2 }) {
  return (
    <div className="screen-desktop" data-mode={mode}>
      <div className="desktop-wall" />

      <div className="desktop-pill">
        <span className="desktop-pill-icon">
          <Eye size={17} strokeWidth={1.9} />
        </span>
        <span className="desktop-pill-time">2.9h</span>
      </div>

      <div className="desktop-taskbar">
        <span className="desktop-start">
          <span />
          <span />
          <span />
          <span />
        </span>
        <span className="desktop-tray">
          <span className="desktop-trayicon">
            <SerionMark size={11} />
          </span>
          <span className="desktop-clock">18:42</span>
        </span>
      </div>
    </div>
  );
}
