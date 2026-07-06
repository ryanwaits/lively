import fs from "node:fs/promises";
import path from "node:path";
import type { SerializedCrdt } from "@waits/lively-types";
import type { LivelyServer } from "./server.js";
import type { ServerConfig } from "./types.js";

interface RoomFileData {
  root: SerializedCrdt;
  updatedAt: number;
}

export type PersistenceFlavor = "storage" | "yjs";

export interface RoomInfo {
  roomId: string;
  flavor: PersistenceFlavor;
  updatedAt: number;
  sizeBytes: number;
}

/**
 * File-based room persistence supporting both storage flavors:
 *
 * - StorageDocument (LiveObject/LiveMap/LiveList CRDTs) — JSON snapshot
 *   at `rooms/<id>.json`
 * - Yjs — binary encoded update at `rooms/<id>.yjs`
 *
 * The flavors are independent; a room uses one or the other depending on
 * which API the client app is built on.
 */
export class RoomPersistence {
  private roomsDir: string;

  constructor(dataDir: string) {
    this.roomsDir = path.join(dataDir, "rooms");
  }

  async ensureDir(): Promise<void> {
    await fs.mkdir(this.roomsDir, { recursive: true });
  }

  // ── StorageDocument flavor ───────────────────────────────

  async loadStorage(roomId: string): Promise<SerializedCrdt | null> {
    try {
      const raw = await fs.readFile(this.storagePath(roomId), "utf-8");
      const data: RoomFileData = JSON.parse(raw);
      return data.root ?? null;
    } catch {
      return null;
    }
  }

  async saveStorage(roomId: string, root: SerializedCrdt): Promise<void> {
    await this.ensureDir();
    const data: RoomFileData = { root, updatedAt: Date.now() };
    await fs.writeFile(this.storagePath(roomId), JSON.stringify(data, null, 2));
  }

  // ── Yjs flavor ───────────────────────────────────────────

  async loadYjs(roomId: string): Promise<Uint8Array | null> {
    try {
      const buf = await fs.readFile(this.yjsPath(roomId));
      return new Uint8Array(buf);
    } catch {
      return null;
    }
  }

  async saveYjs(roomId: string, state: Uint8Array): Promise<void> {
    await this.ensureDir();
    await fs.writeFile(this.yjsPath(roomId), state);
  }

  // ── Shared ───────────────────────────────────────────────

  async reset(): Promise<void> {
    await fs.rm(this.roomsDir, { recursive: true, force: true });
  }

  async list(): Promise<RoomInfo[]> {
    try {
      const files = await fs.readdir(this.roomsDir);
      const results: RoomInfo[] = [];
      for (const file of files) {
        const filePath = path.join(this.roomsDir, file);
        if (file.endsWith(".json")) {
          const stat = await fs.stat(filePath);
          const raw = await fs.readFile(filePath, "utf-8");
          const data: RoomFileData = JSON.parse(raw);
          results.push({
            roomId: file.replace(/\.json$/, ""),
            flavor: "storage",
            updatedAt: data.updatedAt,
            sizeBytes: stat.size,
          });
        } else if (file.endsWith(".yjs")) {
          const stat = await fs.stat(filePath);
          results.push({
            roomId: file.replace(/\.yjs$/, ""),
            flavor: "yjs",
            updatedAt: Math.round(stat.mtimeMs),
            sizeBytes: stat.size,
          });
        }
      }
      return results;
    } catch {
      return [];
    }
  }

  async delete(roomId: string): Promise<void> {
    await fs.rm(this.storagePath(roomId), { force: true });
    await fs.rm(this.yjsPath(roomId), { force: true });
  }

  async exists(roomId: string): Promise<boolean> {
    const checks = await Promise.all([
      fs.access(this.storagePath(roomId)).then(() => true, () => false),
      fs.access(this.yjsPath(roomId)).then(() => true, () => false),
    ]);
    return checks.some(Boolean);
  }

