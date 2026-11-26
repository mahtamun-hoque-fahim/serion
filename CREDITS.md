# Credits

Serion is designed, built and owned by **Mahtamun Hoque Fahim**.

## Co-authors

The commit history credits the following co-authors. They are listed here in
full because the trailer is part of the permanent record: rewriting it would
change every commit hash and the published `v1.1.0` tag.

### Claude Opus 5.5 `<noreply@anthropic.com>`

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

Commits after `54904de` — `c2d018b`, `a7628be`, `32bee3b`, `f646283` and later
— carry no co-author trailer.

## Tools and dependencies

Serion stands on the work of the Tauri, Rust, React, Vite and Tailwind
communities, and on the Lucide icon set and Google Sans typeface. The full
dependency list is in `package.json` and `src-tauri/Cargo.toml`; each package
keeps its own licence.
