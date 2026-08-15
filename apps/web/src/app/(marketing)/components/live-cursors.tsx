"use client";

import { useState, type ReactNode } from "react";
import { LivelyClient } from "@waits/lively-client";
import { LivelyProvider, RoomProvider } from "@waits/lively-react";
import { CursorOverlay, useCursorTracking, generateFunName } from "@waits/lively-ui";

// Production must be explicit. The old silent localhost fallback shipped
// `ws://localhost:1999` to every visitor for as long as the variable was
// unset, which is exactly the kind of failure nobody sees.
const configuredUrl = process.env.NEXT_PUBLIC_LIVELY_URL?.trim();

if (!configuredUrl && process.env.NODE_ENV === "production") {
  console.error(
    "[lively] NEXT_PUBLIC_LIVELY_URL is not set. Live cursors are disabled."
  );
}

const serverUrl = configuredUrl || "http://localhost:1999";

const client = new LivelyClient({ serverUrl });

function CursorCanvas({ children }: { children: ReactNode }) {
  const { ref, onMouseMove } = useCursorTracking<HTMLDivElement>();

  return (
    <div ref={ref} onMouseMove={onMouseMove} className="relative">
      <CursorOverlay mode="name" inactivityTimeout={5000} />
      {children}
    </div>
  );
}

export function LiveCursors({ children }: { children: ReactNode }) {
  const [userId] = useState(() => crypto.randomUUID().slice(0, 8));
  const [displayName] = useState(() => generateFunName());

  return (
    <LivelyProvider client={client}>
      <RoomProvider roomId="landing" userId={userId} displayName={displayName}>
        <CursorCanvas>{children}</CursorCanvas>
      </RoomProvider>
    </LivelyProvider>
  );
}
