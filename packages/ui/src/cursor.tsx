/**
 * A single cursor indicator positioned absolutely within a `position: relative`
 * container. Matches the cursor style used in the whiteboard example.
 */
export interface CursorProps {
  x: number;
  y: number;
  color: string;
  displayName: string;
  className?: string;
}

export function Cursor({ x, y, color, displayName, className }: CursorProps): JSX.Element {
  return (
    <div
      className={`pointer-events-none absolute left-0 top-0${className ? ` ${className}` : ""}`}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        willChange: "transform",
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
      <span
        className="ml-4 -mt-1 inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium text-white"
        style={{ backgroundColor: color }}
      >
        {displayName}
      </span>
    </div>
  );
}
