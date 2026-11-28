# SITETREE — Serion landing page

Two public routes. No auth, no data, no API.

```
/
├── #top        hero, laptop art, download
├── #counts     screen-on is not time used
├── #features   the dashboard on blue
├── #display    Full / Icon / Hidden on the blank laptop (pinned scene)
├── #install    three steps, SmartScreen explained
├── #faq        six questions
└── final CTA → GitHub release asset
/privacy/      full privacy page: 13 parts, each with a Summary toggle
```

| Path | Type | Auth | Purpose |
|---|---|---|---|
| `/` | static page | none | Explain Serion, download the installer |
| `/privacy/` | static page | none | What the app and the site collect; linked from the header and footer |
| `/opengraph-image` | generated at build | none | 1200×630 social card |
| `/icon.svg` | static asset | none | Favicon |
| `/_not-found` | static page | none | 404 |

External destinations (all open in a new tab):

- `releases/latest/download/Serion_x64-setup.exe` — the only download, always the newest release.
- `releases/latest`, `releases`, `blob/main/CHANGELOG.md`,
  `blob/main/LICENSE`, `blob/main/CREDITS.md`, repository home.

Build output: `site/out/` (`index.html`, `404.html`, `opengraph-image`,
`icon.svg`, `_next/`, `pill.png`).

Art in `public/`: `hero-laptop.png` (hero, with the dashboard drawn over it), `laptop-blank.png` (the display and install scenes),
`cta-laptop.png` (closing), `orb-small.png`, `orb-large.png`, `glow-top-left.png`,
`glow-bottom-right.png`.
