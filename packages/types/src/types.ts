// --- Presence & Cursor ---

export type OnlineStatus = "online" | "away" | "offline";

export type HighlightRect = { left: number; top: number; width: number; height: number };

export interface PresenceUser {
  userId: string;
  displayName: string;
  color: string;
  connectedAt: number;
  onlineStatus: OnlineStatus;
  lastActiveAt: number;
  isIdle: boolean;
  avatarUrl?: string;
  location?: string;
  metadata?: Record<string, unknown>;
}

/**
 * What `CursorData.x` / `y` are measured in.
 *
 * - `"pixel"` — offsets in px from the tracking container's top-left. Right
 *   for a fixed coordinate space such as a canvas, where every peer means the
 *   same point.
 * - `"fraction"` — offsets as 0–1 of the container's width and height. Right
 *   for a fluid document that reflows, where a pixel offset would land on
 *   different content at a different viewport width.
 *
 * Absent means `"pixel"`, so older clients stay correct on the wire.
 */
export type CursorSpace = "pixel" | "fraction";

export interface CursorData {
  userId: string;
  displayName: string;
  color: string;
  x: number;
  y: number;
  lastUpdate: number;
  viewportPos?: { x: number; y: number };
  viewportScale?: number;
  cursorType?: "default" | "text" | "pointer";
  highlightRect?: HighlightRect;
  /** Coordinate space of `x`/`y`. Defaults to `"pixel"` when absent. */
  space?: CursorSpace;
}

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

// --- Wire Protocol Messages ---

export interface PresenceMessage {
  type: "presence";
  users: PresenceUser[];
}

export interface CursorUpdateMessage {
  type: "cursor:update";
  cursor: CursorData;
}

export interface ClientCursorMessage {
  type: "cursor:update";
  x: number;
  y: number;
  viewportPos?: { x: number; y: number };
  viewportScale?: number;
  cursorType?: "default" | "text" | "pointer";
  highlightRect?: HighlightRect;
}

export interface PresenceUpdateMessage {
  type: "presence:update";
  onlineStatus?: OnlineStatus;
  isIdle?: boolean;
  location?: string;
  metadata?: Record<string, unknown>;
}

export interface HeartbeatMessage {
  type: "heartbeat";
}

// --- Live State ---

export interface LiveStateUpdateMessage {
  type: "state:update";
  key: string;
  value: unknown;
  timestamp: number;
  merge?: boolean;
}

export interface LiveStateInitMessage {
  type: "state:init";
  states: Record<string, { value: unknown; timestamp: number; userId: string }>;
}

export interface LiveStateUpdateBroadcast {
  type: "state:update";
  key: string;
  value: unknown;
  timestamp: number;
  userId: string;
}
