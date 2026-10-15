# Report: Operating System Concepts in ChronoFS

**Project:** ChronoFS — a time-travel filesystem in C
**Language:** ASD-STE100 Simplified Technical English
**Date:** 15 October 2026

## 1. Purpose

This report shows the operating system concepts that ChronoFS uses.
This report also shows the source files that use each concept.
This report does not include the concepts that ChronoFS does not use.

## 2. What ChronoFS is

ChronoFS is a filesystem for Linux.
It runs in user space.
It uses the FUSE library (libfuse 3).
It keeps a copy of the data at each write.
The user can read an old copy at any time.
The source code is C. The source files are in the directory `src/`.

## 3. Concepts used

### 3.1 Linux shell commands and kernel monitoring

**Experiment 1.**

We use standard Linux commands to operate and to monitor the filesystem.

We use these commands:

- `mount` and `umount` to attach and to detach the filesystem.
- `ls -t` to show the snapshots in time order.
- `stat` to read the file data.
- `fusermount3` to unmount the filesystem.
- `ps` and `top` to monitor the daemon process.

**Where:**

- `src/main.c` — the `mount` and the `umount` subcommands.
- `scripts/demo.sh` — the demonstration steps.
- `docs/` — the report and the demonstration data.

### 3.2 Shell programming

**Experiment 2.**

We use shell scripts to build, to mount, and to demonstrate the project.

**Where:**

- `scripts/dev.sh` — starts a Linux shell with FUSE enabled.
- `scripts/demo.sh` — runs the full demonstration.

### 3.3 System calls

**Experiment 3.**

ChronoFS uses many Linux system calls.
Each FUSE callback in `src/fs.c` is a thin wrapper over these system calls.

We use these system calls:

- `open`, `read`, `write`, and `close` for file input and output.
- `pread` and `pwrite` for a read or a write at a given offset (a seek).
- `stat` and `lstat` to read the file data.
- `opendir` and `readdir` to read a directory.
- `mkdir` to make a directory.
- `rename` to rename a file.
- `unlink` to delete a file.
- `fsync` and `fdatasync` to write the data to the disk.
- `mkstemp` to make a temporary file.
- `fork` to make the daemon process. The FUSE library calls this function.
- `execlp` to start `fusermount3` for the unmount.

**Where:**

- `src/fs.c` — all FUSE callbacks.
- `src/blockstore.c` — the block read and the block write.
- `src/journal.c` — the journal file input and output.
- `src/cmd.c` — the `log`, `ls`, `cat`, `restore`, and `tag` commands.
- `src/main.c` — `fork` and `execlp`.

### 3.4 Inter-process communication

**Experiment 4.**

ChronoFS has two processes: the kernel and the daemon.
The kernel and the daemon exchange data over the `/dev/fuse` character device.
The command-line tool and the daemon share one state.
This state is the journal file.

**Where:**

- `src/journal.c` — the journal file.
- `src/main.c` — the advisory lock on the store.
- `src/fs.c` — the mount-time reconciliation.

### 3.5 Threads

**Experiment 5.**

ChronoFS uses the Pthread library.
The FUSE library serves the requests on a thread pool.
More than one thread can read and write the index at the same time.

We use these Pthread objects:

- `pthread_rwlock_t` to protect the store and the index.
- `pthread_mutex_t` to protect the LRU cache and the statistics.

**Where:**

- `src/journal.c` — the initialization of the read/write lock.
- `src/fs.c` — the read/write lock and the statistics mutex.
- `src/lru.c` — the cache mutex.

### 3.6 Process synchronization

**Experiment 8.**

ChronoFS must synchronize many threads and many processes.
ChronoFS uses locks for this task. ChronoFS does not use semaphores.

We use these locks:

- `pthread_rwlock_t` — many readers or one writer.
- `pthread_mutex_t` — one owner at a time.
- `flock()` — one daemon for each store.

**Where:**

- `src/fs.c` and `src/journal.c` — the read/write lock.
- `src/lru.c` and `src/fs.c` — the mutex.
- `src/main.c`, `src/cmd.c`, and `src/gc.c` — the `flock()` call.

### 3.7 Memory allocation

**Experiment 10.**

ChronoFS uses a fixed pool of cache frames.
This pool is an example of fixed partitions.
ChronoFS also grows arrays when it needs more space.

**Where:**

- `src/lru.c` — the fixed pool of cache frames.
- `src/journal.c` — the `realloc` call for the version arrays.
- `src/blockstore.c` — the `realloc` call for the block lists.

### 3.8 Page replacement

**Experiment 11.**

ChronoFS uses the LRU method for the cache.
`src/lru.c` holds 4 KiB data blocks.
A hash map and a doubly linked list hold the order of use.
The cache removes the block that the system used last.

**Where:**

- `src/lru.c` — `lru_create`, `lru_get`, `lru_put`, and `lru_get_stats`.
- `src/fs.c` — the cache statistics in `.chronofs/stats`.

### 3.9 Disk access

**Experiment 12.**

ChronoFS reads the blocks of a file in offset order.
The kernel does the readahead and the I/O scheduling below the FUSE layer.

**Where:**

- `src/blockstore.c` — the read loop over the block list.

### 3.10 File allocation

**Experiment 13.**

ChronoFS uses two file allocation methods.
The first method is indexed allocation.
The second method is sequential allocation.

In indexed allocation, each version has one manifest.
The manifest is an index block.
The index block holds the list of the data blocks.
The data blocks are in the directory `objects/`.
The manifest is the only way to find these blocks.

In sequential allocation, the journal is one append-only file.
The system adds each new record at the end of this file.

**Where:**

- `src/blockstore.c` — the manifest and the data blocks (indexed allocation).
- `src/journal.c` — the append-only journal file (sequential allocation).

## 4. Summary

The table gives the concepts that ChronoFS uses and the main source files.

| Experiment | Concept | Main source files |
|---|---|---|
| 1 | Linux commands and kernel monitoring | `src/main.c`, `scripts/` |
| 2 | Shell programming | `scripts/dev.sh`, `scripts/demo.sh` |
| 3 | System calls | `src/fs.c`, `src/blockstore.c`, `src/journal.c` |
| 4 | Inter-process communication | `src/journal.c`, `src/main.c` |
| 5 | Threads | `src/journal.c`, `src/fs.c`, `src/lru.c` |
| 8 | Process synchronization | `src/fs.c`, `src/lru.c`, `src/main.c` |
| 10 | Memory allocation | `src/lru.c`, `src/journal.c` |
| 11 | Page replacement (LRU) | `src/lru.c` |
| 12 | Disk access | `src/blockstore.c` |
| 13 | File allocation (indexed, sequential) | `src/blockstore.c`, `src/journal.c` |
