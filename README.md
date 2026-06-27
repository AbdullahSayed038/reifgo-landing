# REIFGO — Marketing Site

Multi-page marketing site for REIFGO (institutional-grade PropTech), built
1:1 from the Figma design. Vite + React + React Router, plain CSS.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
```

## Pages & routing

- `/` → **Home** (`src/pages/Home.jsx`)
- `/services` → **Services** (`src/pages/Services.jsx`)
- `/advisor` → **AI Chat dashboard** (`src/pages/Advisor.jsx`)

`src/App.jsx` defines the routes and resets scroll on navigation. The marketing
`Header` is prop-driven (`active`, `cta`, `variant`) so Home and Services share
it with their own active item, CTA, and size. The Advisor dashboard is a
self-contained app shell (its own header/sidebar/rail/footer). Each page has the
footer that matches its Figma (`Footer` = cities, `ServicesFooter` = newsletter,
`AdvisorFooter` = legal bar).

## How it's organised

- One component per section: `src/components/<Section>.jsx` + matching `.css`,
  every file under 300 lines.
- **One sizing language** — `src/styles/tokens.css` sets the root font-size to
  `clamp(6px, 1.25vw, 16px)` and expresses every other token in `rem`. So the
  whole site is pixel-exact to Figma at 1280px and **scales uniformly** (a true
  proportional zoom — no reflow) as the viewport shrinks, down to a legible
  floor. `src/styles/base.css` holds the shared primitives (`.container`,
  `.section`, `.eyebrow`, `.btn` / `.btn--lg`, `.heading`, reveal animation).
- Icons are inline SVGs in `src/components/Icon.jsx` (thin 1.5 stroke,
  `currentColor`) — swap any for exact assets by editing the `PATHS` map.
- Scroll-reveal is one shared `IntersectionObserver` (`src/lib/reveal.js`)
  driving `[data-reveal]`; it respects `prefers-reduced-motion`.

## Sections

- **Home:** Header · Hero · About · Services · REIFGO AI · For Investors /
  For Developers · Global Forum · Research & Insights · Final CTA · Footer
- **Services:** Header · Hero (image bg) · The Digital Nexus (app) · Strategic
  Engagements (dark) · Executive Advisory · CTA · Newsletter footer
- **AI Chat dashboard:** top bar · left workspace nav · center chat (message
  thread, property card, prompt bar + chips) · right market rail (Market Pulse,
  advisor recommendation, market report) · legal footer bar

## Notes on fidelity

- Fonts match the Figma: **Manrope** (headings) + **Inter** (body) via Google
  Fonts.
- Photos were exported from Figma into `public/` (`hero-towers`,
  `developer-building`, `forum-stage`, `services-hero`, `app-screen`,
  `advisory-meeting`, `engagements-bg`, `marina-sands`, `market-report`,
  `advisor-avatar`).
- Palette `#00556c` / `#b4cbcc` / `#40484c` / `#70787d`, plus the Services
  page's near-black headings (`#001f29`, `#1b1c1c`). The hero grid and a couple
  of placeholder gradients are light interpretations of flat fills; everything
  else mirrors the Figma tokens, spacing, and placement.
```
