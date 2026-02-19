import type { PresenceUser } from "@waits/openblocks-types";

export interface AvatarProps {
  user: PresenceUser;
  size?: "sm" | "md";
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * A single user avatar — colored circle with initials and a tooltip.
 * Styled to match the whiteboard example's online users component.
 */
export function Avatar({ user, size = "md", className }: AvatarProps): JSX.Element {
  const sizeClass = size === "sm"
    ? "h-6 w-6 text-[10px]"
    : "h-8 w-8 text-xs";

  return (
    <div
      className={`flex items-center justify-center rounded-full border-2 border-white font-medium text-white shadow-md ${sizeClass}${className ? ` ${className}` : ""}`}
      style={{ backgroundColor: user.color || "#3b82f6" }}
      title={user.displayName}
    >
      {getInitials(user.displayName)}
    </div>
  );
}
