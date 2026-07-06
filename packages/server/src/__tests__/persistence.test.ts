import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as Y from "yjs";
import { RoomPersistence, PersistenceBinding, sanitize } from "../persistence";
import { LivelyServer } from "../server";
import type { SerializedCrdt } from "@waits/lively-types";

const makeRoot = (overrides?: Partial<SerializedCrdt>): SerializedCrdt => ({
  type: "LiveObject",
  data: { count: 0 },
  ...overrides,
});

function makeYjsState(text: string): Uint8Array {
  const doc = new Y.Doc();
  doc.getText("t").insert(0, text);
  return Y.encodeStateAsUpdate(doc);
}

describe("RoomPersistence", () => {
  let dataDir: string;
  let persistence: RoomPersistence;

  beforeEach(async () => {
    dataDir = path.join(os.tmpdir(), `lively-test-${crypto.randomUUID()}`);
    persistence = new RoomPersistence(dataDir);
    await persistence.ensureDir();
  });

  afterEach(async () => {
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  describe("storage flavor", () => {
    it("round-trips save and load", async () => {
      const root = makeRoot({ data: { title: "hello" } });
      await persistence.saveStorage("room-1", root);
      const loaded = await persistence.loadStorage("room-1");
      expect(loaded).toEqual(root);
    });

    it("returns null for nonexistent room", async () => {
      expect(await persistence.loadStorage("no-such-room")).toBeNull();
    });

    it("overwrites on re-save", async () => {
      await persistence.saveStorage("room-1", makeRoot({ data: { v: 1 } }));
      await persistence.saveStorage("room-1", makeRoot({ data: { v: 2 } }));
      const loaded = await persistence.loadStorage("room-1");
      expect(loaded).toEqual(makeRoot({ data: { v: 2 } }));
    });
  });

  describe("yjs flavor", () => {
    it("round-trips binary state", async () => {
      const state = makeYjsState("hello yjs");
      await persistence.saveYjs("doc-1", state);
      const loaded = await persistence.loadYjs("doc-1");
      expect(loaded).toEqual(state);

      const doc = new Y.Doc();
      Y.applyUpdate(doc, loaded!);
      expect(doc.getText("t").toString()).toBe("hello yjs");
    });

    it("returns null for nonexistent room", async () => {
      expect(await persistence.loadYjs("no-such-room")).toBeNull();
    });

    it("does not collide with a storage room of the same id", async () => {
      await persistence.saveStorage("same-id", makeRoot());
      await persistence.saveYjs("same-id", makeYjsState("x"));
      expect(await persistence.loadStorage("same-id")).toEqual(makeRoot());
      expect(await persistence.loadYjs("same-id")).not.toBeNull();
    });
  });

  describe("shared operations", () => {
    it("list returns both flavors with sizes and timestamps", async () => {
      await persistence.saveStorage("room-x", makeRoot());
      await persistence.saveYjs("doc-y", makeYjsState("y"));
      const rooms = await persistence.list();
      expect(rooms).toHaveLength(2);
      const byId = Object.fromEntries(rooms.map((r) => [r.roomId, r]));
      expect(byId["room-x"].flavor).toBe("storage");
      expect(byId["doc-y"].flavor).toBe("yjs");
      for (const room of rooms) {
        expect(room.sizeBytes).toBeGreaterThan(0);
        expect(room.updatedAt).toBeGreaterThan(0);
      }
    });

    it("list returns empty for no rooms", async () => {
      expect(await persistence.list()).toEqual([]);
    });

    it("reset wipes all rooms", async () => {
      await persistence.saveStorage("a", makeRoot());
      await persistence.saveYjs("b", makeYjsState("b"));
      await persistence.reset();
      expect(await persistence.loadStorage("a")).toBeNull();
      expect(await persistence.loadYjs("b")).toBeNull();
    });

    it("delete removes both flavors of a room", async () => {
      await persistence.saveStorage("dual", makeRoot());
      await persistence.saveYjs("dual", makeYjsState("d"));
      await persistence.saveStorage("keep", makeRoot());
      await persistence.delete("dual");
      expect(await persistence.exists("dual")).toBe(false);
      expect(await persistence.exists("keep")).toBe(true);
    });

    it("exists checks either flavor", async () => {
      expect(await persistence.exists("nope")).toBe(false);
      await persistence.saveYjs("yjs-only", makeYjsState("z"));
      expect(await persistence.exists("yjs-only")).toBe(true);
    });
  });
});

describe("sanitize", () => {
  it("passes through safe chars", () => {
    expect(sanitize("my-room_123")).toBe("my-room_123");
  });

  it("replaces unsafe chars", () => {
    expect(sanitize("room/with spaces!")).toBe("room_with_spaces_");
  });

  it("replaces dots and colons", () => {
    expect(sanitize("ns:room.v2")).toBe("ns_room_v2");
  });
});

describe("PersistenceBinding", () => {
  let dataDir: string;
  let persistence: RoomPersistence;

  beforeEach(async () => {
    dataDir = path.join(os.tmpdir(), `lively-test-${crypto.randomUUID()}`);
    persistence = new RoomPersistence(dataDir);
    await persistence.ensureDir();
  });

  afterEach(async () => {
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it("provides initial state from disk via hooks", async () => {
    await persistence.saveStorage("seeded", makeRoot({ data: { seeded: true } }));
    await persistence.saveYjs("seeded-y", makeYjsState("seed"));

    const binding = new PersistenceBinding(persistence);
    const hooks = binding.hooks();
    expect(await hooks.initialStorage!("seeded")).toEqual(
      makeRoot({ data: { seeded: true } })
    );
    expect(await hooks.initialYjs!("seeded-y")).not.toBeNull();
    expect(await hooks.initialStorage!("missing")).toBeNull();
    expect(await hooks.initialYjs!("missing")).toBeNull();
  });

  it("debounces yjs saves and keeps the latest state", async () => {
    const saved: string[] = [];
    const binding = new PersistenceBinding(persistence, {
      debounceMs: 20,
      onSave: (roomId, flavor) => saved.push(`${flavor}:${roomId}`),
    });
    const hooks = binding.hooks();

    hooks.onYjsChange!("doc", makeYjsState("v1"));
    hooks.onYjsChange!("doc", makeYjsState("v1 v2"));

    await new Promise((r) => setTimeout(r, 60));
    expect(saved).toEqual(["yjs:doc"]); // coalesced to one write

    const doc = new Y.Doc();
    Y.applyUpdate(doc, (await persistence.loadYjs("doc"))!);
    expect(doc.getText("t").toString()).toBe("v1 v2");
  });

  it("flush writes pending saves immediately", async () => {
    const binding = new PersistenceBinding(persistence, { debounceMs: 60_000 });
    const hooks = binding.hooks();

    hooks.onYjsChange!("doc", makeYjsState("pending"));
    expect(await persistence.loadYjs("doc")).toBeNull();

    await binding.flush();
    expect(await persistence.loadYjs("doc")).not.toBeNull();
  });

  it("persists storage rooms end-to-end through a live server", async () => {
    const binding = new PersistenceBinding(persistence, { debounceMs: 20 });
    const server = new LivelyServer({ ...binding.hooks() });
    binding.attach(server);
    await server.start(0);

    try {
      const ws = new WebSocket(
        `ws://127.0.0.1:${server.port}/rooms/e2e?userId=u1&displayName=U1`
      );
      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error("ws error"));
      });

      ws.send(
        JSON.stringify({
          type: "storage:init",
          root: makeRoot({ data: { from: "client" } }),
        })
      );
      ws.send(
        JSON.stringify({
          type: "storage:ops",
          ops: [{ type: "set", path: [], key: "from", value: "ops", clock: 1 }],
        })
      );

      await new Promise((r) => setTimeout(r, 100));
      const loaded = await persistence.loadStorage("e2e");
      expect(loaded).not.toBeNull();
      ws.close();
    } finally {
      await server.stop();
    }
  });
});
