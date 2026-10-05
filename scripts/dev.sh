#!/usr/bin/env bash
# Opens a Linux shell (Docker) with FUSE enabled and this repo mounted at /src.
#
#   ./scripts/dev.sh            interactive shell
#   ./scripts/dev.sh make demo  run a command and exit
set -euo pipefail

cd "$(dirname "$0")/.."
IMAGE=chronofs-dev

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
    docker build -t "$IMAGE" .
fi

# Use the host's timezone so snapshot times match your clock.
TZ_NAME="${TZ:-}"
if [ -z "$TZ_NAME" ] && [ -L /etc/localtime ]; then
    TZ_NAME="$(readlink /etc/localtime | sed 's|.*/zoneinfo/||')"
fi

TTY_FLAGS=()
[ -t 0 ] && TTY_FLAGS=(-it)

exec docker run --rm ${TTY_FLAGS[@]+"${TTY_FLAGS[@]}"} \
    --device /dev/fuse \
    --cap-add SYS_ADMIN \
    --security-opt apparmor=unconfined \
    -e TZ="${TZ_NAME:-UTC}" \
    -v "$PWD":/src \
    -w /src \
    "$IMAGE" "${@:-bash}"
