import type { BoardObject, CursorData, PresenceUser, Frame } from "./board";

// Messages sent from client to server
export type ClientMessage =
  | { type: "cursor:update"; x: number; y: number }
  | { type: "object:create"; object: BoardObject }
  | { type: "object:update"; object: BoardObject; ephemeral?: boolean }
  | { type: "object:delete"; objectId: string }
  | { type: "frame:create"; frame: Frame };

// Messages sent from server to clients
export type ServerMessage =
  | { type: "sync"; objects: BoardObject[] }
  | { type: "presence"; users: PresenceUser[] }
  | { type: "cursor:update"; cursor: CursorData }
  | { type: "object:create"; object: BoardObject }
  | { type: "object:update"; object: BoardObject }
  | { type: "object:delete"; objectId: string }
  | { type: "frame:create"; frame: Frame }
  | { type: "frame:sync"; frames: Frame[] };
