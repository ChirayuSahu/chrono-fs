import { revealDelay } from "../hooks/useScrollReveal";

export default function Footer() {
  return (
    <footer className="foot">
      <div className="wrap foot__grid">
        <p className="foot__mono" data-reveal>
          A course project for BITE303P Operating Systems Lab. Written in C, built on libfuse
          3. Journal, block store and garbage collector are plain POSIX — no kernel module,
          no external database.
        </p>
        <p className="foot__sig" data-reveal style={revealDelay(80)}>
          <svg
            viewBox="0 0 240 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              d="M4 30c14-22 26 10 40-6s18-14 30 2 22 12 34-2 20-18 34-4 20 6 34-4 22-6 34 4"
              strokeLinecap="round"
            />
          </svg>
          chronofs · v1.0
        </p>
      </div>
    </footer>
  );
}
