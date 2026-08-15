"use client";

import { useEffect, useRef, useState } from "react";
import type { TimelineStatus } from "../lib/use-timeline";

/**
 * The playground block: a scripted preview beside the code that produces it.
 *
 * The preview pane is honest about what it is. It never reports a peer count
 * or any other presence figure, because the peers in it are scripted — the
 * page's real presence lives in the hero's status chip and in the visitor
 * cursors, both of which come off an actual socket.
 */
export function DemoFrame({
  title,
  filename,
  code,
  copyText,
  status,
  onReplay,
  showReplay,
  children,
  stageRef,
}: {
  title: string;
  filename: string;
  code: React.ReactNode;
  copyText: string;
  status: TimelineStatus;
  onReplay: () => void;
  /** Hidden under reduced motion, where nothing animated in the first place. */
  showReplay: boolean;
  children: React.ReactNode;
  stageRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(copyText);
    } catch {
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="mb-6 grid grid-cols-1 overflow-hidden rounded-[10px] border border-border md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div
        ref={stageRef}
        className="relative grid min-h-[190px] place-items-center overflow-hidden bg-panel p-6"
      >
        {children}

        <div className="pointer-events-none absolute bottom-2 left-3 flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            Scripted replay
          </span>
          {showReplay && status === "done" && (
            <button
              type="button"
              onClick={onReplay}
              className="pointer-events-auto whitespace-nowrap rounded-[4px] border border-border bg-body px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-border-hover hover:text-text"
            >
              Replay
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-body md:border-l md:border-t-0">
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
          <span className="truncate text-[13px] font-medium text-text">
            {title}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden font-mono text-[10px] text-muted sm:inline">
              {filename}
            </span>
            <button
              type="button"
              onClick={copy}
              className="whitespace-nowrap rounded-[4px] border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-border-hover hover:text-text"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <pre className="m-0 overflow-x-auto p-3 font-mono text-[11.5px] leading-[1.8] text-text-2">
          <code>{code}</code>
        </pre>
      </div>
    </section>
  );
}
