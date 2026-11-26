/*
  Probe helper: run an expression in the page and print its value.
  Usage: node scripts/probe.mjs <url> <width> <height> <scrollY> <exprFile>
*/
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [, , url, widthArg, heightArg, scrollArg, exprFile] = process.argv;
const width = Number(widthArg);
const height = Number(heightArg);
const port = 9334;

const chrome = spawn(
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "serion-probe-"))}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (let i = 0; i < 50; i++) {
  try {
    await fetch(`http://127.0.0.1:${port}/json/version`);
    break;
  } catch {
    await sleep(200);
  }
}

const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = targets.find((target) => target.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
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
  width,
  height,
  deviceScaleFactor: 1,
  mobile: width < 600,
});
await send("Page.navigate", { url });
await sleep(2500);
await send("Runtime.evaluate", { expression: `window.scrollTo(0, ${Number(scrollArg)})` });
await sleep(1200);

const expression = readFileSync(exprFile, "utf8");
const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
  awaitPromise: true,
});
console.log(JSON.stringify(result.result.value, null, 2));
if (result.exceptionDetails) console.error(JSON.stringify(result.exceptionDetails, null, 2));

ws.close();
chrome.kill();
process.exit(0);
