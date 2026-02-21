# Cursor Follow Architecture

Figma-style "follow user" — mirror another user's viewport so you see exactly what they see. The library provides viewport data on the wire; follow UX is app-layer.

## Layer Overview

```
┌─────────────────────────────────────────────────────┐
│  @waits/openblocks-types                            │
│  CursorData { x, y, viewportPos?, viewportScale? }  │
│  ClientCursorMessage (client→server, no user meta)   │
└──────────────────────┬──────────────────────────────┘
                       │
    ┌──────────────────┼──────────────────┐
    ▼                  ▼                  ▼
┌──────────┐   ┌────────────┐   ┌──────────────┐
│  client   │   │   server   │   │    react     │
│  Room     │   │  broadcast │   │  useCursors  │
│  class    │──▶│  + enrich  │──▶│  useUpdate   │
└──────────┘   └────────────┘   │  Cursor      │
                                └──────────────┘
                                       │
                        ┌──────────────┘
                        ▼
              ┌─────────────────────┐
              │  App layer (example) │
              │  useFollowUser()    │
              │  useBoardMutations  │
              │  OnlineUsers UI     │
              └─────────────────────┘
```

## packages/types

Wire protocol definitions. Two key interfaces:

- **`CursorData`** — full state broadcast from server to clients: `userId`, `displayName`, `color`, `x`, `y`, `lastUpdate`, plus optional `viewportPos` and `viewportScale`.
- **`ClientCursorMessage`** — slim client→server payload: only `x`, `y`, `viewportPos?`, `viewportScale?`. Server enriches with user metadata before broadcasting.

## packages/client

**`Room.updateCursor(x, y, viewportPos?, viewportScale?)`** — public API. Throttled at 50ms default. Queues pending updates and sends via WebSocket.

**`Room.sendCursor()`** — formats a `ClientCursorMessage` and writes to the socket.

Incoming `cursor:update` messages are stored in `Room.cursors: Map<string, CursorData>` and a `"cursors"` event is emitted for React hook subscriptions. Cursors are wiped on disconnect/reconnect.

## packages/server

On `cursor:update` receipt:

1. **Validates** — x/y are finite numbers; viewportPos/viewportScale validated separately
2. **Enriches** — attaches `userId`, `displayName`, `color`, `lastUpdate` from the connection
3. **Broadcasts** — sends full `CursorData` to all other clients in the room (excludes sender)

Server is a relay + enrichment hub. Clients never send user metadata themselves.

## packages/react

Two hooks (exported from `@waits/openblocks-react`):

- **`useCursors()`** — subscribes to the cursors map via `useSyncExternalStore`. Equality check includes `viewportPos` and `viewportScale` fields, so viewport changes trigger re-renders.
- **`useUpdateCursor()`** — stable callback wrapping `room.updateCursor()`. Accepts optional viewport args: `(x, y, viewportPos?, viewportScale?)`.

**These four packages are the library.** No follow logic, no UI opinions. Viewport data rides on the cursor wire protocol as opt-in fields.

## App layer (examples/nextjs-whiteboard)

### use-board-mutations.ts

Wraps `useUpdateCursor` to automatically attach local viewport state at send time:

```ts
const updateCursor = useCallback(
  (x: number, y: number) => {
    const { pos, scale } = useViewportStore.getState();
    updateCursorFn(x, y, pos, scale);
  },
  [updateCursorFn]
);
```

Every cursor broadcast includes current pan + zoom — no separate viewport message needed.

### use-follow-user.ts

The follow logic hook. Consumes `useCursors()` + `useOthers()`:

1. **Auto-exit** — if followed user disconnects (presence-based), calls `onAutoExit()`
2. **Viewport sync** — reads `cursor.viewportPos` + `cursor.viewportScale` for the followed user, calls `applyViewport(pos, scale)` to set the local camera

### online-users.tsx

Pure UI. Avatar click opens dropdown with "Follow [Name]" / "Stop following". Sets `followingUserId` state — no cursor logic.

### page.tsx (board/[id])

Wires everything together:

- **State**: `followingUserId` + `useFollowUser` hook
- **Viewport broadcast**: subscribes to viewport store — re-broadcasts cursor+viewport on every pan/zoom
- **Join broadcast**: re-broadcasts current state when a new user joins so they can follow immediately
- **Exit triggers**: Escape key, badge ✕ button, dropdown "Stop following"
- **UI**: "Following X ✕" badge + blue ring on followed user's avatar

## Data Flow

```
User B moves mouse / pans / zooms
  → mutations.updateCursor(x, y) + viewport injected from store
  → Room.sendCursor() over WebSocket (throttled 50ms)
  → Server validates, enriches with user metadata, broadcasts
  → User A's Room receives, stores in cursors map, emits "cursors"
  → useCursors() triggers re-render
  → useFollowUser() reads B's viewportPos + viewportScale
  → canvasRef.setViewport(pos, scale)
  → User A sees B's exact viewport
```

## Consumer Guide

The library gives you the plumbing. A consumer building on openblocks would:

1. **Send viewport data** — pass `viewportPos` and `viewportScale` when calling `useUpdateCursor()` (or wrap it like `useBoardMutations` does)
2. **Build follow logic** — read `cursor.viewportPos`/`cursor.viewportScale` from the `useCursors()` map and apply to your camera (see `use-follow-user.ts` as reference)
3. **Build follow UI** — trigger follow/unfollow from your own presence component

The library handles throttling, broadcasting, server enrichment, and reactive subscriptions. Follow UX is yours to build.