  private storagePath(roomId: string): string {
    return path.join(this.roomsDir, `${sanitize(roomId)}.json`);
  }

  private yjsPath(roomId: string): string {
    return path.join(this.roomsDir, `${sanitize(roomId)}.yjs`);
  }
}

export function sanitize(roomId: string): string {
  return roomId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

// ── Server binding ─────────────────────────────────────────

export interface PersistenceBindingOptions {
  /** Coalesce writes per room within this window. Default 200ms. */
  debounceMs?: number;
  /** Called after each successful room save. */
  onSave?: (roomId: string, flavor: PersistenceFlavor) => void;
  /** Called when a save fails. Defaults to console.error. */
  onError?: (roomId: string, flavor: PersistenceFlavor, error: unknown) => void;
}

type PendingSave = {
  timer: ReturnType<typeof setTimeout>;
  run: () => Promise<void>;
};

/**
 * Wires a RoomPersistence into LivelyServer config hooks with debounced
 * writes and an explicit flush for shutdown.
 *
 * Construction order: hooks() feeds the LivelyServer constructor, and
 * attach() must be called afterwards with the server instance — storage
 * snapshots are read from the live room at save time.
 *
 *   const binding = new PersistenceBinding(persistence);
 *   const server = new LivelyServer({ ...binding.hooks() });
 *   binding.attach(server);
 *   // on shutdown: await binding.flush();
 */
export class PersistenceBinding {
  private persistence: RoomPersistence;
  private debounceMs: number;
  private onSave?: PersistenceBindingOptions["onSave"];
  private onError: NonNullable<PersistenceBindingOptions["onError"]>;
  private server: LivelyServer | null = null;
  private pending = new Map<string, PendingSave>();

  constructor(persistence: RoomPersistence, opts: PersistenceBindingOptions = {}) {
    this.persistence = persistence;
    this.debounceMs = opts.debounceMs ?? 200;
    this.onSave = opts.onSave;
    this.onError =
      opts.onError ??
      ((roomId, flavor, error) => {
        console.error(`[lively] failed to persist ${flavor} room ${roomId}:`, error);
      });
  }

  attach(server: LivelyServer): void {
    this.server = server;
  }

  hooks(): Pick<
    ServerConfig,
    "initialStorage" | "onStorageChange" | "initialYjs" | "onYjsChange"
  > {
    return {
      initialStorage: (roomId) => this.persistence.loadStorage(roomId),
      onStorageChange: (roomId) => {
        this.schedule(roomId, "storage", async () => {
          const doc = this.server
            ?.getRoomManager()
            .get(roomId)
            ?.getStorageDocument();
          if (!doc) return;
          await this.persistence.saveStorage(roomId, doc.serialize());
        });
      },
      initialYjs: (roomId) => this.persistence.loadYjs(roomId),
      onYjsChange: (roomId, state) => {
        this.schedule(roomId, "yjs", () =>
          this.persistence.saveYjs(roomId, state)
        );
      },
    };
  }

  /** Run all pending saves immediately. Call before shutdown. */
  async flush(): Promise<void> {
    const entries = [...this.pending.values()];
    for (const entry of entries) clearTimeout(entry.timer);
    await Promise.all(entries.map((entry) => entry.run()));
  }

  private schedule(
    roomId: string,
    flavor: PersistenceFlavor,
    save: () => Promise<void>
  ): void {
    const key = `${flavor}:${roomId}`;
    const existing = this.pending.get(key);
    if (existing) clearTimeout(existing.timer);

    const run = async () => {
      this.pending.delete(key);
      try {
        await save();
        this.onSave?.(roomId, flavor);
      } catch (error) {
        this.onError(roomId, flavor, error);
      }
    };

    this.pending.set(key, {
      run,
      timer: setTimeout(() => void run(), this.debounceMs),
    });
  }
}
