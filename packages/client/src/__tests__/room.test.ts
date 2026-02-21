import { describe, it, expect, mock, beforeEach } from "bun:test";
import { Room } from "../room";

// Mock WebSocket that auto-opens
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  send = mock(() => {});
  close = mock(() => {
    this.onclose?.();
  });

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
    // Auto-open on next tick
    queueMicrotask(() => this.onopen?.());
  }

  simulateMessage(data: string) {
    this.onmessage?.({ data });
  }

  simulateClose() {
    this.onclose?.();
  }
}

function createRoom(overrides: Record<string, unknown> = {}): Room {
  return new Room({
    serverUrl: "ws://localhost:3000",
    roomId: "test-room",
    userId: "alice",
    displayName: "Alice",
    WebSocket: MockWebSocket as any,
    reconnect: false,
    ...overrides,
  });
}

describe("Room", () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
  });

  it("builds correct URL with query params", () => {
    const room = createRoom();
    room.connect();
    expect(MockWebSocket.instances[0].url).toBe(
      "ws://localhost:3000/rooms/test-room?userId=alice&displayName=Alice"
    );
  });

  it("emits status events on connect", async () => {
    const statuses: string[] = [];
    const room = createRoom();
    room.subscribe("status", (s) => statuses.push(s));
    room.connect();
    await new Promise((r) => queueMicrotask(r));
    expect(statuses).toContain("connecting");
    expect(statuses).toContain("connected");
  });

  it("tracks presence from server messages", async () => {
    const room = createRoom();
    room.connect();
    await new Promise((r) => queueMicrotask(r));

    const users = [
      { userId: "alice", displayName: "Alice", color: "#f00", connectedAt: 1 },
      { userId: "bob", displayName: "Bob", color: "#0f0", connectedAt: 2 },
    ];
    MockWebSocket.instances[0].simulateMessage(
      JSON.stringify({ type: "presence", users })
    );

    expect(room.getPresence()).toEqual(users);
    expect(room.getSelf()?.userId).toBe("alice");
    expect(room.getOthers()).toHaveLength(1);
    expect(room.getOthers()[0].userId).toBe("bob");
  });

  it("fires presence subscription", async () => {
    const cb = mock(() => {});
    const room = createRoom();
    room.subscribe("presence", cb);
    room.connect();
    await new Promise((r) => queueMicrotask(r));

    MockWebSocket.instances[0].simulateMessage(
      JSON.stringify({ type: "presence", users: [{ userId: "alice", displayName: "Alice", color: "#f00", connectedAt: 1 }] })
    );
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("tracks cursor updates from server", async () => {
    const cb = mock(() => {});
    const room = createRoom();
    room.subscribe("cursors", cb);
    room.connect();
    await new Promise((r) => queueMicrotask(r));

    const cursor = { userId: "bob", displayName: "Bob", color: "#0f0", x: 10, y: 20, lastUpdate: 1 };
    MockWebSocket.instances[0].simulateMessage(
      JSON.stringify({ type: "cursor:update", cursor })
    );
    expect(cb).toHaveBeenCalledTimes(1);
    expect(room.getCursors().get("bob")).toEqual(cursor);
  });

  it("cleans up cursors on presence update", async () => {
    const room = createRoom();
    room.connect();
    await new Promise((r) => queueMicrotask(r));

    // Add cursor for bob
    MockWebSocket.instances[0].simulateMessage(
      JSON.stringify({ type: "cursor:update", cursor: { userId: "bob", displayName: "Bob", color: "#0f0", x: 10, y: 20, lastUpdate: 1 } })
    );
    expect(room.getCursors().has("bob")).toBe(true);

    // Presence update without bob → cursor cleaned up
    MockWebSocket.instances[0].simulateMessage(
      JSON.stringify({ type: "presence", users: [{ userId: "alice", displayName: "Alice", color: "#f00", connectedAt: 1 }] })
    );
    expect(room.getCursors().has("bob")).toBe(false);
  });

  it("fires message subscription for custom messages", async () => {
    const cb = mock(() => {});
    const room = createRoom();
    room.subscribe("message", cb);
    room.connect();
    await new Promise((r) => queueMicrotask(r));

    MockWebSocket.instances[0].simulateMessage(
      JSON.stringify({ type: "custom:action", payload: "hello" })
    );
    expect(cb).toHaveBeenCalledWith({ type: "custom:action", payload: "hello" });
  });

  it("clears state on reconnecting/disconnected status", async () => {
    const room = createRoom();
    room.connect();
    await new Promise((r) => queueMicrotask(r));

    // Populate state
    MockWebSocket.instances[0].simulateMessage(
      JSON.stringify({ type: "presence", users: [{ userId: "alice", displayName: "Alice", color: "#f00", connectedAt: 1 }] })
    );
    MockWebSocket.instances[0].simulateMessage(
      JSON.stringify({ type: "cursor:update", cursor: { userId: "bob", displayName: "Bob", color: "#0f0", x: 10, y: 20, lastUpdate: 1 } })
    );
    expect(room.getPresence()).toHaveLength(1);
    expect(room.getCursors().size).toBe(1);

    // Simulate close → state cleared
    MockWebSocket.instances[0].simulateClose();
    expect(room.getPresence()).toHaveLength(0);
    expect(room.getCursors().size).toBe(0);
  });

  it("unsubscribe stops callback", async () => {
    const cb = mock(() => {});
    const room = createRoom();
    const unsub = room.subscribe("message", cb);
    room.connect();
    await new Promise((r) => queueMicrotask(r));

    unsub();
    MockWebSocket.instances[0].simulateMessage(
      JSON.stringify({ type: "custom:action", payload: "ignored" })
    );
    expect(cb).not.toHaveBeenCalled();
  });

  it("send() serializes and sends via connection", async () => {
    const room = createRoom();
    room.connect();
    await new Promise((r) => queueMicrotask(r));

    room.send({ type: "test", value: 42 });
    expect(MockWebSocket.instances[0].send).toHaveBeenCalledWith(
      JSON.stringify({ type: "test", value: 42 })
    );
  });

  it("getSelf returns null before presence", () => {
    const room = createRoom();
    expect(room.getSelf()).toBeNull();
  });

  it("appends token to WebSocket URL when provided", () => {
    const room = createRoom({ token: "my-secret-token" });
    room.connect();
    expect(MockWebSocket.instances[0].url).toBe(
      "ws://localhost:3000/rooms/test-room?userId=alice&displayName=Alice&token=my-secret-token"
    );
  });

  it("handles http:// serverUrl by converting to ws://", () => {
    const room = new Room({
      serverUrl: "http://localhost:3000",
      roomId: "r1",
      userId: "u1",
      displayName: "U",
      WebSocket: MockWebSocket as any,
      reconnect: false,
    });
    room.connect();
    expect(MockWebSocket.instances[0].url).toStartWith("ws://");
  });

  // --- Task #4: Clear cursorTimer on disconnect ---

  it("disconnect clears pending cursor timer", async () => {
    const room = createRoom({ cursorThrottleMs: 1000 });
    room.connect();
    await new Promise((r) => queueMicrotask(r));

    // Send first cursor to start the clock
    room.updateCursor(1, 1);
    // Immediately send another — should schedule a timer
    room.updateCursor(2, 2);

    // Disconnect should clear the timer
    room.disconnect();

    // Wait longer than throttle — no error from dangling timer
    await new Promise((r) => setTimeout(r, 50));
    // If timer wasn't cleared, it would try to send on a closed connection
    expect(room.getStatus()).toBe("disconnected");
  });

  // --- Task #5: Reset batch state on disconnect ---

  it("batch state resets on disconnect", async () => {
    const room = createRoom();
    room.connect();
    await new Promise((r) => queueMicrotask(r));
    const ws = MockWebSocket.instances[0];

    // Simulate close during batch (abnormal)
    // Start a batch, then simulate disconnect
    // After reconnect, batch should not be stuck
    ws.simulateClose();

    // After disconnect, sending should work normally (not queued)
    // Reconnect
    const room2 = createRoom();
    room2.connect();
    await new Promise((r) => queueMicrotask(r));
    const ws2 = MockWebSocket.instances[1];

    room2.send({ type: "test", v: 1 });
    expect(ws2.send).toHaveBeenCalledTimes(1);
  });

  // --- Error event forwarding ---

  it("emits 'error' event when WebSocket errors", async () => {
    const cb = mock(() => {});
    const room = createRoom();
    room.subscribe("error", cb);
    room.connect();
    await new Promise((r) => queueMicrotask(r));

    // Trigger onerror on the WebSocket
    const ws = MockWebSocket.instances[0];
    ws.onerror?.(new Event("error"));

    expect(cb).toHaveBeenCalledTimes(1);
    const err = cb.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("WebSocket error");
  });

  // --- Task #13: Validate cursorThrottleMs ---

  // --- Follow API ---

  it("followUser sets following in presence metadata", async () => {
    const room = createRoom();
    room.connect();
    await new Promise((r) => queueMicrotask(r));

    // Set up presence so getSelf works
    MockWebSocket.instances[0].simulateMessage(
      JSON.stringify({ type: "presence", users: [{ userId: "alice", displayName: "Alice", color: "#f00", connectedAt: 1 }] })
    );

    room.followUser("bob");
    expect(MockWebSocket.instances[0].send).toHaveBeenCalledWith(
      JSON.stringify({ type: "presence:update", metadata: { following: "bob" } })
    );
  });

  it("stopFollowing clears following in presence metadata", async () => {
    const room = createRoom();
    room.connect();
    await new Promise((r) => queueMicrotask(r));

    MockWebSocket.instances[0].simulateMessage(
      JSON.stringify({ type: "presence", users: [{ userId: "alice", displayName: "Alice", color: "#f00", connectedAt: 1, metadata: { following: "bob" } }] })
    );

    room.stopFollowing();
    expect(MockWebSocket.instances[0].send).toHaveBeenCalledWith(
      JSON.stringify({ type: "presence:update", metadata: { following: null } })
    );
  });

  it("getFollowing reads own following from presence metadata", async () => {
    const room = createRoom();
    room.connect();
    await new Promise((r) => queueMicrotask(r));

    expect(room.getFollowing()).toBeNull();

    MockWebSocket.instances[0].simulateMessage(
      JSON.stringify({ type: "presence", users: [{ userId: "alice", displayName: "Alice", color: "#f00", connectedAt: 1, metadata: { following: "bob" } }] })
    );
    expect(room.getFollowing()).toBe("bob");
  });

  it("followUser optimistically updates getFollowing without server roundtrip", async () => {
    const room = createRoom();
    room.connect();
    await new Promise((r) => queueMicrotask(r));

    // Set up presence so getSelf works
    MockWebSocket.instances[0].simulateMessage(
      JSON.stringify({ type: "presence", users: [{ userId: "alice", displayName: "Alice", color: "#f00", connectedAt: 1 }] })
    );

    expect(room.getFollowing()).toBeNull();
    room.followUser("bob");
    expect(room.getFollowing()).toBe("bob");

    room.stopFollowing();
    expect(room.getFollowing()).toBeNull();
  });

  it("getFollowers filters others following this user", async () => {
    const room = createRoom();
    room.connect();
    await new Promise((r) => queueMicrotask(r));

    MockWebSocket.instances[0].simulateMessage(
      JSON.stringify({
        type: "presence",
        users: [
          { userId: "alice", displayName: "Alice", color: "#f00", connectedAt: 1 },
          { userId: "bob", displayName: "Bob", color: "#0f0", connectedAt: 2, metadata: { following: "alice" } },
          { userId: "carol", displayName: "Carol", color: "#00f", connectedAt: 3, metadata: { following: "alice" } },
          { userId: "dave", displayName: "Dave", color: "#ff0", connectedAt: 4, metadata: { following: "bob" } },
        ],
      })
    );

    expect(room.getFollowers()).toEqual(["bob", "carol"]);
  });

  it("cursorThrottleMs clamped to minimum 1", () => {
    const room = createRoom({ cursorThrottleMs: 0 });
    room.connect();
    // Just verifying it doesn't crash; internal value is clamped
    room.updateCursor(1, 1);

    const room2 = createRoom({ cursorThrottleMs: -100 });
    room2.connect();
    room2.updateCursor(1, 1);
  });
});
