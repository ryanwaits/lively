import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { LiveList, LiveMap, LiveObject } from "@waits/lively-client";
import type { Room } from "@waits/lively-client";
import type {
  PresenceUser,
  Thread,
  ThreadAnchor,
  ThreadKind,
  ThreadReply,
  ThreadStatus,
} from "@waits/lively-types";
import { useRoom, useStorageRoot } from "./room-context.js";

/** Storage root key holding the `LiveMap` of threads. */
export const THREADS_STORAGE_KEY = "threads";

export interface ThreadsFilter {
  status?: ThreadStatus;
  blockId?: string;
}

export interface CreateThreadInput {
  anchor: ThreadAnchor;
  kind: ThreadKind;
  body: string;
  /** For a suggestion: the text that should replace `anchor.quote`. */
  replacement?: string;
  metadata?: Record<string, unknown>;
}

export interface EditThreadPatch {
  body?: string;
  replacement?: string;
  /** Replaces the thread's metadata wholesale. */
  metadata?: Record<string, unknown>;
}

type ThreadObject = LiveObject<Record<string, unknown>>;
type ThreadMap = LiveMap<ThreadObject>;

// --- Reading ---

function getThreadMap(root: LiveObject): ThreadMap | null {
  const map = root.get(THREADS_STORAGE_KEY);
  return map instanceof LiveMap ? (map as ThreadMap) : null;
}

function readThread(obj: ThreadObject): Thread {
  const replies = obj.get("replies");
  const status = (obj.get("status") as ThreadStatus) ?? "open";
  const thread: Thread = {
    id: obj.get("id") as string,
    anchor: obj.get("anchor") as ThreadAnchor,
    kind: obj.get("kind") as ThreadKind,
    body: obj.get("body") as string,
    authorId: obj.get("authorId") as string,
    authorName: obj.get("authorName") as string,
    authorColor: obj.get("authorColor") as string,
    status,
    createdAt: obj.get("createdAt") as number,
    replies: replies instanceof LiveList ? (replies.toArray() as ThreadReply[]) : [],
  };
  const replacement = obj.get("replacement");
  if (typeof replacement === "string") thread.replacement = replacement;
  const metadata = obj.get("metadata");
  if (metadata && typeof metadata === "object") {
    thread.metadata = metadata as Record<string, unknown>;
  }
  // Resolution fields outlive a reopen in storage; only surface them while resolved.
  if (status === "resolved") {
    const resolvedAt = obj.get("resolvedAt");
    const resolvedBy = obj.get("resolvedBy");
    if (typeof resolvedAt === "number") thread.resolvedAt = resolvedAt;
    if (typeof resolvedBy === "string") thread.resolvedBy = resolvedBy;
  }
  return thread;
}

/**
 * Reads every thread as plain data, oldest first. Unchanged threads keep their
 * previous object identity, and an unchanged list keeps its array identity, so
 * consumers can memoize on either.
 */
function readThreads(root: LiveObject, prev: Thread[]): Thread[] {
  const map = getThreadMap(root);
  if (!map) return prev.length === 0 ? prev : [];

  const prevById = new Map(prev.map((t) => [t.id, t]));
  const next: Thread[] = [];
  map.forEach((obj) => {
    if (!(obj instanceof LiveObject)) return;
    const thread = readThread(obj);
    const old = prevById.get(thread.id);
    next.push(old && JSON.stringify(old) === JSON.stringify(thread) ? old : thread);
  });
  next.sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1));

  const unchanged =
    next.length === prev.length && next.every((t, i) => t === prev[i]);
  return unchanged ? prev : next;
}

