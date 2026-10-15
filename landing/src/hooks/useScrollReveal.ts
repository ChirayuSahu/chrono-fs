import { useEffect } from "react";
import type { CSSProperties } from "react";

/**
 * Adds `.is-in` to every `[data-reveal]` element once it scrolls into view.
 * Mirrors the observer used by the static page, so component markup stays clean.
 */
export function useScrollReveal() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

    if (!("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-in"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add("is-in");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -6% 0px" },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
}

/** Inline style for the per-element reveal delay (`--d`). */
export function revealDelay(ms: number): CSSProperties {
  return { "--d": `${ms}ms` } as CSSProperties;
}
