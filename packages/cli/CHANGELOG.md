# @waits/lively-cli

## 0.1.0

### Minor Changes

- Persistence now comes from `@waits/lively-server` (re-exported): the former
  `load`/`save` methods are `loadStorage`/`saveStorage`, and the new
  `loadYjs`/`saveYjs` handle binary Yjs rooms.
- The dev server persists Yjs rooms in addition to storage rooms, via the
  shared `PersistenceBinding` (debounced writes, flush on shutdown).
