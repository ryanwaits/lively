"use client";

import { useEffect, useRef, useState } from "react";
import { useOthers, useStatus } from "@waits/lively-react";

/**
 * The hero's focal element: a graphite code card with a typographic frame.
 *
 * Deliberately NOT a fake browser window. No traffic-light dots, no URL pill —
 * the reader's own browser already supplies chrome, and redrawing it reads as
 * invented UI. The frame here is a filename, a hairline rule, and a status chip.
 */

/** Reports real room occupancy, or says plainly that it has nothing to report. */
function PresenceChip() {
  const status = useStatus();
  const others = useOthers();

  if (status !== "connected") {
    return (
      <span className="whitespace-nowrap font-mono text-[11px] text-tok-mut">
        offline
      </span>
    );
  }

  // `others` excludes you, so the room holds one more than it reports.
  const peers = others.length + 1;
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap font-mono text-[11px] text-tok-key">
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 rounded-full bg-tok-key"
      />
      {peers === 1 ? "just you" : `${peers} here now`}
    </span>
  );
}

const LINES: { text: string; cls?: string }[][] = [
  [
    { text: "import", cls: "text-tok-key" },
    { text: " { RoomProvider, useOthers } " },
    { text: "from", cls: "text-tok-key" },
    { text: " " },
    { text: '"@waits/lively-react"', cls: "text-tok-str" },
    { text: ";" },
  ],
  [],
  [
    { text: "function", cls: "text-tok-key" },
    { text: " Canvas() {" },
  ],
  [
    { text: "  const", cls: "text-tok-key" },
    { text: " others = useOthers();" },
  ],
  [
    { text: "  return", cls: "text-tok-key" },
    { text: " <CursorOverlay peers={others} />;" },
  ],
  [{ text: "}" }],
  [],
  [
    { text: "<RoomProvider roomId=" },
    { text: '"board-1"', cls: "text-tok-str" },
    { text: " initialStorage={{ shapes: [] }}>" },
  ],
  [{ text: "  <Canvas />" }],
  [{ text: "</RoomProvider>" }],
];

/**
 * The one line that types itself in, once, on first paint.
 * Index into LINES — keep it pointing at `const others = useOthers();`
 * if lines are ever added or merged above it.
 */
const TYPED_LINE_INDEX = 3;

export function CodeCard() {
  const typedFull = "  const others = useOthers();";
  const [typed, setTyped] = useState(typedFull);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    setTyped("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(typedFull.slice(0, i));
      if (i >= typedFull.length) window.clearInterval(id);
    }, 28);

    return () => window.clearInterval(id);
  }, []);

  return (
    <figure className="m-0 overflow-hidden rounded-[10px] border border-graphite-2 bg-graphite">
      <figcaption className="flex items-center justify-between gap-3 border-b border-graphite-2 px-3.5 py-2">
        <span className="truncate font-mono text-[11px] tracking-wide text-tok-mut">
          Canvas.tsx
        </span>
        <PresenceChip />
      </figcaption>

      <pre className="m-0 overflow-x-auto px-3.5 pb-4 pt-3.5 font-mono text-[12px] leading-[1.85] text-on-dark">
        <code>
          {LINES.map((line, i) => {
            // Reserve the row's height while it types so nothing shifts.
            if (i === TYPED_LINE_INDEX) {
              return (
                <div key={i} className="min-h-[1.85em]">
                  <span className="text-tok-key">
                    {typed.slice(0, Math.min(typed.length, 7))}
                  </span>
                  <span>{typed.slice(7)}</span>
                </div>
              );
            }
            return (
              <div key={i} className="min-h-[1.85em]">
                {line.map((part, j) => (
                  <span key={j} className={part.cls}>
                    {part.text}
                  </span>
                ))}
              </div>
            );
          })}
        </code>
      </pre>
    </figure>
  );
}
