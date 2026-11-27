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
- **2026-11-25 — 1.2.1 was published as a GitHub Release from the REST API.**
  `gh` is not installed, but `git credential fill` returns a token that works
  against the API, so the release and its installer were created without a
  browser: `POST /releases`, then `POST` to that release's `upload_url`. The
  first attempt got a 422 because PowerShell 5.1's `ConvertTo-Json` had wrapped
  the notes string in `{"value": ...}`; `JavaScriptSerializer` fixed it. The
  asset was checked afterwards with a `HEAD` on the download URL.
- **2026-11-25 — the repo's About, changelog and Dependabot were seeded.**
  Description and nine topics were set through the API; topics need
  `PUT /repos/{owner}/{repo}/topics` because the repo `PATCH` left them empty.
  `CHANGELOG.md` starts at 1.0.0, built back from the tags. The README gained
  version, license and stars badges in brand blue `0047ff`. Dependabot covers
  npm, cargo under `src-tauri`, and GitHub Actions. No homepage is set: this is
  a desktop app with no site.
- **2026-11-25 — the landing site is a second app in `site/`.** One page, Next.js
  16 App Router with `output: "export"`, so it is plain files any static host can
  serve. It imports nothing from the app: release facts live in
  `site/lib/site.ts` and the palette is copied by hand, because a shared package
  for one page would cost more than it saves. Hand-written CSS, no Tailwind, no
  shadcn/ui, no animation library.
- **2026-11-25 — Singularity was satisfied at site scope.** `site/BRAIN.md` and
  `site/SITETREE.md` describe the page, not a second product identity, and reuse
  the answers already in `PROJECT.md`. The owner asked for the site to be built
  without a second interview.
- **2026-11-25 — the display-modes demo is CSS 3D plus DOM, not three.js.** The
  owner suggested a 3D laptop and was unsure of the tool. DOM keeps the pill's
  text crisp at any zoom, ships no WebGL payload, and still gives a real 3D lean
  (one shared `rotateY` on the machine, a `rotateX` deck pinned to the hinge).
  Scroll progress drives the mode on desktop; an IntersectionObserver does it
  below 901px, where the laptop is sticky.
- **2026-11-25 — the site shows the real app at 2×.** `site/scripts/capture-app.mjs`
  drives the running app over CDP, sets the brand theme, captures the pill with
  its panel open and the dashboard at 920px, then puts the owner's own theme,
  size and display mode back. Generated images are atmosphere only and never
  carry UI.
- **2026-11-25 — `CREDITS.md` instead of rewriting history.** The owner asked for
  every co-author in the git history to be credited. Rewriting 24 commits would
  change every SHA and the `v1.2.1` tag, so the co-authors are listed in one file
  that the README and the footer link to.
- **2026-11-27 — the landing page follows the new comp, not the old page.** The
  owner supplied a comp with a new section order and art direction: floating
  pill header, hero laptop, gray problem band, blue dashboard block, dark display
  modes, three install cards, dark FAQ, closing CTA and floating footer. The old
  `HowItCounts`, `Features` and `Privacy` sections are removed. Laptop screens
  and background graphics stay as marked placeholders until the owner supplies
  the art.
- **2026-11-27 — display modes are a static band with three buttons.** The comp
  reads as a two-column dark band, so the previous 300vh scroll choreography is
  gone; the three rows switch the drawn laptop's pill on click.
- **2026-11-27 — the owner's art replaces the drawn laptops.** The owner
  supplied the laptop, desk, orb and glow PNGs and asked for the page to match
  the comp exactly, so the CSS laptops and orbs are gone (`Laptop.tsx`
  deleted) and every section is sized from the comp measured at 1440px. The
  live pill stays as DOM on the desk art's white screen so the three mode
  buttons still work.
- **2026-11-27 — Google Sans only.** The owner said no font except Google Sans;
  Inter is uninstalled and body text uses Google Sans with `0.02em` tracking to
  match the comp's wider set.
- **2026-11-27 — copy follows the comp where it changed.** Icon mode now reads
  "Just the mark and today's time, when you want the nudge."; the closing line
  reads "Install Serion and look at the times wasted."; the FAQ privacy line and
  the install card's mode chips are gone because the comp has neither.
- **2026-11-27 — an animated hourglass replaces the video laptop.** The owner
  supplied a blank laptop and a "Times up!" sample and asked for an hourglass
  that keeps filling and rotating. It is drawn in SVG and animated in CSS
  (`components/ScreenLaptop.tsx`): the sand drains for 3.7 s, then the glass
  turns 180 degrees; the glass is symmetric, so the turned state equals the
  start and the 5 s loop has no jump. No third-party animation was used: a
  hand-drawn SVG matches the sample's look and needs no license or script.
  `laptop-video.png`, with its Spider-Man stand-in, is deleted.
