import { useStatus } from "@waits/openblocks-react";

export interface ConnectionBadgeProps {
  className?: string;
}

/**
 * Shows a status pill when the connection is not `"connected"`.
 * Returns `null` when connected — no badge needed in the happy path.
 *
 * - Yellow: `"connecting"` / `"reconnecting"`
 * - Red: `"disconnected"`
 *
 * @example
 * <div className="flex items-center gap-2">
 *   <ConnectionBadge />
 *   <AvatarStack />
 * </div>
 */
export function ConnectionBadge({ className }: ConnectionBadgeProps): JSX.Element | null {
  const status = useStatus();

  if (status === "connected") return null;

  const colorClass =
    status === "disconnected"
      ? "bg-red-100 text-red-700"
      : "bg-yellow-100 text-yellow-700";

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}${className ? ` ${className}` : ""}`}
    >
      {status}
    </span>
  );
}
