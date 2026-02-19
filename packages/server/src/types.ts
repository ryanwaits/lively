import type { IncomingMessage } from "node:http";
import type WebSocket from "ws";

// Re-export shared types from @waits/openblocks-types
export type {
  PresenceUser,
  CursorData,
  ConnectionStatus,
  PresenceMessage,
  CursorUpdateMessage,
  ClientCursorMessage,
} from "@waits/openblocks-types";

import type { PresenceUser } from "@waits/openblocks-types";

// --- Auth ---

export interface AuthHandler {
  authenticate(
    req: IncomingMessage
  ): Promise<{ userId: string; displayName: string } | null>;
}

// --- Config ---

export interface RoomConfig {
  cleanupTimeoutMs?: number;
  maxConnections?: number;
}

export interface ServerConfig {
  port?: number;
  path?: string;
  auth?: AuthHandler;
  roomConfig?: RoomConfig;
  onMessage?: OnMessageHandler;
  onJoin?: OnJoinHandler;
  onLeave?: OnLeaveHandler;
}

// --- Callbacks ---

export type OnMessageHandler = (
  roomId: string,
  senderId: string,
  message: Record<string, unknown>
) => void | Promise<void>;

export type OnJoinHandler = (
  roomId: string,
  user: PresenceUser
) => void | Promise<void>;

export type OnLeaveHandler = (
  roomId: string,
  user: PresenceUser
) => void | Promise<void>;

// --- Internal ---

export interface Connection {
  ws: WebSocket;
  user: PresenceUser;
}
