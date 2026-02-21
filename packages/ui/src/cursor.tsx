/**
 * A single cursor indicator positioned absolutely within a `position: relative`
 * container. Matches the cursor style used in the whiteboard example.
 *
 * Supports two display modes:
 * - `"name"` (default): shows a colored name label beside the arrow.
 * - `"avatar"`: shows a 24px circular avatar image (or initials fallback)
 *   beside the arrow instead of the name label.
 */
export interface CursorProps {
  x: number;
  y: number;
  color: string;
  displayName: string;
  className?: string;
  /** Display mode — `"name"` (default) shows a label, `"avatar"` shows a circular avatar. */
  mode?: "name" | "avatar";
  /** URL to the user's avatar image. Used when `mode="avatar"`. */
  avatarUrl?: string;
  /** Extra inline styles, e.g. opacity transitions for inactivity fade. */
  style?: React.CSSProperties;
}

function Initials({ displayName, color }: { displayName: string; color: string }): JSX.Element {
  const letter = displayName.charAt(0).toUpperCase();
  return (
    <div
      className="ml-3 -mt-1 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {letter}
    </div>
  );
}

export function Cursor({
  x,
  y,
  color,
  displayName,
  className,
  mode = "name",
  avatarUrl,
  style: extraStyle,
}: CursorProps): JSX.Element {
  return (
    <div
      className={`pointer-events-none absolute left-0 top-0${className ? ` ${className}` : ""}`}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        willChange: "transform",
        transition: "opacity 300ms",
        ...extraStyle,
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
      >
        <path
          d="M5 3l14 8-8 2-2 8z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>

      {mode === "avatar" ? (
        avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="ml-3 -mt-1 h-6 w-6 rounded-full object-cover"
            style={{ border: `2px solid ${color}` }}
          />
        ) : (
          <Initials displayName={displayName} color={color} />
        )
      ) : (
        <span
          className="ml-4 -mt-1 inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: color }}
        >
          {displayName}
        </span>
      )}
    </div>
  );
}
