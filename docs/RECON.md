# Recon — website redesign

## What exists

- `landing/` — React 19 + Vite 8 + Tailwind 4, all styling hand-written in
  `src/index.css` (385 lines) with class names like `.rail`, `.spec`, `.edge`.
- Entry: `src/main.tsx` → `App.tsx` → `Masthead`, `Hero`, six `Section`s
  (`Storage`, `Pipeline`, `Nomenclature`, `Console`, `Edges`, `Boot`), `Footer`.
- Interaction: `TimeRail` (pointer drag + arrow keys, 5 records), `useLenis` smooth
  scroll with anchor interception, `useScrollReveal` (IntersectionObserver).
- `docs/index.html` is an untracked, hand-written copy of the page. Out of scope.
- Committed starting point: film-archive foundation (`5538f3a`) — tokens, fonts,
  masthead, section spine and footer already restyled.

## Risks

- The custom fonts were never loaded before this redesign; only the new
  `index.html` link makes them real, so every size was tuned against fallbacks.
- `index.css` uses `color-mix()` and `text-wrap: balance`; both are fine in the
  Chromium used for verification.
- Section work is CSS-heavy; component markup must stay unchanged where possible
  so keyboard and aria behaviour does not regress.
- No test runner exists for the landing page. Verification = `tsc --noEmit`,
  `vite build`, Playwright screenshots at 360/768/1440 and a contrast check.
