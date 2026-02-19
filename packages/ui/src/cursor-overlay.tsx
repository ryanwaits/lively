import { useCursors, useSelf } from "@waits/openblocks-react";
import { Cursor } from "./cursor.js";

export interface CursorOverlayProps {
  /** Extra class names applied to each `<Cursor>` element */
  className?: string;
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
export function CursorOverlay({ className }: CursorOverlayProps): JSX.Element {
  const cursors = useCursors();
  const self = useSelf();

  const others = Array.from(cursors.entries()).filter(
    ([userId]) => userId !== self?.userId
  );

  return (
    <>
      {others.map(([userId, cursor]) => (
        <Cursor
          key={userId}
          x={cursor.x}
          y={cursor.y}
          color={cursor.color}
          displayName={cursor.displayName}
          className={className}
        />
      ))}
    </>
  );
}
