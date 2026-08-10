import type { SerializedCrdt, StorageOp } from "@waits/lively-types";
import type { LamportClock } from "./clock.js";

export interface StorageDocumentHost {
  _onLocalOp(op: StorageOp): void;
  _captureInverse?(op: StorageOp): void;
  _clock: LamportClock;
  _deserializeValue(data: SerializedCrdt): unknown;
}

export abstract class AbstractCrdt {
  _path: string[] = [];
  _parent: AbstractCrdt | null = null;
  _doc: StorageDocumentHost | null = null;
  _subscribers: Set<() => void> = new Set<() => void>();

  abstract _serialize(): SerializedCrdt;
  abstract _applyOp(op: StorageOp): boolean;

  _emitOp(op: StorageOp): void {
    if (this._doc) {
      this._doc._onLocalOp(op);
    }
  }

  _notifySubscribers(): void {
    for (const cb of this._subscribers) {
      cb();
    }
    // Walk up parent chain for deep subscriptions
    if (this._parent) {
      this._parent._notifySubscribers();
    }
  }

  /** Iterate direct child CRDTs with the path segment that addresses each one. */
  _forEachChild(_cb: (key: string, child: AbstractCrdt) => void): void {}

  _attach(doc: StorageDocumentHost, path: string[], parent: AbstractCrdt | null): void {
    this._doc = doc;
    this._path = path;
    this._parent = parent;
    // Re-attach the whole subtree so descendant paths stay addressable
    // (constructor-assigned paths are relative to a detached parent)
    this._forEachChild((key, child) => {
      child._attach(doc, [...path, key], this);
    });
  }
}
