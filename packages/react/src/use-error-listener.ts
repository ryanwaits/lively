import { useEffect, useRef } from "react";
import { useRoom } from "./room-context.js";

/**
 * Fires a callback when a WebSocket-level error occurs on the room connection.
 * Uses the callbackRef pattern — no stale closure issues.
 *
 * @example
 * useErrorListener(err => console.error("Room error:", err.message));
 */
export function useErrorListener(
  callback: (error: Error) => void
): void {
  const room = useRoom();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const unsub = room.subscribe("error", (error) => {
      callbackRef.current(error);
    });
    return unsub;
  }, [room]);
}
