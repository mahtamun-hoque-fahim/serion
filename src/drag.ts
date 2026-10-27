import { useRef, useState, type PointerEvent } from "react";
import { currentMonitor, getCurrentWindow, PhysicalPosition, primaryMonitor } from "@tauri-apps/api/window";

/** Gap between the pill and a screen edge. Must match TOP_MARGIN in src-tauri/src/lib.rs. */
const EDGE_GAP = 8;
/** While dragging, within this distance (CSS px) of an edge or the dock, the pill sticks to it. */
const MAGNET = 36;
/** Released within this distance of the top-center dock (CSS px), it glides home. */
const DOCK_SNAP = 120;
/** Released within this distance of an edge (CSS px), it glides flush to it. */
const EDGE_SNAP = 48;
/** Movement below this (CSS px) is a click, not a drag. */
const CLICK_SLOP = 4;
const GLIDE_MS = 420;

/** Ease out with a small overshoot past the target, then settle. */
const easeOutBack = (t: number) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;

/** Where the pill's top-left corner sits when touching each edge (physical px). */
type Edges = { left: number; right: number; top: number; bottom: number };

type Drag = {
  pointerX: number;
  pointerY: number;
  windowX: number;
  windowY: number;
  dockX: number;
  dockY: number;
  edges: Edges;
  scale: number;
  x: number;
  y: number;
  moved: boolean;
};

/** Pull `v` onto `lo` or `hi` when it is within `reach` of either. */
function snapAxis(v: number, lo: number, hi: number, reach: number) {
  if (Math.abs(v - lo) < reach) return lo;
  if (Math.abs(v - hi) < reach) return hi;
  return v;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/**
 * Drag the window by the element that gets these handlers. A press that
 * moves less than CLICK_SLOP is a tap and calls `onTap` instead.
 *
 * Magnetic: the top-center dock and every edge of the screen's work area
 * (the screen minus the taskbar) pull the pill in. Each axis snaps on its
 * own, so a corner catches two edges at once.
 *
 * A custom drag instead of Tauri's native one: during the native drag the page
 * gets no events, so it could not show a grab cursor or pull toward edges.
 * Window positions are physical pixels; pointer positions are CSS pixels and
 * are converted with the window's scale factor.
 */
/** `offset`: how far (CSS px) the window currently reaches left of the pill. */
export function useMagneticDrag(pillWidth: number, pillHeight: number, offset: () => number, onTap: () => void) {
  const [dragging, setDragging] = useState(false);
  const drag = useRef<Drag | null>(null);
  const pressed = useRef(false);
  const frame = useRef(0);
  const glideFrame = useRef(0);

  const win = getCurrentWindow();
  // Positions here are the pill's; the window sits `offset` further left.
  const scaleRef = useRef(1);
  const move = (x: number, y: number) =>
    win.setPosition(new PhysicalPosition(Math.round(x - offset() * scaleRef.current), Math.round(y)));

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
    const [position, primary, here, scale] = await Promise.all([
      win.outerPosition(),
      primaryMonitor(),
      currentMonitor(),
      win.scaleFactor(),
    ]);
    if (!pressed.current) return; // already released: it was a click
    scaleRef.current = scale;
    const pillX = position.x + offset() * scale;

    const gap = EDGE_GAP * scale;
    // shortcut: edges come from the screen the drag starts on; dragging onto
    // another monitor snaps there only on the next drag. Re-read per move if
    // multi-monitor users ask for it.
    const area = (here ?? primary)?.workArea;
    const edges: Edges = area
      ? {
          left: area.position.x + gap,
          right: area.position.x + area.size.width - pillWidth * scale - gap,
          top: area.position.y + gap,
          bottom: area.position.y + area.size.height - pillHeight * scale - gap,
        }
      : { left: -Infinity, right: Infinity, top: -Infinity, bottom: Infinity };

    drag.current = {
      pointerX: screenX,
      pointerY: screenY,
      windowX: pillX,
      windowY: position.y,
      dockX: primary ? primary.position.x + (primary.size.width - pillWidth * scale) / 2 : pillX,
      dockY: primary ? primary.position.y + gap : position.y,
      edges,
      scale,
      x: pillX,
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
    const reach = MAGNET * d.scale;
    if (Math.hypot(x - d.dockX, y - d.dockY) < reach) {
      // The dock wins: it holds both axes until pulled further.
      x = d.dockX;
      y = d.dockY;
    } else {
      x = snapAxis(x, d.edges.left, d.edges.right, reach);
      y = snapAxis(y, d.edges.top, d.edges.bottom, reach);
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

    let toX: number;
    let toY: number;
    if (Math.hypot(d.x - d.dockX, d.y - d.dockY) < DOCK_SNAP * d.scale) {
      toX = d.dockX;
      toY = d.dockY;
    } else {
      // Near an edge: flush to it. Dropped partly off screen: back inside.
      const reach = EDGE_SNAP * d.scale;
      toX = clamp(snapAxis(d.x, d.edges.left, d.edges.right, reach), d.edges.left, d.edges.right);
      toY = clamp(snapAxis(d.y, d.edges.top, d.edges.bottom, reach), d.edges.top, d.edges.bottom);
    }
    if (toX !== d.x || toY !== d.y) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      glideTo(d.x, d.y, toX, toY);
    }
  }

  return {
    dragging,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}
