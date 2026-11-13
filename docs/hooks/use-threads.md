# `useThreads` -- Comment Threads

Comments and suggested edits pinned to text. Threads live in room storage, so everyone in the room sees them appear, get replies and resolve in real time, and they persist wherever your storage persists.

For the ready-made UI (selection popover, highlights, margin cards) see [Comment thread components](../components/comment-threads.md).

---

## API Reference

| Hook | Signature | Description |
|------|-----------|-------------|
| `useThreads(filter?)` | `(filter?: { status?, blockId? }) => Thread[] \| null` | All threads, oldest first. `null` while storage loads. |
| `useThread(id)` | `(id: string) => Thread \| null` | One thread, or `null` if it does not exist. |
| `useCreateThread()` | `() => (input) => string` | Creates a thread authored by the current user. Returns its id. |
| `useEditThread()` | `() => (id, patch) => boolean` | Edits `body`, `replacement` or `metadata`. Author only. |
| `useReplyToThread()` | `() => (id, body) => string \| null` | Appends a reply. Returns the reply id, or `null` if the thread is gone. |
| `useResolveThread()` | `() => (id, resolved: boolean) => void` | Resolves or reopens. Anyone in the room may. |
| `useDeleteThread()` | `() => (id) => boolean` | Deletes a thread and its replies. Author only. |

All hooks must be called inside a `<RoomProvider>`.

```tsx
import { useThreads, useCreateThread, useResolveThread } from "@waits/lively-react";

function OpenComments() {
  const threads = useThreads({ status: "open" });
  const resolve = useResolveThread();

  if (threads === null) return <p>Loading…</p>;
  return (
    <ul>
      {threads.map((t) => (
        <li key={t.id}>
          <b>{t.authorName}</b> on “{t.anchor.quote}”: {t.body}
          <button onClick={() => resolve(t.id, true)}>Resolve</button>
        </li>
      ))}
    </ul>
  );
}
```

---

## The `Thread` shape

```ts
import type { Thread, ThreadAnchor, ThreadReply } from "@waits/lively-types";

interface Thread {
  id: string;
  anchor: ThreadAnchor;            // where it is pinned
  kind: "comment" | "suggestion";
  replacement?: string;            // suggestion: text that should replace anchor.quote
  body: string;
  authorId: string;
  authorName: string;
  authorColor: string;
  status: "open" | "resolved";
  createdAt: number;
  resolvedAt?: number;             // only while resolved
  resolvedBy?: string;             // only while resolved
  replies: ThreadReply[];
  metadata?: Record<string, unknown>;  // yours; Lively never reads it
}

interface ThreadAnchor {
  blockId: string;   // matches data-lively-block="<blockId>" on an element
  quote: string;     // the exact quoted text inside that block
  prefix?: string;   // text just before the quote
  suffix?: string;   // text just after it
}
```

Hooks return plain data, not CRDT objects. An unchanged thread keeps its object identity between renders, so `React.memo` on a thread row works as expected.

---

## Anchors

A thread is pinned by **block id + quoted text**, not by character offsets:

1. Your app puts a stable id on each commentable element: `<p data-lively-block="intro">`.
2. The anchor stores that id and the exact text the user selected.
3. To find the text again, look up the block and search for the quote. `prefix` and `suffix` pick the right occurrence when the quote repeats.

This survives re-renders and edits elsewhere in the document. When the quoted text itself is rewritten, the anchor stops resolving and the thread is **detached**: it still exists, with its quote, but points at nothing. Decide per app what to do with those (the margin cards list them under "Detached").

Build and resolve anchors with the helpers in `@waits/lively-ui`:

```ts
import { anchorFromSelection, resolveAnchor } from "@waits/lively-ui";

const anchor = anchorFromSelection(container, window.getSelection()); // ThreadAnchor | null
const range = resolveAnchor(container, thread.anchor);                // Range | null
```

> Anchors are text-based on purpose. They fit documents that change in discrete rewrites. Threads that follow text through live co-editing (Yjs relative positions) are not part of this version.

---

## Creating threads

```tsx
const createThread = useCreateThread();

// A comment
createThread({
  anchor: { blockId: "timeline", quote: "two weeks" },
  kind: "comment",
  body: "Does this include QA?",
});

// A suggested edit, tagged for your own bookkeeping
createThread({
  anchor: { blockId: "timeline", quote: "two weeks" },
  kind: "suggestion",
  replacement: "three weeks",
  body: "QA needs a full week.",
  metadata: { batch: "review-3" },
});
```

The author's id, name and colour come from the current user's presence.

Lively does not apply suggestions. A suggestion is data (`anchor.quote` → `replacement`); your app, or an agent reading the threads, decides what to do with it.

---

## Permissions

| Action | Who |
|--------|-----|
| Create, reply, resolve, reopen | Anyone in the room |
| Edit, delete | The thread's author |

A non-author calling `useEditThread()` or `useDeleteThread()` gets `false` back and nothing changes; it does not throw.

> These checks run in the client. They keep honest users out of each other's way; they are not access control. Enforce real permissions on the server.

---

## Storage

Threads are stored as one `LiveMap` at the storage root key `threads` (exported as `THREADS_STORAGE_KEY`), keyed by thread id. Each thread is a `LiveObject` whose `replies` is a `LiveList`.

- **No `initialStorage` entry needed.** The map is created on the first comment.
- **Storage must be loaded.** A room only has storage once some client or the server has provided `initialStorage` (even `{}`). The mutation hooks throw if called before then; wait for `useThreads()` to return non-`null`.
- **First-comment race.** If two people post the room's very first comment in the same instant, both create the map and last-writer-wins keeps one. To rule that out, seed it yourself: `initialStorage={{ threads: new LiveMap() }}`.

---

## Undo / Redo

Every mutation runs in `room.batch()`, so each one is a single undo step, and [`useHistory`](./use-history.md) covers them with no extra work.

Undo is scoped to the local user: undoing your create removes your thread and leaves everyone else's alone.

---

## Reading threads outside React

The same data is reachable from the client SDK, for example in a server-side job that hands a review batch to an agent:

```ts
import { LiveMap, type LiveObject } from "@waits/lively-client";

const { root } = await room.getStorage();
const threads = root.get("threads") as LiveMap<LiveObject> | undefined;

threads?.forEach((thread) => {
  if (thread.get("status") !== "open") return;
  const { blockId, quote } = thread.get("anchor") as { blockId: string; quote: string };
  console.log(blockId, quote, thread.get("kind"), thread.get("body"));
});
```
