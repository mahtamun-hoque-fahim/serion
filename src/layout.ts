/**
 * Where the pill's two hover buttons and its panels go, from the pill's free
 * space on the screen. All values in CSS px, in screen coordinates.
 * Owner-approved rules (sketches, 2026-10-28):
 *
 * - Docked at top center: expand left, settings right, panel below.
 * - Anywhere else, buttons and panel sit above and below the pill, on
 *   opposite sides. The panel prefers the outer side (toward the nearest top
 *   or bottom edge: up in the upper half, down in the lower half) and takes
 *   the inner side when it does not fit there. The buttons take the other
 *   side; when that side has no room either, they sit next to the pill on the
 *   panel's side and the panel opens past them.
 * - The buttons line up with the pill's wall-side end (left end in the left
 *   half, right end in the right half): expand at the wall, settings toward
 *   the middle. Panels are centered on the pill but shifted to stay on screen.
 */

export type Rect = { x: number; y: number; w: number; h: number };

export type Placement =
  | { docked: true; panelUp: false }
  | {
      docked: false;
      buttonsUp: boolean;
      panelUp: boolean;
      /** Buttons and panel on the same side: the panel opens past the buttons. */
      panelPastButtons: boolean;
      /** Which end of the pill the buttons line up with. */
      align: "start" | "end";
    };

/** Gap between the pill and the screen edge; matches EDGE_GAP in drag.ts. */
export const EDGE_GAP = 8;

/** Until the screen is read: the docked top-center layout. */
export const DOCKED: Placement = { docked: true, panelUp: false };

/**
 * `need`: space a row of buttons takes beside the pill (gap + button).
 * `panelRoom`: space the tallest panel takes (gap + height).
 */
export function place(pill: Rect, area: Rect, need: number, panelRoom: number): Placement {
  const centerX = pill.x + pill.w / 2;
  const areaCenterX = area.x + area.w / 2;
  const roomTop = pill.y - area.y;
  const roomBottom = area.y + area.h - (pill.y + pill.h);
  if (Math.abs(centerX - areaCenterX) < 2 && roomTop <= EDGE_GAP + 2) return DOCKED;

  const upperHalf = pill.y + pill.h / 2 < area.y + area.h / 2;
  const roomOut = upperHalf ? roomTop : roomBottom;
  const roomIn = upperHalf ? roomBottom : roomTop;
  // Outer side is up in the upper half, down in the lower half.
  const panelUp = roomOut >= panelRoom ? upperHalf : !upperHalf;
  const roomOpposite = panelUp === upperHalf ? roomIn : roomOut;
  const panelPastButtons = roomOpposite < need;
  return {
    docked: false,
    buttonsUp: panelPastButtons ? panelUp : !panelUp,
    panelUp,
    panelPastButtons,
    align: centerX < areaCenterX ? "start" : "end",
  };
}

/** How far a panel of `width` moves sideways from centered so it stays on screen. */
export function panelShift(pill: Rect, area: Rect, width: number): number {
  const centered = pill.x + pill.w / 2 - width / 2;
  const min = area.x + EDGE_GAP;
  const max = area.x + area.w - EDGE_GAP - width;
  return Math.min(Math.max(centered, min), Math.max(min, max)) - centered;
}

/** Smallest rectangle around all of `rects`. */
export function union(rects: Rect[]): Rect {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.w));
  const bottom = Math.max(...rects.map((r) => r.y + r.h));
  return { x, y, w: right - x, h: bottom - y };
}
