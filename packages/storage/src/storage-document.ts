import type {
  SerializedCrdt,
  SerializedLiveObject,
  SerializedLiveMap,
  SerializedLiveList,
  StorageOp,
} from "@waits/openblocks-types";
import { AbstractCrdt, type StorageDocumentHost } from "./abstract-crdt.js";
import { LamportClock } from "./clock.js";
import { LiveObject } from "./live-object.js";
import { LiveMap } from "./live-map.js";
import { LiveList } from "./live-list.js";

interface Subscription {
  target: AbstractCrdt;
  callback: () => void;
  isDeep: boolean;
}

export class StorageDocument implements StorageDocumentHost {
  _clock = new LamportClock();
  private _root: LiveObject;
  private _subscriptions = new Set<Subscription>();
  private _onOpsGenerated: ((ops: StorageOp[]) => void) | null = null;

  constructor(root: LiveObject) {
    this._root = root;
    this._attachTree(root, []);
  }

  getRoot(): LiveObject {
    return this._root;
  }

  serialize(): SerializedCrdt {
    return this._root._serialize();
  }

  static deserialize(data: SerializedCrdt): StorageDocument {
    const root = deserializeCrdt(data) as LiveObject;
    return new StorageDocument(root);
  }

  applyOps(ops: StorageOp[]): void {
    for (const op of ops) {
      this._clock.merge(op.clock);
      const target = this._resolveTarget(op);
      if (target) {
        target._applyOp(op);
      }
    }
  }

  applySnapshot(serialized: SerializedCrdt): void {
    // Re-hydrate in-place — preserve subscriptions
    const oldRoot = this._root;
    const newRoot = deserializeCrdt(serialized) as LiveObject;

    // Transfer shallow subscribers from old root to new root
    for (const cb of oldRoot._subscribers) {
      newRoot._subscribers.add(cb);
    }

    // Re-target deep subscriptions that pointed at oldRoot
    for (const sub of this._subscriptions) {
      if (sub.target === oldRoot) {
        sub.target = newRoot;
      }
    }

    this._root = newRoot;
    this._attachTree(newRoot, []);

    // Notify all deep subscribers
    for (const sub of this._subscriptions) {
      sub.callback();
    }
    // Notify all shallow subscribers on new root
    for (const cb of newRoot._subscribers) {
      cb();
    }
  }

  subscribe(
    target: AbstractCrdt,
    callback: () => void,
    opts?: { isDeep?: boolean }
  ): () => void {
    const isDeep = opts?.isDeep ?? false;

    if (isDeep) {
      // Deep: use subscription tracking
      const sub: Subscription = { target, callback, isDeep: true };
      this._subscriptions.add(sub);
      return () => {
        this._subscriptions.delete(sub);
      };
    }

    // Shallow: attach directly to target's subscriber set
    target._subscribers.add(callback);
    return () => {
      target._subscribers.delete(callback);
    };
  }

  _onLocalOp(op: StorageOp): void {
    // Op is already stamped by the set/delete method via _clock.tick().
    // Don't re-stamp — this prevents echoed ops from re-applying locally.
    if (this._onOpsGenerated) {
      this._onOpsGenerated([op]);
    }
  }

  setOnOpsGenerated(cb: (ops: StorageOp[]) => void): void {
    this._onOpsGenerated = cb;
  }

  /** Walk the CRDT tree and notify deep subscriptions */
  _notifyDeepSubscribers(changed: AbstractCrdt): void {
    for (const sub of this._subscriptions) {
      if (!sub.isDeep) continue;
      // Fire if target is the changed node or an ancestor of it
      if (isAncestorOrSelf(sub.target, changed)) {
        sub.callback();
      }
    }
  }

  private _attachTree(node: AbstractCrdt, path: string[]): void {
    node._doc = this;
    node._path = path;

    // Override _notifySubscribers to also trigger deep subscriptions
    const doc = this;
    const originalNotify = node._notifySubscribers.bind(node);
    node._notifySubscribers = function () {
      // Shallow subscribers
      for (const cb of this._subscribers) {
        cb();
      }
      // Deep subscribers
      doc._notifyDeepSubscribers(this);
    };

    // Recurse into children
    if (node instanceof LiveObject) {
      const obj = node.toObject();
      for (const [key, value] of Object.entries(obj)) {
        if (value instanceof AbstractCrdt) {
          value._parent = node;
          this._attachTree(value, [...path, key]);
        }
      }
    } else if (node instanceof LiveMap) {
      node.forEach((value: unknown, key: string) => {
        if (value instanceof AbstractCrdt) {
          (value as AbstractCrdt)._parent = node;
          this._attachTree(value as AbstractCrdt, [...path, key]);
        }
      });
    } else if (node instanceof LiveList) {
      node.forEach((value: unknown, _index: number) => {
        if (value instanceof AbstractCrdt) {
          // For LiveList, the position is the path segment
          // We can't easily get position from index, so skip deep path for now
          (value as AbstractCrdt)._parent = node;
          (value as AbstractCrdt)._doc = this;
        }
      });
    }
  }

  private _resolveTarget(op: StorageOp): AbstractCrdt | null {
    let current: AbstractCrdt = this._root;
    for (const segment of op.path) {
      const next = this._getChild(current, segment);
      if (!next || !(next instanceof AbstractCrdt)) return null;
      current = next;
    }
    return current;
  }

  private _getChild(node: AbstractCrdt, key: string): unknown {
    if (node instanceof LiveObject) {
      return node.get(key);
    }
    if (node instanceof LiveMap) {
      return node.get(key);
    }
    // LiveList children are accessed by position, but ops target the list itself
    return null;
  }
}

function isAncestorOrSelf(ancestor: AbstractCrdt, node: AbstractCrdt): boolean {
  let current: AbstractCrdt | null = node;
  while (current) {
    if (current === ancestor) return true;
    current = current._parent;
  }
  return false;
}

export function deserializeCrdt(data: SerializedCrdt): unknown {
  if (data === null || typeof data !== "object") {
    return data;
  }
  if (!("type" in data)) {
    return data;
  }

  switch (data.type) {
    case "LiveObject": {
      const serialized = data as SerializedLiveObject;
      const obj = new LiveObject();
      for (const [key, val] of Object.entries(serialized.data)) {
        const value = deserializeCrdt(val);
        obj.set(key, value);
      }
      return obj;
    }
    case "LiveMap": {
      const serialized = data as SerializedLiveMap;
      const map = new LiveMap();
      for (const [key, val] of Object.entries(serialized.entries)) {
        const value = deserializeCrdt(val);
        map.set(key, value);
      }
      return map;
    }
    case "LiveList": {
      const serialized = data as SerializedLiveList;
      const list = new LiveList();
      const sorted = [...serialized.items].sort((a, b) =>
        a.position < b.position ? -1 : a.position > b.position ? 1 : 0
      );
      for (const item of sorted) {
        const value = deserializeCrdt(item.value);
        list.push(value);
      }
      return list;
    }
    default:
      return data;
  }
}
