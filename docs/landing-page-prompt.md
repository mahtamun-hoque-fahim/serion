# Serion landing page — prompt pack for Google Stitch

Three messages, in order. Paste 1 first, then 2, then 3. If Stitch accepts the
whole thing at once, 1 + 2 + 3 concatenated also works.

---

## 1 — Master prompt

Design a one-page landing site for **Serion**, a free, open-source Windows app
that shows how long someone has actually used their computer today. The
visitor has one job to do here: install it. Every section should make that
decision easier, not more impressive-sounding.

**Who is reading.** Students, freelancers, developers and office workers who
suspect their day disappears into the screen. They are not shopping for
analytics or a "productivity system". They want an honest number and a tool
that stays quiet.

**Voice.** Plain, warm, confident, second person. Concrete numbers instead of
adjectives. No engineering jargon (no "Tauri", "Rust", "webview", "AES",
"telemetry pipeline"). No emoji. No superlatives. Never invent testimonials,
user counts, company logos, awards or statistics — there are none, and inventing
one is a failure of the brief.

**Visual direction.** Calm, modern, minimal — the restraint of Linear, the
product-on-a-quiet-grid hero of Raycast, the type discipline of Vercel, the
friendliness of Things 3, and the system calm of Windows 11 Settings. One page,
white ground, generous space, dark product screenshots as the only heavy
elements, brand blue used like a punctuation mark rather than a paint bucket.

### Tokens

- Ground `#FFFFFF`; soft surface `#F5F6F8`; dark band `#0B0C0E`.
- Ink `#0B0C0E`; muted `#5A616F`; hairline `#E7E9ED`.
- Brand `#0047FF`; brand tint `#E8EEFF`; emerald accent `#047857` (counting
  states only); warning red `#E11D48` (only the Windows warning note).
- Type: headings Google Sans 700 (fallback Inter 700), tight tracking
  (`-0.02em`), line-height 1.05; body Inter 400, 17px/1.65 desktop, 16px/1.6
  mobile; small text 14px muted.
- Layout: 1120px container, 40px desktop gutters, 24px mobile. Section padding
  112px desktop, 64px mobile. 12-column grid, 24px gutters.
- Radius: buttons and chips 999px, cards 20px, inner cards 16px, icon tiles 8px.
- One shadow only: `0 12px 32px rgba(11,12,14,0.08)`.
- Buttons: 48px tall, brand fill, white label, 15px/600, arrow icon that slides
  2px on hover; secondary is text-only with an underline on hover.
- Header: sticky, 64px, white at 85% with 12px backdrop blur, 1px hairline
  underneath, wordmark left, four anchor links centred-right, download button
  far right.

Headings must read as one idea per line. Do not put an eyebrow label above every
section; use at most two in the whole page. Do not use gradient backgrounds,
glowing orbs, glassmorphism, purple, 3D renders, stock photography, avatars,
company logos, fake dashboards, a newsletter form, a cookie banner or a chat
widget.

### Page order

1. Sticky header
2. Hero with the real product shot
3. "Your screen is on longer than you are" — one short paragraph, no card
4. "It counts you, not the machine" — three icon cards
5. "Small tool. Whole day." — six feature cards
6. Dark band: "There when you look. Gone when you don't." — three display modes
7. Dashboard showcase — screenshot left, copy right
8. Privacy — four short points
9. Install — three numbered steps, second download button
10. FAQ — six questions
11. Final call to action
12. Footer

Download points (repeat the same action, never a second competing one): header,
hero, install step one, final CTA.

---

## 2 — Copy deck (use verbatim)

**Header**
Wordmark: Serion
Links: How it counts · What you get · Privacy · Install
Button: Download for Windows

**Hero**
Headline: See how long you actually used your computer today.
Subhead: Serion is a small pill at the top of your screen. It counts the minutes
you are really using your computer, and it stops counting the moment you walk
away.
Primary button: Download for Windows
Secondary link: See how it counts
Micro line: v1.2.1 · 1.6 MB installer · Windows 10 and 11, 64-bit · Free and
open source
Product shot: the real pill and open per-app panel, floating above a quiet dot
grid (see prompt 3).

