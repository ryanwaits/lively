# CollabBoard

Real-time collaborative whiteboard built with Next.js, Konva, PartyKit, and Supabase.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Runtime** | Node.js / Bun |
| **Canvas** | Konva + react-konva |
| **Styling** | Tailwind CSS v4 + shadcn/ui |
| **Real-time** | PartyKit (WebSocket rooms) |
| **Database** | Supabase (Postgres + Auth) |
| **State** | Zustand |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser Client                    │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐ │
│  │  Zustand  │  │  Konva   │  │   Next.js App     │ │
│  │  Stores   │◄─┤  Canvas  │  │   Router (RSC)    │ │
│  └────┬──┬──┘  └──────────┘  └───────────────────┘ │
│       │  │                                          │
└───────┼──┼──────────────────────────────────────────┘
        │  │
   ┌────┘  └────┐
   ▼            ▼
┌──────┐  ┌──────────┐
│Supa- │  │PartyKit  │
│base  │  │Server    │
│      │  │          │
│- Auth│  │- Cursors │
│- CRUD│  │- Presence│
│- RLS │  │- Sync    │
└──────┘  └──────────┘
```

## Zustand Stores

| Store | Purpose |
|-------|---------|
| `auth-store` | User session, display name, anonymous auth |
| `board-store` | Board objects `Map`, selected IDs, CRUD ops |
| `presence-store` | Live cursors, online user list |
| `viewport-store` | Zoom/pan state, persisted per-board in localStorage |

## Object Types

- **Sticky Note** - colored background, text with formatting
- **Rectangle** - outlined shape with fill color
- **Text** - free-form text with bold/italic/underline/alignment

## Features

- Real-time cursor tracking with color-coded presence
- Multi-select with rubber-band drag
- Resize handles on all shapes
- Inline text editing with formatting toolbar (B/I/U, alignment)
- Viewport zoom/pan with per-board persistence
- Board switcher in bottom toolbar
- Ghost preview during object creation

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                # Root layout + metadata
│   ├── page.tsx                  # Home (board list)
│   └── board/[id]/page.tsx       # Board editor (main page)
├── components/
│   ├── auth/                     # Name dialog
│   ├── boards/                   # Board cards, create dialog
│   ├── canvas/                   # Canvas, shapes, toolbar, sidebar
│   ├── presence/                 # Cursor overlay, online users
│   └── ui/                       # shadcn/ui primitives
├── lib/
│   ├── store/                    # Zustand stores
│   ├── supabase/                 # DB client + queries
│   ├── sync/                     # PartyKit hook + broadcast helpers
│   └── utils.ts                  # cn() utility
└── types/
    ├── board.ts                  # Domain types
    └── messages.ts               # PartyKit message protocol

party/
└── board-room.ts                 # PartyKit server room
```

## Getting Started

```bash
# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_PARTYKIT_HOST

# Run dev server (Next.js + PartyKit)
bun run dev
```

## Database

Schema lives in `supabase-schema.sql`. Two tables:

- **boards** - `id`, `name`, `created_by`, `created_at`
- **board_objects** - `id`, `board_id`, `type`, `x`, `y`, `width`, `height`, `color`, `text`, `z_index`, `created_by`, `updated_at`

RLS enabled on both tables. Anonymous read access, authenticated write access.
