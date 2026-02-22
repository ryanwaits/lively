"use client";

import { useState } from "react";

const MANAGERS = [
  { label: "npm", command: "npm install @waits/lively-react" },
  { label: "bun", command: "bun add @waits/lively-react" },
  { label: "pnpm", command: "pnpm add @waits/lively-react" },
] as const;

export function InstallTabs() {
  const [active, setActive] = useState(0);

  return (
    <div className="border border-border bg-code-bg overflow-hidden">
      <div className="flex border-b border-border">
        {MANAGERS.map((m, i) => (
          <button
            key={m.label}
            onClick={() => setActive(i)}
            className={`px-4 py-2 font-mono text-xs transition-colors ${
              i === active
                ? "bg-body text-text font-bold"
                : "text-muted hover:text-text"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="px-5 py-4 font-mono text-sm text-text flex items-center justify-between gap-4">
        <span>{MANAGERS[active].command}</span>
        <CopyButton text={MANAGERS[active].command} />
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-muted hover:text-text transition-colors shrink-0"
      aria-label="Copy to clipboard"
    >
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
