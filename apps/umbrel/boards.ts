import fs from "node:fs/promises";
import path from "node:path";
import type { RoomPersistence } from "@waits/lively-server";
import type {
  SerializedLiveMap,
  SerializedLiveObject,
} from "@waits/lively-types";

export interface BoardRecord {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
}

export interface Board extends BoardRecord {
  object_count: number;
}

/**
 * Board metadata index stored as a single JSON file under the data dir.
 * Object counts are derived from each board's persisted storage snapshot
 * (the room id is the board id), so the index never goes stale on that axis.
 */
export class BoardsIndex {
  private file: string;
  private persistence: RoomPersistence;
  private writeLock: Promise<unknown> = Promise.resolve();

  constructor(dataDir: string, persistence: RoomPersistence) {
    this.file = path.join(dataDir, "boards-index.json");
    this.persistence = persistence;
  }

  async list(): Promise<Board[]> {
    const records = await this.loadRecords();
    const boards = await Promise.all(
      records.map(async (record) => ({
        ...record,
        object_count: await this.objectCount(record.id),
      }))
    );
    return boards.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async create(name: string, createdBy: string | null): Promise<Board> {
    const record: BoardRecord = {
      id: crypto.randomUUID(),
      name,
      created_by: createdBy,
      created_at: new Date().toISOString(),
    };

    const result = this.writeLock.then(async () => {
      const records = await this.loadRecords();
      records.push(record);
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      await fs.writeFile(this.file, JSON.stringify(records, null, 2));
    });
    this.writeLock = result.catch(() => {});
    await result;

    return { ...record, object_count: 0 };
  }

  private async loadRecords(): Promise<BoardRecord[]> {
    try {
      const raw = await fs.readFile(this.file, "utf-8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async objectCount(boardId: string): Promise<number> {
    const root = await this.persistence.loadStorage(boardId);
    if (!root || typeof root !== "object" || root.type !== "LiveObject") {
      return 0;
    }
    const objects = (root as SerializedLiveObject).data?.objects;
    if (
      !objects ||
      typeof objects !== "object" ||
      objects.type !== "LiveMap"
    ) {
      return 0;
    }
    return Object.keys((objects as SerializedLiveMap).entries ?? {}).length;
  }
}
