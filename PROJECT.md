# Serion: project handoff

The single source of truth for anyone (person or agent) picking this project up.
**Read it fully before changing anything. Update it in the same commit as any
change that alters behavior, rules, files, workflow or status** (see
"Keeping this file current" at the end).

Last updated: 2026-10-29, version 1.1.0 released: user-facing README, MIT license.

---

## 1. What Serion is

A small always-on-top **screen-time "notch"** for the desktop: a rounded pill at
the top center of the screen that shows how long you have *actually* used the
computer today ("42m", "1.5h"), plus a dashboard with history, per-app time,
timers, breaks and data controls.

- Repo: `https://github.com/mahtamun-hoque-fahim/serion` (**public**), branch `main`.
- Local path: `E:\codes\serion` (Windows). Owner's git identity:
  `mahtamun-hoque-fahim` / `mahtamunhoquefahim@gmail.com`.
- Stack: **Tauri v2** (Rust backend) + **React 19 + TypeScript + Vite** frontend.
- Target: Windows first (everything is built and tested there). macOS and Linux
  are planned; the OS-facing modules are stubs there today (see Status).
- A phone version is a future interest, not started.

## 2. How the owner works (keep this workflow)

- **Discuss before building anything non-trivial.** For new features, list the
  cases and edge cases, propose a design, ask the open questions, and wait for
  approval ("final spec approved", "go"). The owner explicitly asked: "calculate
  edge cases, total cases, everything, and discuss with me first."
- Explain the **principle** behind decisions briefly, not just the code (the
  owner is building their skills).
