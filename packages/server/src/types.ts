import type { IncomingMessage, ServerResponse } from "node:http";
import type WebSocket from "ws";

// Re-export shared types from @waits/lively-types
export type {
  OnlineStatus,
  PresenceUser,
  CursorData,
  ConnectionStatus,
  PresenceMessage,
  CursorUpdateMessage,
  ClientCursorMessage,
  PresenceUpdateMessage,
  HeartbeatMessage,
  StorageOp,
  SerializedCrdt,
  StorageInitMessage,
  StorageOpsMessage,
  LiveStateUpdateMessage,
  LiveStateInitMessage,
  LiveStateUpdateBroadcast,
} from "@waits/lively-types";

import type { OnlineStatus, PresenceUser, StorageOp, SerializedCrdt } from "@waits/lively-types";

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
  healthPath?: string;
  auth?: AuthHandler;
  roomConfig?: RoomConfig;
  /**
   * Directory of static files to serve for plain HTTP requests.
   * Resolves like a Next.js static export: `/foo` tries `foo`,
   * `foo.html`, then `foo/index.html`. Unmatched requests get 404.
   */
  staticDir?: string;
  /**
   * Custom HTTP handler, checked after the health endpoint and before
   * static files. Return true if the request was handled (response
   * written), false to fall through.
   */
  onRequest?: OnRequestHandler;
  onMessage?: OnMessageHandler;
  onJoin?: OnJoinHandler;
  onLeave?: OnLeaveHandler;
  onStorageChange?: OnStorageChangeHandler;
  initialStorage?: InitialStorageHandler;
  initialYjs?: InitialYjsHandler;
  onYjsChange?: OnYjsChangeHandler;
}

// --- HTTP ---

export type OnRequestHandler = (
  req: IncomingMessage,
  res: ServerResponse
) => boolean | Promise<boolean>;

// --- Storage Callbacks ---

export type OnStorageChangeHandler = (
  roomId: string,
  ops: StorageOp[]
) => void | Promise<void>;

export type InitialStorageHandler = (
  roomId: string
) => Promise<SerializedCrdt | null>;

// --- Yjs Callbacks ---

export type InitialYjsHandler = (
  roomId: string
) => Promise<Uint8Array | null>;

export type OnYjsChangeHandler = (
  roomId: string,
  state: Uint8Array
) => void | Promise<void>;

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
  location?: string;
  metadata?: Record<string, unknown>;
  onlineStatus: OnlineStatus;
  lastActiveAt: number;
  lastHeartbeat: number;
}