- **2026-11-27 — scroll motion, hand-written.** The owner asked for a blurred
  fade reveal on everything and pinned scroll scenes. `ScrollFx.tsx` uses one
  IntersectionObserver and one rAF scroll handler; no animation library, per
  BRAIN.md. "Screen is on" starts as a full white screen with the title over
  the description, centred (owner's correction), and settles into the two
  columns; title lines slide one by one and the description blurs out and in,
  because wrapped text cannot morph. Pinning is wide screens only; phones and
  reduced motion keep the static layout until the owner's responsive pass.
- **2026-11-27 — pill order Full, Icon, Hidden; tray icon dropped.** The
  owner asked for the scroll to go "full, then icon, then pill, then hidden";
  read as Full, Icon, Hidden since the pill only has three modes. The tray
  icon on the desk art is removed and the pill moved right on the screen.
- **2026-11-27 — desk art replaced; install played on the laptop.** The owner
  found the desk mockup section weak and asked for the blank laptop with the
  pill animated on it, and for the install steps simulated card by card on the
  same laptop. `Laptop.tsx` is now the one laptop component; the step logic is
  shared in `lib/useScrollStep.ts`. `laptop-desk.png` is deleted.
- **2026-11-27 — sticky bleed fixed at the root.** The blue band is sticky, and
  its sticky box was `main`, so it kept painting over the FAQ and closing
  section. Problem, Showcase and DisplayModes now sit in one `.scenes` box, so
  the blue band releases when the scenes end.
- **2026-11-27 — laptops fit the screen.** Hero and closing laptops are sized
  from the viewport height so their bases stay visible (closing laptop sits on
  the footer line), and the header moved from 68px to 24px from the top.
- **2026-11-27 — active rows and rounded screens.** Owner: the focused install
  card is brand blue with white text; the focused pill-mode row is pure white
  with dark text. The laptop PNG's screen has square corners, so the live
  screen paints the bezel's black over it and rounds its own corners
  (`.laptop-ui > *`, 1.1cqw). Hidden mode shows a graphic centred on the
  screen; the Serion mark in a soft halo stands in until the owner's image.
- **2026-11-27 — Hidden shows a video card.** The owner supplied the Figma
  frame and card (`site/public/hidden-movie.png`): a film poster with a play
  button, centred at ~89% of the screen width on a plain white screen. The
  poster is studio artwork and must be replaced before the site is published.
- **2026-11-27 — the dashboard is drawn, not a screenshot.** Owner asked for
  the showcase dashboard as a component with animated bars.
  `DashboardMock.tsx` redraws it with the capture's figures and the app's
  dark tokens (from `src/Dashboard.css`), sized in cqw so it scales like the
  image; bars grow when the card's reveal fires. `site/public/dashboard.png`
  is deleted (the README's `docs/dashboard.png` is separate and stays).
- **2026-11-27 — closing laptop runs over the footer.** Owner wanted the
  laptop's base to cover the footer, not sit on its line: `.cta-device` now
  ends 85px below the section (the footer's height) and the section is sized
  so the whole laptop fits the screen at the page end.
- **2026-11-27 — orbs drift.** Owner asked for a subtle float on the rounded
  elements. The orbs and glows loop a 10-14px drift on `transform` (the reveal
  uses `translate`, layout uses top/left, so nothing fights); the hero's
  bottom-left orb only sways sideways because its flat cut edge sits on the
  band line. Reduced motion stops it.
- **2026-11-27 — drift rebuilt for smoothness.** Owner: the drift looked
  choppy. Causes: three keyframes with ease-in-out stopped the motion at every
  point, and revealed art kept `filter: blur(0)`, which makes the browser
  repaint the moving image each frame. Per the owner ("make it randomized") each `[data-drift]` piece now
  runs two CSS sines, x on `translate` and y on `transform`, with random
  reach, periods and phase set once per load by `ScrollFx.tsx`: a path that
  never visibly repeats. A per-frame rAF version was tried first and
  stuttered on the main thread; CSS animations run on the compositor. A
  finished reveal sets `filter: none`. Found
  on the way: the hero's top-left glow never revealed, because only a sliver
  is on screen and the observer wanted 12%; the threshold is now 0.
- **2026-11-27 — orb peek and closing spacing.** The owner saw the top-right
  hero orb as squashed: after the header and laptop moved up, only a sliver
  showed between them. The hero laptop now leaves 182px above it (header plus
  the comp's 85px peek). The closing copy was "too spacious": gaps tightened
  (14px and 24px) and its button is 56px tall.
- **2026-11-27 — closing pill and button.** Owner: the Take a Break pill is
  brand blue (was dark) and is kept ~30px inside the viewport, since the
  laptop bleeds off the left edge and clipped it. The closing Download button
  starts dark; 1.5 s after its copy is revealed a light sweeps across it and
  it stays brand blue (CSS, `forwards`). Without the reveal effect it is blue
  from the start.
- **2026-11-27 — end-of-page focus.** Owner: on reaching the bottom, only the
  laptop's Take a Break pill stays sharp and the rest blurs, then returns to
  focus after 1 s. `ScrollFx.tsx` adds `.end-focus` to <html> for 1 s when
  the page bottom is reached (re-arms after scrolling 200px away); the blur
  sits on the FAQ, closing art, copy, laptop image and footer, never on an
  ancestor of the pill. Reduced motion skips it.
- **2026-11-27 — the site is live; About and metadata point at it.** The
  owner deployed the landing site to https://serion-here.vercel.app. The
  repo's About homepage was an old preview URL (`site-snowy-alpha-39`), so it
  was set to the live one through the REST API; description and topics stay
  as they were. `metadataBase` fell back to `serion.pages.dev`, a host that
  was never used, so social cards would have pointed nowhere; the fallback is
  now the live URL, and `NEXT_PUBLIC_SITE_URL` still overrides it.
- **2026-11-27 — Serion updates itself (1.3.0).** The owner found that
  sending testers back to GitHub for every release is painful, and approved
  an in-app updater. `tauri-plugin-updater` reads `latest.json` from the
  latest GitHub Release; no update server to run. The prompt is a one-click
  banner in the dashboard (checked on open and every 6 hours), not a silent
  install, so nobody's app restarts under them. Skipped on purpose: a nudge
  while the dashboard is closed, silent installs, beta channel, skip-version.
- **2026-11-27 — save in `on_before_exit`, not on exit.** Reading the plugin
  source showed that on Windows it calls `std::process::exit(0)` right after
  starting the installer, so Serion's `RunEvent::Exit` save would be skipped
  and the minutes since the last 10 s save lost. `install_update` builds its
  own updater with an `on_before_exit` hook that saves today first.
- **2026-11-27 — the owner makes the signing key.** The updater key's
  password is the owner's secret, so the owner ran `tauri signer generate`
  in their own terminal; the agent only reads the public key. It lives in
  `%USERPROFILE%\.tauri\`, outside the repo.
- **2026-11-27 — responsive pass: three fixes found by testing.** At every
  stacked width the problem title's first line stayed right-aligned (`.t-line`
  kept `margin-left: auto`); it is now left. Between 1101 and 1360px the hero
  laptop pushed its hourglass off the right edge; its `left` is now capped so
  the screen's centre stays 140px inside. On stacked tablets the display and
  install laptops go first and stick under the header, so the screen being
  played stays in view while the rows step.
- **2026-11-27 — phones follow the owner's sketch, phones only.** The owner
  drew the phone layout and chose 720px and below; tablets keep the full
  mockups. Hero: laptop over the copy, full width, no crop. Showcase: only
  the dashboard's bar chart, re-sized in cqw so it reads at phone width.
  Display modes: the laptop at hero size above the copy, cycling Full, Icon,
  Hidden every 2.5 s, with the cards highlighting in step (owner's choice);
  `useScrollStep` takes an optional media query for this. Install: no laptop,
  the scroll highlight stays (owner's choice). Closing: no laptop, orb and
  glow shown, and the end-of-page blur is skipped since its sharp pill is
  gone.
- **2026-11-27 — the closing blur moves to the closing section and leads a
  sequence.** Owner: the end-of-page blur should fire on reaching the last
  section, since the footer follows right after. On wide screens (721px up)
  it now fires once the closing section is fully on screen (re-arms when it
  has left): everything but the Take a Break pill blurs for 1 s, then the
  closing copy reveals (held back from the normal observer until then), the
  button shimmers 0.5 s after the reveal and turns blue 0.5 s after that.
- **2026-11-27 — phones get the plain reveal only.** Owner: on small screens
  strip every extra. At 720px and below the orbs stop drifting, the closing
  blur never fires and the closing button is blue from the start with no
  shimmer. The display-modes auto-cycle stays: it is the content the owner
  asked for, not decoration.
- **2026-11-27 — the updater was tested with a fake older build.** A 1.2.9
  copy was built with `--config` pointing the endpoint at
  `http://127.0.0.1:8765/latest.json` (`dangerousInsecureTransportProtocol`,
  test build only) and installed through a `.cmd` opened by Explorer, so the
  install ran outside Claude's MSIX sandbox. Clicking the banner over CDP
  downloaded the owner-signed 1.3.0, exited, installed and relaunched it as
  1.3.0 with today's 6h 55m intact. The owner ran the signed build, so the
  key password never passed through the agent.
- **2026-11-28 — 1.3.0 published; the site download moved with it.** Tag
  `v1.3.0` sits on `acfdd2d`, the commit the installer was built from (later
  commits touch only the site and docs). The owner pushed the tag, because
  the agent's shell could not reach the GitHub login; the release and its
  three assets went up through the REST API. The site still offered 1.2.1,
  which has no updater, so every new visitor would have been stranded:
  `site/lib/site.ts` now names 1.3.0 (2.4 MB, 2547811 bytes).
