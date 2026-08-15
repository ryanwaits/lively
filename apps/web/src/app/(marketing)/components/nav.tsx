"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CommandPalette, useCommandPalette } from "./command-palette";

/**
 * N13 — inline ⌘K search pill.
 *
 * The pill is visible for newcomers and the shortcut is there for everyone
 * else. Flush full-width bar, one hairline bottom border, blur once the page
 * has moved. Not a floating pill: this is an instrument panel, not a product
 * tour.
 */
export function Nav() {
  const { open, setOpen } = useCommandPalette();
  const [scrolled, setScrolled] = useState(false);
  const pillRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 w-full border-b transition-colors duration-200 ${
          scrolled
            ? "border-border bg-body/85 backdrop-blur-md"
            : "border-transparent bg-body"
        }`}
        style={{ zIndex: "var(--z-sticky)" }}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-6">
          <Link
            href="/"
            className="shrink-0 whitespace-nowrap font-sans text-[17px] font-semibold tracking-tight text-text no-underline"
          >
            lively
          </Link>

          <button
            ref={pillRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Search documentation (Command K)"
            className="group mx-auto hidden h-9 w-full max-w-[300px] items-center gap-2.5 rounded-full border border-border bg-panel px-3 text-muted transition-colors duration-200 hover:border-border-hover sm:flex"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="shrink-0"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <span className="min-w-0 flex-1 truncate text-left text-[13px]">
              Search docs…
            </span>
            <span className="flex shrink-0 gap-1">
              <kbd className="rounded border border-border-hover bg-body px-1 py-px font-kbd text-[11px] leading-tight">
                ⌘
              </kbd>
              <kbd className="rounded border border-border-hover bg-body px-1 py-px font-kbd text-[11px] leading-tight">
                K
              </kbd>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Search documentation"
            className="ml-auto shrink-0 p-1 text-muted sm:hidden"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </button>

          <nav className="flex shrink-0 items-center gap-4">
            <Link
              href="/docs"
              className="hidden whitespace-nowrap text-[13px] text-text-2 no-underline transition-colors hover:text-text sm:block"
            >
              Docs
            </Link>
            <Link
              href="/docs/quick-start"
              className="whitespace-nowrap rounded-[6px] bg-accent px-3 py-[7px] text-[13px] font-medium text-accent-fg no-underline transition-colors hover:bg-code-keyword"
            >
              Quick start
            </Link>
          </nav>
        </div>
      </header>

      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        returnFocusTo={pillRef}
      />
    </>
  );
}
