import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";
import {
  useDeleteThread,
  useReplyToThread,
  useResolveThread,
  useSelf,
  useThreads,
} from "@waits/lively-react";
import type { Thread } from "@waits/lively-types";
import {
  THREADS_UI_ATTRIBUTE,
  cx,
  rangeRects,
  useContainerVersion,
  useIsomorphicLayoutEffect,
  useThreadRanges,
} from "./thread-dom.js";

export interface ThreadMarginCardsProps {
  /** The element holding the `data-lively-block` content. */
  containerRef: RefObject<HTMLElement | null>;
  /** Also show resolved threads (dimmed, with a reopen action). Default: false */
  showResolved?: boolean;
  /** Vertical space kept between stacked cards, in px. Default: 8 */
  gap?: number;
  className?: string;
}

/**
 * Stacks cards top to bottom: each sits at its highlight's top unless the card
 * above would overlap it, in which case it is pushed down just far enough.
 * Returns each card's top plus the bottom edge of the whole stack.
 */
export function stackCards(
  items: Array<{ id: string; top: number; height: number }>,
  gap: number
): { tops: Record<string, number>; bottom: number } {
  const tops: Record<string, number> = {};
  let bottom = 0;
  let first = true;
  for (const item of [...items].sort((a, b) => a.top - b.top)) {
    const top = first ? Math.max(0, item.top) : Math.max(item.top, bottom + gap);
    tops[item.id] = top;
    bottom = top + item.height;
    first = false;
  }
  return { tops, bottom };
}

const EMPTY: Thread[] = [];

const ICON_BUTTON =
  "inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 " +
  "dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100";

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Icon({ path }: { path: string }): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

const ICON_CHECK = "M3 8.5l3.2 3.2L13 4.8";
const ICON_REOPEN = "M3.5 8a4.5 4.5 0 1 0 1.4-3.3M3.5 3v2.2h2.2";
const ICON_TRASH = "M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5";

function ThreadCard({ thread, detached }: { thread: Thread; detached: boolean }): JSX.Element {
  const self = useSelf();
  const reply = useReplyToThread();
  const resolve = useResolveThread();
  const remove = useDeleteThread();
  const [draft, setDraft] = useState("");

  const resolved = thread.status === "resolved";
  const isAuthor = self?.userId === thread.authorId;

  const sendReply = () => {
    const body = draft.trim();
    if (!body) return;
    reply(thread.id, body);
    setDraft("");
  };

  const onReplyKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendReply();
    }
  };

  return (
    <article
      data-thread-id={thread.id}
      data-thread-status={thread.status}
      aria-label={`${thread.kind === "suggestion" ? "Suggestion" : "Comment"} by ${thread.authorName}`}
      className={cx(
        "ob-thread-card rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 shadow-sm",
        "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
        resolved && "opacity-70"
      )}
    >
      <header className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: thread.authorColor }}
        />
        <span className="min-w-0 truncate font-medium">{thread.authorName}</span>
        <time
          dateTime={new Date(thread.createdAt).toISOString()}
          className="shrink-0 text-xs text-slate-500 dark:text-slate-400"
        >
          {formatTime(thread.createdAt)}
        </time>
        <span className="ml-auto flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            className={ICON_BUTTON}
            aria-label={resolved ? "Reopen thread" : "Resolve thread"}
            title={resolved ? "Reopen" : "Resolve"}
            onClick={() => resolve(thread.id, !resolved)}
          >
            <Icon path={resolved ? ICON_REOPEN : ICON_CHECK} />
          </button>
          {isAuthor && (
            <button
              type="button"
              className={ICON_BUTTON}
              aria-label="Delete thread"
              title="Delete"
              onClick={() => remove(thread.id)}
            >
              <Icon path={ICON_TRASH} />
            </button>
          )}
        </span>
      </header>

      {resolved && (
        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Resolved</p>
      )}

      {thread.kind === "suggestion" ? (
        <p className="mt-2 break-words leading-snug">
          <del className="text-slate-500 line-through dark:text-slate-400">{thread.anchor.quote}</del>{" "}
          <ins className="font-medium text-emerald-700 no-underline dark:text-emerald-400">
            {thread.replacement ?? ""}
          </ins>
        </p>
      ) : (
        detached && (
          <blockquote className="mt-2 break-words text-slate-500 dark:text-slate-400">
            “{thread.anchor.quote}”
          </blockquote>
        )
      )}

      {thread.body && <p className="mt-2 whitespace-pre-wrap break-words">{thread.body}</p>}

      {thread.replies.length > 0 && (
        <ul className="mt-2 space-y-2 border-t border-slate-200 pt-2 dark:border-slate-700">
          {thread.replies.map((r) => (
            <li key={r.id}>
              <span className="font-medium">{r.authorName}</span>{" "}
              <time
                dateTime={new Date(r.createdAt).toISOString()}
                className="text-xs text-slate-500 dark:text-slate-400"
              >
                {formatTime(r.createdAt)}
              </time>
              <p className="whitespace-pre-wrap break-words">{r.body}</p>
            </li>
          ))}
        </ul>
      )}

      {!resolved && (
        <textarea
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onReplyKeyDown}
          aria-label="Reply"
          placeholder="Reply…"
          className={cx(
            "mt-2 block w-full resize-none rounded border border-slate-200 bg-transparent px-2 py-1 text-sm",
            "placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600",
            "dark:border-slate-700"
          )}
        />
      )}
    </article>
  );
}

