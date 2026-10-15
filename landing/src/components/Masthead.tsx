import { useEffect, useState } from "react";

const LINKS = [
  { href: "#what", label: "Storage" },
  { href: "#pipeline", label: "Pipeline" },
  { href: "#names", label: "Nomenclature" },
  { href: "#console", label: "Console" },
  { href: "#edges", label: "Edges" },
];

function formatTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export default function Masthead() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className="masthead">
      <div className="wrap masthead__inner">
        <a className="brand" href="#top">
          chrono<b>fs</b>
        </a>
        <p className="masthead__status">
          <span className="dot" aria-hidden="true" />
          mounted on /tmp/mnt <span aria-hidden="true">·</span>{" "}
          <time dateTime={now.toISOString()}>{formatTime(now)}</time>
        </p>
        <nav className="masthead__nav" aria-label="Sections">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
