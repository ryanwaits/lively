# Lively

Real-time collaboration framework for React. CRDT-powered storage, presence, cursors, live state, and undo/redo — all over WebSockets.

## Packages

| Package | Description |
|---------|-------------|
| [`@waits/lively-types`](packages/types/) | Shared TypeScript types and wire protocol definitions |
| [`@waits/lively-storage`](packages/storage/) | CRDT primitives — `LiveObject`, `LiveMap`, `LiveList` |
| [`@waits/lively-client`](packages/client/) | Framework-agnostic client SDK (browser + Node/Bun) |
| [`@waits/lively-server`](packages/server/) | WebSocket collaboration server |
| [`@waits/lively-react`](packages/react/) | React hooks and providers (40+ hooks) |
| [`@waits/lively-ui`](packages/ui/) | Pre-built components — cursors, avatars, connection badge |
| [`@waits/lively-cli`](packages/cli/) | `lively` dev server CLI |

## Architecture

```
types (base)
  |
storage (CRDT)
  |
client (SDK)            server (WebSocket)
  |                       |
react (hooks)           [standalone]
  |
ui (components)
```

Each layer depends only on layers below it.

## Quick Start

**Server:**

```ts
import { LivelyServer } from "@waits/lively-server";

const server = new LivelyServer({ port: 1999 });
await server.start();
```

**Client (React):**

```tsx
import { LivelyClient } from "@waits/lively-client";
import { LivelyProvider, RoomProvider } from "@waits/lively-react";
import { CursorOverlay, AvatarStack, useCursorTracking } from "@waits/lively-ui";

const client = new LivelyClient({ serverUrl: "ws://localhost:1999" });

function App() {
  return (
    <LivelyProvider client={client}>
      <RoomProvider
        roomId="my-room"
        userId={user.id}
        displayName={user.name}
        initialStorage={{ count: 0 }}
      >
        <Toolbar />
        <Canvas />
      </RoomProvider>
    </LivelyProvider>
  );
}

function Canvas() {
  const { ref, onMouseMove } = useCursorTracking<HTMLDivElement>();
  const count = useStorage(root => root.get("count"));
  const increment = useMutation(({ storage }) => {
    storage.root.set("count", (storage.root.get("count") as number) + 1);
  }, []);

  return (
    <div ref={ref} onMouseMove={onMouseMove} className="relative">
      <CursorOverlay />
      <p>Count: {count}</p>
      <button onClick={increment}>+1</button>
    </div>
  );
}

function Toolbar() {
  return <AvatarStack max={5} showStatus />;
}
```

## Features

- **CRDT Storage** — `LiveObject`, `LiveMap`, `LiveList` with automatic conflict resolution
- **Presence** — online/away/offline status, location tracking, custom metadata
- **Cursors** — real-time cursor tracking with viewport-aware follow mode
- **Live State** — ephemeral shared key-value state (not persisted)
- **Undo/Redo** — automatic inverse op capture, batch support
- **Broadcast Events** — custom ephemeral events between clients
- **Activity Tracking** — automatic inactivity detection (away/offline)
- **Follow Mode** — Figma-style "follow user" with viewport sync
- **Suspense** — `useStorageSuspense` and SSR-safe `ClientSideSuspense`

## Self-hosting & collaboration

Lively is designed to be **self-hosted** — you run the server on your own
hardware (a home server, a VPS, or an [Umbrel](https://umbrel.com) device) and
your collaboration data never leaves it. No SaaS account, no subscription, no
third party. It's an open-source, self-hosted alternative to tools like
Liveblocks or a private Figma-lite for you and the people you trust.

### How real-time collaboration works

Lively is a **server-authoritative hub**, not peer-to-peer. The server holds the
live room (the CRDT document + presence) and relays cursors, edits, and ops to
every connected client, then persists to disk. The important consequence:

> **Collaborators don't need to be on the same network as each other — they each
> just need a path to the server.** The server is the hub.

The connection is always `browser ⇄ server (HTTP + WebSocket)`. Whatever carries
that first hop is transparent to Lively, which is what makes the access model
flexible.

### Access paths

| Path | What it gives you | Exposure |
|------|-------------------|----------|
| **Same LAN** | Everyone on the home/office network reaches the server directly | Nothing leaves your network |
| **[Tailscale](https://tailscale.com)** | Collaborators join over a private WireGuard mesh from anywhere | No public ports opened — the recommended remote path |
| **Tor** | Umbrel exposes each app as a hidden service out of the box | Works anywhere via Tor Browser; too slow for live cursors |
| **Cloudflare Tunnel / reverse proxy** | Public URL | DIY; only with your own auth in front |

### The v1 auth model (and its honest boundary)

On Umbrel, Lively rides the platform's built-in auth: every request is gated by
your Umbrel login, and browsers authorize the same-origin WebSocket via that
session cookie. This is secure and zero-config, but it has a deliberate v1
boundary worth stating plainly:

> **v1 collaboration is among people who share access to the host.** On a
> single-account platform like Umbrel, that means everyone collaborating logs in
> with the same account. Great for a **household or a small trusted team**; not
> yet a way to invite an outside guest without handing over the whole server.

Participants pick a display name when they join, but there is no per-user
identity separation underneath in v1.

### The vision: invite guests securely (v1.1 and beyond)

The goal is to let others join a specific room **securely, without giving up the
host password** — the Liveblocks/Figma "share this board" experience, on your
own hardware. The building blocks are already in place:

- **v1.1 — scoped room tokens.** A `TokenAuthHandler` (against the existing
  [`AuthHandler`](packages/server/src/types.ts) interface) issues short-lived,
  per-room tokens. Combined with whitelisting *only* the WebSocket room paths at
  the proxy (`PROXY_AUTH_WHITELIST: "/rooms/*"` on Umbrel), an invited client
  can join a single board over its own token while the rest of the host stays
  fully locked behind platform auth. This path is verified end-to-end against
  Umbrel's real `app_proxy`.
- **Beyond — real identities & sharing.** Per-user accounts, named participants
  with durable identity, per-board roles (viewer/editor), and shareable invite
  links with expiry — turning "people who share my server" into "people I
  invited to this board."

The end state: a private, self-hosted realtime layer where your data lives on
your hardware, trusted people collaborate on your LAN or over Tailscale with
zero exposure, and you can hand a guest a scoped link to one board without ever
sharing your credentials.

## Examples

| Example | Description |
|---------|-------------|
| [`nextjs-todo`](examples/nextjs-todo/) | Collaborative todo list with `LiveList`, drag-and-drop, presence |
| [`nextjs-whiteboard`](examples/nextjs-whiteboard/) | Full collaborative canvas with shapes, connectors, follow mode |

## Documentation

- [Getting Started](docs/guides/getting-started.md)
- [Server Guide](docs/guides/server.md)
- [Architecture](docs/architecture.md)
- [Hooks Reference](docs/hooks/) (14 docs covering all hook families)
- [Components](docs/components/)

## Development

```bash
bun install
bun run build:packages
bun run test:packages
```
