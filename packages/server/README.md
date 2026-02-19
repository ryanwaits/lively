# @waits/openblocks-server

Real-time collaboration server — WebSocket rooms, presence, and cursor relay.

## Quick Start

```ts
import { OpenBlocksServer } from "@waits/openblocks-server";

const server = new OpenBlocksServer({ port: 1999 });
await server.start();
// Clients connect to ws://localhost:1999/rooms/{roomId}
```

## Auth

Provide a custom `AuthHandler` to authenticate WebSocket upgrades. If auth is configured, query-param `userId`/`displayName` are ignored.

```ts
const server = new OpenBlocksServer({
  auth: {
    async authenticate(req) {
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const token = url.searchParams.get("token");
      const user = await verifyToken(token);
      if (!user) return null; // rejects with 401
      return { userId: user.id, displayName: user.name };
    },
  },
});
```

Without auth, clients pass identity via query params:

```
ws://localhost:1999/rooms/my-room?userId=alice&displayName=Alice
```

## Message Handling

All messages must follow a `{ type: string, ...payload }` envelope. The server handles `cursor:update` automatically — everything else is relayed to peers and passed to `onMessage`.

```ts
const server = new OpenBlocksServer({
  onMessage: async (roomId, senderId, message) => {
    console.log(`[${roomId}] ${senderId}:`, message);
    // Persist to database, trigger side effects, etc.
  },
});
```

## Room Events

```ts
const server = new OpenBlocksServer({
  onJoin: (roomId, user) => {
    console.log(`${user.displayName} joined ${roomId}`);
  },
  onLeave: (roomId, user) => {
    console.log(`${user.displayName} left ${roomId}`);
  },
});
```

## External Broadcast

Push messages into a room from outside the WebSocket flow (e.g., an HTTP API handler):

```ts
server.broadcastToRoom("room-id", JSON.stringify({ type: "notify", text: "Hello" }));
```

## API Reference

| Export | Description |
|--------|-------------|
| `OpenBlocksServer` | Main server class — manages rooms, connections, message routing |
| `Room` | Single room — tracks connections, provides `broadcast`/`send` |
| `RoomManager` | Room lifecycle — create, get, cleanup on disconnect |
| `ServerConfig` | Config for `OpenBlocksServer` — port, path, auth, callbacks |
| `AuthHandler` | Interface for custom auth — `authenticate(req)` |
| `PresenceUser` | User in a room — `userId`, `displayName`, `color`, `connectedAt` |
| `CursorData` | Cursor position — `userId`, `displayName`, `color`, `x`, `y`, `lastUpdate` |
| `RoomConfig` | Room tuning — `cleanupTimeoutMs`, `maxConnections` |

## Built-in Behavior

- **Presence**: Broadcasts `{ type: "presence", users }` on every join/leave
- **Cursor relay**: `cursor:update` messages are enriched with sender info and relayed to peers (sender excluded)
- **Color assignment**: Deterministic color from userId hash — consistent across reconnects
- **Room cleanup**: Empty rooms are removed after a configurable timeout (default 30s)
