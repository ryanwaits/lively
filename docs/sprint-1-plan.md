# Sprint 1: Detailed Implementation Plan

Foundation sprint — presence enhancements, `useLiveState`, undo/redo.

---

## Phase 1: Presence Enhancements

### 1A. Extend PresenceUser Type

**File: `packages/types/src/types.ts`**

```ts
export type OnlineStatus = "online" | "away" | "offline";

export interface PresenceUser {
  userId: string;
  displayName: string;
  color: string;
  connectedAt: number;
  // NEW
  onlineStatus: OnlineStatus;
  lastActiveAt: number;
  isIdle: boolean;
  avatarUrl?: string;
  location?: string;            // app-defined location ID (page, section, etc.)
  metadata?: Record<string, unknown>;  // arbitrary app-specific data
}
```

Changes:
- Add `OnlineStatus` union type
- Extend `PresenceUser` with 5 new fields
- All new fields are backward-compatible (server populates defaults)

### 1B. Client-Side Activity Tracking

**New file: `packages/client/src/activity-tracker.ts`**

Tracks mouse/keyboard activity + tab visibility to determine idle state.

```ts
export interface ActivityTrackerConfig {
  inactivityTime?: number;       // ms before "away" (default 300_000 = 5min)
  offlineInactivityTime?: number; // ms before "offline" (default 600_000 = 10min)
  onStatusChange?: (status: OnlineStatus) => void;
}

export class ActivityTracker {
  private status: OnlineStatus = "online";
  private lastActivity: number = Date.now();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private config: ActivityTrackerConfig) {}

  start(): void;   // attach mousemove, keydown, visibilitychange listeners
  stop(): void;    // detach listeners, clear timer
  getStatus(): OnlineStatus;
  getLastActiveAt(): number;
  isIdle(): boolean;

  private onActivity(): void;     // reset timer, set "online"
  private onVisibilityChange(): void;  // hidden → "away" immediately
  private checkInactivity(): void;     // poll every 10s, transition states
}
```

Behavior:
- `mousemove`/`keydown`/`touchstart` → reset to "online"
- `visibilitychange` (hidden) → immediately "away"
- No activity for `inactivityTime` → "away"
- No activity for `offlineInactivityTime` → "offline"
- Tab re-focus + activity → "online"
- Poll interval: 10 seconds (check `Date.now() - lastActivity`)

### 1C. Presence Metadata on Wire

**File: `packages/client/src/room.ts`**

Add methods to Room:

```ts
// Update own presence metadata
updatePresence(data: {
  location?: string;
  metadata?: Record<string, unknown>;
}): void;

// Get presence filtered by location
getOthersOnLocation(locationId: string): PresenceUser[];
```

New wire message:

```ts
// Client → Server
{ type: "presence:update", location?: string, metadata?: Record<string, unknown> }
```

Room changes:
- `ActivityTracker` created in constructor, started on `connect()`, stopped on `disconnect()`
- Status changes from tracker → send `presence:update` to server
- `updatePresence()` → send `presence:update` with location/metadata

### 1D. Server-Side Presence Enhancements

**File: `packages/server/src/server.ts`**

Changes:
- Store per-connection metadata: `{ location, metadata, onlineStatus, lastActiveAt }`
- Handle `presence:update` message: update stored metadata, rebroadcast presence
- Heartbeat: client sends `{ type: "heartbeat" }` every 30s (configurable)
- Server tracks `lastHeartbeat` per connection
- Server poll (every 15s): if `lastHeartbeat` > `heartbeatTimeout` → mark "offline", broadcast
- `PresenceUser` construction includes all new fields

**File: `packages/server/src/room.ts`**

Changes:
- `Connection` type gains: `location?, metadata?, onlineStatus, lastActiveAt, lastHeartbeat`
- `getPresenceMessage()` includes new fields in serialized users
- Clear presence cache on any metadata update

### 1E. React Hooks

**File: `packages/react/src/use-others.ts`**

New hooks:

```ts
// Filter others by location
export function useOthersOnLocation(locationId: string): PresenceUser[];

// Subscribe to presence state transitions
export function usePresenceEvent(
  event: 'stateChange',
  callback: (data: { user: PresenceUser; from: OnlineStatus; to: OnlineStatus }) => void
): void;
```

**File: `packages/react/src/room-context.ts`** (RoomProvider)

