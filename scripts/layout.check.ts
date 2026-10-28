// Self-check for src/layout.ts: node --experimental-strip-types scripts/layout.check.ts
import assert from "node:assert/strict";
import { panelShift, place } from "../src/layout.ts";

const area = { x: 0, y: 0, w: 1366, h: 728 };
const pill = (x: number, y: number) => ({ x, y, w: 134, h: 40 });
const need = 48;

// Docked top center: one button each side, panel below.
assert.deepEqual(place(pill(616, 8), area, need), { buttons: "both", column: "start", panelUp: false });
// Top-left corner: both to the right.
assert.equal(place(pill(8, 8), area, need).buttons, "right");
// Bottom-right corner: both to the left, panel above.
assert.deepEqual(place(pill(1224, 680), area, need), { buttons: "left", column: "end", panelUp: true });
// Right wall, upper half: column going down, lined up with the pill's right end.
assert.deepEqual(place(pill(1224, 250), area, need), { buttons: "down", column: "end", panelUp: false });
// Left wall, lower half: column going up from the pill's left end.
assert.deepEqual(place(pill(8, 450), area, need), { buttons: "up", column: "start", panelUp: true });

// Centered panel needs no shift; at the left wall it moves right to stay on screen.
assert.equal(panelShift(pill(616, 8), area, 226), 0);
assert.equal(panelShift(pill(8, 8), area, 226), 46);
assert.equal(panelShift(pill(1224, 8), area, 226), -46);

console.log("layout ok");
