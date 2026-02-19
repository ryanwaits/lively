// --- Storage Ops ---

export interface SetOp {
  type: "set";
  path: string[];
  key: string;
  value: SerializedCrdt;
  clock: number;
}

export interface DeleteOp {
  type: "delete";
  path: string[];
  key: string;
  clock: number;
}

export interface ListInsertOp {
  type: "list-insert";
  path: string[];
  position: string;
  value: SerializedCrdt;
  clock: number;
}

export interface ListDeleteOp {
  type: "list-delete";
  path: string[];
  position: string;
  clock: number;
}

export interface ListMoveOp {
  type: "list-move";
  path: string[];
  fromPosition: string;
  toPosition: string;
  clock: number;
}

export type StorageOp =
  | SetOp
  | DeleteOp
  | ListInsertOp
  | ListDeleteOp
  | ListMoveOp;

// --- Serialized CRDT ---

export interface SerializedLiveObject {
  type: "LiveObject";
  data: Record<string, SerializedCrdt>;
}

export interface SerializedLiveMap {
  type: "LiveMap";
  entries: Record<string, SerializedCrdt>;
}

export interface SerializedLiveList {
  type: "LiveList";
  items: Array<{ position: string; value: SerializedCrdt }>;
}

export type SerializedCrdt =
  | SerializedLiveObject
  | SerializedLiveMap
  | SerializedLiveList
  | string
  | number
  | boolean
  | null;

// --- Wire Protocol Messages ---

export interface StorageInitMessage {
  type: "storage:init";
  root: SerializedCrdt | null;
}

export interface StorageOpsMessage {
  type: "storage:ops";
  ops: StorageOp[];
  clock?: number;
}