New optional props:
```ts
inactivityTime?: number;        // passed to ActivityTracker
offlineInactivityTime?: number;
location?: string;              // initial location
presenceMetadata?: Record<string, unknown>;
```

### 1F. UI Enhancements

**File: `packages/ui/src/avatar.tsx`**

- Add status dot indicator (green/yellow/gray) based on `onlineStatus`
- Support `avatarUrl` prop — render image instead of initials when provided

**File: `packages/ui/src/avatar-stack.tsx`**

- Add `onUserClick?: (user: PresenceUser) => void` callback prop
- Filter by location: `locationId?: string` prop

### 1G. New Exports

**File: `packages/types/src/types.ts`** — export `OnlineStatus`
**File: `packages/client/src/index.ts`** — export `ActivityTracker`, `ActivityTrackerConfig`
**File: `packages/react/src/index.ts`** — export `useOthersOnLocation`, `usePresenceEvent`

---

## Phase 2: `useLiveState`

Lightweight reactive state sync — `useState` that syncs across clients. Simpler than CRDT for ephemeral/non-conflicting state.

### 2A. Wire Protocol

**File: `packages/types/src/types.ts`**

```ts
// Client → Server
export interface LiveStateUpdateMessage {
  type: "state:update";
  key: string;
  value: unknown;
  timestamp: number;       // client timestamp for LWW
  merge?: boolean;         // shallow merge vs replace
}

// Server → Client (on join, catch-up)
export interface LiveStateInitMessage {
  type: "state:init";
  states: Record<string, { value: unknown; timestamp: number }>;
}

// Server → Client (single update)
export interface LiveStateUpdateBroadcast {
  type: "state:update";
  key: string;
  value: unknown;
  timestamp: number;
  userId: string;         // who set it
}
```

### 2B. Server-Side State Store

**New file: `packages/server/src/live-state.ts`**

```ts
export class LiveStateStore {
  private states = new Map<string, { value: unknown; timestamp: number; userId: string }>();

  set(key: string, value: unknown, timestamp: number, userId: string, merge?: boolean): boolean;
  get(key: string): { value: unknown; timestamp: number } | undefined;
  getAll(): Record<string, { value: unknown; timestamp: number }>;
  delete(key: string): boolean;
  clear(): void;
}
```

- LWW: only accept if `timestamp >= existing.timestamp`
- Merge mode: `Object.assign(existing, value)` if `merge: true`
- Ephemeral: lives in memory, lost on room cleanup

**File: `packages/server/src/room.ts`**
- Add `liveState: LiveStateStore` to Room
- Initialize on room creation

**File: `packages/server/src/server.ts`**

Handle new messages:
- `state:update` → apply to `room.liveState`, broadcast to all (including sender for confirmation)
- On client join → send `state:init` with all current states

### 2C. Client-Side State Management

**File: `packages/client/src/room.ts`**

New private state:
```ts
private liveStates = new Map<string, { value: unknown; timestamp: number }>();
```

New public methods:
```ts
// Set live state (debounced send)
setLiveState(key: string, value: unknown, options?: { merge?: boolean }): void;

// Get current value
getLiveState(key: string): unknown | undefined;

// Get all states
getAllLiveStates(): Map<string, { value: unknown; timestamp: number }>;

// Subscribe to specific key changes
subscribeLiveState(key: string, callback: (value: unknown) => void): () => void;
```

Message handling additions:
- `state:init` → populate `liveStates` map, notify subscribers
- `state:update` → update map entry (LWW), notify subscribers

Event additions:
- `"liveState"` event type on Room's EventEmitter

### 2D. React Hook: `useLiveState`

**New file: `packages/react/src/use-live-state.ts`**

```ts
export function useLiveState<T>(
  key: string,
  initialValue: T,
  options?: {
    syncDuration?: number;  // debounce ms (default 50)
    merge?: boolean;        // shallow merge vs replace (default false)
  }
): [T, (value: T | ((prev: T) => T)) => void];
```

Implementation:
- `useSyncExternalStore` subscribing to `room.subscribeLiveState(key)`
- Setter debounces `room.setLiveState()` by `syncDuration`
- Supports updater function pattern: `setValue(prev => prev + 1)`
- Returns `initialValue` until first sync
- Shallow-equal memoization on value

**New file: `packages/react/src/use-live-state-data.ts`**

