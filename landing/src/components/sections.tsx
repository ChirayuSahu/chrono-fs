import type { ReactNode } from "react";
import Section from "./Section";
import { revealDelay } from "../hooks/useScrollReveal";
import { INSTALL_CMD } from "../install";

/* ---------------------------------------------------------------- 01 */
export function Storage() {
  return (
    <Section
      id="what"
      num="01"
      label="Storage"
      title={
        <>
          A filesystem that <em>runs backwards</em> as easily as forwards.
        </>
      }
      intro={
        <>
          ChronoFS mounts like any directory. The kernel sends your reads and writes to a
          normal process, not a kernel module. A snapshot is taken when a written file
          closes — roughly once per edit, not once per syscall.
        </>
      }
    >
      <div className="editorial" style={{ marginTop: "var(--s5)" }}>
        <p className="editorial__lead" data-reveal>
          A 1&nbsp;MB <b>cp</b> arrives as about eight kernel write requests. ChronoFS keeps{" "}
          <b>one</b> version for that session, not eight. Delete and rename are recorded too
          — a rename copies no data, it just points a new path at the same manifest.
        </p>
        <div className="facts" data-reveal style={revealDelay(120)}>
          <div className="fact">
            <span className="fact__i">01</span>
            <div>
              <p className="fact__h">Version on close</p>
              <p className="fact__p">
                A new version is written on <code>flush</code>, <code>fsync</code>,{" "}
                <code>truncate</code>, <code>chmod</code> and <code>utime</code>.
              </p>
            </div>
          </div>
          <div className="fact">
            <span className="fact__i">02</span>
            <div>
              <p className="fact__h">Content-addressed blocks</p>
              <p className="fact__p">
                Files split into 4&nbsp;KiB blocks, each hashed with SHA-256. Identical
                blocks live once.
              </p>
            </div>
          </div>
          <div className="fact">
            <span className="fact__i">03</span>
            <div>
              <p className="fact__h">Append-only journal</p>
              <p className="fact__p">
                1096-byte records, one <code>O_APPEND</code> write each. A crash discards a
                torn tail.
              </p>
            </div>
          </div>
          <div className="fact">
            <span className="fact__i">04</span>
            <div>
              <p className="fact__h">LRU block cache</p>
              <p className="fact__p">
                A fixed set of frames keeps hot 4&nbsp;KiB blocks in memory. Hits beat
                re-reads.
              </p>
            </div>
          </div>
          <div className="fact">
            <span className="fact__i">05</span>
            <div>
              <p className="fact__h">Mark-and-sweep GC</p>
              <p className="fact__p">
                <b>chronofs gc --keep 1h</b> drops old history and frees blocks no version
                points at.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- 02 */
interface Stage {
  n: string;
  h: string;
  p: ReactNode;
  icon: ReactNode;
}

const STAGES: Stage[] = [
  {
    n: "STEP 01",
    h: "Write & close",
    p: (
      <>
        Your process writes bytes. On <code>close()</code>, the snapshot opens.
      </>
    ),
    icon: (
      <>
        <path d="M5 3h9l5 5v13H5z" />
        <path d="M14 3v5h5" />
        <path d="M8 13h8M8 17h5" strokeLinecap="round" />
      </>
    ),
  },
  {
    n: "STEP 02",
    h: "Split to 4 KiB",
    p: <>The file becomes an ordered list of fixed-size blocks.</>,
    icon: (
      <>
        <rect x="4" y="4" width="6" height="6" />
        <rect x="14" y="4" width="6" height="6" />
        <rect x="4" y="14" width="6" height="6" />
        <rect x="14" y="14" width="6" height="6" />
      </>
    ),
  },
  {
    n: "STEP 03",
    h: "Hash & store",
    p: (
      <>
        Each block is SHA-256&apos;d into <code>objects/ab/cd…</code>. A repeat stores
        nothing.
      </>
    ),
    icon: (
      <>
        <path d="M12 3v18M5 7l14 10M19 7L5 17" />
      </>
    ),
  },
  {
    n: "STEP 04",
    h: "Write manifest",
    p: <>An index block lists the block hashes for this version. This is the file.</>,
    icon: (
      <>
        <path d="M5 4h14v16H5z" />
        <path d="M8 9h8M8 13h8M8 17h5" strokeLinecap="round" />
      </>
    ),
  },
  {
    n: "STEP 05",
    h: "Append journal",
    p: <>One record holds the time, path and manifest. Now the version is real.</>,
    icon: (
      <>
        <path d="M4 5h16M4 10h16M4 15h10M4 20h10" strokeLinecap="round" />
      </>
    ),
  },
];

export function Pipeline() {
  return (
    <Section
      id="pipeline"
      num="02"
      label="Pipeline"
      title={
        <>
          One write, <em>five</em> steps.
        </>
      }
      intro={
        <>
          Follow a single file from your editor to the journal. Nothing here is asynchronous
          — the record exists before <code>close()</code> returns.
        </>
      }
    >
      <div className="strip">
        <div className="perf" aria-hidden="true" />
        <div className="pipeline">
          {STAGES.map((stage, i) => (
            <article className="stage" key={stage.n} data-reveal style={revealDelay(i * 80)}>
              <span className="stage__node" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  {stage.icon}
                </svg>
              </span>
              <p className="stage__n">{stage.n}</p>
              <h3 className="stage__h">{stage.h}</h3>
              <p className="stage__p">{stage.p}</p>
            </article>
          ))}
        </div>
        <div className="perf" aria-hidden="true" />
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- 03 */
const PILLS = ["1d-ago", "1h-ago", "10min-ago", "2min-ago", "30s-ago", "now"];

const TIME_ROWS = [
  {
    k: "relative",
    v: "30s-ago · 2min-ago · 1h30min-ago",
    d: "That long before the current moment.",
  },
  { k: "clock", v: "@19:53:12", d: "Today, local time, resolved to the end of that second." },
  { k: "date + time", v: "@2026-10-05T19:53:12", d: "An absolute local timestamp." },
  { k: "epoch", v: "@1759674000", d: "Unix seconds." },
  { k: "tag", v: "before-disaster", d: "A moment you named with chronofs tag." },
  { k: "now", v: "now", d: "The current state. Read-only, like all history." },
];

export function Nomenclature() {
  return (
    <Section
      id="names"
      num="03"
      label="Nomenclature"
      tone="paper"
      title={
        <>
          Name a moment the way you <em>read a path</em>.
        </>
      }
      intro={
        <>
          Anywhere a time is accepted — <code>.snapshots/&lt;WHEN&gt;/</code> or{" "}
          <code>--at &lt;WHEN&gt;</code> — these forms all work.
        </>
      }
    >
      <div className="pills" data-reveal style={{ ...revealDelay(120), marginTop: "var(--s4)" }}>
        {PILLS.map((pill) => (
          <span key={pill} className={pill === "now" ? "pill pill--live" : "pill"}>
            {pill}
          </span>
        ))}
      </div>

      <div className="spec" data-reveal style={revealDelay(160)}>
        {TIME_ROWS.map((row) => (
          <div className="spec__row" key={row.k}>
            <span className="spec__k">{row.k}</span>
            <span className="spec__v">{row.v}</span>
            <p className="spec__d">{row.d}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- 04 */
interface Cmd {
  c: string;
  b: string;
  p: ReactNode;
}

const COMMANDS: Cmd[] = [
  { c: "chronofs", b: "mount", p: <>Mount the store. History appears under <i>&lt;mnt&gt;/.snapshots/</i>.</> },
  { c: "chronofs", b: "tui", p: <>Open the interactive timeline browser. Rewind the past and watch each file change.</> },
  { c: "chronofs", b: "log", p: <>Show the version history of a path — writes, deletes, mkdirs.</> },
  { c: "chronofs", b: "ls", p: <>List a directory as it was. No mount is needed.</> },
  { c: "chronofs", b: "cat", p: <>Print a file as it was.</> },
  { c: "chronofs", b: "restore", p: <>Bring a file or a whole directory back. Through a mount, the restore becomes a new version.</> },
  { c: "chronofs", b: "tag", p: <>Give a moment a name. Or list the names you already gave.</> },
  { c: "chronofs", b: "stats", p: <>Versions, blocks on disk, deduplication ratio.</> },
  { c: "chronofs", b: "gc", p: <>Remove history older than 1h and free blocks no version uses. Unmount first.</> },
];

export function Console() {
  return (
    <Section
      id="console"
      num="04"
      label="Console"
      title={
        <>
          Nine commands. One of them is a <em>time machine</em>.
        </>
      }
      intro={
        <>
          History stays read-only. A restore writes a new version, so the record of the
          recovery is not lost either.
        </>
      }
    >
      <div className="man" style={{ marginTop: "var(--s5)" }}>
        {COMMANDS.map((cmd, i) => (
          <div className="cmd" key={cmd.b} data-reveal style={revealDelay(i * 40)}>
            <code>
              {cmd.c} <b>{cmd.b}</b>
            </code>
            <p>{cmd.p}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- 05 */
const EDGES = [
  { tag: "not versioned", h: "Symlinks and hard links", p: "Symlinks pass through but are not captured. Hard links are unsupported." },
  { tag: "no mid-write snapshot", h: "A writer that never closes", p: "A version is taken at close or fsync. A process that holds a file open and never syncs produces no intermediate versions." },
  { tag: "weak on insertions", h: "Middle edits shift blocks", p: "Inserting bytes at the start shifts every later block, so fixed-size blocks deduplicate poorly. Content-defined chunking would fix this." },
  { tag: "O(paths)", h: "Large tree listings", p: "A snapshot directory listing scans every tracked path. That is fine for project-sized trees, not for millions of files." },
];

export function Edges() {
  return (
    <Section
      id="edges"
      num="05"
      label="Edges"
      title={
        <>
          Where it <em>stops</em> working.
        </>
      }
      intro="A tool you can trust is a tool with stated limits. These are measured, not guessed."
    >
      <div className="edges">
        {EDGES.map((edge, i) => (
          <article className="edge" key={edge.h} data-reveal style={revealDelay(i * 60)}>
            <span className="edge__tag">{edge.tag}</span>
            <p className="edge__h">{edge.h}</p>
            <p className="edge__p">{edge.p}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- 06 */
export function Boot() {
  return (
    <Section
      id="boot"
      num="06"
      label="Boot"
      title={
        <>
          Build it in a minute, <em>rewind it</em> in five.
        </>
      }
      intro="FUSE needs a Linux kernel. On macOS or Windows, the repo's Docker container supplies one. The TUI is optional; the core needs only libfuse."
    >
      <div className="boot" style={{ marginTop: "var(--s5)" }}>
        <div className="term" data-reveal>
          <div className="term__bar">
            <span className="term__rec" aria-hidden="true" />
            <span className="term__name">Setup · take 01</span>
            <span className="term__meta">Linux</span>
          </div>
          <pre>
            <span className="c"># install: builds it and puts chronofs on PATH</span>
            {"\n"}
            <span className="p">$</span> {INSTALL_CMD}
            {"\n\n"}
            <span className="c"># or from the repo — macOS or Windows gets a Linux shell via Docker</span>
            {"\n"}
            <span className="p">$</span> ./scripts/dev.sh
            {"\n"}
            <span className="p">$</span> make
            {"\n"}
            <span className="p">$</span> ./scripts/demo.sh
            {"\n\n"}
            <span className="c"># Linux (Fedora)</span>
            {"\n"}
            <span className="p">$</span> sudo dnf install fuse3-devel ncurses-devel
            {"\n"}
            <span className="p">$</span> make
          </pre>
        </div>

        <div className="term" data-reveal style={revealDelay(100)}>
          <div className="term__bar">
            <span className="term__rec" aria-hidden="true" />
            <span className="term__name">Mount · take 02</span>
            <span className="term__meta">Linux</span>
          </div>
          <pre>
            <span className="p">$</span> mkdir -p /tmp/store /tmp/mnt
            {"\n"}
            <span className="p">$</span> chronofs mount /tmp/store /tmp/mnt
            {"\n"}
            <span className="p">$</span> echo &quot;draft 1&quot; {">"} /tmp/mnt/notes.txt
            {"\n"}
            <span className="p">$</span> echo &quot;draft 2&quot; {">"} /tmp/mnt/notes.txt
            {"\n"}
            <span className="p">$</span> cat /tmp/mnt/.snapshots/30s-ago/notes.txt
            {"\n"}
            <span className="o">draft 1</span>
          </pre>
        </div>
      </div>
    </Section>
  );
}
