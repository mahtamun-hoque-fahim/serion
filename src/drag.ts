import { useRef, useState, type PointerEvent } from "react";
import { getCurrentWindow, PhysicalPosition, primaryMonitor } from "@tauri-apps/api/window";

/** Gap above the docked pill. Must match TOP_MARGIN in src-tauri/src/lib.rs. */
const TOP_MARGIN = 8;
/** Within this distance of the dock (CSS px) the pill stays stuck to it. */
const MAGNET = 36;
/** Released within this distance of the dock (CSS px), it glides back. */
const SNAP = 120;
/** Movement below this (CSS px) is a click, not a drag. */
const CLICK_SLOP = 4;
const GLIDE_MS = 420;

/** Ease out with a small overshoot past the target, then settle. */
const easeOutBack = (t: number) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;

type Drag = {
  pointerX: number;
  pointerY: number;
  windowX: number;
  windowY: number;
  dockX: number;
  dockY: number;
  scale: number;
  x: number;
  y: number;
  moved: boolean;
};

/**
 * Drag the window by the element that gets these handlers. A press that
 * moves less than CLICK_SLOP is a tap and calls `onTap` instead.
 *
 * A custom drag instead of Tauri's native one: during the native drag the page
 * gets no events, so it could not show a grab cursor or pull toward the dock.
 * Window positions are physical pixels; pointer positions are CSS pixels and
 * are converted with the window's scale factor.
 */
export function useMagneticDrag(pillWidth: number, onTap: () => void) {
  const [dragging, setDragging] = useState(false);
  const drag = useRef<Drag | null>(null);
  const pressed = useRef(false);
  const frame = useRef(0);
  const glideFrame = useRef(0);

  const win = getCurrentWindow();
  const move = (x: number, y: number) => win.setPosition(new PhysicalPosition(Math.round(x), Math.round(y)));

  function glideTo(fromX: number, fromY: number, toX: number, toY: number) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      move(toX, toY);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / GLIDE_MS);
      const k = easeOutBack(t);
      move(fromX + (toX - fromX) * k, fromY + (toY - fromY) * k);
      glideFrame.current = t < 1 ? requestAnimationFrame(step) : 0;
    };
    glideFrame.current = requestAnimationFrame(step);
  }

  async function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    // Recorded at once: a quick click can end before the reads below return.
    pressed.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    cancelAnimationFrame(glideFrame.current);
    const { screenX, screenY } = event;
    const [position, monitor, scale] = await Promise.all([win.outerPosition(), primaryMonitor(), win.scaleFactor()]);
    if (!pressed.current) return; // already released: it was a click
    const dockX = monitor ? monitor.position.x + (monitor.size.width - pillWidth * scale) / 2 : position.x;
    const dockY = monitor ? monitor.position.y + TOP_MARGIN * scale : position.y;
    drag.current = {
      pointerX: screenX,
      pointerY: screenY,
      windowX: position.x,
      windowY: position.y,
      dockX,
      dockY,
      scale,
      x: position.x,
      y: position.y,
      moved: false,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d) return;
    const dx = (event.screenX - d.pointerX) * d.scale;
    const dy = (event.screenY - d.pointerY) * d.scale;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < CLICK_SLOP * d.scale) return;
      d.moved = true;
      setDragging(true);
    }
    let x = d.windowX + dx;
    let y = d.windowY + dy;
    // Magnet: close to the dock, the pill stays on it until pulled further.
    if (Math.hypot(x - d.dockX, y - d.dockY) < MAGNET * d.scale) {
      x = d.dockX;
      y = d.dockY;
    }
    d.x = x;
    d.y = y;
    // At most one window move per frame, however fast the pointer events come.
    if (!frame.current) {
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        move(d.x, d.y);
      });
    }
  }

  function onPointerUp() {
    const d = drag.current;
    const wasPressed = pressed.current;
    pressed.current = false;
    drag.current = null;
    setDragging(false);
    if (!wasPressed) return;
    if (!d?.moved) {
      onTap();
      return;
    }
    const offDock = d.x !== d.dockX || d.y !== d.dockY;
    if (offDock && Math.hypot(d.x - d.dockX, d.y - d.dockY) < SNAP * d.scale) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      glideTo(d.x, d.y, d.dockX, d.dockY);
    }
  }

  return {
    dragging,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}