```ts
// Imperative read-only subscription (for consuming state set elsewhere)
export function useLiveStateData<T>(key: string): T | undefined;

// Imperative setter (for setting state consumed elsewhere)
export function useSetLiveState<T>(key: string): (value: T, options?: { merge?: boolean }) => void;
```

### 2E. Exports

**File: `packages/react/src/index.ts`**
- Export `useLiveState`, `useLiveStateData`, `useSetLiveState`

**File: `packages/types/src/types.ts`**
- Export `LiveStateUpdateMessage`, `LiveStateInitMessage`, `LiveStateUpdateBroadcast`

---

## Phase 3: Undo/Redo

Op-level undo/redo built into `packages/storage`. Captures inverse ops automatically — no manual before/after snapshots needed.

### 3A. History Manager

**New file: `packages/storage/src/history.ts`**

```ts
export interface HistoryEntry {
  forward: StorageOp[];   // ops to redo
  inverse: StorageOp[];   // ops to undo
}

export interface HistoryConfig {
  maxEntries?: number;    // default 100
  enabled?: boolean;      // default true
}

export class HistoryManager {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private config: Required<HistoryConfig>;
  private capturing: boolean = false;
  private currentBatch: { forward: StorageOp[]; inverse: StorageOp[] } | null = null;

  constructor(config?: HistoryConfig);

  // Start capturing ops into a single undo entry
  startBatch(): void;
  // Finish batch and push to undo stack
  endBatch(): void;

  // Record a single op + its inverse
  record(forward: StorageOp, inverse: StorageOp): void;

  // Pop from undo stack, return inverse ops to apply
  undo(): StorageOp[] | null;
  // Pop from redo stack, return forward ops to apply
  redo(): StorageOp[] | null;

  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;

  // Subscribe to undo/redo availability changes
  subscribe(callback: () => void): () => void;
}
```

Key design:
- `record()` captures both forward and inverse ops
- Batching groups multiple ops into one undo entry (aligns with `room.batch()`)
- `undo()` returns inverse ops — caller applies them via `StorageDocument`
- New action clears redo stack (standard UX)
- Max entries with FIFO eviction

### 3B. Inverse Op Generation

**New file: `packages/storage/src/inverse.ts`**

Generates the inverse op for any given op + current state:

```ts
export function computeInverseOp(
  op: StorageOp,
  getCurrentValue: (path: string[], key: string) => { value: SerializedCrdt; clock: number } | undefined
): StorageOp;
```

| Forward Op | Inverse Op |
|-----------|------------|
| `set(path, key, newValue, clock)` | `set(path, key, oldValue, oldClock)` if key existed; `delete(path, key, clock)` if new |
| `delete(path, key, clock)` | `set(path, key, oldValue, oldClock)` |
| `list-insert(path, pos, value, clock)` | `list-delete(path, pos, clock)` |
| `list-delete(path, pos, clock)` | `list-insert(path, pos, oldValue, clock)` |
| `list-move(path, from, to, clock)` | `list-move(path, to, from, clock)` |

`getCurrentValue` reads from the CRDT tree *before* the op is applied — this is critical. We compute the inverse op first, then apply the forward op.

### 3C. StorageDocument Integration

**File: `packages/storage/src/storage-document.ts`**

Add history tracking:

```ts
export class StorageDocument {
  private _history: HistoryManager;

  constructor(root: LiveObject, config?: { history?: HistoryConfig }) {
    this._history = new HistoryManager(config?.history);
  }

  // Expose history
  getHistory(): HistoryManager { return this._history; }

  // Modified _onLocalOp — capture inverse before forwarding
  _onLocalOp(op: StorageOp): void {
    // 1. Compute inverse op BEFORE applying (current state is pre-mutation)
    //    Wait — op is generated AFTER local mutation in LiveObject.set().
    //    We need to capture pre-mutation state.
    //    Solution: LiveObject.set() calls _captureBeforeState() before mutating.

    // 2. Record forward + inverse in history
    if (this._history) {
      const inverse = this._pendingInverse;
      if (inverse) {
        this._history.record(op, inverse);
        this._pendingInverse = null;
      }
    }

    // 3. Forward to connection (existing behavior)
    if (this._onOpsGenerated) {
      this._onOpsGenerated([op]);
    }
  }

  // Called by LiveObject BEFORE mutating
  _captureInverse(op: StorageOp): void {
    this._pendingInverse = op;
  }

  // Apply inverse ops (undo) or forward ops (redo)
  applyLocalOps(ops: StorageOp[]): void {
    // Similar to applyOps but:
    // 1. Forces application (ignores LWW clock check — these are local replays)
    // 2. Generates new clock values
    // 3. Sends to server via _onOpsGenerated
    // 4. Does NOT record in history (prevents infinite undo loops)
  }
}
```

