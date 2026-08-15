"use client";

import { useEffect, useRef, useState } from "react";

const COMMAND = "bun add @waits/lively-react";

/**
 * Install strip. Silent success: the label swaps for a moment and swaps back.
 * No toast — the user can see the thing they asked for happened.
 */
export function CopyInstall() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(COMMAND);
    } catch {
      // Clipboard can be blocked by permissions; the command is on screen
      // and selectable either way, so there is nothing useful to say.
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex max-w-sm items-stretch overflow-hidden rounded-[6px] border border-border-hover bg-body">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap px-3 py-2.5 font-mono text-[13px] text-text">
        {COMMAND}
      </code>
      <button
        type="button"
        onClick={copy}
        className="grid shrink-0 place-items-center whitespace-nowrap border-l border-border px-3 font-mono text-[11px] uppercase tracking-wider text-muted transition-colors duration-150 hover:bg-panel hover:text-text"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Install command copied to clipboard" : ""}
      </span>
    </div>
  );
}
