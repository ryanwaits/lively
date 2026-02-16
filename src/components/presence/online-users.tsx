"use client";

import { usePresenceStore } from "@/lib/store/presence-store";

export function OnlineUsers() {
  const onlineUsers = usePresenceStore((s) => s.onlineUsers);

  return (
    <div className="flex items-center gap-1.5">
      {onlineUsers.map((user) => (
        <div
          key={user.userId}
          className="flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-1 shadow-sm backdrop-blur"
          title={user.displayName}
        >
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: user.color }}
          />
          <span className="text-xs font-medium text-gray-700">
            {user.displayName}
          </span>
        </div>
      ))}
    </div>
  );
}
