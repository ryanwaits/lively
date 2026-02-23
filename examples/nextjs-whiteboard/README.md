# CollabBoard

Real-time collaborative whiteboard with AI-powered board manipulation. Built on [Lively](../../packages/) — a CRDT-based multiplayer infrastructure.

**Live:** [collab.waits.dev](https://collab.waits.dev)

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16, React 19 |
| Canvas | Pure SVG (no third-party canvas lib) |
| Styling | Tailwind v4, shadcn/ui |
| State | Zustand |
| Sync | Lively (custom CRDT over WebSocket) |
| Persistence | Supabase (Postgres) |
| AI | Anthropic Claude (agentic tool-calling loop) |
| Runtime | Bun |

## Features

### Board

- [x] Infinite canvas with smooth pan/zoom (0.02x–10x, dot-grid background)
- [x] Sticky notes — create, edit text inline, change colors, formatting (bold/italic/underline/alignment)
- [x] Shapes — rectangle, circle, diamond, pill
- [x] Lines/connectors — multi-point polylines, straight or Catmull-Rom curves, arrow heads, labels, object-to-object snapping
- [x] Freehand drawing — pointer gesture with Ramer-Douglas-Peucker simplification
- [x] Standalone text elements
- [x] Emoji stamps — 8 types, Tab to cycle
- [x] Frames — named slide-like regions, `[`/`]` to navigate, create/delete/rename, animated transitions
- [x] Move, resize (8 handles), rotate objects
- [x] Single-click, shift-click multi-select, drag-to-select marquee
- [x] Delete (with cascade to connected lines), duplicate (Cmd+D), copy/paste (Cmd+C/V)
- [x] Undo/redo (Cmd+Z / Cmd+Shift+Z)
- [x] Ghost preview cursor for creation tools
- [x] Keyboard shortcuts for all tools (1-9, S/T/R/C/D/P/L/B/E)

### Real-Time Collaboration

- [x] Multiplayer cursors with name labels and user colors
- [x] Cursor positions lerp-interpolated at 60fps via rAF (decoupled from React render)
- [x] Object creation/modification syncs instantly via CRDT
- [x] Online presence — avatar row showing connected users
- [x] Follow mode — click avatar to track another user's viewport
- [x] CRDT-based conflict resolution (Lamport clock ordering, automatic merge)
- [x] Graceful disconnect/reconnect (`reconnect: true`)
- [x] Board state persists to Supabase (debounced 2s flush, immediate on last-user-leave)
- [x] Cursor frame isolation — only see cursors of users on the same frame
- [x] Connection status badge + sync indicator

### AI Board Agent

Opened via `/` key or sidebar button. 13 tools across all required command categories:

**Creation**
- [x] `createStickyNote` — text, position, color
- [x] `createShape` — rectangle, text, circle, diamond, pill
- [x] `createConnector` — lines/arrows between objects or coordinates, with labels
- [x] `createFrame` — new frame (guarded, only on explicit request)
- [x] `addStamp` — emoji reaction, optionally attached to an object
- [x] `createDrawing` — freehand stroke from point array

**Manipulation**
- [x] `moveObject` — reposition any object
- [x] `resizeObject` — resize any object
- [x] `updateText` — change text content
- [x] `changeColor` — change background/fill color
- [x] `deleteObject` — remove object by ID
- [x] `deleteFrame` — remove frame + cascade delete all objects

**Context**
- [x] `getBoardState` — read current board for multi-step planning

**Complex Commands** — built-in template recipes in the system prompt:
SWOT analysis, retrospective board, Kanban, pros/cons, priority matrix (Eisenhower), user journey map, Venn diagram (2 & 3 circle), flowchart, mind map, architecture diagram, timeline.

All AI mutations write directly to CRDT storage — every user sees results in real-time. Multiple users can issue AI commands simultaneously.

### Auth

- [x] Supabase anonymous auth with display name prompt
- [x] Session persistence across refreshes
- [x] Sign out via sidebar

### Performance

- [x] 60fps viewport — SVG transforms applied via `ref.setAttribute`, bypassing React
- [x] Viewport culling — only render visible objects + 200px padding (AABB with rotation support)
- [x] CRDT notification batching — `applyOps` fires subscribers once per batch, not per op
- [x] Cursor broadcasting via rAF loop (not tied to React render cycle)
- [x] Render tiers — 4-tier z-ordering prevents cross-tier z-fighting
- [x] Diff-only CRDT updates — only changed fields transmitted
- [x] Debounced persistence (2s) and viewport save (300ms)
- [x] Memoized components and derived state (`React.memo`, `useMemo`)

## Setup

```bash
# Install dependencies
bun install

# Configure environment
cp .env.example .env.local
# Fill in:
#   NEXT_PUBLIC_SUPABASE_URL
#   SUPABASE_SERVICE_ROLE_KEY
#   NEXT_PUBLIC_LIVELY_HOST (default: localhost:1999)
#   ANTHROPIC_API_KEY

# Start WebSocket server
bun run server/lively.ts

# Start Next.js dev server (separate terminal)
bun run dev
```

## Architecture

```
src/
  app/
    board/[id]/page.tsx      Main board — all interaction logic
    api/ai/route.ts          AI agentic loop (Claude + 13 tools)
  components/
    canvas/                  SVG canvas, shapes, selection, drawing layers
    presence/                Cursors overlay, online users
    ai/                      AI command bar
    auth/                    Name dialog
  lib/
    ai/                      System prompt, tool definitions, executor
    sync/                    CRDT ↔ Zustand bridge, mutations, client config
    store/                   Zustand stores (board, viewport, frame, auth)
    geometry/                Rotation, snapping, culling, render tiers, curves
    animation/               Viewport transitions
  hooks/                     Line drawing, freehand drawing
  types/                     BoardObject, Frame, ToolMode, etc.
server/
  lively.ts                  WebSocket server entry
  persistence.ts             Supabase diff-write persistence
```

## Testing Scenarios

| Scenario | Status |
|---|---|
| 2 users editing simultaneously in different browsers | Supported |
| User refreshes mid-edit (state persistence) | Supported — Supabase persistence + CRDT rehydration |
| Rapid sticky note/shape creation and movement | Supported — diff-only sync, batched notifications |
| Network throttling and disconnection recovery | Supported — auto-reconnect, debounced persistence |
| 5+ concurrent users without degradation | Supported — viewport culling, rAF cursor loop, CRDT batching |

## Performance Targets

| Metric | Target | Approach |
|---|---|---|
| Frame rate | 60fps during pan/zoom/manipulation | SVG ref transforms, rAF loops |
| Object sync latency | <100ms | WebSocket CRDT, diff-only ops |
| Cursor sync latency | <50ms | rAF broadcast with 50ms room throttle |
| Object capacity | 500+ without drops | Viewport culling, notification batching |
| Concurrent users | 5+ | CRDT merge, presence isolation |
