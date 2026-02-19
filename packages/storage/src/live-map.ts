import type {
  SerializedCrdt,
  SerializedLiveMap,
  StorageOp,
  SetOp,
  DeleteOp,
} from "@waits/openblocks-types";
import { AbstractCrdt } from "./abstract-crdt.js";

interface MapEntry<V> {
  value: V;
  clock: number;
  deleted: boolean;
}

export class LiveMap<V = unknown> extends AbstractCrdt {
  private _entries = new Map<string, MapEntry<V>>();
  private _immutableCache: ReadonlyMap<string, V> | null = null;

  constructor(entries?: Iterable<[string, V]>) {
    super();
    if (entries) {
      for (const [key, value] of entries) {
        if (value instanceof AbstractCrdt) {
          (value as AbstractCrdt)._parent = this;
          (value as AbstractCrdt)._path = [...this._path, key];
        }
        this._entries.set(key, { value, clock: 0, deleted: false });
      }
    }
  }

  get(key: string): V | undefined {
    const entry = this._entries.get(key);
    if (!entry || entry.deleted) return undefined;
    return entry.value;
  }

  set(key: string, value: V): void {
    const clock = this._doc ? this._doc._clock.tick() : 0;

    if (value instanceof AbstractCrdt) {
      (value as AbstractCrdt)._attach(this._doc!, [...this._path, key], this);
    }

    this._entries.set(key, { value, clock, deleted: false });
    this._immutableCache = null;

    const op: SetOp = {
      type: "set",
      path: this._path,
      key,
      value: serializeValue(value),
      clock,
    };
    this._emitOp(op);
    this._notifySubscribers();
  }

  delete(key: string): void {
    const entry = this._entries.get(key);
    if (!entry || entry.deleted) return;

    const clock = this._doc ? this._doc._clock.tick() : 0;
    entry.deleted = true;
    entry.clock = clock;
    this._immutableCache = null;

    const op: DeleteOp = {
      type: "delete",
      path: this._path,
      key,
      clock,
    };
    this._emitOp(op);
    this._notifySubscribers();
  }

  has(key: string): boolean {
    const entry = this._entries.get(key);
    return !!entry && !entry.deleted;
  }

  get size(): number {
    let count = 0;
    for (const entry of this._entries.values()) {
      if (!entry.deleted) count++;
    }
    return count;
  }

  forEach(cb: (value: V, key: string) => void): void {
    for (const [key, entry] of this._entries) {
      if (!entry.deleted) cb(entry.value, key);
    }
  }

  *entries(): IterableIterator<[string, V]> {
    for (const [key, entry] of this._entries) {
      if (!entry.deleted) yield [key, entry.value];
    }
  }

  *keys(): IterableIterator<string> {
    for (const [key, entry] of this._entries) {
      if (!entry.deleted) yield key;
    }
  }

  *values(): IterableIterator<V> {
    for (const entry of this._entries.values()) {
      if (!entry.deleted) yield entry.value;
    }
  }

  toImmutable(): ReadonlyMap<string, V> {
    if (!this._immutableCache) {
      const m = new Map<string, V>();
      for (const [key, entry] of this._entries) {
        if (!entry.deleted) m.set(key, entry.value);
      }
      this._immutableCache = m;
    }
    return this._immutableCache;
  }

  _serialize(): SerializedCrdt {
    const entries: Record<string, SerializedCrdt> = {};
    for (const [key, entry] of this._entries) {
      if (!entry.deleted) {
        entries[key] = serializeValue(entry.value);
      }
    }
    return { type: "LiveMap", entries };
  }

  _applyOp(op: StorageOp): boolean {
    if (op.type === "set") {
      const setOp = op as SetOp;
      const existing = this._entries.get(setOp.key);
      if (existing && setOp.clock <= existing.clock) {
        return false;
      }
      const value = deserializeValue(setOp.value) as V;
      if (value instanceof AbstractCrdt) {
        (value as AbstractCrdt)._attach(this._doc!, [...this._path, setOp.key], this);
      }
      this._entries.set(setOp.key, { value, clock: setOp.clock, deleted: false });
      this._immutableCache = null;
      this._notifySubscribers();
      return true;
    }
    if (op.type === "delete") {
      const deleteOp = op as DeleteOp;
      const existing = this._entries.get(deleteOp.key);
      if (!existing || deleteOp.clock <= existing.clock) {
        return false;
      }
      existing.deleted = true;
      existing.clock = deleteOp.clock;
      this._immutableCache = null;
      this._notifySubscribers();
      return true;
    }
    return false;
  }

  static _deserialize<V>(serialized: SerializedLiveMap): LiveMap<V> {
    const map = new LiveMap<V>();
    for (const [key, val] of Object.entries(serialized.entries)) {
      const value = deserializeValue(val) as V;
      map._entries.set(key, { value, clock: 0, deleted: false });
    }
    return map;
  }
}

function serializeValue(value: unknown): SerializedCrdt {
  if (value instanceof AbstractCrdt) {
    return value._serialize();
  }
  return value as SerializedCrdt;
}

function deserializeValue(serialized: SerializedCrdt): unknown {
  if (serialized !== null && typeof serialized === "object" && "type" in serialized) {
    if (serialized.type === "LiveMap") {
      return LiveMap._deserialize(serialized as SerializedLiveMap);
    }
  }
  return serialized;
}
