import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { RefObject } from "react";
import type { Thread } from "@waits/lively-types";
import { resolveAnchor } from "./anchor.js";

/**
 * Marks DOM rendered by the thread components themselves, so their own
 * re-renders are not mistaken for a change to the document being annotated.
 */
export const THREADS_UI_ATTRIBUTE = "data-lively-threads-ui";

/** `useLayoutEffect` in the browser, `useEffect` on the server (avoids the SSR warning). */
export const useIsomorphicLayoutEffect: typeof useLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Applies an alpha to a CSS colour: `#rgb` / `#rrggbb` become `rgba()`, anything else goes through `color-mix`. */
export function withAlpha(color: string, alpha: number): string {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())?.[1];
  if (!hex) return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;
  const full = hex.length === 3 ? hex.replace(/./g, "$&$&") : hex;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function isOwnUi(node: Node): boolean {
  const el = node.nodeType === 1 ? (node as Element) : node.parentElement;
  return !!el?.closest(`[${THREADS_UI_ATTRIBUTE}]`);
}

/**
 * Returns a number that changes whenever the container's content or size
 * changes (coalesced to one bump per frame), so anchors can be re-resolved
 * and re-measured.
 */
export function useContainerVersion(containerRef: RefObject<HTMLElement | null>): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let frame = 0;
    const bump = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setVersion((v) => v + 1);
      });
    };

    // The container did not exist during the first render; resolve against it now.
    bump();

    const mutations =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver((records) => {
            if (records.some((r) => !isOwnUi(r.target))) bump();
          })
        : null;
    mutations?.observe(el, { childList: true, subtree: true, characterData: true });

    const resizes = typeof ResizeObserver !== "undefined" ? new ResizeObserver(bump) : null;
    resizes?.observe(el);

    window.addEventListener("resize", bump);
    // Web fonts swapping in reflow the text without resizing the container.
    let cancelled = false;
    (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready.then(() => {
      if (!cancelled) bump();
    });

    return () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
      mutations?.disconnect();
      resizes?.disconnect();
      window.removeEventListener("resize", bump);
    };
  }, [containerRef]);

  return version;
}

/**
 * Resolves each thread's anchor to a `Range` inside the container. Threads
 * whose anchor no longer resolves are absent from the map ("detached").
 */
export function useThreadRanges(
  containerRef: RefObject<HTMLElement | null>,
  threads: Thread[],
  version: number
): Map<string, Range> {
  return useMemo(() => {
    const ranges = new Map<string, Range>();
    const el = containerRef.current;
    if (!el) return ranges;
    for (const thread of threads) {
      const range = resolveAnchor(el, thread.anchor);
      if (range) ranges.set(thread.id, range);
    }
    return ranges;
    // `version` stands in for the container's DOM, which React cannot track.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, threads, version]);
}

export interface BoxRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Client rects of a range, minus empties and rects swallowed by another one.
 * Browsers report an inline element's box as well as the text inside it; left
 * in, translucent highlights would stack and paint darker there.
 */
export function rangeRects(range: Range): BoxRect[] {
  if (typeof range.getClientRects !== "function") return [];
  const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0.5 && r.height > 0.5);
  const contains = (a: DOMRect, b: DOMRect) =>
    a.left <= b.left + 1 && a.top <= b.top + 1 && a.right >= b.right - 1 && a.bottom >= b.bottom - 1;

  const kept: DOMRect[] = [];
  for (const rect of rects) {
    if (kept.some((k) => contains(k, rect))) continue;
    for (let i = kept.length - 1; i >= 0; i--) {
      if (contains(rect, kept[i])) kept.splice(i, 1);
    }
    kept.push(rect);
  }
  return kept.map((r) => ({ left: r.left, top: r.top, width: r.width, height: r.height }));
}

// --- CSS Custom Highlight API (typed loosely: not in every TS DOM lib yet) ---

interface HighlightRegistry {
  set(name: string, highlight: unknown): void;
  delete(name: string): boolean;
}

/** `CSS.highlights` when the browser supports the Custom Highlight API, else `null`. */
export function getHighlightRegistry(): HighlightRegistry | null {
  const css = (globalThis as unknown as { CSS?: { highlights?: HighlightRegistry } }).CSS;
  const ctor = (globalThis as unknown as { Highlight?: unknown }).Highlight;
  return css?.highlights && typeof ctor === "function" ? css.highlights : null;
}

export function createHighlight(ranges: Range[]): unknown {
  const Ctor = (globalThis as unknown as { Highlight: new (...r: Range[]) => unknown }).Highlight;
  return new Ctor(...ranges);
}
