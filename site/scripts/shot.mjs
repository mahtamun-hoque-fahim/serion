/*
  Screenshot helper: drives the local Chrome over CDP with no dependencies.
  Usage:
    node scripts/shot.mjs <url> <width> <height> <out.png> [full|scrollY]
*/
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [, , url, widthArg, heightArg, out, mode = "full"] = process.argv;
const width = Number(widthArg);
const height = Number(heightArg);
const port = 9333;

const chrome = spawn(
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "serion-shot-"))}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function version() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      return await res.json();
    } catch {
      await sleep(200);
    }
  }
  throw new Error("Chrome did not start");
}

await version();
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = targets.find((target) => target.type === "page");
if (!page) throw new Error("No page target");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let nextId = 1;
const pending = new Map();

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
  }
};

await new Promise((resolve) => (ws.onopen = resolve));

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: width < 600,
});
await send("Page.navigate", { url });
await sleep(2500);

if (mode.startsWith("eval:")) {
  const result = await send("Runtime.evaluate", {
    expression: mode.slice(5),
    returnByValue: true,
  });
  console.log(JSON.stringify(result.result.value, null, 2));
  ws.close();
  chrome.kill();
  process.exit(0);
}

if (mode === "offsets") {
  const result = await send("Runtime.evaluate", {
    expression: `JSON.stringify([...document.querySelectorAll("section")].map((s) => ({ id: s.id, top: Math.round(s.getBoundingClientRect().top + scrollY), h: Math.round(s.offsetHeight) })))`,
    returnByValue: true,
  });
  console.log(result.result.value);
  ws.close();
  chrome.kill();
  process.exit(0);
}

if (mode !== "full") {
  await send("Runtime.evaluate", { expression: `window.scrollTo(0, ${Number(mode)})` });
  await sleep(1400);
  const shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(out, Buffer.from(shot.data, "base64"));
} else {
  // Walk the page first so lazy images and reveal-on-scroll effects settle.
  const { contentSize } = await send("Page.getLayoutMetrics");
  for (let y = 0; y < contentSize.height; y += Math.round(height * 0.8)) {
    await send("Runtime.evaluate", { expression: `window.scrollTo(0, ${y})` });
    await sleep(120);
  }
  await send("Runtime.evaluate", { expression: "window.scrollTo(0, 0)" });
  await sleep(900);
  const shot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width, height: Math.ceil(contentSize.height), scale: 1 },
  });
  writeFileSync(out, Buffer.from(shot.data, "base64"));
}

console.log("wrote", out);
ws.close();
chrome.kill();
process.exit(0);
