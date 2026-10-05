#!/usr/bin/env bash
# ChronoFS end-to-end demo.
#
#   ./scripts/demo.sh            run straight through
#   ./scripts/demo.sh --pause    wait for Enter between steps (for presenting)
#
# On macOS this re-runs itself inside the Docker dev container.
set -euo pipefail

cd "$(dirname "$0")/.."
if [ "$(uname)" != "Linux" ]; then
    exec ./scripts/dev.sh ./scripts/demo.sh "$@"
fi

PAUSE=0
[ "${1:-}" = "--pause" ] && PAUSE=1

BIN="$PWD/chronofs"
export PATH="$PWD:$PATH"
BASE=/tmp/chronofs-demo
S=$BASE/store
M=$BASE/mnt

bold=$'\e[1m'; dim=$'\e[2m'; cyan=$'\e[36m'; green=$'\e[32m'; reset=$'\e[0m'

step() {
    echo
    echo "${bold}${cyan}== $* ${reset}"
    if [ "$PAUSE" = 1 ]; then read -r -p "${dim}(press Enter)${reset}" _; fi
}
run() {
    echo "${green}\$ $*${reset}"
    eval "$@"
}
cleanup() {
    fusermount3 -u "$M" 2>/dev/null || true
}
trap cleanup EXIT

[ -x "$BIN" ] || make -s
cleanup
rm -rf "$BASE"
mkdir -p "$S" "$M"

step "1. Mount a fresh ChronoFS store"
run chronofs mount $S $M
run "mount | grep chronofs"

step "2. Write a file three times, a few seconds apart"
cd "$M"
run "echo 'Draft 1: OS project ideas' > notes.txt"
T1=$(date +%H:%M:%S); sleep 2
run "echo 'Draft 2: FUSE time-travel filesystem' > notes.txt"
T2=$(date +%H:%M:%S); sleep 2
run "echo 'Draft 3: ChronoFS - final' > notes.txt"
run "mkdir -p src && echo 'int main(void) { return 0; }' > src/main.c"
sleep 1
run cat notes.txt

step "3. Every write became a version - the past is just a directory"
run "ls .snapshots/"
run "cat .snapshots/@$T1/notes.txt"
run "cat .snapshots/@$T2/notes.txt"
run "cat .snapshots/3s-ago/notes.txt"
run "diff .snapshots/@$T1/notes.txt notes.txt || true"

step "4. ls -t works on the past, sorted by the mtime each file had back then"
run "ls -lt .snapshots/now/"
run "ls -lt .snapshots/@$T1/"

step "5. Version history from the CLI"
run "chronofs log $S"
run "chronofs log $S notes.txt"

step "6. Name a moment, then make a disaster"
run "chronofs tag $S before-disaster"
sleep 1
run "rm -rf src notes.txt"
run "ls -la"
run "ls -R .snapshots/before-disaster/"

step "7. Undo the disaster"
run "cp -r .snapshots/before-disaster/src ."
run "chronofs restore $S notes.txt --at before-disaster"
run "ls -R; cat notes.txt"

step "8. History is read-only"
run "(echo hacked > .snapshots/before-disaster/notes.txt) 2>&1 || true"

step "9. Block-level deduplication: change 1 byte of a 2 MiB file"
run "head -c 2097152 /dev/urandom > data.bin"
run "chronofs stats $S | grep -E 'blocks|dedup'"
T3=$(date +%H:%M:%S); sleep 1.1
run "printf 'X' | dd of=data.bin bs=1 seek=1000000 conv=notrunc status=none"
run "chronofs stats $S | grep -E 'all versions|blocks|dedup'"
echo "${dim}(two 2 MiB versions, but only one new 4 KiB block was stored)${reset}"

step "10. LRU block cache for reading history"
run "for i in 1 2 3; do cat .snapshots/@$T3/data.bin > /dev/null; done"
run "cat .chronofs/stats"

step "11. Offline browsing without the mount"
run "chronofs ls $S --at @$T2"
run "chronofs cat $S notes.txt --at @$T1"

step "12. Unmount, then garbage-collect history older than 5 seconds"
cd /
run "chronofs umount $M"
sleep 1
run "chronofs stats $S | grep -E 'records|blocks'"
run "chronofs gc $S --keep 5s"
run "chronofs stats $S | grep -E 'records|blocks'"

echo
echo "${bold}Demo complete.${reset}  Store left at $S"
