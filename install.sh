#!/usr/bin/env bash
# Builds ChronoFS from source and installs `chronofs` onto your PATH.
#
#   curl -fsSL https://raw.githubusercontent.com/ChirayuSahu/chrono-fs/main/install.sh | bash
#
# PREFIX sets the install root (default /usr/local, so the binary lands in /usr/local/bin):
#   curl -fsSL https://raw.githubusercontent.com/ChirayuSahu/chrono-fs/main/install.sh \
#       | PREFIX="$HOME/.local" bash
set -euo pipefail

TARBALL=${TARBALL:-https://github.com/ChirayuSahu/chrono-fs/archive/refs/heads/main.tar.gz}
PREFIX=${PREFIX:-/usr/local}
BIN_DIR="$PREFIX/bin"

say() { printf '\033[1m==>\033[0m %s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

[ "$(uname -s)" = Linux ] \
    || die "ChronoFS needs a Linux kernel; on macOS or Windows use scripts/dev.sh (Docker)"

command -v cc >/dev/null || command -v gcc >/dev/null || die "no C compiler found"
command -v make >/dev/null || die "make not found"
command -v pkg-config >/dev/null || die "pkg-config not found"
pkg-config --exists fuse3 || die "libfuse3 development files not found
  Debian/Ubuntu: sudo apt install libfuse3-dev fuse3 pkg-config build-essential
  Fedora:        sudo dnf install fuse3-devel pkg-config gcc make"

src=$(mktemp -d)
trap 'rm -rf "$src"' EXIT

say "downloading source"
curl -fsSL "$TARBALL" | tar -xz -C "$src" --strip-components=1

say "building"
make -C "$src" -s

say "installing to $BIN_DIR/chronofs"
sudo=""
if ! mkdir -p "$BIN_DIR" 2>/dev/null || [ ! -w "$BIN_DIR" ]; then
    command -v sudo >/dev/null \
        || die "$BIN_DIR is not writable and sudo is missing; rerun with PREFIX=<writable dir>"
    sudo=sudo
fi
$sudo install -m 755 "$src/chronofs" "$BIN_DIR/chronofs"

case ":$PATH:" in
    *":$BIN_DIR:"*) ;;
    *) printf 'note: %s is not on your PATH; add it to call `chronofs` without a path\n' "$BIN_DIR" ;;
esac

say "installed $("$BIN_DIR/chronofs" --version)"
