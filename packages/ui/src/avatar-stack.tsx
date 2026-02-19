import { useOthers, useSelf } from "@waits/openblocks-react";
import { Avatar } from "./avatar.js";

export interface AvatarStackProps {
  /** Max avatars before overflow badge. Default: 4 */
  max?: number;
  /** Include the current user's own avatar. Default: true */
  showSelf?: boolean;
  className?: string;
}

/**
 * Renders a stacked row of avatars for all users in the room.
 * Shows a `+N` overflow badge when users exceed `max`.
 *
 * @example
 * <AvatarStack max={5} />
 */
export function AvatarStack({ max = 4, showSelf = true, className }: AvatarStackProps): JSX.Element {
  const others = useOthers();
  const self = useSelf();

  const users = showSelf && self ? [self, ...others] : others;
  const visible = users.slice(0, max);
  const overflow = users.length - visible.length;

  return (
    <div className={`flex -space-x-2${className ? ` ${className}` : ""}`}>
      {visible.map((u) => (
        <Avatar key={u.userId} user={u} />
      ))}
      {overflow > 0 && (
        <div className="flex h-8 w-8 cursor-default items-center justify-center rounded-full border-2 border-white bg-slate-100 text-xs font-medium text-slate-500 shadow-md">
          +{overflow}
        </div>
      )}
    </div>
  );
}
