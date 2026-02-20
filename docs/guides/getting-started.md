# Getting Started

OpenBlocks is a real-time collaboration framework. This guide covers the four foundational APIs you need to go from zero to a live, multiplayer app: **`OpenBlocksClient`**, **`OpenBlocksProvider`**, **`RoomProvider`**, and the hooks **`useRoom`** and **`useStorageRoot`**.

---

## Quick Start

```bash
npm install @waits/openblocks-client @waits/openblocks-react
```

```tsx
import { OpenBlocksClient } from "@waits/openblocks-client";
import {
  OpenBlocksProvider,
  RoomProvider,
  useStorage,
  useMutation,
  LiveObject,
} from "@waits/openblocks-react";

// 1. Create a single client instance (module-level singleton)
const client = new OpenBlocksClient({
  serverUrl: "ws://localhost:2001",
});

// 2. Wrap your app with providers
function App() {
  return (
    <OpenBlocksProvider client={client}>
      <RoomProvider
        roomId="my-room"
        userId="user-123"
        displayName="Alice"
        initialStorage={{ counter: new LiveObject({ value: 0 }) }}
      >
        <Counter />
      </RoomProvider>
    </OpenBlocksProvider>
  );
}

// 3. Read and write collaborative state
function Counter() {
  const count = useStorage((root) => root.get("counter").get("value"));
  const increment = useMutation((root) => {
    const counter = root.get("counter");
    counter.set("value", counter.get("value") + 1);
  }, []);

  return <button onClick={increment}>Count: {count}</button>;
}
```

That's it. Every browser tab pointing at `"my-room"` sees the same counter and updates in real time.

---

## `OpenBlocksClient`

The client manages WebSocket connections and room lifecycles. Create **one instance** and reuse it everywhere.

### Constructor

```ts
import { OpenBlocksClient } from "@waits/openblocks-client";

const client = new OpenBlocksClient({
  serverUrl: "ws://localhost:2001",
  reconnect: true,
  maxRetries: 10,
});
```

### Config

| Property | Type | Default | Description |
|---|---|---|---|
| `serverUrl` | `string` | **required** | WebSocket server URL. Accepts `ws://`, `wss://`, `http://`, or `https://` (http schemes are auto-converted to ws). |
| `reconnect` | `boolean` | `undefined` | Automatically reconnect on unexpected disconnects. |
| `maxRetries` | `number` | `undefined` | Maximum reconnection attempts before giving up. |
| `WebSocket` | `{ new(url: string): WebSocket }` | `undefined` | Custom WebSocket constructor. Useful for Node.js environments (pass `ws`). |

### Singleton Pattern

> **Always create the client at module level, outside any component.** Placing it inside a component causes a new instance on every render, which leaks connections and breaks room state.

```ts
// lib/openblocks.ts
import { OpenBlocksClient } from "@waits/openblocks-client";

export const client = new OpenBlocksClient({
  serverUrl: process.env.NEXT_PUBLIC_OPENBLOCKS_URL!,
  reconnect: true,
});
```

### Methods

| Method | Signature | Description |
|---|---|---|
| `joinRoom` | `(roomId, options) => Room` | Joins a room (idempotent -- returns existing room if already joined). |
| `leaveRoom` | `(roomId) => void` | Disconnects from a room and removes it from the internal map. |
| `getRoom` | `(roomId) => Room \| undefined` | Returns a joined room, or `undefined`. |
| `getRooms` | `() => Room[]` | Returns all currently joined rooms. |

> You rarely call these directly. `RoomProvider` calls `joinRoom` / `leaveRoom` for you.

---

## `OpenBlocksProvider`

A React context provider that makes the `OpenBlocksClient` available to all descendant hooks. It must wrap everything that uses OpenBlocks.

```tsx
import { OpenBlocksProvider } from "@waits/openblocks-react";
import { client } from "./lib/openblocks";

function Root() {
  return (
    <OpenBlocksProvider client={client}>
      <App />
    </OpenBlocksProvider>
  );
}
```

### Props

| Prop | Type | Description |
|---|---|---|
| `client` | `OpenBlocksClient` | **Required.** The singleton client instance. |
| `children` | `ReactNode` | Your application tree. |

---

## `RoomProvider`

Joins a room on mount, leaves on unmount, and provides room + storage context to all child hooks. Must be nested inside `<OpenBlocksProvider>`.