function useAllThreads(): Thread[] | null {
  const room = useRoom();
  const storage = useStorageRoot();
  const cache = useRef<{ root: LiveObject | null; dirty: boolean; value: Thread[] }>({
    root: null,
    dirty: true,
    value: [],
  });

  return useSyncExternalStore(
    useCallback(
      (cb) => {
        if (!storage) return () => {};
        // Changes made while unsubscribed were not observed; re-read once.
        cache.current.dirty = true;
        return room.subscribe(
          storage.root,
          () => {
            cache.current.dirty = true;
            cb();
          },
          { isDeep: true }
        );
      },
      [room, storage]
    ),
    useCallback(() => {
      if (!storage) return null;
      const c = cache.current;
      if (c.root !== storage.root) {
        c.root = storage.root;
        c.value = [];
        c.dirty = true;
      }
      if (c.dirty) {
        c.value = readThreads(storage.root, c.value);
        c.dirty = false;
      }
      return c.value;
    }, [storage]),
    () => null
  );
}

/**
 * Returns the room's comment threads as plain data, oldest first.
 * Returns `null` while storage is loading. Re-renders only when a thread
 * that passes the filter changes.
 *
 * @param filter - Optional `status` and/or `blockId` to narrow the list
 *
 * @example
 * const open = useThreads({ status: "open" });
 * if (open === null) return <Spinner />;
 * return <span>{open.length} open comments</span>;
 */
export function useThreads(filter?: ThreadsFilter): Thread[] | null {
  const all = useAllThreads();
  const status = filter?.status;
  const blockId = filter?.blockId;
  const cache = useRef<Thread[]>([]);

  return useMemo(() => {
    if (all === null) return null;
    if (status === undefined && blockId === undefined) return all;
    const next = all.filter(
      (t) =>
        (status === undefined || t.status === status) &&
        (blockId === undefined || t.anchor.blockId === blockId)
    );
    const prev = cache.current;
    if (next.length === prev.length && next.every((t, i) => t === prev[i])) {
      return prev;
    }
    cache.current = next;
    return next;
  }, [all, status, blockId]);
}

/**
 * Returns a single thread by id, or `null` if it does not exist (or storage
 * is still loading).
 *
 * @example
 * const thread = useThread(threadId);
 * if (!thread) return null;
 * return <p>{thread.body}</p>;
 */
export function useThread(id: string): Thread | null {
  const all = useAllThreads();
  return useMemo(() => all?.find((t) => t.id === id) ?? null, [all, id]);
}

// --- Writing ---

interface ThreadMutationContext {
  room: Room;
  root: LiveObject;
  self: PresenceUser;
}

/**
 * Returns the threads map, creating it on first use. The creation is kept out
 * of undo history: otherwise undoing your first comment would remove the whole
 * map, and with it every thread other people added since.
 */
function ensureThreadMap(room: Room, root: LiveObject): ThreadMap {
  const existing = getThreadMap(root);
  if (existing) return existing;

  const history = room.getHistory();
  history?.pause();
  try {
    root.set(THREADS_STORAGE_KEY, new LiveMap<ThreadObject>());
  } finally {
    history?.resume();
  }
  return getThreadMap(root)!;
}

function useThreadMutation<Args extends unknown[], R>(
  name: string,
  fn: (ctx: ThreadMutationContext, ...args: Args) => R
): (...args: Args) => R {
  const room = useRoom();
  const storage = useStorageRoot();
  const fnRef = useRef(fn);
  fnRef.current = fn;

  return useCallback(
    (...args: Args): R => {
      if (!storage) {
        throw new Error(
          `${name}: storage not loaded yet. Wait for useThreads to return a non-null value.`
        );
      }
      const self = room.getSelf();
      if (!self) {
        throw new Error(
          `${name}: not connected yet. Wait for useSelf to return a non-null value.`
        );
      }
      return room.batch(() =>
        fnRef.current({ room, root: storage.root, self }, ...args)
      );
    },
    [room, storage, name]
  );
}

/**
 * Returns a stable callback that creates a thread authored by the current
 * user and returns its id. The threads map is created in storage on first
 * use, so no `initialStorage` entry is needed.
 *
 * @example
 * const createThread = useCreateThread();
 * const id = createThread({
 *   anchor: { blockId: "intro", quote: "ships on Friday" },
 *   kind: "comment",
 *   body: "Is this date confirmed?",
 * });
 */
