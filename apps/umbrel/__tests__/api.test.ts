import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { LivelyServer, RoomPersistence } from "@waits/lively-server";
import { BoardsIndex } from "../boards.js";
import { handleApiRequest } from "../api.js";

describe("umbrel /api routes", () => {
  let dataDir: string;
  let server: LivelyServer;
  let base: string;

  beforeEach(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "lively-umbrel-"));
    const persistence = new RoomPersistence(dataDir);
    await persistence.ensureDir();
    const boards = new BoardsIndex(dataDir, persistence);

    server = new LivelyServer({
      onRequest: (req, res) =>
        handleApiRequest(req, res, { boards, config: { ai: false } }),
    });
    await server.start(0);
    base = `http://127.0.0.1:${server.port}`;
  });

  afterEach(async () => {
    await server.stop();
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it("GET /api/boards returns empty list initially", async () => {
    const res = await fetch(`${base}/api/boards`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ boards: [] });
  });

  it("POST /api/boards creates a board, GET lists it newest-first", async () => {
    const created = await fetch(`${base}/api/boards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Roadmap", created_by: "user-1" }),
    });
    expect(created.status).toBe(201);
    const { board } = (await created.json()) as { board: any };
    expect(board.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(board.name).toBe("Roadmap");
    expect(board.created_by).toBe("user-1");
    expect(board.object_count).toBe(0);

    await fetch(`${base}/api/boards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Second" }),
    });

    const res = await fetch(`${base}/api/boards`);
    const { boards } = (await res.json()) as { boards: any[] };
    expect(boards).toHaveLength(2);
    expect(boards[0].name).toBe("Second");
    expect(boards[1].name).toBe("Roadmap");
    expect(boards[1].created_by).toBe("user-1");
  });

  it("persists the index across instances (boards-index.json)", async () => {
    await fetch(`${base}/api/boards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Durable" }),
    });

    const raw = await fs.readFile(
      path.join(dataDir, "boards-index.json"),
      "utf-8"
    );
    const records = JSON.parse(raw);
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe("Durable");

    const persistence = new RoomPersistence(dataDir);
    const reloaded = new BoardsIndex(dataDir, persistence);
    const boards = await reloaded.list();
    expect(boards).toHaveLength(1);
    expect(boards[0].name).toBe("Durable");
  });

  it("derives object_count from the board's storage snapshot", async () => {
    const created = await fetch(`${base}/api/boards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "With objects" }),
    });
    const { board } = (await created.json()) as { board: any };

    const persistence = new RoomPersistence(dataDir);
    await persistence.saveStorage(board.id, {
      type: "LiveObject",
      data: {
        objects: {
          type: "LiveMap",
          entries: {
            a: { type: "LiveObject", data: {} },
            b: { type: "LiveObject", data: {} },
          },
        },
        frames: { type: "LiveMap", entries: {} },
      },
    });

    const res = await fetch(`${base}/api/boards`);
    const { boards } = (await res.json()) as { boards: any[] };
    expect(boards[0].object_count).toBe(2);
  });

  it("validates POST bodies", async () => {
    const noName = await fetch(`${base}/api/boards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(noName.status).toBe(400);

    const badJson = await fetch(`${base}/api/boards`, {
      method: "POST",
      body: "not json",
    });
    expect(badJson.status).toBe(400);

    const blankName = await fetch(`${base}/api/boards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "   " }),
    });
    expect(blankName.status).toBe(400);
  });

  it("GET /api/config reports capability flags", async () => {
    const res = await fetch(`${base}/api/config`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ai: false });
  });

  it("unknown /api paths get JSON 404, method mismatches get 405", async () => {
    const notFound = await fetch(`${base}/api/nope`);
    expect(notFound.status).toBe(404);

    const badMethod = await fetch(`${base}/api/boards`, { method: "DELETE" });
    expect(badMethod.status).toBe(405);
  });
});
