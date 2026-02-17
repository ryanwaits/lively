"use client";

import { usePresenceStore } from "@/lib/store/presence-store";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function OnlineUsers() {
  const onlineUsers = usePresenceStore((s) => s.onlineUsers);

  if (onlineUsers.length === 0) return null;

  return (
    <div className="flex -space-x-2">
      {onlineUsers.map((user) => (
        <div
          key={user.userId}
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-medium text-white shadow-md"
          style={{ backgroundColor: user.color }}
          title={user.displayName}
        >
          {getInitials(user.displayName)}
        </div>
      ))}
    </div>
  );
}
