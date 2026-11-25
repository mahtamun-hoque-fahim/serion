# Agent instructions: Serion

1. **Read `PROJECT.md` first.** It holds everything about this project: what it
   is, how the owner works, architecture, rules, decisions, gotchas and status.
2. **Keep `PROJECT.md` current.** Every change to behavior, rules, files,
   workflow or status updates the matching sections of `PROJECT.md` in the same
   commit, including the history table and the "Last updated" line.
3. Follow the owner's workflow in `PROJECT.md` section 2. Most important:
   discuss cases and get approval before non-trivial work, no emojis
   (lucide-react icons only), commit only when asked, ask before pushing.
4. **Log every decision here.** Append one entry per decision to the log below,
   with the date, what was decided and why. This includes decisions that were
   later reversed (say so) and decisions the owner made in passing.

## Decision log

Newest last. Date, decision, reason.

- **2026-11-23 — the working tree was not installed.** The installed app was
  `C:\Users\HP\AppData\Local\Serion\serion.exe`, built 2026-10-28 (v1.1.0,
  no tray code in the binary); `src-tauri/target/release` did not exist, so the
  uncommitted display-mode work had never been built. Therefore the owner's
  path applied: commit, build, install, run, observe, fix.
- **2026-11-23 — commit first, fix later.** The uncommitted feature
  (display modes + tray) was committed as found (`c2d018b`) so the installed
  build can be compared against a clean, known baseline. Doc defects found in
  review (literal `'"'"'` escapes, stale "notch size" wording, orphan comment)
  were deliberately left for the fix commit.
- **2026-11-23 — no Claude co-author.** The owner asked to remove the
  co-author trailer. `PROJECT.md`'s commit rule no longer asks for
  `Co-Authored-By: Claude ...`; commits end with the message body only.
- **2026-11-23 — version 1.2.0.** Bumped before building so the installer and
  the published 1.1.0 cannot be confused: same version number must never mean
  two different behaviors.
- **2026-11-23 — automated clicks allowed.** The owner chose to let the agent
  drive the UI with `mouse_event` for the display-mode checks. The owner's
  mouse buttons are swapped, so a logical left click is flags 8/16 (see
  `PROJECT.md` section 2).
- **2026-11-23 — install over the daily app approved.** The running Serion is
  quit (it saves today's numbers), then the new installer overwrites the exe;
  counted data lives in the user data folder and is untouched.
- **2026-11-24 — the display-mode bug is a corrupt Local Storage WAL, not app
  logic.** The pill's mode reverts to Full on restart because Chromium's log
  for this profile is damaged: `...\com.serion.app\EBWebView\Default\Local
  Storage\leveldb\LOG` says, on every start, `Recovering log #3` then
  `(ignoring error) 000003.log: dropping 2814 bytes; Corruption: checksum
  mismatch`. LevelDB discards everything from the damaged offset to the end of
  the file, so every `localStorage` write made after that point is silently
  lost at the next launch. Proof: a throwaway `probe` key written three
  seconds before quitting, and again one written thirty-five seconds before
  quitting, were both gone after relaunch, while the accumulated writes from
  before the damage were intact. Fixing this is a data repair, not a code
  change, and it wipes saved preferences, so it waits for the owner.
- **2026-11-24 — the "size anomaly" is withdrawn.** The stored
  `serion.size = small` is in fact honoured: the pill runs at `zoom: 0.8`
  (134px wide), which is the Small size. The earlier reading that the
  dashboard showed Large selected was a misread of the screenshot. No code
  change is needed for size.
- **2026-11-24 — the damaged store was moved aside, not deleted.** The corrupt
  `leveldb` folder was renamed to `leveldb.corrupt-20261124-1819` inside the
  WebView2 profile, so the writes that are still readable stay on disk while a
  clean profile is built. Straight after the repair the store held only the
  defaults (blue, Large, Hidden).
- **2026-11-24 — the repair is verified, both directions.** After the rebuild,
  Full survived a quit and a relaunch, and Hidden survived a quit through the
  tray's own "Quit Serion"; `leveldb\LOG` has no checksum error any more. So the
  display-mode code was right all along and the profile was the fault.
- **2026-11-24 — emerald and Small came back on their own, and that is fine.**
  The install-time read showed `theme=#047857` and `size=small` again, written
  after the repair by something other than the agent's checks: the log then
  reads `#047857`, `icon`, `icon`, `small`, `hidden`, which looks like the owner
  clicking the open dashboard's Pill card. Whatever the source, those values now
  survive a restart, which is the whole point. No action taken.
- **2026-11-24 — the tray is verified live.** Hovering the icon shows "Serion";
  the menu offers "Open Serion" and "Quit Serion"; Open brings the dashboard up
  while the pill is hidden; Quit saves and exits. The menu items were activated
  with the keyboard because synthetic clicks kept missing a native popup menu;
  that is a harness limitation, not an app fault.
- **2026-11-24 — three small fixes made after the live run.** A tray that fails
  to build no longer aborts startup (`add_tray` error is printed and ignored,
  because the pill and dashboard still work without a tray); the pill's 50px
  height, icon width and intro width now come from one `--pill-h` custom
  property instead of three literals; and an orphaned doc comment above the
  dashboard's `Choices` component is gone.
- **2026-11-24 — automated UI checks stop when the owner's screen is in use.**
  The tray-icon test fired two `mouse_event` clicks into a fullscreen video the
  owner had started; playback was unaffected (the position kept advancing), but
  blind clicking over someone's film is not acceptable. Tray verification is
  deferred until the desktop is free, and future UI probes will take a
  full-screen capture and confirm the scene before clicking.
- **2026-11-25 — the Breaks clipping is a reveal height, not a flex bug.** At
  the window's 760px minimum the "Every … for … min" line needs two lines
  (72px), but `.reveal.open` caps it at 44px `overflow: hidden`, so the unit
  dropdown was cut off. A `@media (max-width: 829px)` rule raises that one row
  to 88px; from about 830px up it still fits on one line (38px) and keeps the
  original animation. Measured: 760/780/800/820 → 72px with no clipping,
  830+ → 38px.
- **2026-11-25 — the break sentence breaks as two units.** "Every 45 min of
  screen time," and "for 1 min" are now separate spans, so the wrap keeps the
  unit with its number instead of leaving the dropdown alone on line two. The
  text still reads in full; only the break point changed.
- **2026-11-25 — 1.2.1, not a second 1.2.0.** The 1.2.0 installer was already
  built, installed and pushed; this fix changes behavior, so it ships as 1.2.1
  in all four version files. Same rule as before: one version number, one
  behavior.
- **2026-11-25 — layout fixes are proved in the running page before a build.**
  Both the taller reveal and the two-span sentence were injected into the
  installed 1.2.0 page over CDP and measured before spending a 3-minute build
  on them. A `PrintWindow` capture with `PW_RENDERFULLCONTENT` (flag 2) reads a
  covered window's own pixels, so checks no longer need the owner's desktop to
  be free.
