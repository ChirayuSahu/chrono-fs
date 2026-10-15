import type { ReactNode } from "react";
import { revealDelay } from "../hooks/useScrollReveal";

interface SectionProps {
  id: string;
  num: string;
  label: string;
  title: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
}

export default function Section({ id, num, label, title, intro, children }: SectionProps) {
  return (
    <section className="section" id={id} aria-labelledby={`${id}-h`}>
      <div className="wrap section__grid">
        <div className="spine" aria-hidden="true">
          <span className="spine__num">{num}</span>
          <span className="spine__label">{label}</span>
          <span className="spine__rule" />
        </div>
        <div>
          <h2 className="h2" id={`${id}-h`} data-reveal>
            {title}
          </h2>
          {intro ? (
            <p className="section__intro" data-reveal style={revealDelay(80)}>
              {intro}
            </p>
          ) : null}
          {children}
        </div>
      </div>
    </section>
  );
}