**Important design decision**: When undoing, we need to re-clock the inverse ops with fresh Lamport timestamps so they win over the original ops in LWW resolution. The inverse ops are applied locally and sent to server just like normal mutations.

### 3D. LiveObject/LiveMap/LiveList Changes

Each CRDT type needs to capture pre-mutation state before applying local mutations.

**File: `packages/storage/src/live-object.ts`**

```ts
set<K extends keyof T>(key: K, value: T[K]): void {
  const k = key as string;

  // NEW: capture current value for inverse op
  if (this._doc) {
    const existing = this._fields.get(k);
    if (existing) {
      this._doc._captureInverse({
        type: "set", path: this._path, key: k,
        value: serializeValue(existing.value), clock: existing.clock
      });
    } else {
      this._doc._captureInverse({
        type: "delete", path: this._path, key: k, clock: 0
      });
    }
  }

  // ... existing set logic unchanged
}
```

Same pattern for `LiveMap.set()`, `LiveMap.delete()`, `LiveList.push()`, `LiveList.insert()`, `LiveList.delete()`, `LiveList.move()`.

### 3E. Batch Integration

**File: `packages/client/src/room.ts`**

```ts
batch<T>(fn: () => T): T {
  this.batching = true;
  this.batchStorageOps = [];

  // NEW: start history batch so all ops in fn become one undo entry
  this.storageDoc?.getHistory().startBatch();

  try {
    const result = fn();
    return result;
  } finally {
    this.storageDoc?.getHistory().endBatch();  // NEW
    this.batching = false;
    // ... existing flush logic
  }
}
```

### 3F. React Hooks

**New file: `packages/react/src/use-undo-redo.ts`**

```ts
export function useUndo(): () => void;
export function useRedo(): () => void;
export function useCanUndo(): boolean;
export function useCanRedo(): boolean;

// Combined convenience hook
export function useHistory(): {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};
```

Implementation:
- `useUndo` returns stable callback that calls `room.storageDoc.getHistory().undo()` → applies inverse ops via `room.storageDoc.applyLocalOps()`
- `useCanUndo`/`useCanRedo` use `useSyncExternalStore` subscribing to `HistoryManager.subscribe()`
- `useHistory` combines all four

### 3G. Exports

**File: `packages/storage/src/index.ts`** — export `HistoryManager`, `HistoryConfig`, `HistoryEntry`
**File: `packages/react/src/index.ts`** — export `useUndo`, `useRedo`, `useCanUndo`, `useCanRedo`, `useHistory`

---

## Phase 4: Integration & Testing

### Test Plan

**packages/types:**
- Type-level tests (TypeScript compilation)
- Ensure backward compat (old PresenceUser still valid)

**packages/storage (undo/redo):**
- `inverse.test.ts` — verify inverse op generation for every op type
- `history.test.ts` — stack behavior, batching, max entries, clear, subscribe
- `storage-document.test.ts` — end-to-end: mutate → undo → verify state → redo → verify
- Edge cases: undo with nested CRDTs, undo after remote ops, undo empty stack

**packages/client:**
- `activity-tracker.test.ts` — state transitions, timer behavior, visibility events
- `room.test.ts` — live state set/get/subscribe, presence metadata updates
- `room.test.ts` — undo/redo via batch integration

**packages/server:**
- `server.test.ts` — heartbeat timeout, presence metadata relay, live state store
- `live-state.test.ts` — LWW, merge mode, getAll

**packages/react:**
- `use-live-state.test.ts` — sync between two mock rooms, debounce, updater fn
- `use-undo-redo.test.ts` — canUndo/canRedo reactivity, hook stability
- `use-others.test.ts` — useOthersOnLocation filter, usePresenceEvent

**packages/ui:**
- `avatar.test.ts` — status dot rendering, avatarUrl image
- `avatar-stack.test.ts` — onUserClick, locationId filter

### Example App Updates

**examples/nextjs-whiteboard:**
- Replace custom undo-store with SDK `useHistory()` hook
- Replace manual `recordAction()` calls — now automatic
- Add presence status dots to `AvatarStack`
- Add idle detection

