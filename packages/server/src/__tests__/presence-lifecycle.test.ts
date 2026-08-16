import { describe, it, expect, afterEach } from "bun:test";
import type WebSocket from "ws";
import { LivelyServer } from "../server";
import { connectClient, waitForOpen } from "./test-helpers";

/**
 * A client that connects and then never heartbeats reproduces the case that
 * used to leak: the socket stays open, so the server's `close` handler never
 * runs, and the only thing that can reclaim the entry is the heartbeat sweep.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("presence lifecycle", () => {
  let server: LivelyServer | null = null;
  const sockets: WebSocket[] = [];

  afterEach(async () => {
    for (const ws of sockets.splice(0)) {
      try {
        ws.terminate();
      } catch {}
    }
    if (server) {
      await server.stop();
      server = null;
    }
  });

  async function startServer(
    roomConfig: Record<string, number> = {},
    onLeave?: (roomId: string, user: { userId: string }) => void
  ) {
    server = new LivelyServer({
      onLeave: onLeave as never,
      roomConfig: {
        heartbeatTimeoutMs: 120,
        heartbeatCheckIntervalMs: 40,
        offlineRemovalMs: 120,
        ...roomConfig,
      },
    });
    await server.start(0);
    return server;
  }

  async function connect(roomId: string, userId: string) {
    const ws = connectClient(server!.port, roomId, {
      userId,
      displayName: userId,
    });
    sockets.push(ws);
    await waitForOpen(ws);
    return ws;
  }

  it("marks a silent connection offline before removing it", async () => {
    await startServer();
    await connect("r1", "alice");

    expect(server!.getRoomUsers("r1")).toHaveLength(1);

    // Past the heartbeat timeout, inside the removal grace window.
    await sleep(220);
    const during = server!.getRoomUsers("r1");
    expect(during).toHaveLength(1);
    expect(during[0].onlineStatus).toBe("offline");
  });

  it("removes a silent connection once the grace window passes", async () => {
    await startServer();
    await connect("r1", "alice");

    await sleep(500);

    // Previously this stayed at 1 forever, flagged offline but never removed.
    expect(server!.getRoomUsers("r1")).toHaveLength(0);
  });

  it("empties the room so it becomes eligible for cleanup", async () => {
    await startServer();
    await connect("r1", "alice");

    const room = server!.getRoomManager().get("r1");
    expect(room?.size).toBe(1);

    await sleep(500);

    // room.size counts ghosts, so a leaked entry used to keep this above zero
    // and cleanup could never run.
    expect(server!.getRoomManager().get("r1")?.size ?? 0).toBe(0);
  });

  it("fires onLeave exactly once for a reaped connection", async () => {
    const left: string[] = [];
    await startServer({}, (_roomId, user) => {
      left.push(user.userId);
    });
    await connect("r1", "alice");

    await sleep(500);

    expect(left).toEqual(["alice"]);
  });

  it("fires onLeave exactly once for a graceful close", async () => {
    const left: string[] = [];
    await startServer({ offlineRemovalMs: 5_000 }, (_roomId, user) => {
      left.push(user.userId);
    });
    const ws = await connect("r1", "alice");

    ws.close();
    await sleep(150);

    expect(left).toEqual(["alice"]);
    expect(server!.getRoomUsers("r1")).toHaveLength(0);
  });

  it("does not duplicate a user who reconnects during the grace window", async () => {
    // Long grace so the first entry is still present, flagged offline.
    await startServer({ offlineRemovalMs: 5_000 });
    await connect("r1", "alice");

    await sleep(220);
    expect(server!.getRoomUsers("r1")[0].onlineStatus).toBe("offline");

    await connect("r1", "alice");
    await sleep(60);

    const users = server!.getRoomUsers("r1");
    expect(users).toHaveLength(1);
    expect(users[0].onlineStatus).toBe("online");
  });

  it("leaves a second live tab of the same user alone", async () => {
    await startServer({ heartbeatTimeoutMs: 5_000 });
    await connect("r1", "alice");
    await connect("r1", "alice");

    await sleep(120);

    // Both are online, so neither is eligible for eviction.
    expect(server!.getRoomUsers("r1")).toHaveLength(2);
  });

  it("does not disturb other users in the room", async () => {
    await startServer({ heartbeatTimeoutMs: 5_000 });
    await connect("r1", "alice");
    await connect("r1", "bob");

    await sleep(120);

    const ids = server!
      .getRoomUsers("r1")
      .map((u) => u.userId)
      .sort();
    expect(ids).toEqual(["alice", "bob"]);
  });
});
