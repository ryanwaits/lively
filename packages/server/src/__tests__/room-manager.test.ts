import { describe, it, expect } from "bun:test";
import { RoomManager } from "../room-manager";

describe("RoomManager", () => {
  it("creates a room on first access", () => {
    const mgr = new RoomManager();
    const room = mgr.getOrCreate("r1");
    expect(room.id).toBe("r1");
    expect(mgr.roomCount).toBe(1);
  });

  it("returns existing room on subsequent access", () => {
    const mgr = new RoomManager();
    const a = mgr.getOrCreate("r1");
    const b = mgr.getOrCreate("r1");
    expect(a).toBe(b);
    expect(mgr.roomCount).toBe(1);
  });

  it("get returns undefined for unknown room", () => {
    const mgr = new RoomManager();
    expect(mgr.get("nope")).toBeUndefined();
  });

  it("remove deletes a room immediately", () => {
    const mgr = new RoomManager();
    mgr.getOrCreate("r1");
    mgr.remove("r1");
    expect(mgr.roomCount).toBe(0);
    expect(mgr.get("r1")).toBeUndefined();
  });

  it("scheduleCleanup removes empty room after timeout", async () => {
    const mgr = new RoomManager();
    mgr.getOrCreate("r1");
    mgr.scheduleCleanup("r1", 50);

    expect(mgr.roomCount).toBe(1);
    await new Promise((r) => setTimeout(r, 80));
    expect(mgr.roomCount).toBe(0);
  });

  it("getOrCreate cancels pending cleanup", async () => {
    const mgr = new RoomManager();
    mgr.getOrCreate("r1");
    mgr.scheduleCleanup("r1", 50);

    // Re-access before cleanup fires
    mgr.getOrCreate("r1");
    await new Promise((r) => setTimeout(r, 80));

    // Room still exists because cleanup was cancelled
    expect(mgr.roomCount).toBe(1);
  });

  it("scheduleCleanup skips non-empty room", async () => {
    const mgr = new RoomManager();
    const room = mgr.getOrCreate("r1");
    // Simulate a connection by adding directly
    const WebSocket = await import("ws");
    room.addConnection("c1", { readyState: 1, send: () => {} } as any, {
      userId: "u1",
      displayName: "User",
      color: "#000",
      connectedAt: Date.now(),
    });

    mgr.scheduleCleanup("r1", 50);
    await new Promise((r) => setTimeout(r, 80));

    // Room NOT removed because size > 0
    expect(mgr.roomCount).toBe(1);
  });
});