**Section 3 — the problem**
Heading: Your screen is on longer than you are.
Body: A computer counts from the moment you log in until you shut down. That
number is easy to look at and hard to trust. Serion counts the time you are
actually there, and takes back the minutes you spent away.

**Section 4 — how it counts**
Heading: It counts you, not the machine.
Card 1 — icon: eye
Title: While you work
Body: An eye sits in the pill while Serion is counting. It is the only thing the
app ever asks of your attention.
Card 2 — icon: moon
Title: When you step away
Body: Five quiet minutes and it stops counting, then subtracts those five from
the total. A lunch break never becomes screen time.
Card 3 — icon: hand
Title: When nothing is open
Body: A locked screen or an empty desktop is not time used, so Serion waits for
you to come back.
Footnote under the row: Video and calls still count while the screen stays awake
— you asked the screen to keep going.

**Section 5 — features**
Heading: Small tool. Whole day.
Card 1 — icon: chart
Title: Today, per app
Body: Click the pill to see which apps took the hours.
Card 2 — icon: calendar
Title: A week, or a month
Body: Seven and thirty days of history, with your daily average and your
most-used app.
Card 3 — icon: timer
Title: Timers that end the day on purpose
Body: Set a daily limit or a countdown. When it runs out, the pill flashes red
and a soft chime plays.
Card 4 — icon: droplet
Title: Breaks you can ignore
Body: Water, a stretch, a look out the window. Serion offers them from the pill;
skipping is one click.
Card 5 — icon: book-open
Title: Reading mode
Body: On a long page, it waits twenty minutes before it calls you idle.
Card 6 — icon: palette
Title: Yours to shape
Body: Six colors, a light or dark dashboard, a small or large pill, and you can
drag it wherever you like.

**Section 6 — dark band**
Heading: There when you look. Gone when you don't.
Body: Serion starts hidden. It counts from the tray by the clock and never
covers your work.
Chip 1 — Hidden: Nothing on screen. Open the dashboard from the tray.
Chip 2 — Icon: Just the mark and today's time, when you want the nudge.
Chip 3 — Full: The whole pill, with today's total.
Note: It also steps aside during fullscreen video and games, and stays out of
screen recordings and screenshots if you ask it to.

**Section 7 — dashboard**
Heading: Where the hours actually went.
Body: Seven days at a glance, thirty when you need the bigger picture. A bar for
each day, your top apps in order, and your average for the week.
Bullet 1: Today, your average and your most-used app, at the top.
Bullet 2: One bar per day. Hover for the exact number.
Bullet 3: Apps ranked by time, not by how often you opened them.
Image: the real dashboard screenshot, dark, in a plain dark card without browser
chrome.

**Section 8 — privacy**
Heading: Your day stays on your PC.
Body: No account. No cloud. Nothing leaves this computer.
Point 1: Stored locally, in your own Windows profile.
Point 2: Encrypted on disk, so the files read as noise.
Point 3: No sign-in, no sync, no analytics.
Point 4: Choose how long history is kept, and export a backup whenever you like.
Link line: Open source under the MIT license — you can read the code that
touches your data.

**Section 9 — install**
Heading: Two minutes, then it gets out of the way.
Step 01 — Download the installer
Body: Serion_1.2.1_x64-setup.exe, 1.6 MB, from GitHub.
Step 02 — Run it
Body: Windows will warn that the installer is not signed yet. Click More info,
then Run anyway. That is the normal path for a small open-source app.
Step 03 — Choose how visible you want it
Body: Serion starts in the tray by the clock. Click the tray icon, then pick
Hidden, Icon or Full under Pill. Turn on Start at login if you want it every day.
Button: Download for Windows
Secondary link: Latest release on GitHub
Small note: Uninstall from Windows Settings. Your history is kept unless you tick
the box to delete it.

