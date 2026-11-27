# SITETREE — Serion landing page

One public route. No auth, no data, no API.

```
/
├── #top        hero, laptop art, download
├── #counts     screen-on is not time used
├── #features   the dashboard on blue
├── #display    Hidden / Icon / Full on the desk laptop art
├── #install    three steps, SmartScreen explained
├── #privacy    the privacy line inside the FAQ head
├── #faq        six questions
└── final CTA → GitHub release asset
```

| Path | Type | Auth | Purpose |
|---|---|---|---|
| `/` | static page | none | Explain Serion, download the installer |
| `/opengraph-image` | generated at build | none | 1200×630 social card |
| `/icon.svg` | static asset | none | Favicon |
| `/_not-found` | static page | none | 404 |

External destinations (all open in a new tab):

- `releases/download/v1.2.1/Serion_1.2.1_x64-setup.exe` — the only download.
- `releases/latest`, `releases`, `blob/main/CHANGELOG.md`,
  `blob/main/LICENSE`, `blob/main/CREDITS.md`, repository home.

Build output: `site/out/` (`index.html`, `404.html`, `opengraph-image`,
`icon.svg`, `_next/`, `pill.png`, `dashboard.png`).

Art in `public/`: `laptop-blank.png` (hero and closing, with the hourglass
screen from `components/ScreenLaptop.tsx`), `laptop-desk.png`
(display band), `orb-small.png`, `orb-large.png`, `glow-top-left.png`,
`glow-bottom-right.png`.
