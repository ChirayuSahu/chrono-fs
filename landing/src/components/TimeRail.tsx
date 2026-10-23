import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

type Op = "write" | "mkdir" | "delete" | "rmdir";

interface RawMoment {
  secAgo: number;
  op: Op;
  path: string;
  bytes: number;
  hash: string | null;
  content: string | null;
}

interface Moment extends RawMoment {
  clock: string;
  ago: string;
}

interface TreeLine {
  depth: number;
  label: string;
  meta: string;
  isDir: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** A live five-record history: the newest tick is always "now". */
function buildMoments(now: number): Moment[] {
  const raw: RawMoment[] = [
    { secAgo: 481, op: "write", path: "/notes.txt", bytes: 26, hash: "4d55066b", content: "Draft 1: OS project ideas" },
    { secAgo: 197, op: "write", path: "/notes.txt", bytes: 37, hash: "02f830be", content: "Draft 2: FUSE time-travel filesystem" },
    { secAgo: 106, op: "mkdir", path: "/src", bytes: 0, hash: null, content: null },
    { secAgo: 44, op: "write", path: "/src/main.c", bytes: 29, hash: "73d5289c", content: "int main(void) { return 0; }" },
    { secAgo: 0, op: "write", path: "/notes.txt", bytes: 26, hash: "5dcd1ea9", content: "Draft 3: ChronoFS — final" },
  ];

  return raw.map((m) => {
    const at = new Date(now - m.secAgo * 1000);
    const ago =
      m.secAgo === 0
        ? "now"
        : m.secAgo < 60
          ? `${m.secAgo} s ago`
          : `${Math.round(m.secAgo / 60)} min ago`;
    return {
      ...m,
      clock: `${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`,
      ago,
    };
  });
}

function human(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1048576).toFixed(1)} MiB`;
}

/** The filesystem tree that exists at moment `i`. */
function treeAt(moments: Moment[], i: number): TreeLine[] {
  const live = new Map<string, Moment>();
  for (let k = 0; k <= i; k++) {
    const m = moments[k];
    if (m.op === "delete" || m.op === "rmdir") live.delete(m.path);
    else live.set(m.path, m);
  }

  const children = new Map<string, Map<string, { name: string; isDir: boolean; size: number; full: string }>>();
  const ensure = (dir: string) => {
    if (!children.has(dir)) children.set(dir, new Map());
  };
  ensure("/");

  for (const [path, m] of live) {
    const parts = path.split("/").filter(Boolean);
    let parent = "/";
    for (let j = 0; j < parts.length; j++) {
      ensure(parent);
      const name = parts[j];
      const last = j === parts.length - 1;
      const full = (parent === "/" ? "" : parent) + "/" + name;
      const box = children.get(parent)!;
      if (!box.has(name)) {
        box.set(name, { name, isDir: last ? m.op === "mkdir" : true, size: last ? m.bytes : 0, full });
      }
      parent = full;
    }
  }

  const lines: TreeLine[] = [];
  const walk = (dir: string, depth: number) => {
    const box = children.get(dir);
    if (!box) return;
    const kids = [...box.values()].sort(
      (a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name),
    );
    for (const k of kids) {
      const label = (k.isDir ? `${k.name}/` : k.name).padEnd(12, " ");
      lines.push({ depth, label, meta: k.isDir ? "" : human(k.size), isDir: k.isDir });
      if (k.isDir) walk(k.full, depth + 1);
    }
  };
  walk("/", 0);
  return lines;
}

export default function TimeRail() {
  const moments = useMemo(() => buildMoments(Date.now()), []);
  const N = moments.length;

  const [index, setIndex] = useState(N - 1);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const select = useCallback(
    (i: number) => setIndex(Math.max(0, Math.min(N - 1, i))),
    [N],
  );

  const indexFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return index;
      const r = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(r.width, clientX - r.left));
      return Math.round((x / r.width) * (N - 1));
    },
    [N, index],
  );

  /* The hero's "Rewind the rail" button moves focus to the track. */
  useEffect(() => {
    const anchor = document.querySelector<HTMLAnchorElement>('a[href="#rail"]');
    if (!anchor) return;
    const handler = () => window.setTimeout(() => trackRef.current?.focus({ preventScroll: true }), 450);
    anchor.addEventListener("click", handler);
    return () => anchor.removeEventListener("click", handler);
  }, []);

  const moment = moments[index];
  const lines = useMemo(() => treeAt(moments, index), [moments, index]);
  const pct = N <= 1 ? 0 : (index / (N - 1)) * 100;
  const previewName = moment.path.split("/").pop() ?? moment.path;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      select(index - 1);
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      select(index + 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      select(0);
    } else if (e.key === "End") {
      e.preventDefault();
      select(N - 1);
    }
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    select(indexFromClientX(e.clientX));
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) select(indexFromClientX(e.clientX));
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
  };

  return (
    <div className="wrap">
      <div className="rail" id="rail" aria-labelledby="rail-h">
        <div className="perf" aria-hidden="true" />
        <div className="rail__head">
          <h2 className="rail__label" id="rail-h">
            Time rail<span>reel 01 · {N} frames</span>
          </h2>
          <p className="rail__hint">drag · ← → · home / end</p>
        </div>

        <div className="rail__stage">
          <div className="rail__clock">
            <span className="rail__time">{moment.clock}</span>
            <span className="rail__ago">{moment.ago}</span>
          </div>

          <div
            className="track"
            ref={trackRef}
            role="slider"
            tabIndex={0}
            aria-label="History position"
            aria-valuemin={0}
            aria-valuemax={N - 1}
            aria-valuenow={index}
            aria-valuetext={`${moment.op} ${moment.path} at ${moment.ago}`}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              dragging.current = false;
            }}
          >
            <div className="ticks">
              {moments.map((m, i) => (
                <button
                  key={`${m.path}-${i}`}
                  type="button"
                  className="tick"
                  style={{ left: `${N <= 1 ? 0 : (i / (N - 1)) * 100}%` }}
                  aria-label={`${m.op} ${m.path}, ${m.ago}`}
                  aria-pressed={i === index}
                  onClick={() => select(i)}
                >
                  {String(i + 1).padStart(2, "0")}
                </button>
              ))}
            </div>
            <div className="track__fill" style={{ width: `${pct}%` }} />
            <div className="handle" style={{ left: `${pct}%` }} />
          </div>

          <div className="readout">
            <div className="pane">
              <h3 className="pane__title">
                journal record{" "}
                <b>
                  {String(index + 1).padStart(2, "0")}/{String(N).padStart(2, "0")}
                </b>
              </h3>
              <pre>
                <b>time</b>     {moment.clock}
                {"\n"}
                <b>op</b>       <i>{moment.op}</i>
                {"\n"}
                <b>path</b>     {moment.path}
                {"\n"}
                <b>size</b>     {moment.op === "write" ? human(moment.bytes) : "—"}
                {"\n"}
                <b>manifest</b>{" "}
                {moment.hash ? moment.hash : <span className="fade">—</span>}
              </pre>
            </div>

            <div className="pane">
              <h3 className="pane__title">
                state <b>{moment.ago}</b>
              </h3>
              <pre>
                {lines.length ? (
                  <>
                    <span className="dir">/</span>
                    {"\n"}
                    {lines.map((line, i) => (
                      <span key={`${line.label}-${i}`}>
                        {"  ".repeat(line.depth + 1)}
                        {line.isDir ? <span className="dir">{line.label}</span> : line.label}
                        {line.meta ? <span className="fade">{line.meta}</span> : null}
                        {i < lines.length - 1 ? "\n" : null}
                      </span>
                    ))}
                  </>
                ) : (
                  <span className="fade">(empty)</span>
                )}
              </pre>
            </div>

            <div className="pane">
              <h3 className="pane__title">
                preview <b>{previewName}</b>
              </h3>
              <pre>
                <i>{moment.op === "write" ? moment.path : `${moment.path}/`}</i>
                {"\n\n"}
                {moment.op === "write" ? (
                  moment.content ?? ""
                ) : (
                  <span className="fade">
                    directory · {lines.length} entr{lines.length === 1 ? "y" : "ies"}
                  </span>
                )}
              </pre>
            </div>
          </div>
        </div>
        <div className="perf" aria-hidden="true" />
      </div>
    </div>
  );
}
