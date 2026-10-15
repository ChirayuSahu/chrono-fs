import { useEffect } from "react";
import Lenis from "lenis";

/** Expo-out, tuned to the site's `--ease-out`. */
const EASE = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t));

const HEADER_OFFSET = -80;

/**
 * Lenis smooth scrolling for the whole window.
 *
 * Native smooth scrolling is turned off in CSS, so anchor links are intercepted
 * here and driven through Lenis (with an offset for the fixed masthead). Motion
 * is skipped entirely for readers who ask for reduced motion.
 */
export function useLenis() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: EASE,
      smoothWheel: true,
    });

    let frame = requestAnimationFrame(function raf(time: number) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    });

    const onClick = (event: MouseEvent) => {
      const target = (event.target as Element | null)?.closest<HTMLAnchorElement>(
        'a[href^="#"]',
      );
      if (!target) return;

      const hash = target.getAttribute("href");
      if (!hash || hash === "#") return;

      const section = document.querySelector(hash);
      if (!(section instanceof HTMLElement)) return;

      event.preventDefault();
      lenis.scrollTo(section, { offset: HEADER_OFFSET, duration: 1.1, easing: EASE });
    };

    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);
}
