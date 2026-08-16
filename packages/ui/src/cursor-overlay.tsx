import { useState, useEffect, Fragment } from "react";
import type { RefObject } from "react";
import { useCursors, useOthers, useSelf } from "@waits/lively-react";
import { Cursor } from "./cursor.js";

export interface CursorOverlayProps {
  /** Extra class names applied to each `<Cursor>` element */
  className?: string;
  /** Display mode passed to each `<Cursor>`. Default: `"name"`. */
  mode?: "name" | "avatar" | "cursor";
  /**
   * Milliseconds of cursor inactivity before fading to transparent.
   * Undefined or 0 = no fade.
   */
  inactivityTimeout?: number;
  /**
   * The tracking container — the same ref `useCursorTracking` returns.
   *
   * Required only when peers broadcast `coordinates: "fraction"`, since those
   * cursors carry 0–1 offsets that have to be scaled back up by the local
   * container's size. Pixel cursors ignore it.
   */
  containerRef?: RefObject<HTMLElement | null>;
}

/**
 * Renders a `<Cursor>` for every other user in the room.
 * Automatically excludes the current user's own cursor.
 *
 * Must be placed inside a `position: relative` container that also has
 * the `useCursorTracking` ref attached so coordinates align correctly.
 *
 * @example
 * const { ref, onMouseMove } = useCursorTracking<HTMLDivElement>();
 * return (
 *   <div ref={ref} onMouseMove={onMouseMove} className="relative">
 *     <CursorOverlay />
 *     {children}
 *   </div>
 * );
 */
export function CursorOverlay({
  className,
  mode,
  inactivityTimeout,
  containerRef,
}: CursorOverlayProps): JSX.Element {
  const cursors = useCursors();
  const self = useSelf();
  const others = useOthers();

  // Container size, tracked so fraction cursors can be scaled back to pixels.
  // Only observed when a containerRef is supplied.
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null
  );
  useEffect(() => {
    const el = containerRef?.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  // Force re-render every second to recheck inactivity timestamps
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!inactivityTimeout) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [inactivityTimeout]);

  // Build userId → avatarUrl lookup from presence data
  const avatarMap = new Map<string, string | undefined>();
  for (const user of others) {
    avatarMap.set(user.userId, user.avatarUrl);
  }

  const entries = Array.from(cursors.entries()).filter(
    ([userId]) => userId !== self?.userId
  );

  return (
    <>
      {entries.map(([userId, cursor]) => {
        // Fraction cursors carry 0-1 offsets; scale them by the local
        // container so both sides agree on where the pointer is even when
        // their viewports differ.
        const scale = cursor.space === "fraction";
        if (scale && !size && process.env.NODE_ENV !== "production") {
          console.warn(
            "[lively] Received fraction cursors but <CursorOverlay> has no " +
              "containerRef, so they cannot be positioned. Pass the same ref " +
              "returned by useCursorTracking()."
          );
        }
        const cx = scale && size ? cursor.x * size.width : cursor.x;
        const cy = scale && size ? cursor.y * size.height : cursor.y;
        const rect = cursor.highlightRect;
        const highlight =
          rect && scale && size
            ? {
                left: rect.left * size.width,
                top: rect.top * size.height,
                width: rect.width * size.width,
                height: rect.height * size.height,
              }
            : rect;

        const isInactive =
          inactivityTimeout != null &&
          inactivityTimeout > 0 &&
          Date.now() - cursor.lastUpdate > inactivityTimeout;

        return (
          <Fragment key={userId}>
            {highlight && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  transform: `translate(${highlight.left}px, ${highlight.top}px)`,
                  width: highlight.width,
                  height: highlight.height,
                  backgroundColor: cursor.color,
                  opacity: isInactive ? 0 : 0.12,
                  transition: "opacity 300ms",
                  borderRadius: 4,
                  pointerEvents: "none",
                  zIndex: 9998,
                }}
              />
            )}
            <Cursor
              x={cx}
              y={cy}
              color={cursor.color}
              displayName={cursor.displayName}
              className={className}
              mode={mode}
              avatarUrl={avatarMap.get(userId)}
              cursorType={cursor.cursorType}
              style={isInactive ? { opacity: 0 } : undefined}
            />
          </Fragment>
        );
      })}
    </>
  );
}
