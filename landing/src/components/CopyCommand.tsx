import { useEffect, useRef, useState } from "react";

type State = "idle" | "copied" | "failed";

interface Props {
  command: string;
  label: string;
}

/** A mono command with a copy button; the copied/failed state is announced. */
export default function CopyCommand({ command, label }: Props) {
  const [state, setState] = useState<State>("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    window.clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(command);
      setState("copied");
    } catch {
      setState("failed");
    }
    timer.current = window.setTimeout(() => setState("idle"), 2600);
  };

  return (
    <div className="copyline">
      <p className="copyline__label">{label}</p>
      <code className="copyline__cmd">{command}</code>
      <button
        type="button"
        className="copyline__btn"
        data-state={state}
        aria-label={`Copy ${label.toLowerCase()}`}
        onClick={copy}
      >
        {state === "copied" ? "copied" : "copy"}
      </button>
      <span className="copyline__status" data-state={state} role="status" aria-live="polite">
        {state === "copied" ? "Copied to clipboard." : null}
        {state === "failed" ? "Copy blocked — select the line instead." : null}
      </span>
    </div>
  );
}
