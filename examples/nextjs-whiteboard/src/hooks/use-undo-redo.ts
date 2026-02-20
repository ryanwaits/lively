"use client";

import { useHistory } from "@waits/openblocks-react";

/**
 * Thin wrapper around the SDK's useHistory() hook.
 * No longer needs mutation functions — the SDK captures inverse ops
 * automatically via CRDT methods (set, delete, etc).
 */
export function useUndoRedo() {
  const { undo, redo, canUndo, canRedo } = useHistory();
  return { undo, redo, canUndo, canRedo };
}
