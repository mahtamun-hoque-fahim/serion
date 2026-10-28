// Self-check for src/layout.ts: node --experimental-strip-types scripts/layout.check.ts
import assert from "node:assert/strict";
import { panelShift, place } from "../src/layout.ts";

const area = { x: 0, y: 0, w: 1366, h: 728 };
const pill = (x: number, y: number) => ({ x, y, w: 134, h: 40 });
const need = 48;
const panelRoom = 264;

// Docked top center: the default layout.
assert.equal(place(pill(616, 8), area, need, panelRoom).docked, true);

// Top-left, a little below the edge: panel cannot fit above, so it opens
// below; buttons above, at the wall (left) end.
assert.deepEqual(place(pill(8, 70), area, need, panelRoom), {
  docked: false,
  buttonsUp: true,
  panelUp: false,
  panelPastButtons: false,
  align: "start",
});

// Touching the top edge, not centered: no room above for either, so buttons
// below the pill and the panel past them.
assert.deepEqual(place(pill(300, 8), area, need, panelRoom), {
  docked: false,
  buttonsUp: false,
  panelUp: false,
  panelPastButtons: true,
  align: "start",
});

// Upper half near the middle: the panel fits above (outer side), buttons below.
assert.deepEqual(place(pill(1224, 300), area, need, panelRoom), {
  docked: false,
  buttonsUp: false,
  panelUp: true,
  panelPastButtons: false,
  align: "end",
});

// Lower half near the middle: panel below (outer side), buttons above.
const nearMidLow = place(pill(8, 400), area, need, panelRoom);
assert.equal(nearMidLow.docked === false && nearMidLow.panelUp, false);
assert.equal(nearMidLow.docked === false && nearMidLow.buttonsUp, true);

// Bottom-right corner: panel above (inner side), buttons below at the right end.
assert.deepEqual(place(pill(1224, 640), area, need, panelRoom), {
  docked: false,
  buttonsUp: false,
  panelUp: true,
  panelPastButtons: false,
  align: "end",
});

// Touching the bottom edge: buttons above the pill, panel past them.
const bottomEdge = place(pill(1224, 680), area, need, panelRoom);
assert.equal(bottomEdge.docked === false && bottomEdge.panelPastButtons, true);
assert.equal(bottomEdge.docked === false && bottomEdge.buttonsUp, true);

// Centered panel needs no shift; at the left wall it moves right to stay on screen.
assert.equal(panelShift(pill(616, 8), area, 226), 0);
assert.equal(panelShift(pill(8, 8), area, 226), 46);
assert.equal(panelShift(pill(1224, 8), area, 226), -46);

console.log("layout ok");