```tsx
import {
  RoomProvider,
  LiveObject,
  LiveMap,
  LiveList,
} from "@waits/openblocks-react";

<RoomProvider
  roomId="project-abc"
  userId={user.id}
  displayName={user.name}
  initialStorage={{
    canvas: new LiveObject({ name: "Untitled", zoom: 1 }),
    shapes: new LiveMap(),
    layers: new LiveList([]),
  }}
  cursorThrottleMs={50}
  inactivityTime={120000}
  offlineInactivityTime={300000}
>
  <Canvas />
</RoomProvider>
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `roomId` | `string` | **required** | Unique room identifier. All clients with the same `roomId` share a session. |
| `userId` | `string` | **required** | Stable identifier for the current user. |
| `displayName` | `string` | **required** | Display name shown to other participants. |
| `initialStorage` | `Record<string, unknown>` | `undefined` | CRDT seed data written to the server on first connection if the room has no existing storage. See [Initial Storage](#initial-storage) below. |
| `cursorThrottleMs` | `number` | `50` | Minimum interval (ms) between outgoing cursor position broadcasts. |
| `inactivityTime` | `number` | `undefined` | Milliseconds of inactivity before the user's presence status becomes `"away"`. |
| `offlineInactivityTime` | `number` | `undefined` | Milliseconds of inactivity before the user's presence status becomes `"offline"`. |
| `location` | `string` | `undefined` | Location identifier for this client (e.g., a page or tab). Used with `useOthersOnLocation`. |
| `presenceMetadata` | `Record<string, unknown>` | `undefined` | Arbitrary metadata attached to this user's presence. |
| `children` | `ReactNode` | **required** | Components that use OpenBlocks hooks. |

### Initial Storage

`initialStorage` defines the CRDT schema for the room. It is only written to the server the **first time** a client connects to an empty room. After that, the server's existing storage is used.

Think of it as a database migration: it sets the initial shape, and all future clients hydrate from the server's authoritative copy.

```tsx
initialStorage={{
  // A nested LiveObject for document metadata
  document: new LiveObject({
    title: "Untitled",
    createdAt: Date.now(),
  }),

  // A LiveMap for key-value collections (e.g., shapes on a canvas)
  shapes: new LiveMap(),

  // A LiveList for ordered collections (e.g., layer ordering)
  layers: new LiveList([]),
}}
```

> **Key point:** Plain values (strings, numbers, booleans) inside a `LiveObject` are fine. Use `LiveMap` and `LiveList` when you need dynamic collections. Nest them as deep as you need.

---

## `useRoom`

Returns the current `Room` instance. Use it when you need direct access to room methods that don't have dedicated hooks.

```tsx
import { useRoom } from "@waits/openblocks-react";

function BatchButton() {
  const room = useRoom();

  const handleClick = () => {
    // Batch multiple mutations into a single network message
    room.batch(() => {
      const root = room.getStorage();
      // ... multiple mutations here
    });
  };

  return <button onClick={handleClick}>Batch update</button>;
}
```

### When to use `useRoom`

- **Batching mutations** via `room.batch()` to group multiple CRDT writes into one network round-trip.
- **Subscribing to room events** like `"status"`, `"presence"`, `"cursors"`, or `"message"`.
- **Sending custom messages** with `room.send()`.
- **Updating presence** directly via `room.updatePresence()`.
- **Undo/redo** via `room.undo()` and `room.redo()`.

```tsx
function StatusLogger() {
  const room = useRoom();

  useEffect(() => {
    const unsub = room.subscribe("status", (status) => {
      console.log("Connection status:", status);
    });
    return unsub;
  }, [room]);

  return null;
}
```

> For most use cases, prefer the dedicated hooks (`useStatus`, `useSelf`, `useOthers`, `useCursors`, etc.) over `useRoom`. They handle subscriptions and re-renders automatically.

---

## `useStorageRoot`

Returns the raw `{ root: LiveObject }` storage object, or `null` while storage is still loading from the server.

```tsx
import { useStorageRoot } from "@waits/openblocks-react";

function DebugStorage() {
  const storage = useStorageRoot();

  if (!storage) return <p>Loading storage...</p>;

  // storage.root is a LiveObject -- the CRDT root
  const title = storage.root.get("document")?.get("title");
  return <pre>{title}</pre>;
}
```

### When to use `useStorageRoot`

Rarely. In almost all cases, prefer **`useStorage(selector)`** instead -- it subscribes to granular changes and only re-renders when the selected value changes.

`useStorageRoot` is useful when you need:

- The raw `LiveObject` reference for advanced CRDT operations.
- To pass the root to a non-React system (e.g., a canvas rendering engine).
- A guard to check whether storage has initialized.

---

## Real-World Patterns

### Multi-Room App

Dynamic `roomId` from URL params, with room switching:

```tsx
import { useParams } from "react-router-dom";

function CollabPage() {
  const { roomId } = useParams<{ roomId: string }>();

  return (
    <OpenBlocksProvider client={client}>
      <RoomProvider
        roomId={roomId!}
        userId={auth.userId}
        displayName={auth.displayName}
        initialStorage={{ doc: new LiveObject({ text: "" }) }}
      >
        <Editor />
      </RoomProvider>
    </OpenBlocksProvider>
  );
}
```

When `roomId` changes, `RoomProvider` automatically leaves the old room and joins the new one.

### Auth Integration

Pass `userId` and `displayName` from your authentication context:

```tsx
import { useAuth } from "./auth";

