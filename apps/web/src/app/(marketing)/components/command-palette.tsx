"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { type DocEntry, searchEntries } from "../../docs/nav-config";

function isExternal(href: string) {
  return href.startsWith("http");
}

/** Group results by section, preserving the ranked order within each group. */
function groupResults(results: DocEntry[]) {
  const groups: { heading: string; items: DocEntry[] }[] = [];
  for (const entry of results) {
    const existing = groups.find((g) => g.heading === entry.section);
    if (existing) existing.items.push(entry);
    else groups.push({ heading: entry.section, items: [entry] });
  }
  return groups;
}

export function CommandPalette({
  open,
  onClose,
  returnFocusTo,
}: {
  open: boolean;
  onClose: () => void;
  /**
   * Where focus lands on close. Opening via ⌘K leaves nothing focused, so
   * without this a keyboard user is dropped on <body> with no way back into
   * the nav except Tab-from-the-top.
   */
  returnFocusTo?: React.RefObject<HTMLElement | null>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  const results = searchEntries(query);
  const groups = groupResults(results);

  const go = useCallback(
    (entry: DocEntry) => {
      onClose();
      if (isExternal(entry.href)) {
        window.open(entry.href, "_blank", "noopener,noreferrer");
      } else {
        router.push(entry.href);
      }
    },
    [onClose, router]
  );

  // Remember what had focus so we can hand it back on close.
  useEffect(() => {
    if (open) {
      const activeEl = document.activeElement as HTMLElement | null;
      // Opening via the shortcut leaves <body> focused; fall back to the
      // trigger so Escape always returns somewhere useful.
      restoreFocusTo.current =
        activeEl && activeEl !== document.body
          ? activeEl
          : (returnFocusTo?.current ?? null);
      setQuery("");
      setActive(0);
      // Focus after paint so the dialog is in the tree.
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      restoreFocusTo.current?.focus?.();
    }
  }, [open, returnFocusTo]);

  // Lock body scroll while open, without shifting the layout.
  useEffect(() => {
    if (!open) return;
    const { overflow, paddingRight } = document.body.style;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [open]);

  // Keyboard model.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => (results.length ? (i + 1) % results.length : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) =>
          results.length ? (i - 1 + results.length) % results.length : 0
        );
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const entry = results[active];
        if (entry) go(entry);
        return;
      }
      if (e.key === "Tab") {
        // Only the input and the rows are focusable; keep focus inside.
        e.preventDefault();
        inputRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, results, active, go, onClose]);

  // Keep the active row in view when arrowing past the fold.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  if (!open) return null;

  let index = -1;

  return (
    <div
      className="fixed inset-0"
      style={{ zIndex: "var(--z-modal)" }}
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className="absolute inset-0 w-full cursor-default bg-text/25 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search documentation"
        className="absolute left-1/2 top-0 flex h-full w-full max-w-[560px] -translate-x-1/2 flex-col border border-border bg-body shadow-2xl sm:top-[12vh] sm:h-auto sm:max-h-[70vh] sm:rounded-[10px]"
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="shrink-0 text-muted"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Search docs…"
            aria-label="Search documentation"
            // The dialog frame and the caret already show where focus is;
            // a ring on an auto-focused field just reads as noise on open.
            className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-text outline-none placeholder:text-muted focus-visible:outline-none"
          />
          <kbd className="shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted">
            esc
          </kbd>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">
              No matches for “{query}”. Try “storage”, “hooks”, or “self-host”.
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.heading} className="mb-2 last:mb-0">
                <p className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted">
                  {group.heading}
                </p>
                {group.items.map((entry) => {
                  index += 1;
                  const i = index;
                  const isActive = i === active;
                  return (
                    <button
                      key={entry.href}
                      type="button"
                      data-active={isActive}
                      onMouseMove={() => setActive(i)}
                      onClick={() => go(entry)}
                      className={`flex w-full items-baseline gap-3 rounded-[6px] px-3 py-2 text-left transition-colors ${
                        isActive ? "bg-panel" : ""
                      }`}
                    >
                      <span
                        className={`text-sm ${isActive ? "text-accent" : "text-text"}`}
                      >
                        {entry.label}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs text-muted">
                        {entry.summary}
                      </span>
                      {isExternal(entry.href) && (
                        <span className="shrink-0 font-mono text-[10px] text-muted">
                          ↗
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="hidden items-center gap-4 border-t border-border px-4 py-2 font-mono text-[10px] text-muted sm:flex">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}

/** Owns the ⌘K / Ctrl+K binding so both the nav and the palette stay dumb. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return { open, setOpen };
}