- Prefer **simple over clever** for security and infrastructure ("getting too
  messy for the sake of security": choose the simple, honest option).
- **Every interaction has micro-interactions and soft animations** (springs,
  draw-ons, slides), and every animation respects `prefers-reduced-motion`.
- **No emojis** anywhere in code or UI. Icons: **lucide-react only**.
- Commits: on `main`, only when asked ("commit the working tree changes with a
  sensible message"). **Ask before pushing**; push only when told. Commit
  message body is detailed; it ends with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- "Activate tauri" / "the notch is gone" means: (re)start the dev app
  (`npm run tauri dev`) and make sure the pill is on screen.
- The owner tests by using the app and sends screenshots. They work in Windows
  with PowerShell, mostly in dark mode, taskbar set to auto-hide, one 1366x768
  screen.
- **The owner's mouse buttons are swapped (left-handed).** When automating
  clicks with `mouse_event`, the *logical* left click is flags `8`/`16`
  (RIGHTDOWN/RIGHTUP), not `2`/`4`.
- Before driving the mouse or keyboard for a test, say so; stop if the owner is
  actively using the PC. Never keep screenshots that capture private content
  (chats); delete them.

## 3. Environment and commands

| What | Where / how |
|---|---|
| Node 22, npm 11 | global |
| Rust (stable, MSVC target) | `C:\Users\HP\.cargo\bin` (add to `PATH` in each shell) |
| MSVC Build Tools 2022 | `C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools` |
| Rust build output | `C:/rust-target/serion` (SSD), set in `src-tauri/.cargo/config.toml`; the project itself is on the E: HDD |
| Encryption key | `src-tauri/serion.key`, 32 raw bytes, **git-ignored**, owner keeps a backup |
| App data (default) | `%APPDATA%\com.serion.app\` |

```bash
npm run tauri dev                     # run the app (pill + dashboard), hot reload
cd src-tauri && cargo test --lib      # Rust unit tests (48 at last count)
npx tsc --noEmit                      # frontend type-check
npx tauri icon src-tauri/icons/app-icon.svg   # regenerate every icon size
cd src-tauri && cargo run --example probe     # print what Windows reports for the foreground window
npm run tauri build                   # release installer (NSIS), see "Installer" below
```

**Installer:** `npm run tauri build` makes
`C:/rust-target/serion/release/bundle/nsis/Serion_<version>_x64-setup.exe`; a
copy of the latest one is kept at `E:\` for the owner. Config: NSIS only,
installs for the current user (no admin), product name "Serion", publisher
"Mahtamun Hoque Fahim", unsigned (SmartScreen shows "Windows protected your PC":
More info, Run anyway). The NSIS uninstaller offers to delete app data; by
default data is kept. Bump the version in `tauri.conf.json`, `Cargo.toml` and
`package.json` together for each release. Stop the dev app before running the
installed one, or two pills appear.

In PowerShell sessions prepend: `$env:Path="$env:USERPROFILE\.cargo\bin;$env:Path"`.

## 4. Architecture (file map)

Repo root: `README.md` (for users: what it does, install, using the pill,
privacy, build from source incl. making your own `serion.key`), `LICENSE`
(MIT), `docs/` (README screenshots: `pill.png`, `dashboard.png`; retake them
when the UI changes).

### Rust (`src-tauri/src/`)
| File | Role |
|---|---|
| `main.rs` | entry, calls `serion_lib::run()` |
| `lib.rs` | app setup (single-instance guard first), the **1-second loop** (`run_tracker`), shared state `Core` behind a `Mutex`, all `#[tauri::command]`s, window creation (dashboard, alert flash), save on exit |
| `screen.rs` | **OS scan** each second (Windows API via `windows-sys`): foreground window, all open "Alt+Tab" windows in z-order (visible, not minimized, not cloaked, no owner, not tool windows), fullscreen check, monitor count, "display kept awake" (`CallNtPowerInformation(SystemExecutionState)` & `ES_DISPLAY_REQUIRED`). Stub on other OSes |
| `tracker.rs` | **pure counting rules** (unit tested): `classify` (App / Shell / Desktop / Locked), `open_apps`, `credit`, `other_screens`, `Tracker` (pending vs committed time, per app), `format_duration` |
| `breaks.rs` | water / stretch / eye breaks: config + validation, offer → start → run → end, skip, "away counts as break" (pure, tested) |
| `history.rs` | storage: encrypted day files + settings, migration of old plain JSON, prune by retention, clear, data folder move, export bundle, validated import with modes (tested) |
| `crypto.rs` | AES-256-GCM seal/open; key from `serion.key` via `include_bytes!` (tested) |
| `names.rs` | real app names: Store-app manifest `DisplayName` (incl. `ms-resource:` via `SHLoadIndirectString`) or exe `FileDescription` |
| `battery.rs` | battery level (`GetSystemPowerStatus`) and "entered low" rule (tested) |
| `sound.rs` | notification chimes: builds the WAV once, plays it with `PlaySoundW` (tested) |
| `build.rs` | checks `serion.key` exists and is 32 bytes, else stops the build with instructions |
| `examples/probe.rs` | debugging tool: prints foreground window + idle each second (only user of `active-win-pos-rs`) |

### Frontend (`src/`)
One Vite page, three windows chosen by `?view=` in `main.tsx` (lazy imports so
each window loads only its own CSS):

| File | Role |
|---|---|
| `main.tsx` | routes `?view=dashboard` / `?view=flash` / default (pill); applies appearance before first paint |
| `App.tsx` + `App.css` | **the pill window**: pill, state icon with draw-on animation, settings button + panel, top-apps panel, break card, fixed window size + clickable hit area, intro animation, steady-state debounce, fullscreen hide/peek, calendar flip, alert red |
| `drag.ts` | custom drag (not Tauri's native one): grab cursor, magnetic dock at top center and magnetic screen edges, glide back, tap detection; converts window and pill positions with an x/y offset |
| `Settings.tsx` | themes (6 presets), size (Small/Large), autostart hook, pill settings panel, shared `ThemeSwatches` |
| `TopApps.tsx` | pill panel: today's top 5 apps and the accent reading-mode switch |
| `layout.ts` | where the hover buttons and panels go from the pill's free screen space (self-check: `node --experimental-strip-types scripts/layout.check.ts`) |
| `BreakCard.tsx` + `.css`, `BreakArt.tsx` | break card (offer / starting tick / active / done) and the animated illustrations |
| `Dashboard.tsx` + `.css` | dashboard window: range tabs, stat tiles, bar chart, top apps, Settings, Breaks, Timers, Data cards, appearance switch |
| `BarChart.tsx` | single-series SVG bar chart with hover tooltip and screen-reader table |
| `Flash.tsx` + `.css` | full-screen red flash for timer alerts (click-through window that closes itself) |
| `appearance.ts` | System/Light/Dark choice; sets `data-mode` on `<html>` |
| `sound.ts` | when to chime (asks Rust `play_chime`) and the Sounds on/off pref |
| `SerionMark.tsx` | the Serion logo mark as an SVG component |
| `types.ts` | shared types (mirror the Rust structs) and formatters |

Windows communicate through **Tauri events** (`tick` every second, `alert`) and
**`localStorage`** (theme, size, appearance; `storage` events sync windows).

## 5. Counting rules (approved spec)

Each second the loop decides **who gets the second**:

1. **Focused real app** → it gets the time.
2. Focus on **desktop, taskbar, the pill, a minimized window, Game Bar or the
   screenshot overlay** → the **topmost open app window** gets it.
3. **Hold** (nothing counts) only when **no app window is open** (N goes from 1
   to 0), on the **lock screen / UAC / no foreground window**, or when **Start,
   search, Action Center, Alt+Tab or Task View** is in front (even with apps open).
4. **Serion's dashboard counts** (as "Serion"); the pill and flash never count.
5. **Idle:** no input for **5 min** → idle; the last 5 min are held as
   *pending* and dropped, so the idle wait never leaks into the total. An input
   confirms pending time. The displayed total only ever goes up.
6. **Display kept awake** (video, call, controller game) counts as present even
   without input.
7. **Reading mode:** idle after **20 min** instead of 5, tied to the app it was
   switched on in; ends on app switch or after 60 min.
8. **Other screens** (setting; automatic = on with 2+ monitors): the topmost
   app on each other monitor also gets **per-app** time; the day total counts once.
9. **Durations use the steady clock**; the wall clock only decides the date.
   A tick longer than 5 s (sleep) is dropped.
10. **Midnight:** pending time is committed to the old day, then the day resets.
11. **While a started break runs** nothing counts.
12. Store-app windows hosted by `ApplicationFrameHost.exe` are keyed by window title.

## 6. Features (what exists)

**Pill**
- States: eye = counting, moon = idle, hand = hold, glass / dumbbell / closed
  eye = breaks, book = reading mode, calendar flip at midnight, grabbing fist
  while dragging (dragging is *not* hold), hourglass (turns over every 4 s)
  while a countdown runs: over counting, idle, hold and reading, but breaks,
  offers, midnight and dragging still win.
- A state must last **2 s** before the pill shows it (no flicker on app switches).
- Circle pop + line draw-on animation on every state change; launch intro (mark
  in a circle opens into the pill).
- Hover → two round buttons: **expand** (`Maximize2`, opens the dashboard)
  and **settings** (a `Power` icon, opens the settings panel with theme,
  start at login and Quit). Both animate in (arrows spring apart; stick drops
  and ring turns) and on hover. Click the pill → top-apps panel; right-click
  → quit.
- **Placement follows free screen space** (`layout.ts`, from the owner's
  sketches): docked at top center → expand left, settings right, panel below
  (the default). Anywhere else the buttons and the panel sit above and below
  the pill, on opposite sides: the panel prefers the outer side (toward the
  nearest top or bottom edge) and takes the inner side when it does not fit;
  the buttons take the other side, or, with no room there either (pill
  touching the top or bottom edge), sit next to the pill with the panel
  opening past them (they then stay shown while it is open). The buttons
  line up with the pill's wall-side end: expand at the wall, settings toward
  the middle. Panels are centered on the pill but shifted to stay on screen.
  Re-measured 150 ms after the window stops moving (`onMoved`).
- The pill window has **one fixed size** per pill size, with the pill at a
  fixed spot in its middle and room on every side for a button pair or a
  panel (it reaches past the screen edge; the transparent rest is
  click-through). Opening or closing a panel never moves or resizes it. The
  page tells Rust which parts are clickable (pill plus shown buttons, and an
  open panel, each including the gap to the pill) with `set_hit_area`; a Rust
  thread (`watch_hit_area`) checks the cursor every 25 ms and turns
  click-through (`set_ignore_cursor_events`) on outside them, never while a
  mouse button is held. They grow at once and shrink after the exit
  animation (`EXIT_MS`). `set_bounds` resizes the window only when the pill
  size or screen scale changes. The drag hook converts between window and
  pill positions with the x/y offset.
- Top-apps panel: today's top 5, then **reading mode as a big accent
  switch** (the book knob slides across, "On"/"Off"). The old chevron to the
  dashboard is gone (the expand button replaces it).
- Custom drag, magnetic top-center dock and magnetic screen edges (work area).
- Sizes: Small (80%, CSS `zoom`) / Large; keeps its center when resized.
- Hides while a **fullscreen** app is in front (setting "Show over fullscreen"
  off by default); a due break peeks 5 s every 20 min.
- Optional "Hide Serion from recordings & screenshots"
  (`SetWindowDisplayAffinity` / `WDA_EXCLUDEFROMCAPTURE` via
  `set_content_protected`), off by default; covers pill, cards, flash.

**Breaks** (all off by default; Breaks card in the dashboard)
- Water, stretch, eyes: free interval 5–240 min of *counted* screen time, free
  length 10 s–30 min; **two switched-on breaks cannot share an interval**.
- Due breaks are **offered** (card with Start / skip) and wait on the pill;
  several due at once show all icons and the user picks one (others skipped).
- Start → animated tick → break animation (filling glass, jumping jacks,
  blinking eye looking at a horizon); accent ring fills around the pill icon;
  ends by itself or with Done.
- Being away (idle, locked, asleep) at least a break's length counts as that break.

**Dashboard**
- Range tabs (7D…5Y within retention), stat tiles, bar chart (daily; weekly or
  30-day averages beyond 90 days), top apps, Timers (daily limit + countdown),
  Settings, Breaks, Data, System/Light/Dark switch.
- Timer alerts: whole-screen red flash + pill red for 5 s.
- Sounds: a short two-note chime with an octave overtone. Firmer `alert`
  chime for the daily limit and countdown; softer `break` chime for a new
  break offer and a break that ran out. The page decides when (`sound.ts`);
  Rust `play_chime` plays it (`sound.rs`: an in-memory WAV built once, played
  with `PlaySoundW`, no audio file). Quiet while the pill hides for a
  fullscreen app (`hide_for_fullscreen`); volume follows Windows. "Sounds"
  switch in the dashboard Settings card, on by default; turning it on plays
  a sample chime.

**Settings** (dashboard Settings card unless noted)
- Theme colors (also pill panel), notch size, start at login (installed builds
  only), show over fullscreen, hide from recordings, count other screens, quit
  when battery is low (off; 10/15/20/30%, acts only on *entering* low), Quit.

**Data**
- All files encrypted (`.srn`); privacy note in the Data card.
- History retention 7 days … 5 years; clear all (two-click confirm).
- Data folder: change → "Move my data there" (copies verified before removing)
  or "Start fresh there" (history empty, settings kept); "Use default".
- Export to one sealed `.serion` file; import with **Keep the higher numbers /
  Use the file's numbers / Replace everything**.

**Other**
- App icon: white Serion mark on a blue circle (`src-tauri/icons/app-icon.svg`).
- Real app names (manifest / FileDescription), cached per exe path.

## 7. Data, storage and security

- Layout (data folder): `history/YYYY-MM-DD.srn` (a `Day`: total + per-app),
  `settings.srn`. A chosen folder is remembered in
  `%APPDATA%\com.serion.app\data-folder.txt`.
- File format: `"SRN1"` + 12-byte random nonce + AES-256-GCM ciphertext of JSON.
  GCM authentication means any changed byte is refused (that *is* the
  signature). Old plain `.json` files are sealed at startup (`seal_legacy`).
- Export bundle: sealed JSON `{format:"serion-export", version:1, settings, days}`.
  Import validates: real dates, not in the future, ≤ 24 h per day and per app,
  sane sizes; days older than retention are skipped and reported.
- **Key:** one key for storage and exports, embedded at build from
  `src-tauri/serion.key` (never in the repo; the repo is public). Honest limit:
  someone who reverse-engineers the app binary could recover it. **Losing the
  key file makes all data and exports unreadable** for builds made with a new key.
- Settings JSON fields (`history::Settings`): `retention_days`, `limit_ms`,
  `battery_quit`, `battery_threshold`, `breaks{water_every, stretch_every,
  eye_every, water_seconds, stretch_seconds, eye_seconds}`,
  `show_over_fullscreen`, `other_screens` (null = automatic), `hide_from_capture`.
- Frontend-only prefs in `localStorage`: `serion.theme`, `serion.size`,
  `serion.appearance`, `serion.autostartChosen`, `serion.sounds`.

## 8. Design system

- Brand blue `#0047ff`; theme presets Blue `#0047ff`, Graphite `#1f1f1f`, Violet
  `#6d28d9`, Emerald `#047857`, Coral `#e5484d`, Amber `#c2410c`. Alert red
  `#e11d48`. The pill always uses the theme color; panels/dashboard follow
  light/dark tokens, with `--accent` lightened in dark mode (Graphite → light gray).
- Font: Google Sans 700 (`@fontsource/google-sans`, Latin only, bundled offline).
- Pill (Large): 168×50, circle 36 px, settings button 50 px, panels 226 px wide
  (break card 260). **Sizes in `App.tsx` constants must match `App.css`.**
- Motion: springs `cubic-bezier(0.34, 1.56, 0.64, 1)`, outs
  `cubic-bezier(0.22, 1, 0.36, 1)`; icon draw-on via `pathLength=1` +
  `stroke-dashoffset`; state change remounts the circle (`key`) to replay.
- Charts follow the dataviz guidance: thin rounded bars, 2 px gaps, recessive
  grid, hover tooltip, text in ink colors.

## 9. Gotchas learned the hard way

- **Hot reload mid-edit can crash the pill page** (it reloads one file against
  a half-edited other one) → the transparent window looks "gone". Fix: touch
  `src/main.tsx` to force a full reload. Write multi-file changes so each file
  stays valid, or reload after.
- Rust edits make `tauri dev` rebuild and **restart the app**; intermediate
  build errors in its log are normal if the last build finished.
- **PowerShell 5 `Set-Content -Encoding utf8` writes a BOM**, which breaks JSON
  parsing → use `[IO.File]::WriteAllText(path, text, (New-Object System.Text.UTF8Encoding $false))`.
- Bash `node -e "..."` with backticks inside double quotes gets mangled → put
  edit scripts in files and run `node script.js`.
- Chained `sleep` commands are blocked in the agent shell → use `until …; do sleep 2; done` or background tasks.
- When the last app is minimized Windows gives focus to **the pill**; that is
  why the pill is treated as "Desktop" (credit the top open app), not as an app.
- `GetLastInputInfo` ignores gamepads and synthetic input from tools counts as input.
- The browser preview pane cannot run Tauri APIs (`invoke`/`listen` throw);
  only pure components (e.g. `BreakCard`) can be rendered there for checks.
- With "Hide from recordings" on, the pill is invisible to `CopyFromScreen`
  screenshots too.
- Windows 11 Notepad is a Store app; test windows are easier as WinForms forms.
- **Dev runs started from the Claude desktop app are sandboxed.** Claude is a
  packaged (MSIX) app; every process it starts (the agent's shells, `npm run
  tauri dev`) has its AppData writes silently redirected to
  `C:\Users\HP\AppData\Local\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\com.serion.app`.
  The installed app (started from the desktop) uses the real
  `%APPDATA%\com.serion.app`. So dev data and installed data are separate, and
  the agent's shell sees the redirected view, not the real folder. Copying data
  into the real folder has to be done outside Claude (Explorer).
- **Production builds and lazy imports:** with several `import()`s in one
  expression inside `lazy()`, Vite/rolldown wired up only one view's CSS (the
  dashboard rendered unstyled). Keep one `import()` per loader function
  (`src/main.tsx`). Always look at the installed build, not only dev.
- Dev (`localhost:1420`) and the installed app (`tauri.localhost`) are
  different web origins, so `localStorage` prefs (theme, size, appearance) do
  not carry over between them.
- **Two copies stack invisibly:** before the single-instance guard, autostart
  plus a desktop-icon launch ran two Serions; both docked at the same spot, so
  one pill hid the other and both saved the same files. The guard
  (`tauri-plugin-single-instance`, keyed on the app identifier) also means a
  dev build will not start while the installed app runs: quit one first.
- **Never move or resize the pill window for a panel.** Earlier builds grew
  the window left and shifted the pill right inside it; the two changes land
  on different screen frames, so the pill jumped about 72 px sideways for a
  frame on every open and close (seen in a 60 fps recording, invisible in
  window-position logs). Hence the fixed window plus a hit area.
- **No window regions on the pill window.** `SetWindowRgn` made the rest of
  the window click-through, but on this transparent (DWM) window it sometimes
  painted the region as an opaque dark box behind the pill. Clearing the
  region removed the box at once. Click-through is cursor-polled instead.
- **Icon jumped 1 px after each state change (Small size).** The circle's
  `logo-pop` transform animation puts it on its own GPU layer; in Small
  (`zoom` 0.8) it sits at a fractional pixel position, and when the
  animation ended the icon was redrawn snapped to whole pixels. Fixed with
  `will-change: transform` on `.logo` (always its own layer).
- **Port 1420 can be reserved by Windows** (Hyper-V/WinNAT excluded port
  ranges, `netsh interface ipv4 show excludedportrange protocol=tcp`); Vite
  then fails with `EACCES`. Run dev on another port for that session:
  `npx tauri dev --config '{"build":{"devUrl":"http://localhost:5199","beforeDevCommand":"npm run dev -- --port 5199 --strictPort"}}'`.
- **Testing with computer-use:** the owner's buttons are swapped, so the
  tool's `right_click` is a logical left click (and its `left_click` on the
  pill would quit Serion). It also minimizes windows it was not granted, the
  dev `serion.exe` included: grant `serion.exe` before the first screenshot.
- **No Web Audio for notifications.** A webview page may not play sound until
  it has been clicked, and the pill often never is, so the first chimes
  (Web Audio in the page) could stay silent. Rust plays them instead. Test
  sound with the pill untouched (open the dashboard with a second launch),
  and measure the speaker peak rather than trusting the call returned.

## 10. Status

**Verified live:** counting with N open windows and minimize (the owner's bug),
Win+M hold, fullscreen hide, drag + magnet + edges, grab icon, launch intro,
themes, sizes, dark mode panels and dashboard, top apps list, dashboard render,
countdown alert flash, break card visuals (light/dark), capture exclusion,
encrypted migration of real data.

**Built, covered by unit tests, not yet seen live:** reading mode, display-awake
(video/call) counting, midnight flip, fullscreen break peek, other-screens
credit, Start menu = hold, a full live break cycle, export/import/folder move
through the UI, battery quit.

**Missing / open:**
1. **Version 1.1.0** (2026-10-29): installer `Serion_1.1.0_x64-setup.exe`,
   published as GitHub Release `v1.1.0` (tag on the release commit). The owner
   uses the installed app daily. Start at login turns on at the first
   installed run and has not been confirmed yet.
2. macOS / Linux: `screen.rs`, `names.rs`, `battery.rs` are stubs → nothing
   counts there yet. Decide: port or declare v1 Windows-only.
3. Unsigned → SmartScreen warning for other users; no auto-updater.
4. Open question: the first click on the pill sometimes seemed to only
   activate the window (seen once during automated tests, unconfirmed).
5. Cleanups: drop `active-win-pos-rs` (only the probe uses it); no frontend
   tests.
6. Releases: `gh` is not installed here, so a release is made on github.com
   (new release, pick the tag, attach the installer). Each release: bump the
   version in `tauri.conf.json`, `Cargo.toml`, `package.json` (and the root of
   `package-lock.json`), build, tag `vX.Y.Z`, push the tag, then publish.

## 11. History (commits on `main`)

| Commit | What |
|---|---|
| `5b5b506` | Tauri v2 + React + TS scaffold, window probe |
| `3187bcd` | Tracker core (pending buffer) and first pill |
| `4d89cc5` | Smaller pill, Google Sans, idle/hold icons |
| `3e75c37` | Eye icon while counting |
| `4a4ee43` | Circle pop + line draw-on animations |
| `cec51e0` | App icon from the Serion mark |
| `95e5619` | Settings menu with theme colors |
| `f60b8fa` | Never count Serion's own window |
| `2c4b697` | Launch intro, magnetic drag, start at login |
| `44ceb36` | App icon: white mark on blue circle |
| `1105a91` | Dashboard, per-app history, timers, alerts, light/dark |
| `cf44017` | Breaks, dashboard settings, edge magnet, notch size, battery quit |
| `efc3378` | Offered breaks, screen-scan counting rules, recording privacy |
| `c8ed9d0` | Encrypted data, movable data folder, export/import |
| `8e6520d` | PROJECT.md handoff, AGENTS.md / CLAUDE.md |
| v1.0.0 | Release config (Serion 1.0.0, NSIS, publisher), installer at `E:\` |
| `d592bc7` | Fixes found in the installed app: dashboard CSS not loaded in production, panels centered under the pill, more room for break names; installer at `E:\` rebuilt (version still 1.0.0) |
| `ce0acac` | Single instance: a second launch (autostart plus the desktop icon) exits and opens the running copy's dashboard; installer at `E:\` rebuilt |
| `218fdc7` | Pill window keeps one size; panels change only its clickable region (`SetWindowRgn`), so the pill no longer jumps a frame sideways on open/close |
| `25526bf` | Region replaced by cursor-polled click-through (`set_hit_area`, `watch_hit_area`): the region sometimes showed a dark box behind the pill. State icon no longer jumps 1 px when its pop ends (`will-change` on `.logo`); installer at `E:\` rebuilt |
| `2f95149` | Notification sounds: chimes for timer alerts and breaks, played by Rust (`sound.rs`) so the webview's click-to-play rule cannot mute them; Sounds switch in the dashboard; hourglass icon while a countdown runs |
| `3845bb0` | Expand + settings (power icon) hover buttons; buttons and panels placed by free screen space (`layout.ts`); multi-rect hit area; accent reading switch; chevron removed |
| `ac19e07` | Placement redone from the owner's edge sketches: buttons and panel on opposite sides of the pill (no side columns), panel past the buttons at the top/bottom edge, expand at the wall end; installer at `E:\` rebuilt |
| v1.1.0 | User-facing README (features, install, using the pill, privacy, build from source) with screenshots in `docs/`; MIT LICENSE; version 1.1.0, installer `Serion_1.1.0_x64-setup.exe` at `E:\` and on GitHub Releases |

Decisions worth knowing (and *why*): Tauri over Electron for a 24/7 widget
(memory); a custom drag because the native one blocks page events; offered
(not forced) breaks; hold only on 1→0 open windows; simple built-in-key
encryption instead of passwords/credential manager (owner's call: simple over
messy), with the key kept out of the public repo.

## 12. Keeping this file current

Any agent working here must:
1. Read this file before starting.
2. Update the relevant sections **in the same commit** as the change:
   features (6), rules (5), files (4), data (7), gotchas (9), status (10),
   history (11, add the commit), and the "Last updated" line.
3. Record new owner preferences in section 2 as soon as they are stated.
