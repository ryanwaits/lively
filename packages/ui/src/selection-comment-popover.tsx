import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";
import { createPortal } from "react-dom";
import { useCreateThread } from "@waits/lively-react";
import type { ThreadAnchor, ThreadKind } from "@waits/lively-types";
import { anchorFromSelection, resolveAnchor } from "./anchor.js";
import {
  THREADS_UI_ATTRIBUTE,
  createHighlight,
  cx,
  getHighlightRegistry,
  useIsomorphicLayoutEffect,
} from "./thread-dom.js";

export interface SelectionCommentPopoverProps {
  /** The element holding the `data-lively-block` content. */
  containerRef: RefObject<HTMLElement | null>;
  /** Called after a thread is created, with its id. */
  onCreate?: (threadId: string) => void;
  /** Attached to every thread created here, e.g. `{ batch: "review-3" }`. */
  metadata?: Record<string, unknown>;
  className?: string;
}

interface Draft {
  anchor: ThreadAnchor;
  range: Range;
  /** `"menu"` shows the two actions; the others show the compose form. */
  step: "menu" | ThreadKind;
}

const DRAFT_HIGHLIGHT = "lively-thread-draft";
const EDGE = 8;

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600";
const FIELD =
  "block w-full resize-none rounded border border-slate-200 bg-transparent px-2 py-1.5 text-sm " +
  "placeholder:text-slate-400 dark:border-slate-700 " +
  FOCUS;
const MENU_BUTTON =
  "rounded px-2.5 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100 " +
  "dark:text-slate-200 dark:hover:bg-slate-800 " +
  FOCUS;

/**
 * Shows a small popover above a text selection made inside blocks marked
 * `data-lively-block`, offering "Comment" and "Suggest edit". Picking one
 * opens a short form; Cmd/Ctrl+Enter saves, Esc closes. Suggest edit starts
 * from the selected text so the reviewer edits it in place.
 *
 * Selections that span two blocks, or sit outside any block, show nothing.
 * Renders into `document.body`, so it can be placed anywhere inside the room.
 *
 * @example
 * const ref = useRef<HTMLDivElement>(null);
 * return (
 *   <>
 *     <article ref={ref}>
 *       <p data-lively-block="intro">We ship on Friday.</p>
 *     </article>
 *     <SelectionCommentPopover containerRef={ref} metadata={{ batch: "review-3" }} />
 *   </>
 * );
 */