export function useCreateThread(): (input: CreateThreadInput) => string {
  return useThreadMutation("useCreateThread", ({ room, root, self }, input: CreateThreadInput) => {
    const id = crypto.randomUUID();
    const fields: Record<string, unknown> = {
      id,
      anchor: { ...input.anchor },
      kind: input.kind,
      body: input.body,
      authorId: self.userId,
      authorName: self.displayName,
      authorColor: self.color,
      status: "open",
      createdAt: Date.now(),
      replies: new LiveList<ThreadReply>(),
    };
    if (input.replacement !== undefined) fields.replacement = input.replacement;
    if (input.metadata !== undefined) fields.metadata = input.metadata;

    ensureThreadMap(room, root).set(id, new LiveObject(fields));
    return id;
  });
}

/**
 * Returns a stable callback that edits a thread's body, replacement or
 * metadata. Only the author may edit: for anyone else (or a missing thread)
 * the call does nothing and returns `false`.
 *
 * @example
 * const editThread = useEditThread();
 * editThread(thread.id, { body: "Reworded question" });
 */
export function useEditThread(): (id: string, patch: EditThreadPatch) => boolean {
  return useThreadMutation("useEditThread", ({ root, self }, id: string, patch: EditThreadPatch) => {
    const thread = getThreadMap(root)?.get(id);
    if (!thread || thread.get("authorId") !== self.userId) return false;
    if (patch.body !== undefined) thread.set("body", patch.body);
    if (patch.replacement !== undefined) thread.set("replacement", patch.replacement);
    if (patch.metadata !== undefined) thread.set("metadata", patch.metadata);
    return true;
  });
}

/**
 * Returns a stable callback that appends a reply from the current user and
 * returns the reply id, or `null` if the thread no longer exists.
 *
 * @example
 * const reply = useReplyToThread();
 * reply(thread.id, "Confirmed with the team.");
 */
export function useReplyToThread(): (id: string, body: string) => string | null {
  return useThreadMutation("useReplyToThread", ({ root, self }, id: string, body: string) => {
    const replies = getThreadMap(root)?.get(id)?.get("replies");
    if (!(replies instanceof LiveList)) return null;
    const reply: ThreadReply = {
      id: crypto.randomUUID(),
      authorId: self.userId,
      authorName: self.displayName,
      body,
      createdAt: Date.now(),
    };
    replies.push(reply);
    return reply.id;
  });
}

/**
 * Returns a stable callback that resolves (`true`) or reopens (`false`) a
 * thread. Anyone in the room may resolve.
 *
 * @example
 * const resolveThread = useResolveThread();
 * <button onClick={() => resolveThread(thread.id, true)}>Resolve</button>
 */
export function useResolveThread(): (id: string, resolved: boolean) => void {
  return useThreadMutation("useResolveThread", ({ root, self }, id: string, resolved: boolean) => {
    const thread = getThreadMap(root)?.get(id);
    if (!thread) return;
    if (resolved) {
      thread.set("status", "resolved");
      thread.set("resolvedAt", Date.now());
      thread.set("resolvedBy", self.userId);
    } else {
      thread.set("status", "open");
    }
  });
}

/**
 * Returns a stable callback that deletes a thread and its replies. Only the
 * author may delete: for anyone else (or a missing thread) the call does
 * nothing and returns `false`.
 *
 * @example
 * const deleteThread = useDeleteThread();
 * deleteThread(thread.id);
 */
export function useDeleteThread(): (id: string) => boolean {
  return useThreadMutation("useDeleteThread", ({ root, self }, id: string) => {
    const map = getThreadMap(root);
    const thread = map?.get(id);
    if (!map || !thread || thread.get("authorId") !== self.userId) return false;
    map.delete(id);
    return true;
  });
}
