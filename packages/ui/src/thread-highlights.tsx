import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { useThreads } from "@waits/lively-react";
import type { Thread } from "@waits/lively-types";
import {
  THREADS_UI_ATTRIBUTE,
  createHighlight,
  getHighlightRegistry,
  rangeRects,
  useContainerVersion,
  useIsomorphicLayoutEffect,
  useThreadRanges,
  withAlpha,
  type BoxRect,
} from "./thread-dom.js";

export interface ThreadHighlightsProps {
  /** The element holding the `data-lively-block` content. */
  containerRef: RefObject<HTMLElement | null>;
  /** Also highlight resolved threads. Default: false */
  showResolved?: boolean;
  /** Opacity of the author colour behind the text, 0–1. Default: 0.25 */
  alpha?: number;
  /**
   * `"auto"` paints with the CSS Custom Highlight API when the browser has it
   * and falls back to positioned rectangles. `"rects"` always uses rectangles.
   * Default: `"auto"`
   */
  mode?: "auto" | "rects";
  /** Class names for the overlay element that holds fallback rectangles. */
  className?: string;
}

interface HighlightGroup {
  name: string;
  color: string;
  suggestion: boolean;
  ranges: Range[];
}

const EMPTY: Thread[] = [];

/**
 * Marks each open thread's quote inside its block, tinted with the author's
 * colour. Suggestions are underlined as well.
 *
 * Paints with the CSS Custom Highlight API where available, so the document's
 * DOM is never touched. Elsewhere it draws absolutely positioned rectangles;
 * for those, render it inside a `position: relative` ancestor of the content.
 *
 * @example
 * const ref = useRef<HTMLDivElement>(null);
 * return (
 *   <div className="relative">
 *     <ThreadHighlights containerRef={ref} />
 *     <article ref={ref}>
 *       <p data-lively-block="intro">We ship on Friday.</p>
 *     </article>
 *   </div>
 * );
 */
export function ThreadHighlights({
  containerRef,
  showResolved = false,
  alpha = 0.25,
  mode = "auto",
  className,
}: ThreadHighlightsProps): JSX.Element {
  const all = useThreads() ?? EMPTY;
  const threads = useMemo(
    () => (showResolved ? all : all.filter((t) => t.status === "open")),
    [all, showResolved]
  );
  const version = useContainerVersion(containerRef);
  const ranges = useThreadRanges(containerRef, threads, version);

  const baseName = `lively-thread-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const useRects = mode === "rects" || getHighlightRegistry() === null;

  // One registry entry per (author colour, kind): `::highlight()` rules style a
  // whole named highlight, not a single range.
  const groups = useMemo(() => {
    const byKey = new Map<string, HighlightGroup>();
    for (const thread of threads) {
      const range = ranges.get(thread.id);
      if (!range) continue;
      const suggestion = thread.kind === "suggestion";
      const key = `${thread.authorColor}|${suggestion}`;
      let group = byKey.get(key);
      if (!group) {
        group = {
          name: `${baseName}-${byKey.size}`,
          color: thread.authorColor,
          suggestion,
          ranges: [],
        };
        byKey.set(key, group);
      }
      group.ranges.push(range);
    }
    return Array.from(byKey.values());
  }, [threads, ranges, baseName]);

  useEffect(() => {
    const registry = getHighlightRegistry();
    if (useRects || !registry) return;
    for (const group of groups) {
      registry.set(group.name, createHighlight(group.ranges));
    }
    return () => {
      for (const group of groups) registry.delete(group.name);
    };
  }, [groups, useRects]);

  // Fallback: rectangles measured against this overlay's own origin, so it
  // works under any positioned ancestor without knowing which one it is.
  const [rects, setRects] = useState<Array<BoxRect & { key: string; color: string; suggestion: boolean }>>([]);
  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!useRects || !root) {
      setRects((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    const origin = root.getBoundingClientRect();
    const next = groups.flatMap((group) =>
      group.ranges.flatMap((range, r) =>
        rangeRects(range).map((rect, i) => ({
          key: `${group.name}-${r}-${i}`,
          color: group.color,
          suggestion: group.suggestion,
          left: rect.left - origin.left,
          top: rect.top - origin.top,
          width: rect.width,
          height: rect.height,
        }))
      )
    );
    setRects((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  }, [groups, useRects, version]);

  const css = useRects
    ? ""
    : groups
        .map(
          (g) =>
            `::highlight(${g.name}){background-color:${withAlpha(g.color, alpha)};` +
            (g.suggestion
              ? `text-decoration:underline;text-decoration-color:${g.color};text-underline-offset:3px;`
              : "") +
            `}`
        )
        .join("");

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={`ob-thread-highlights${className ? ` ${className}` : ""}`}
      style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, pointerEvents: "none" }}
      {...{ [THREADS_UI_ATTRIBUTE]: "" }}
    >
      {css && <style>{css}</style>}
      {rects.map((rect) => (
        <div
          key={rect.key}
          data-testid="thread-highlight-rect"
          style={{
            position: "absolute",
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            backgroundColor: withAlpha(rect.color, alpha),
            borderBottom: rect.suggestion ? `1px solid ${rect.color}` : undefined,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}
