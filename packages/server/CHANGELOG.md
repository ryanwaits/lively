# @waits/lively-server

## 0.2.0

### Patch Changes

- Remove stale connections instead of only marking them offline. A client that disappeared without a clean WebSocket close previously stayed in the room's presence list forever, and because those entries counted toward the room size the room could never be cleaned up either. Heartbeat timings and the offline-removal grace window are now configurable through `roomConfig`.
- Updated dependencies
  - @waits/lively-types@0.2.0
  - @waits/lively-storage@0.2.0

## 0.1.2

### Patch Changes

- @waits/lively-storage@0.1.2
- @waits/lively-types@0.1.2

## 0.1.1

### Patch Changes

- Updated dependencies [4efa332]
  - @waits/lively-storage@0.1.1
  - @waits/lively-types@0.1.1

## 0.1.0

### Minor Changes

- Static file serving via the `staticDir` option — resolves like a Next static
  export (`/foo` → `foo`, `foo.html`, `foo/index.html`), guards against path
  traversal, and serves `/_next/static` assets with immutable caching.
- `onRequest` hook for custom HTTP routes, checked after the health endpoint
  and before static files.
- Unified file-based `RoomPersistence` covering both storage flavors:
  StorageDocument JSON snapshots (`rooms/<id>.json`) and binary Yjs updates
  (`rooms/<id>.yjs`), with flavor-aware `list`/`delete`/`exists`.
- `PersistenceBinding` — wires a `RoomPersistence` into server hooks with
  per-room debounced writes and an explicit `flush()` for shutdown.
