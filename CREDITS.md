# Credits

Serion is designed, built and owned by **Mahtamun Hoque Fahim**.

## Co-authors

Every AI model that worked on Serion is credited here, whether or not its
commits carry a `Co-Authored-By` trailer. Rewriting history to add trailers
would change every commit hash and the published tags, so this file is the
record instead.

### Claude Opus 5.5 `<noreply@anthropic.com>` (Claude Code)

Co-authored these 24 commits, from the first scaffold to the 1.1.0 release:

| Commit | What it did |
|---|---|
| `5b5b506` | Project setup: Tauri v2 + React + TS scaffold and window probe |
| `3187bcd` | Tracker core and pill UI |
| `4d89cc5` | Smaller pill, Google Sans, idle and hold icons |
| `3e75c37` | Show an eye icon while counting |
| `4a4ee43` | Animate state changes: circle pop, then line draw-on |
| `cec51e0` | App icon from the Serion mark |
| `95e5619` | Settings menu with theme colors; smaller state circle |
| `f60b8fa` | Never count Serion's own window as app time |
| `2c4b697` | Launch intro, magnetic drag, start at login |
| `44ceb36` | App icon: white mark on a blue circle |
| `1105a91` | Dashboard, per-app history, timers, alerts, light/dark mode |
| `cf44017` | Breaks, settings in the dashboard, edge magnet, notch size, battery quit |
| `efc3378` | Offered breaks, screen-scan counting rules, recording privacy |
| `c8ed9d0` | Encrypted data, movable data folder, export and import |
| `8e6520d` | PROJECT.md handoff, plus agent instructions to keep it current |
| `a245c3a` | Release 1.0.0: installer config |
| `d592bc7` | Fix installed-app issues: dashboard CSS, centered panels |
| `ce0acac` | Run a single instance: second launch opens the dashboard |
| `218fdc7` | Keep the pill window one size; panels change only its click region |
| `25526bf` | Cursor-based click-through; stop the state icon's 1px jump |
| `2f95149` | Notification chimes and a countdown hourglass |
| `3845bb0` | Expand and settings buttons placed by free screen space |
| `ac19e07` | Buttons and panel on opposite sides of the pill |
| `54904de` | Release 1.1.0: user-facing README, MIT license |

It also rebuilt the landing page to the owner's comp on 2026-11-27 (`f6518ff`
onward) and pointed the site and the repo at the live URL (`7288efa`). Those
commits carry no trailer.

### DeepSeek V4.1 Flash (OpenCode)

Worked from 2026-11-23 to 2026-11-26: committed the display modes and tray,
built, installed and verified 1.2.0 and 1.2.1, repaired the corrupt Local
Storage profile, seeded the repo's About, changelog and Dependabot, wrote the
Google Stitch prompt pack, and built the first landing site. No trailer.

| Commit | What it did |
|---|---|
| `c2d018b` | Pill display modes (Hidden / Icon / Full) and a tray icon |
| `a7628be` | Keep startup alive without a tray, and one pill height in CSS |
| `32bee3b` | Fix the Breaks row clipping at the dashboard's minimum width (1.2.1) |
| `f646283` | Seed the repo's About, changelog, badges and Dependabot |
| `2c3044f` | Landing site: one page, real screenshots, scroll-driven display modes |

### Also run on the landing page (OpenCode, 2026-11-27)

These models were run one after another in the same OpenCode session on the
afternoon of 2026-11-27, while the landing page was being rebuilt:

- beam (OpenCode)
- Nemotron 3.5 Super VL (NVIDIA)
- Gemma 4 26B A4B (Google)
- Nemotron 3 Nano Omni 30B A3B Reasoning (NVIDIA)
- DeepSeek R1 Distill Qwen 32B

### Tools

- **Google Stitch** — the landing page prompt pack in
  `docs/landing-page-prompt.md` was written for it.

## Session log: how this list was found (2026-11-27)

The owner asked for every agent to be credited. Only Claude had left a
signature (the 24 trailers), so the other models were traced from where they
did leave a record:

- Git history, every branch, tag and unreachable object, and every past
  version of each `.md` file: only Claude's trailers.
- GitHub releases, issues, pull requests and comments: nothing.
- Claude Code's saved sessions for this folder: Claude Opus 5.5 only.
- OpenCode's local session database: two sessions in `E:\codes\serion`, which
  name DeepSeek V4.1 Flash and the five models above. DeepSeek's commits were
  matched by the `git commit` calls in those sessions and their times.

Only Claude appears in GitHub's Contributors sidebar, because only its trailer
email belongs to a GitHub account. The others have no such account, so this
file is where they are credited.

## Tools and dependencies

Serion stands on the work of the Tauri, Rust, React, Vite and Tailwind
communities, and on the Lucide icon set and Google Sans typeface. The full
dependency list is in `package.json` and `src-tauri/Cargo.toml`; each package
keeps its own licence.
