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

/**
 * How long a peer's cursor stays on screen after they stop moving.
 *
 * The hero's status chip counts everyone connected, but a cursor only exists
 * while its owner is moving a mouse. At the old five seconds the two told
 * different stories — the chip would say "3 here now" while the page showed
 * nothing, which reads as broken rather than quiet. Thirty seconds keeps a
 * reader who moved recently on screen, so the count and the cursors agree.
 */
const CURSOR_INACTIVITY_MS = 30_000;

function CursorCanvas({ children }: { children: ReactNode }) {
  // The page is a fluid document, so pixel offsets would land on different
  // content at a different window width. Fractions track the layout instead.
  const { ref, onMouseMove } = useCursorTracking<HTMLDivElement>({
    coordinates: "fraction",
  });

  return (
    <div ref={ref} onMouseMove={onMouseMove} className="relative">
      <CursorOverlay
        mode="name"
        inactivityTimeout={CURSOR_INACTIVITY_MS}
        containerRef={ref}
      />
      {children}
    </div>
  );
}

const IDENTITY_KEY = "lively:landing-identity";

/**
 * A stable identity for the lifetime of this tab.
 *
 * Deliberately sessionStorage, not localStorage. The server does not dedupe by
 * userId — two sockets sharing an id show up as two separate people — and
 * `CursorOverlay` hides any cursor whose userId matches your own. Sharing one
 * id across tabs would therefore count your other tabs in the presence total
 * while never drawing their cursors: present in the number, invisible on the
 * page. Per-tab ids keep the count and the cursors telling the same story,
 * and surviving reloads is what stops stale identities piling up in the room.
 */
function readIdentity(): { userId: string; displayName: string } {
  if (typeof window === "undefined") {
    // SSR pass. No socket is opened here; the client replaces this on mount.
    return { userId: "", displayName: "" };
  }
  try {
    const stored = window.sessionStorage.getItem(IDENTITY_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.userId && parsed?.displayName) return parsed;
    }
  } catch {
    // Private browsing and some embedded webviews throw on access.
  }
  const identity = {
    userId: crypto.randomUUID().slice(0, 8),
    displayName: generateFunName(),
  };
  try {
    window.sessionStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  } catch {
    // Non-persistent identity is still a working identity.
  }
  return identity;
}

export function LiveCursors({ children }: { children: ReactNode }) {
  const [{ userId, displayName }] = useState(readIdentity);

  return (
    <LivelyProvider client={client}>
      <RoomProvider roomId="landing" userId={userId} displayName={displayName}>
        <CursorCanvas>{children}</CursorCanvas>
      </RoomProvider>
    </LivelyProvider>
  );
}
