# BRAIN — Serion landing page

The identity of the one-page site in `site/`. The app itself is described in
`../PROJECT.md`; this file never overrides it.

## The one-line truth

A single page that explains Serion in plain language and gets a Windows user to
download the installer from GitHub.

## Why it exists

The repository's README is written for someone who already understands the
project. A visitor arriving from a search, a post or a link needs the same facts
in the order a buyer asks them: what is this, why should I trust the number, what
do I get, where does my data go, how do I install it. The page is the answer to
that, and its only job is the download.

## What it must become

A calm, confident page that a person can read in two minutes and act on. It
should feel like the product: quiet, precise, and honest about limits (Windows
only, unsigned installer, no cloud). Success is a download, not applause.

## Core decisions (locked)

- [LOCKED] The site lives in this repository under `site/`, deployed from that
  folder. The screenshots and release facts are here; a second repo would drift.
- [LOCKED] Next.js 16 App Router with `output: "export"` — static files, no
  server, no adapter. Host is not chosen yet; any static host works.
- [LOCKED] Hand-written CSS with the tokens below. No Tailwind, no shadcn/ui, no
  animation library. One page does not need a component system.
- [LOCKED] One primary action only: **Download for Windows**, pointing at the
  versioned GitHub release asset. No "Get started", no trial, no pricing.
- [LOCKED] The dashboard is the real 2× capture
  (`site/public/dashboard.png`). The laptops are drawn in CSS; their screens are
  labelled placeholders until the owner supplies the final mockups, which drop
  into `.laptop-screen`.
- [LOCKED] The display-modes section is a laptop drawn in CSS (DOM + 3D
  transforms), not a photograph and not a WebGL scene. The three rows are
  buttons that switch the pill between Hidden / Icon / Full.
- [LOCKED] No emojis. Icons come from `lucide-react` only.
- [LOCKED] Section copy follows the 2026-11-27 comp, built on
  `docs/landing-page-prompt.md` § 2. It may be trimmed, never re-voiced, and no
  claim may be invented.

## What it must never become

- A second product site with pricing, testimonials, logos, awards, user counts
  or statistics. None of those exist.
- A "productivity system" pitch. Serion reports a number; it does not coach.
- A platform page. No Mac or Linux download, no "coming soon", no app-store
  badges.
- A template. No glassmorphism, purple, stock photography, fake dashboards or a
  newsletter form. Background atmosphere is the owner's supplied art; the CSS
  orbs are placeholders, not the final look.
- A second design system. The palette is the app's palette.

## Current state

Status: rebuilt to the 2026-11-27 comp, verified in headless Chrome at 390 / 768
/ 1024 / 1440 / 1920.
Last updated: 2026-11-27.
What works: the floating pill header; hero with a drawn laptop; the gray
"screen is on" band; the blue dashboard block; the dark display-modes band with
Hidden / Icon / Full buttons; the three install cards with the SmartScreen mock;
the dark FAQ; the closing laptop CTA and floating footer. Real dashboard
capture, branded 404, static export, OG card, metadata and JSON-LD.
What is open: the laptop screen art and the background graphics (placeholders
are in place); the domain and host; a look at the 1200×630 social card.
What is next in spirit: drop in the owner's mockups, publish, then keep the
version line and screenshots in step with each release
(`site/scripts/capture-app.mjs` re-shoots them).

## The stack (frozen)

Next.js 16.4 (App Router, static export) · React 19 · TypeScript · hand-written
CSS · `@fontsource/google-sans` + `@fontsource/inter` · `lucide-react` · Node 22+.
No database, no auth, no payments, no analytics, no server runtime.

## Constraints and non-negotiables

- Windows 10 and 11, 64-bit only. Never imply other platforms.
- The installer is unsigned: the SmartScreen warning is explained, not hidden.
- Version, file size and installer name come from `site/lib/site.ts` in one
  place. A release bump touches that file and nothing else.
- WCAG 2.2 AA: visible focus, landmarks, labelled sections, reduced motion.
- The page must read and work with JavaScript off, except the laptop's
  scroll choreography (the three modes are still described in text).
- Screenshots are 1× and must not be upscaled past their natural size.

## Context hooks

- The app's pill is 168×50 at Large; the display mock draws it at 150×44 in a
  16:10 screen. Keep the proportions (circle inset, gap) or it stops looking
  like the product.
- `serion.display` defaults to **Hidden**, and the tray is the default home.
  Copy that says "the pill at the top of your screen" is about the Full mode.
- `site/public/pill.png` is 548×840 at 2× and contains the pill plus its open
  panel. It is kept for future screen art; the current page does not use it.
- The dashboard screenshot is 1840×2120 at 2× (dark). It sits in a dark card
  with 12px padding, never in browser chrome.
- `next build` writes `out/`. `trailingSlash: true` is deliberate for static
  hosts.
- `metadataBase` falls back to `https://serion.pages.dev`; set
  `NEXT_PUBLIC_SITE_URL` when the real domain exists.

## Visual identity (locked)

THEME: Quiet Product — light, editorial, one blue accent.

- Ground `#FFFFFF`, soft `#F5F6F8`, dark band `#0B0C0E`.
- Ink `#0B0C0E`, muted `#5A616F`, hairline `#E7E9ED`.
- Brand `#0047FF`, tint `#E8EEFF`, emerald `#047857` (counting only), red
  `#E11D48` (warnings only).
- Headings Google Sans 700, tracking `-0.025em`; body Inter 400/500/600.
- Container 1180px; section padding 92–100px; cards 20px; buttons 999px; one
  shadow `0 12px 32px rgba(11,12,14,.08)`.
- Motion: spring `cubic-bezier(.34,1.56,.64,1)` for the pill, out
  `cubic-bezier(.22,1,.36,1)` for reveals; nothing loops except the tray pulse
  while Hidden.

## Features

- Always on: skip link, 404, focus-visible, print styles, landmarks, labelled
  navigation, reduced-motion support.
- Opt-in: none. No theme toggle (the page is light), no search, no newsletter,
  no cookie banner, no analytics, no chat.

## Tools in `scripts/`

- `shot.mjs <url> <w> <h> <out.png> [full|<scrollY>|offsets|eval:<js>]` —
  screenshots a page in headless Chrome over CDP, no dependencies. `full` walks
  the page first so lazy images load.
- `probe.mjs <url> <w> <h> <scrollY> <exprFile>` — runs an expression in the
  page and prints the value; how layout, overflow and state are measured.
- `capture-app.mjs` — re-shoots `docs/pill-blue@2x.png` and
  `docs/dashboard-blue@2x.png` from the running app (launch it with
  `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222`), then
  restores the owner's theme, size and display mode.
- `recapture-dashboard.mjs` — one-off: the dashboard at 920×1060 so no card is
  cut in half.
