# ChronoFS — a time-travel filesystem in C (FUSE)

ChronoFS is a userspace filesystem that **versions every write**. It mounts like a normal
directory, but the past is always one path away:

```bash
ls -t  mnt/.snapshots/2min-ago/
cat    mnt/.snapshots/@19:53:12/notes.txt
cp -r  mnt/.snapshots/before-disaster/src  mnt/
```

It's built on [libfuse 3](https://github.com/libfuse/libfuse) and uses a content-addressed
block store with deduplication, an append-only journal, an LRU block cache, and
mark-and-sweep garbage collection. Everything is plain C with no dependencies beyond libfuse.

## Quick start

FUSE needs a Linux kernel. On macOS (or Windows), the provided Docker container gives you one.

```bash
./scripts/dev.sh            # opens a Linux shell with FUSE enabled, repo at /src
make                        # builds ./chronofs
./scripts/demo.sh           # scripted end-to-end demo (add --pause to step through)
```

On a Linux machine, skip Docker and install `libfuse3-dev fuse3 pkg-config build-essential`, then run `make`.

## Using it

```bash
mkdir -p /tmp/store /tmp/mnt
./chronofs mount /tmp/store /tmp/mnt      # -f to stay in the foreground, -d for FUSE debug

cd /tmp/mnt
echo "v1" > notes.txt
sleep 60
echo "v2" > notes.txt

cat .snapshots/1min-ago/notes.txt         # -> v1
ls -lt .snapshots/                        # every moment something changed
cat .chronofs/stats                       # live cache / version statistics

./chronofs umount /tmp/mnt
```

### Naming a point in time

Anywhere a time is accepted (`.snapshots/<WHEN>/` or `--at <WHEN>`):

| Form | Example | Meaning |
|---|---|---|
| relative | `30s-ago`, `2min-ago`, `1h30min-ago`, `1d-ago` | that long before now |
| clock time | `@19:53:12`, `@19:53` | today, local time (end of that second/minute) |
| date + time | `@2026-10-05T19:53:12` | absolute local time |
| epoch | `@1759674000` | Unix seconds |
| tag | `before-disaster` | a moment named with `chronofs tag` |
| `now` | `now` | the current state, read-only |

### Commands

| Command | What it does |
|---|---|
| `chronofs mount <store> <mnt> [-f] [-d] [--cache-blocks N]` | mount; history appears under `<mnt>/.snapshots/` |
| `chronofs umount <mnt>` | unmount |
| `chronofs log <store> [path] [-n N]` | version history (writes, deletes, mkdirs) |
| `chronofs ls <store> [dir] --at WHEN` | list a directory as it was, without mounting |
| `chronofs cat <store> <path> --at WHEN` | print a file as it was |
| `chronofs restore <store> <path> --at WHEN [-o dest]` | restore a file or a whole directory. If the store is mounted, the restore goes through the mount, so it becomes a new version too |
| `chronofs tag <store> [name] [--at WHEN]` | name a moment, or list tags |
| `chronofs stats <store>` | versions, blocks on disk, dedup ratio |
| `chronofs gc <store> --keep 1h [--dry-run]` | drop history older than 1h and free unreferenced blocks (store must be unmounted) |

## How it works

```
 user process ──syscall──▶ Linux VFS ──▶ fuse.ko ──/dev/fuse──▶ chronofs daemon (libfuse, multithreaded)
                                                                  │
                         normal paths ─ passthrough ──────────────┼──▶ <store>/current/
                         on close/fsync of a written file ────────┼──▶ split into 4 KiB blocks
                                                                  │      SHA-256 each → objects/ab/cd…  (stored once)
                                                                  │      block list → manifests/…       (index block)
                                                                  │      append record → journal.log
                         .snapshots/<WHEN>/path ──────────────────┴──▶ index lookup at time T
                                                                         → manifest → blocks (via LRU cache)
```

- **Store layout:** `current/` holds live files, `objects/` holds deduplicated data blocks,
  `manifests/` holds per-version block lists, and `journal.log` is an append-only array of
  fixed-size 1096-byte records.
- **When versions are taken:** at `close()`, i.e. `flush`, after the file was written. Also on `fsync()`, and after
  `truncate`, `chmod` and `utime`. Versioning each write session rather than each `write()` syscall
  keeps a 1 MB `cp`, which is ~8 kernel write requests, from becoming 8 versions.
- **Deletes and renames** are journaled too: deletes as tombstones, and renames as "new path, same
  manifest", so a rename copies no data. Past snapshots therefore still show deleted and moved files.
- **The in-memory index** is a hash table from each path to its versions sorted by time. A lookup at time T is
  a hash lookup plus a binary search. A `pthread_rwlock_t` protects it, because libfuse
  serves requests from several threads.
- **Crash safety:** objects are written to a temp file and then `rename()`d. Each journal record is a single
  `O_APPEND` `write()`. On mount, the journal is reconciled with `current/` (anything changed while
  unmounted gets recorded, which works like a tiny fsck).
- **One daemon per store**, enforced with `flock()`. `gc` refuses to run while the store is mounted.

## Source map

| File | Purpose |
|---|---|
| `src/main.c` | CLI entry point and the `mount`/`umount` subcommands |
| `src/fs.c` | all FUSE callbacks, the `.snapshots/` and `.chronofs/` virtual trees, mount-time reconcile |
| `src/journal.c` | journal file, path→versions hash index, store open/close |
| `src/blockstore.c` | block and manifest storage, file snapshotting, reading old versions |
| `src/lru.c` | LRU cache of 4 KiB blocks (hash map + doubly linked list) |
| `src/timeparse.c` | `2min-ago` / `@19:53:12` / tag parsing, formatting helpers |
| `src/gc.c` | retention plus mark-and-sweep garbage collection |
| `src/cmd.c` | `log`, `ls`, `cat`, `restore`, `tag`, `stats` |
| `src/sha256.c` | self-contained SHA-256 |

## Limitations

- Symlinks are passed through but not versioned. Hard links aren't supported.
- A version is the file's content at close/fsync. A long-running writer that never closes or fsyncs the file
  produces no intermediate versions.
- Each snapshot rehashes the whole file (only *new* blocks are written). Insert-in-the-middle
  edits shift every later block, so fixed-size blocks dedup them poorly (content-defined chunking would fix this).
- A snapshot directory listing scans every tracked path, which is O(paths). That's fine for project-sized trees.