/**
 * Renders a card for each thread, aligned to the top of its highlight and
 * pushed down where cards would overlap. Each card can be replied to and
 * resolved; its author can delete it. Threads whose anchor no longer resolves
 * are listed under "Detached" at the bottom with their quote.
 *
 * Place it in a column beside the content. It measures against its own
 * position, so the column only needs to scroll together with the content.
 *
 * @example
 * const ref = useRef<HTMLDivElement>(null);
 * return (
 *   <div className="grid grid-cols-[1fr_18rem] gap-6">
 *     <article ref={ref}>…</article>
 *     <ThreadMarginCards containerRef={ref} />
 *   </div>
 * );
 */
export function ThreadMarginCards({
  containerRef,
  showResolved = false,
  gap = 8,
  className,
}: ThreadMarginCardsProps): JSX.Element {
  const all = useThreads() ?? EMPTY;
  const threads = useMemo(
    () => (showResolved ? all : all.filter((t) => t.status === "open")),
    [all, showResolved]
  );
  const version = useContainerVersion(containerRef);
  const ranges = useThreadRanges(containerRef, threads, version);

  const attached = threads.filter((t) => ranges.has(t.id));
  // Before the container has been seen once, nothing is known to be detached.
  const detached = version === 0 ? [] : threads.filter((t) => !ranges.has(t.id));

  const stackRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{ tops: Record<string, number>; bottom: number }>({
    tops: {},
    bottom: 0,
  });
  // Card heights change with replies and typing; re-stack when any of them does.
  const [cardVersion, setCardVersion] = useState(0);

  useIsomorphicLayoutEffect(() => {
    const stack = stackRef.current;
    if (!stack || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setCardVersion((v) => v + 1));
    for (const el of Array.from(stack.children)) observer.observe(el);
    return () => observer.disconnect();
  }, [attached.map((t) => t.id).join("|")]);

  useIsomorphicLayoutEffect(() => {
    const stack = stackRef.current;
    if (!stack) return;
    const origin = stack.getBoundingClientRect().top;
    const items: Array<{ id: string; top: number; height: number }> = [];
    for (const el of Array.from(stack.children) as HTMLElement[]) {
      const id = el.dataset.cardFor;
      const range = id ? ranges.get(id) : undefined;
      if (!id || !range) continue;
      const first = rangeRects(range)[0];
      items.push({ id, top: first ? first.top - origin : 0, height: el.offsetHeight });
    }
    const next = stackCards(items, gap);
    setLayout((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  }, [ranges, version, cardVersion, gap]);

  return (
    <div
      className={cx("ob-thread-margin-cards", className)}
      {...{ [THREADS_UI_ATTRIBUTE]: "" }}
    >
      <div ref={stackRef} className="relative" style={{ minHeight: layout.bottom }}>
        {attached.map((thread) => {
          const top = layout.tops[thread.id];
          return (
            <div
              key={thread.id}
              data-card-for={thread.id}
              className="absolute inset-x-0 motion-safe:transition-[top] motion-safe:duration-150"
              style={{ top: top ?? 0, visibility: top === undefined ? "hidden" : undefined }}
            >
              <ThreadCard thread={thread} detached={false} />
            </div>
          );
        })}
      </div>

      {detached.length > 0 && (
        <section
          aria-label="Detached threads"
          className={cx("space-y-2", attached.length > 0 && "mt-4")}
        >
          <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Detached
            <span className="sr-only"> — the quoted text is no longer in the document</span>
          </h3>
          {detached.map((thread) => (
            <ThreadCard key={thread.id} thread={thread} detached />
          ))}
        </section>
      )}
    </div>
  );
}
