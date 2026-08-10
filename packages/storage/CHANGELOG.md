# @waits/lively-storage

## 0.1.1

### Patch Changes

- 4efa332: Fix LiveList children losing their storage path on snapshot hydration. Items loaded via `StorageDocument.deserialize`, `applySnapshot` (reconnect), or the `LiveList` constructor emitted ops addressed at the storage root, so mutations on list items (e.g. toggling a todo's `completed` field) neither synced to other clients nor persisted. Child CRDTs are now re-attached recursively with position-based paths, and `applySnapshot` preserves subscriptions on list children.
  - @waits/lively-types@0.1.1
