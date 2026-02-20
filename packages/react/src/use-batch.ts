import { useCallback } from "react";
import { useRoom } from "./room-context.js";

/**
 * Returns a stable function that wraps its callback in `room.batch()`.
 * Batched mutations are combined into a single history entry and sent
 * as one network message.
 *
 * @example
 * const batch = useBatch();
 * batch(() => {
 *   root.set("x", 1);
 *   root.set("y", 2);
 * });
 */
export function useBatch(): <T>(fn: () => T) => T {
  const room = useRoom();
  return useCallback(<T>(fn: () => T) => room.batch(fn), [room]);
}
