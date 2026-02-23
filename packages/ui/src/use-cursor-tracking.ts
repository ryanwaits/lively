import { useRef, useCallback } from "react";
import type { RefObject } from "react";
import type { HighlightRect } from "@waits/lively-types";
import { useUpdateCursor } from "@waits/lively-react";

const INLINE_TAGS = new Set([
  "A", "ABBR", "B", "BDO", "BR", "CITE", "CODE", "DFN", "EM", "I",
  "KBD", "LABEL", "MARK", "Q", "S", "SAMP", "SMALL", "SPAN", "STRONG",
  "SUB", "SUP", "TIME", "U", "VAR",
]);

const PROSE_TAGS = new Set([
  "P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "TD", "TH",
  "BLOCKQUOTE", "FIGCAPTION", "DT", "DD", "CAPTION",
]);

function isProseElement(el: Element): boolean {
  return INLINE_TAGS.has(el.tagName) || PROSE_TAGS.has(el.tagName);
}

function detectCursorType(e: MouseEvent): "default" | "text" | "pointer" {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el) return "default";
  const cursor = getComputedStyle(el).cursor;
  if (cursor === "text") return "text";
  if (cursor === "pointer") return "pointer";
  if (cursor === "auto" && isProseElement(el)) {
    // caretRangeFromPoint (Webkit/Blink) or caretPositionFromPoint (Firefox)
    if (typeof document.caretRangeFromPoint === "function") {
      const range = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (range && range.startContainer.nodeType === Node.TEXT_NODE) return "text";
    } else if (typeof (document as any).caretPositionFromPoint === "function") {
      const pos = (document as any).caretPositionFromPoint(e.clientX, e.clientY);
      if (pos && pos.offsetNode?.nodeType === Node.TEXT_NODE) return "text";
    }
  }
  return "default";
}

/**
 * Returns a `ref` to attach to your container element and an `onMouseMove`
 * handler. Cursor coordinates are computed relative to the container's
 * bounding box and broadcast to the room automatically.
 *
 * Attach both to the same element that wraps `<CursorOverlay>`.
 *
 * @example
 * const { ref, onMouseMove } = useCursorTracking<HTMLDivElement>();
 * return <div ref={ref} onMouseMove={onMouseMove}><CursorOverlay />{children}</div>
 */
export interface CursorTrackingOptions {
  /** Track cursor type changes and text highlights. Default: `false`. */
  trackCursorType?: boolean;
}

export function useCursorTracking<T extends HTMLElement>(
  options?: CursorTrackingOptions
): {
  ref: RefObject<T>;
  onMouseMove: (e: React.MouseEvent) => void;
} {
  const ref = useRef<T>(null);
  const lastTarget = useRef<Element | null>(null);
  const lastCursorType = useRef<"default" | "text" | "pointer">("default");
  const updateCursor = useUpdateCursor();
  const track = options?.trackCursorType ?? false;

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();

      if (!track) {
        updateCursor(e.clientX - rect.left, e.clientY - rect.top);
        return;
      }

      const target = document.elementFromPoint(e.clientX, e.clientY);
      let cursorType = lastCursorType.current;
      if (target !== lastTarget.current) {
        lastTarget.current = target;
        cursorType = detectCursorType(e.nativeEvent);
        lastCursorType.current = cursorType;
      }
      let highlightRect: HighlightRect | undefined;
      if (cursorType === "text" && target) {
        // Use the closest prose-level element for the highlight bounds
        let hlTarget: Element = target;
        if (INLINE_TAGS.has(target.tagName) && target.parentElement && PROSE_TAGS.has(target.parentElement.tagName)) {
          hlTarget = target.parentElement;
        }
        const targetRect = hlTarget.getBoundingClientRect();
        highlightRect = {
          left: targetRect.left - rect.left,
          top: targetRect.top - rect.top,
          width: targetRect.width,
          height: targetRect.height,
        };
      }
      updateCursor(e.clientX - rect.left, e.clientY - rect.top, undefined, undefined, cursorType, highlightRect);
    },
    [updateCursor, track]
  );

  return { ref, onMouseMove };
}
