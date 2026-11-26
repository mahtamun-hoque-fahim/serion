# SITETREE — Serion landing page

One public route. No auth, no data, no API.

```
/
├── #top        hero, real pill screenshot
├── #counts     how the counting works
├── #features   six things you get
├── #display    display modes on a drawn laptop (scroll-driven)
├── #privacy    where the data lives
├── #install    three steps, SmartScreen explained
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
