/**
 * Where the pill's two hover buttons and its panels go, from the pill's free
 * space on the screen. All values in CSS px, in screen coordinates.
 *
 * - Room on both sides: expand left, power right (the docked default).
 * - Against a side wall near the top or bottom: both buttons side by side on
 *   the open side.
 * - Against a side wall elsewhere: the buttons stack toward the screen's
 *   vertical middle.
 * - Panels open below the pill in the upper half of the screen and above it in
 *   the lower half, centered on the pill but kept inside the screen.
 */

export type Rect = { x: number; y: number; w: number; h: number };

/** Both: one each side. Right / left: a pair on that side. Down / up: a column. */
export type ButtonSide = "both" | "right" | "left" | "down" | "up";

export type Placement = {
  buttons: ButtonSide;
  /** In a column, which end of the pill the buttons line up with. */
  column: "start" | "end";
  panelUp: boolean;
};

/** Gap between the pill and the screen edge; matches EDGE_GAP in drag.ts. */
export const EDGE_GAP = 8;

/** Until the screen is read: the docked top-center layout. */
export const DOCKED: Placement = { buttons: "both", column: "start", panelUp: false };

/** Smallest rectangle around all of `rects`. */
export function union(rects: Rect[]): Rect {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.w));
  const bottom = Math.max(...rects.map((r) => r.y + r.h));
  return { x, y, w: right - x, h: bottom - y };
}

/** `need`: space one button takes beside the pill (gap + button). */
export function place(pill: Rect, area: Rect, need: number): Placement {
  const roomLeft = pill.x - area.x;
  const roomRight = area.x + area.w - (pill.x + pill.w);
  const roomTop = pill.y - area.y;
  const roomBottom = area.y + area.h - (pill.y + pill.h);
  const upperHalf = pill.y + pill.h / 2 < area.y + area.h / 2;
  const column = roomLeft <= roomRight ? "start" : "end";
  let buttons: ButtonSide;
  if (roomLeft >= need && roomRight >= need) buttons = "both";
  else if (roomTop < 2 * need || roomBottom < 2 * need) buttons = roomRight >= roomLeft ? "right" : "left";
  else buttons = upperHalf ? "down" : "up";
  return { buttons, column, panelUp: !upperHalf };
}

/** How far a panel of `width` moves sideways from centered so it stays on screen. */
export function panelShift(pill: Rect, area: Rect, width: number): number {
  const centered = pill.x + pill.w / 2 - width / 2;
  const min = area.x + EDGE_GAP;
  const max = area.x + area.w - EDGE_GAP - width;
  return Math.min(Math.max(centered, min), Math.max(min, max)) - centered;
}
