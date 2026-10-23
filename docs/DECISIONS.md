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
