"use client";

import { useState } from "react";

const COMMAND = "bun add @waits/lively-react";

export function CopyInstall() {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(COMMAND);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="bg-accent text-accent-fg font-mono font-bold text-sm px-6 py-4 hover:bg-text transition-colors flex items-center justify-center gap-2"
    >
      <span>{COMMAND}</span>
      {copied ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}