**Section 10 — FAQ**
Q: Is it really free?
A: Yes. It is MIT licensed. No account, no trial, no upsell.
Q: Which Windows versions?
A: Windows 10 and 11, 64-bit. There is no Mac version yet.
Q: Will it slow my computer down?
A: It records which window is in front and for how long. There is no video
capture, no keystroke logging and no background indexing, so there is almost
nothing to use your processor for.
Q: Does it see what I type or what is on my screen?
A: No. Serion stores app names and durations. Nothing else.
Q: Why does Windows warn about the installer?
A: The installer is not code-signed yet. Click More info, then Run anyway, or
build it yourself from the public source.
Q: Can I keep it out of my recordings?
A: Yes. Turn on Hide Serion from recordings and it disappears from OBS, screen
sharing and screenshots, while you still see it on your own screen.

**Section 11 — final CTA**
Heading: Start with today.
Body: Install Serion and look at the real number tonight. Two minutes to set up,
and it will not interrupt your work.
Button: Download for Windows
Micro line: Free · Open source · Windows 10 and 11

**Footer**
Left: Serion — Screen time, counted honestly.
Links: GitHub · Releases · Changelog · License (MIT)
Right: Built for Windows 10 and 11. Never sends your data anywhere.

---

## 3 — Graphics brief

**Slot A — hero product shot (the most important image on the page).**
Composition, not decoration: the real Serion pill and its open per-app panel,
stacked with a 24px gap, floating over a `#F4F5F7` ground with a 24px dot grid
at 6% opacity. The pill is a dark capsule with a white eye icon, the time "51m"
in white, and two circular buttons either side. The panel below is a dark
rounded card, 20px radius, with a small "TODAY" label and five app rows.
Use the real screenshots — do not redraw or restyle them, and do not put them
inside a browser window. If images cannot be imported, lay out a labelled
placeholder frame with a 4:3 ratio and the note
"replace with docs/pill.png + docs/dashboard.png".
The shot should overlap the hero's bottom edge slightly so the next section
starts behind it.

**Slot B — dashboard showcase.**
The real dashboard screenshot at 16:10, inside a plain `#0B0C0E` card with a
1px `rgba(255,255,255,0.08)` border and the one allowed shadow. No tilt, no
perspective, no browser chrome, no fake cursor.

**Icons.** One family only: Lucide, 24px, 1.75px stroke, `currentColor`, inside
nothing (no circles, no tiles) or inside an 8px tile with `#E8EEFF`. Required:
eye, moon, hand, chart-bar, calendar, timer, droplet, book-open, palette, lock,
download, arrow-right, chevron-down, monitor, check.

**Ambience.** Exactly one soft brand-blue radial highlight behind the hero
(`#0047FF` at 6% opacity, 900px wide) and one 1px dotted rule between the
install section and the FAQ. Nothing else: no blobs, no mesh gradients, no
floating shapes.

**Install illustration (optional, only if it does not add clutter).** A flat
mock of the Windows warning dialog, 320px wide, white card, small shield glyph,
text "Windows protected your PC", two buttons "More info" and "Don't run", with
a single thin arrow pointing at More info and the words "then Run anyway" beside
it. Monochrome plus brand blue. Never a photo of a real screen.

**Mobile.** Hero shot 320px wide, panel cropped at the bottom edge; three icon
cards stack; the dark band's three display modes stack as full-width rows;
install steps become a vertical list with the number left of the text.

---

## 4 — Deliverables

- Desktop frame, 1440px wide, all twelve sections in the order above.
- Mobile frame, 390px wide, same sections and copy.
- Two type sizes only for headlines on mobile: 36px and 28px.
- Every button labelled exactly "Download for Windows". No "Get started",
  "Try it free" or "Learn more" as a primary action.
- All copy above used verbatim. If a sentence must be shortened for space, cut
  the second half of the sentence, never the number.
