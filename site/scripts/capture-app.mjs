/*
  Capture the real app for the landing page, at 2x, with the brand-blue theme.
  Talks to the running app over CDP (launch it with
  WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222).
  Writes ../docs/pill-blue@2x.png and ../docs/dashboard-blue@2x.png.
*/
import { writeFileSync } from "node:fs";

const PORT = 9222;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function targets() {
  return (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
}

async function connect(filter) {
  for (let i = 0; i < 60; i++) {
    const list = await targets().catch(() => []);
    const target = list.find((t) => t.type === "page" && filter(t.url));
    if (target) return open(target.webSocketDebuggerUrl);
    await sleep(250);
  }
  throw new Error("target not found");
}

function open(wsUrl) {
  const ws = new WebSocket(wsUrl);
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
  const ready = new Promise((resolve) => (ws.onopen = resolve));
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = id++;
      pending.set(n, { resolve, reject });
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  return { ws, ready, send };
}

const evaluate = async (client, expression) => {
  const result = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return result.result.value;
};

const rectOf = async (client, selector) =>
  JSON.parse(
    await evaluate(
      client,
      `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return "null"; const r = el.getBoundingClientRect(); return JSON.stringify({x:r.x,y:r.y,w:r.width,h:r.height}); })()`,
    ),
  );

async function click(client, x, y) {
  await client.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none" });
  await sleep(500);
  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x,
    y,
    button: "left",
    buttons: 1,
    clickCount: 1,
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x,
    y,
    button: "left",
    buttons: 0,
    clickCount: 1,
  });
}

const pill = await connect((url) => !url.includes("view=dashboard"));
await pill.ready;
await pill.send("Page.enable");

const original = JSON.parse(
  await evaluate(
    pill,
    `JSON.stringify({ theme: localStorage.getItem("serion.theme"), display: localStorage.getItem("serion.display"), size: localStorage.getItem("serion.size") })`,
  ),
);
await evaluate(
  pill,
  `localStorage.setItem("serion.theme", "#0047ff");
   localStorage.setItem("serion.display", "full");
   localStorage.setItem("serion.size", "large");
   location.reload();`,
);
await sleep(2600);

const pillRect = await rectOf(pill, ".pill");
await click(pill, pillRect.x + pillRect.w / 2, pillRect.y + pillRect.h / 2);
await sleep(1300);

const parts = await evaluate(
  pill,
  `JSON.stringify([...document.querySelectorAll(".pill, .pill-btn.show, .panel.open")].map((el) => { const r = el.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; }))`,
);
const boxes = JSON.parse(parts);
const left = Math.min(...boxes.map((b) => b.x)) - 24;
const top = Math.min(...boxes.map((b) => b.y)) - 24;
const right = Math.max(...boxes.map((b) => b.x + b.w)) + 24;
const bottom = Math.max(...boxes.map((b) => b.y + b.h)) + 24;

const pillShot = await pill.send("Page.captureScreenshot", {
  format: "png",
  omitBackground: true,
  captureBeyondViewport: true,
  clip: { x: left, y: top, width: right - left, height: bottom - top, scale: 2 },
});
writeFileSync("../docs/pill-blue@2x.png", Buffer.from(pillShot.data, "base64"));
console.log("pill", Math.round((right - left) * 2), "x", Math.round((bottom - top) * 2));

// Open the dashboard through the pill's own expand button.
const expand = await rectOf(pill, ".expand-btn.show");
if (expand) {
  await click(pill, expand.x + expand.w / 2, expand.y + expand.h / 2);
  await sleep(2200);
}

const dash = await connect((url) => url.includes("view=dashboard"));
await dash.ready;
await dash.send("Page.enable");
await evaluate(dash, `localStorage.setItem("serion.theme", "#0047ff"); location.reload();`);
await sleep(2600);

const metrics = await dash.send("Page.getLayoutMetrics");
const width = Math.ceil(metrics.contentSize.width);
const height = Math.ceil(metrics.contentSize.height);
const dashShot = await dash.send("Page.captureScreenshot", {
  format: "png",
  captureBeyondViewport: true,
  clip: { x: 0, y: 0, width, height, scale: 2 },
});
writeFileSync("../docs/dashboard-blue@2x.png", Buffer.from(dashShot.data, "base64"));
console.log("dashboard", width * 2, "x", height * 2);

// Put the owner's own settings back.
for (const [key, value] of Object.entries(original)) {
  const name = JSON.stringify(`serion.${key}`);
  await evaluate(
    dash,
    value
      ? `localStorage.setItem(${name}, ${JSON.stringify(value)});`
      : `localStorage.removeItem(${name});`,
  );
}
console.log("done; restored", original);
pill.ws.close();
dash.ws.close();
process.exit(0);