export function SelectionCommentPopover({
  containerRef,
  onCreate,
  metadata,
  className,
}: SelectionCommentPopoverProps): JSX.Element | null {
  const createThread = useCreateThread();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [body, setBody] = useState("");
  const [replacement, setReplacement] = useState("");
  const [position, setPosition] = useState<{ left: number; top: number; below: boolean } | null>(null);

  const popoverRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLTextAreaElement>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const composing = draft !== null && draft.step !== "menu";

  const close = useCallback(() => {
    setDraft(null);
    setBody("");
    setReplacement("");
    setPosition(null);
  }, []);

  // Watch for selections: mouse (mouseup) and keyboard (Shift+arrows → keyup).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const read = (event: Event) => {
      const current = draftRef.current;
      // A form in progress is not replaced by a stray selection.
      if (current && current.step !== "menu") return;
      if (popoverRef.current?.contains(event.target as Node)) return;

      // The selection settles after the event: a click inside an existing
      // selection only collapses it once mouseup has returned.
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        const container = containerRef.current;
        if (!container) return;
        const selection = document.getSelection();
        const anchor = anchorFromSelection(container, selection);
        if (!anchor || !selection) {
          if (draftRef.current) close();
          return;
        }
        const range = resolveAnchor(container, anchor) ?? selection.getRangeAt(0).cloneRange();
        setDraft({ anchor, range, step: "menu" });
      }, 0);
    };

    document.addEventListener("mouseup", read);
    document.addEventListener("keyup", read);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("mouseup", read);
      document.removeEventListener("keyup", read);
    };
  }, [containerRef, close]);

  // Esc closes from anywhere while the popover is open.
  useEffect(() => {
    if (!draft) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [draft, close]);

  // Keep the popover on its selection through scrolling and resizing; flip
  // below the selection when there is no room above.
  useIsomorphicLayoutEffect(() => {
    if (!draft) return;
    const place = () => {
      if (typeof draft.range.getBoundingClientRect !== "function") {
        setPosition({ left: 0, top: 0, below: true });
        return;
      }
      const rect = draft.range.getBoundingClientRect();
      const height = popoverRef.current?.offsetHeight ?? 0;
      const width = popoverRef.current?.offsetWidth ?? 0;
      const below = rect.top - height - EDGE < 0;
      const half = width / 2;
      const viewport = window.innerWidth || document.documentElement.clientWidth || Infinity;
      const center = rect.left + rect.width / 2;
      const left = Math.min(
        Math.max(center, half + EDGE),
        Math.max(half + EDGE, viewport - half - EDGE)
      );
      setPosition({ left, top: below ? rect.bottom + EDGE : rect.top - EDGE, below });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [draft]);

  // Focusing the form drops the native selection, so keep the quote marked.
  useEffect(() => {
    const registry = getHighlightRegistry();
    if (!composing || !draft || !registry) return;
    registry.set(DRAFT_HIGHLIGHT, createHighlight([draft.range]));
    return () => {
      registry.delete(DRAFT_HIGHLIGHT);
    };
  }, [composing, draft]);

  useEffect(() => {
    if (!composing) return;
    const field = firstFieldRef.current;
    if (!field) return;
    field.focus();
    field.select();
  }, [composing]);

  if (!draft || typeof document === "undefined") return null;

  const start = (step: ThreadKind) => {
    setBody("");
    setReplacement(step === "suggestion" ? draft.anchor.quote : "");
    setDraft({ ...draft, step });
  };

  const isSuggestion = draft.step === "suggestion";
  const canSave = isSuggestion
    ? replacement !== draft.anchor.quote
    : body.trim().length > 0;

  const save = () => {
    if (!composing || !canSave) return;
    const id = createThread({
      anchor: draft.anchor,
      kind: draft.step as ThreadKind,
      body: body.trim(),
      ...(isSuggestion && { replacement }),
      ...(metadata && { metadata }),
    });
    document.getSelection()?.removeAllRanges();
    close();
    onCreate?.(id);
  };

  const onFieldKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      save();
    }
  };

  return createPortal(
    <div
      ref={popoverRef}
      role={composing ? "dialog" : "toolbar"}
      aria-label={composing ? (isSuggestion ? "Suggest an edit" : "Add a comment") : "Comment on selection"}
      className={cx(
        "ob-selection-comment-popover z-50 rounded-lg border border-slate-200 bg-white text-slate-900 shadow-lg",
        "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
        composing ? "w-72 p-3" : "flex gap-0.5 p-1",
        className
      )}
      style={{
        position: "fixed",
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        transform: `translate(-50%, ${position?.below ? "0" : "-100%"})`,
        visibility: position ? undefined : "hidden",
      }}
      {...{ [THREADS_UI_ATTRIBUTE]: "" }}
    >
      {composing && (
        <style>{`::highlight(${DRAFT_HIGHLIGHT}){background-color:rgba(250,204,21,0.4)}`}</style>
      )}

      {!composing ? (
        <>
          {/* preventDefault on mousedown keeps the selection visible while choosing */}
          <button
            type="button"
            className={MENU_BUTTON}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => start("comment")}
          >
            Comment
          </button>
          <button
            type="button"
            className={MENU_BUTTON}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => start("suggestion")}
          >
            Suggest edit
          </button>
        </>
      ) : (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          {isSuggestion && (
            <textarea
              ref={firstFieldRef}
              rows={3}
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              onKeyDown={onFieldKeyDown}
              aria-label="Replacement text"
              className={FIELD}
            />
          )}
          <textarea
            ref={isSuggestion ? undefined : firstFieldRef}
            rows={isSuggestion ? 2 : 3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={onFieldKeyDown}
            aria-label={isSuggestion ? "Note (optional)" : "Comment"}
            placeholder={isSuggestion ? "Why? (optional)" : "Add a comment…"}
            className={FIELD}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className={cx(
                "rounded px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                FOCUS
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSave}
              title="Save (Cmd/Ctrl+Enter)"
              className={cx(
                "rounded bg-slate-900 px-2.5 py-1 text-sm font-medium text-white hover:bg-slate-700",
                "disabled:cursor-not-allowed disabled:opacity-40",
                "dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300",
                FOCUS
              )}
            >
              {isSuggestion ? "Suggest" : "Comment"}
            </button>
          </div>
        </form>
      )}
    </div>,
    document.body
  );
}
