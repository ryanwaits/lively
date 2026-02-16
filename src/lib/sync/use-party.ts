"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import PartySocket from "partysocket";
import type { ClientMessage, ServerMessage } from "@/types/messages";
import { usePresenceStore } from "@/lib/store/presence-store";
import { useBoardStore } from "@/lib/store/board-store";

interface UsePartyOptions {
  roomId: string;
  userId: string;
  displayName: string;
}

export function useParty({ roomId, userId, displayName }: UsePartyOptions) {
  const socketRef = useRef<PartySocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { updateCursor, updatePresence } = usePresenceStore();
  const { syncAll, addObject, updateObject, deleteObject } = useBoardStore();

  useEffect(() => {
    if (!userId || !displayName) return;

    const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999";

    const socket = new PartySocket({
      host,
      room: roomId,
      query: { userId, displayName },
    });

    socketRef.current = socket;

    socket.addEventListener("open", () => setIsConnected(true));
    socket.addEventListener("close", () => setIsConnected(false));

    socket.addEventListener("message", (event) => {
      const data: ServerMessage = JSON.parse(event.data);

      switch (data.type) {
        case "cursor:update":
          updateCursor(data.cursor);
          break;
        case "presence":
          updatePresence(data.users);
          break;
        case "sync":
          syncAll(data.objects);
          break;
        case "object:create":
          addObject(data.object);
          break;
        case "object:update":
          updateObject(data.object);
          break;
        case "object:delete":
          deleteObject(data.objectId);
          break;
      }
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId, displayName]);

  const sendMessage = useCallback((msg: ClientMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { sendMessage, isConnected };
}
