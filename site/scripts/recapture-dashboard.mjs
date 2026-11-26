/* Re-shoot the dashboard with a taller viewport so no card is cut in half. */
import { writeFileSync } from "node:fs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const list = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const target = list.find((t) => t.type === "page" && t.url.includes("view=dashboard"));
if (!target) throw new Error("dashboard window is not open");

const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 1;
const pending = new Map();
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
  }
};
await new Promise((resolve) => (ws.onopen = resolve));
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const n = id++;
    pending.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });

await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 920,
  height: 1060,
  deviceScaleFactor: 1,
  mobile: false,
});
await sleep(1200);
const metrics = await send("Page.getLayoutMetrics");
const height = Math.ceil(metrics.contentSize.height);
console.log("content", metrics.contentSize.width, height);
const shot = await send("Page.captureScreenshot", {
  format: "png",
  captureBeyondViewport: true,
  clip: { x: 0, y: 0, width: 920, height, scale: 2 },
});
writeFileSync("../docs/dashboard-blue@2x.png", Buffer.from(shot.data, "base64"));
console.log("wrote dashboard", 1840, "x", height * 2);
ws.close();
process.exit(0);
