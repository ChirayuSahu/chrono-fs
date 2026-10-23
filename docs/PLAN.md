# Plan — website redesign (film archive)

Direction chosen by the owner: **film archive**, full restyle, keep copy and the
TimeRail interaction. Exact decisions:

1. **Foundation** (done, `5538f3a`) — ink `#0c0b09`, bone `#f5eddd`, amber `#f3a940`,
   cue red `#d45f47` (lightened from `#c9503a` to clear AA), paper `#efe6d3`; Fraunces
   300–600, IBM Plex Sans, JetBrains Mono; radii 2/4/6px; 8px spacing scale; grain,
   safelight vignette, gate crop marks.
2. **Hero** — Fraunces title (italic amber on the emphasised word), mono eyebrow with
   rule, square buttons (primary amber, ghost hairline), catalog card replacing the
   spec plate: mono rows plus a copyable install line (`CopyCommand`, clipboard with a
   visible "copied" state and a failure message).
3. **TimeRail** — the signature: sprocket perforations top and bottom, numbered frames
   (01–05) as square ticks, red cue-mark playhead, timecode clock, three readout panes
   titled as journal / state / preview. Drag, arrow keys, Home/End and aria-slider
   semantics stay exactly as they are.
4. **Sections 01–03** — storage facts as a catalog ledger; pipeline as a frame sequence
   on a strip; nomenclature on the single paper band (`.section--paper` remaps tokens,
   AA contrast on `#efe6d3`).
5. **Sections 04–06** — console as a man page with amber verbs; edges as cue-annotated
   cards on red hairlines; boot as two slates (setup / mount) with the curl installer
   first.
6. **Hardening** — 360/768/1440 screenshots, no horizontal overflow, no console errors,
   `prefers-reduced-motion` honoured, focus rings visible, AA contrast checked,
   `tsc --noEmit` + `vite build` clean.
7. **Docs** — README landing section, `docs/DECISIONS.md` updated, no blocked work.
