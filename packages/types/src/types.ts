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

// --- Comment threads ---

/** A plain comment, or a suggested replacement for the quoted text. */
export type ThreadKind = "comment" | "suggestion";

export type ThreadStatus = "open" | "resolved";

/**
 * Where a thread is pinned: a block the app marks with
 * `data-lively-block="<blockId>"`, plus the exact quoted text inside it
 * (W3C TextQuoteSelector style).
 *
 * `prefix` / `suffix` are the text just before and after the quote. They only
 * matter when the quote repeats inside the block.
 */
export interface ThreadAnchor {
  blockId: string;
  quote: string;
  prefix?: string;
  suffix?: string;
}

export interface ThreadReply {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: number;
  editedAt?: number;
}

export interface Thread {
  id: string;
  anchor: ThreadAnchor;
  kind: ThreadKind;
  /** For a suggestion: the text that should replace `anchor.quote`. */
  replacement?: string;
  body: string;
  authorId: string;
  authorName: string;
  authorColor: string;
  status: ThreadStatus;
  createdAt: number;
  /** Set only while `status` is `"resolved"`. */
  resolvedAt?: number;
  /** User id of whoever resolved it. Set only while `status` is `"resolved"`. */
  resolvedBy?: string;
  replies: ThreadReply[];
  /** Free-form app data, e.g. `{ batch: "review-3" }`. Lively never reads it. */
  metadata?: Record<string, unknown>;
}
