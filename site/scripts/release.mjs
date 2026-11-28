// Runs before every build (npm "prebuild"): writes the latest GitHub release's
// version and installer size into lib/release.json, so the site never names an old
// version. If GitHub can't be reached the committed file is kept, and the
// build goes on with the last known release.
import { writeFileSync } from "node:fs";

const API = "https://api.github.com/repos/mahtamun-hoque-fahim/serion/releases/latest";
const out = new URL("../lib/release.json", import.meta.url);

try {
  const headers = { "User-Agent": "serion-site-build", Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(API, { headers, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  const rel = await res.json();
  const exe = rel.assets.find((a) => /^Serion_.+_x64-setup\.exe$/.test(a.name));
  if (!exe) throw new Error(`no x64 installer in ${rel.tag_name}`);
  const release = { version: rel.tag_name.replace(/^v/, ""), bytes: exe.size };
  writeFileSync(out, JSON.stringify(release, null, 2) + "\n");
  console.log(`release: v${release.version} (${release.bytes} bytes)`);
} catch (err) {
  console.warn(`release: kept lib/release.json, ${err.message}`);
}
