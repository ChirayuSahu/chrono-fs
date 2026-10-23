# Decisions

- **Installed command is `chronofs`** (the existing binary name), not `chrono-fs`. Every
  README command already uses `chronofs`; no rename, no symlink.
- **The installer builds from source.** The repo has no tagged releases or prebuilt
  binaries, so `install.sh` downloads the `main` tarball, runs `make`, and installs the
  result. Once releases exist, the script can prefer a prebuilt binary.
- **Default install root is `/usr/local`** (binary in `/usr/local/bin`), with `PREFIX`
  as the override. `sudo` is only used when that directory is not writable.
- **No prompts.** The script must work when piped into `bash`, so missing dependencies
  fail with the exact `apt`/`dnf` command instead of asking questions.
- **`landing/` is the website.** `docs/index.html` is an untracked, hand-written copy of
  the same page; it was updated too but left untracked for its owner to decide.
- **No blocked work.** Nothing in this change needs host-only commands.

## Website redesign

- **Only `landing/` was redesigned.** `docs/index.html` is an untracked static copy from
  before the React rewrite; it keeps the previous "phosphor terminal" design.
- **Copy and the TimeRail interaction are unchanged.** The drag, arrow keys, Home/End,
  slider roles and the five sample records are the ones that shipped before.
- **One accent, one state colour.** Amber `#f3a940` is the only accent; red `#d45f47` is
  used only for recording state and the rail playhead. Red was lightened from `#c9503a`
  because it measured 4.40:1 on ink, under AA for small text; it is now 5.18:1.
- **One inverted band.** The nomenclature section sits on paper (`#efe6d3`) with its own
  token remap; every other band stays ink so the page reads as one reel.
- **Fonts are loaded for real.** `index.html` now links Fraunces, IBM Plex Sans and
  JetBrains Mono. Before this, the CSS named display fonts that were never fetched.
- **No new runtime dependencies.** The copy button uses the Clipboard API with a visible
  "copy blocked" fallback; no toast library, no animation library added.
- **Verification is browser-based.** No test runner exists here: `tsc --noEmit`,
  `vite build`, Playwright at 360/768/1024/1440, a keyboard pass and a contrast check.
  No blocked work.