**examples/nextjs-todo:**
- Add `useLiveState` demo (e.g., shared filter state)
- Add undo/redo for todo operations

---

## File Summary

### New Files
| File | Package | Purpose |
|------|---------|---------|
| `activity-tracker.ts` | client | Idle/away/offline detection |
| `live-state.ts` | server | Per-room ephemeral state store |
| `history.ts` | storage | Undo/redo stack manager |
| `inverse.ts` | storage | Inverse op computation |
| `use-live-state.ts` | react | `useLiveState`, `useLiveStateData`, `useSetLiveState` |
| `use-undo-redo.ts` | react | `useUndo`, `useRedo`, `useCanUndo`, `useCanRedo`, `useHistory` |
| `use-presence-event.ts` | react | `usePresenceEvent`, `useOthersOnLocation` |

### Modified Files
| File | Package | Changes |
|------|---------|---------|
| `types.ts` | types | `OnlineStatus`, extended `PresenceUser`, live state messages |
| `room.ts` | client | Activity tracker, live state methods, presence metadata, batch→history |
| `connection.ts` | client | Heartbeat ping interval |
| `server.ts` | server | Heartbeat handling, presence metadata, live state handling |
| `room.ts` | server | `LiveStateStore`, extended `Connection` type, presence fields |
| `storage-document.ts` | storage | History integration, `_captureInverse`, `applyLocalOps` |
| `live-object.ts` | storage | Pre-mutation inverse capture in `set()`/`update()` |
| `live-map.ts` | storage | Pre-mutation inverse capture in `set()`/`delete()` |
| `live-list.ts` | storage | Pre-mutation inverse capture in `push()`/`insert()`/`delete()`/`move()` |
| `room-context.ts` | react | New RoomProvider props (inactivity, location, metadata) |
| `use-others.ts` | react | `useOthersOnLocation` |
| `use-self.ts` | react | Include new PresenceUser fields |
| `index.ts` | react | New exports |
| `avatar.tsx` | ui | Status dot, avatarUrl support |
| `avatar-stack.tsx` | ui | `onUserClick`, `locationId` filter |
| `index.ts` | ui | New exports |

---

## Implementation Order

```
Week 1: Presence (Phases 1A-1G)
  Day 1-2: Types + ActivityTracker + tests
  Day 3-4: Server heartbeat + presence metadata + tests
  Day 5: React hooks + UI updates + tests

Week 2: useLiveState (Phases 2A-2E)
  Day 1: Types + server LiveStateStore + tests
  Day 2-3: Client live state methods + message handling + tests
  Day 4: React hooks (useLiveState, useLiveStateData, useSetLiveState) + tests
  Day 5: Integration testing, edge cases

Week 3: Undo/Redo (Phases 3A-3G)
  Day 1: inverse.ts + tests (most critical piece)
  Day 2: HistoryManager + tests
  Day 3: StorageDocument integration + LiveObject/Map/List changes + tests
  Day 4: Room batch integration + React hooks + tests
  Day 5: End-to-end testing, example app migration

Week 4: Integration & Polish (Phase 4)
  Day 1-2: Example app updates (whiteboard undo migration, todo useLiveState)
  Day 3-4: Full integration tests, edge cases, docs
  Day 5: Review, cleanup, ship
```

---

## Open Design Decisions (Sprint 1)

1. **Inverse op timing**: LiveObject.set() mutates then emits. We need pre-mutation state for inverse. Two options:
   - (a) Call `_captureInverse()` before mutation in each CRDT method (proposed above)
   - (b) Refactor to emit op before mutating, let doc capture old state

   Recommendation: (a) — less invasive, keeps mutation flow intact.

2. **Undo scope**: Should undo be per-user (only undo your own ops) or global (undo any op)?
   - Per-user is standard (Google Docs, Figma behavior)
   - Implementation: history only records ops from `_onLocalOp`, not from `applyOps` (remote)
   - Already the case with proposed design

3. **Live state persistence**: Ephemeral (default) vs. persisted to storage doc?
   - Start ephemeral. Add `persist: true` option later that writes to a reserved LiveMap.
   - Keeps initial implementation simple.

4. **Heartbeat interval**: 30s client ping, 45s server timeout?
   - Matches industry standard (Slack uses 30s, Discord uses 41s)
   - Configurable via `RoomProvider` props