function AuthenticatedApp() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <Spinner />;
  if (!user) return <LoginPage />;

  return (
    <OpenBlocksProvider client={client}>
      <RoomProvider
        roomId="shared-workspace"
        userId={user.id}
        displayName={user.name}
        presenceMetadata={{ avatar: user.avatarUrl, role: user.role }}
        initialStorage={{ board: new LiveObject({ title: "Team Board" }) }}
      >
        <Workspace />
      </RoomProvider>
    </OpenBlocksProvider>
  );
}
```

### Complex Initial Storage

Nested CRDTs for a whiteboard-style application:

```tsx
import { LiveObject, LiveMap, LiveList } from "@waits/openblocks-react";

const initialStorage = {
  // Document-level metadata
  meta: new LiveObject({
    title: "Untitled Board",
    createdAt: Date.now(),
    createdBy: "",
  }),

  // Shapes indexed by ID -- use LiveMap for dynamic collections
  shapes: new LiveMap<string, LiveObject>(),

  // Ordered layer stack -- use LiveList for ordered items
  layers: new LiveList<string>([]),

  // Per-user viewport state
  viewports: new LiveMap<string, LiveObject>(),
};

<RoomProvider
  roomId="board-1"
  userId={userId}
  displayName={displayName}
  initialStorage={initialStorage}
>
  <Board />
</RoomProvider>
```

### Loading States

Handle the brief moment before storage initializes from the server:

```tsx
import { useStorageRoot, useStorage, useStatus } from "@waits/openblocks-react";

// Option 1: Check storage root directly
function LoadingGuard({ children }: { children: ReactNode }) {
  const storage = useStorageRoot();

  if (!storage) {
    return <div className="loading">Connecting to room...</div>;
  }

  return <>{children}</>;
}

// Option 2: Use connection status
function StatusAwareApp() {
  const status = useStatus();

  if (status === "connecting") return <Spinner />;
  if (status === "disconnected") return <ReconnectBanner />;

  return <App />;
}

// Option 3: useStorage returns null while loading
function SafeTitle() {
  const title = useStorage((root) => root.get("meta")?.get("title"));

  // title is null until storage loads, then the selected value
  return <h1>{title ?? "Loading..."}</h1>;
}
```

---

## Common Mistakes

### Forgetting `initialStorage`

```tsx
// Bad -- room will have no storage if it's the first connection
<RoomProvider roomId="room-1" userId="u1" displayName="Alice">
  <App />
</RoomProvider>

// Good -- always provide initial schema
<RoomProvider
  roomId="room-1"
  userId="u1"
  displayName="Alice"
  initialStorage={{ doc: new LiveObject({ text: "" }) }}
>
  <App />
</RoomProvider>
```

Without `initialStorage`, the first client to connect creates an empty room. Any `useStorage` selectors that expect keys on the root will return `undefined`, and mutations will fail.

### Using Hooks Outside a Provider

```tsx
// This throws: "useRoom must be used within a <RoomProvider>"
function Broken() {
  const room = useRoom(); // No provider above!
  return <div />;
}

// Fix: ensure the component is rendered inside both providers
<OpenBlocksProvider client={client}>
  <RoomProvider roomId="room-1" userId="u1" displayName="Alice">
    <Broken /> {/* Now works */}
  </RoomProvider>
</OpenBlocksProvider>
```

All OpenBlocks hooks (`useRoom`, `useStorage`, `useMutation`, `useSelf`, `useOthers`, etc.) require both `<OpenBlocksProvider>` and `<RoomProvider>` as ancestors.

### Creating Multiple Client Instances

```tsx
// Bad -- new client on every render, leaks WebSocket connections
function App() {
  const client = new OpenBlocksClient({ serverUrl: "ws://localhost:2001" });
  return <OpenBlocksProvider client={client}>...</OpenBlocksProvider>;
}

// Good -- module-level singleton
const client = new OpenBlocksClient({ serverUrl: "ws://localhost:2001" });

function App() {
  return <OpenBlocksProvider client={client}>...</OpenBlocksProvider>;
}
```

Each `OpenBlocksClient` instance maintains its own connection pool. Creating one inside a component means a fresh pool on every render -- connections pile up and state is lost.

---

## Next Steps

- **[`useStorage` and `useMutation`](./storage-hooks.md)** -- Read and write CRDT state with granular subscriptions.
- **[Presence and Cursors](./presence-cursors.md)** -- Show who's online and where their cursor is.
- **[Undo / Redo](./undo-redo.md)** -- Add history support to your collaborative features.
