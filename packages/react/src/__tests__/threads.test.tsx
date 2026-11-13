// Import ws BEFORE DOM setup to avoid browser detection
import WebSocket from "ws";
import { LivelyServer } from "@waits/lively-server";
import { LivelyClient } from "@waits/lively-client";
import type { Thread } from "@waits/lively-types";

import "./setup";
import { describe, it, expect, afterEach } from "bun:test";

const { render, act } = await import("@testing-library/react");
const { createElement } = await import("react");
const { LivelyProvider } = await import("../client-context.js");
const { RoomProvider } = await import("../room-context.js");
const {
  useThreads,
  useThread,
  useCreateThread,
  useEditThread,
  useReplyToThread,
  useResolveThread,
  useDeleteThread,
} = await import("../use-threads.js");
const { useUndo, useRedo } = await import("../use-undo-redo.js");

interface Api {
  threads: Thread[] | null;
  renders: number;
  create: ReturnType<typeof useCreateThread>;
  edit: ReturnType<typeof useEditThread>;
  reply: ReturnType<typeof useReplyToThread>;
  resolve: ReturnType<typeof useResolveThread>;
  remove: ReturnType<typeof useDeleteThread>;
  undo: () => void;
  redo: () => void;
}

const wait = (ms = 120) =>
  act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });

describe("Thread hooks (two clients, real server)", () => {
  let server: LivelyServer | null = null;
  const clients: LivelyClient[] = [];
  const unmounts: Array<() => void> = [];

  afterEach(async () => {
    for (const u of unmounts) u();
    unmounts.length = 0;
    for (const c of clients) {
      for (const room of c.getRooms()) c.leaveRoom(room.roomId);
    }
    clients.length = 0;
    if (server) {
      await server.stop();
      server = null;
    }
  });

  /** Mounts one user's hooks in the shared room and returns a live view of them. */
  function mount(userId: string, roomId = "threads-room"): Api {
    const client = new LivelyClient({
      serverUrl: `ws://127.0.0.1:${server!.port}`,
      WebSocket: WebSocket as any,
      reconnect: false,
    });
    clients.push(client);

    const api = { renders: 0 } as Api;
    function Harness() {
      api.threads = useThreads();
      api.renders++;
      api.create = useCreateThread();
      api.edit = useEditThread();
      api.reply = useReplyToThread();
      api.resolve = useResolveThread();
      api.remove = useDeleteThread();
      api.undo = useUndo();
      api.redo = useRedo();
      return null;
    }

    const { unmount } = render(
      createElement(
        LivelyProvider,
        { client },
        createElement(
          RoomProvider,
          { roomId, userId, displayName: `User ${userId}`, initialStorage: {} },
          createElement(Harness)
        )
      )
    );
    unmounts.push(unmount);
    return api;
  }

  async function twoUsers() {
    server = new LivelyServer();
    await server.start(0);
    const a = mount("a");
    await wait();
    const b = mount("b");
    await wait();
    return { a, b };
  }

  const anchor = (blockId = "p1", quote = "hello world") => ({ blockId, quote });

  it("starts empty with no threads key in initialStorage", async () => {
    const { a, b } = await twoUsers();
    expect(a.threads).toEqual([]);
    expect(b.threads).toEqual([]);
  }, 10000);

  it("syncs create, reply and resolve between clients", async () => {
    const { a, b } = await twoUsers();

    let id = "";
    await act(() => {
      id = a.create({
        anchor: { ...anchor(), prefix: "say ", suffix: "!" },
        kind: "suggestion",
        body: "tighter",
        replacement: "hi world",
        metadata: { batch: "review-1" },
      });
    });
    await wait();

    expect(id).toBeTruthy();
    expect(b.threads).toHaveLength(1);
    const seen = b.threads![0];
    expect(seen.id).toBe(id);
    expect(seen.anchor).toEqual({ blockId: "p1", quote: "hello world", prefix: "say ", suffix: "!" });
    expect(seen.kind).toBe("suggestion");
    expect(seen.replacement).toBe("hi world");
    expect(seen.authorId).toBe("a");
    expect(seen.authorName).toBe("User a");
    expect(seen.authorColor).toBeTruthy();
    expect(seen.status).toBe("open");
    expect(seen.replies).toEqual([]);
    expect(seen.metadata).toEqual({ batch: "review-1" });

    let replyId: string | null = null;
    await act(() => {
      replyId = b.reply(id, "agreed");
    });
    await wait();

    expect(replyId).toBeTruthy();
    expect(a.threads![0].replies).toHaveLength(1);
    expect(a.threads![0].replies[0]).toMatchObject({
      id: replyId!,
      authorId: "b",
      authorName: "User b",
      body: "agreed",
    });

    await act(() => b.resolve(id, true));
    await wait();

    expect(a.threads![0].status).toBe("resolved");
    expect(a.threads![0].resolvedBy).toBe("b");
    expect(typeof a.threads![0].resolvedAt).toBe("number");

    await act(() => a.resolve(id, false));
    await wait();

    expect(b.threads![0].status).toBe("open");
    expect(b.threads![0].resolvedBy).toBeUndefined();
    expect(b.threads![0].resolvedAt).toBeUndefined();
  }, 10000);

  it("refuses edit and delete from a non-author", async () => {
    const { a, b } = await twoUsers();

    let id = "";
    await act(() => {
      id = a.create({ anchor: anchor(), kind: "comment", body: "mine" });
    });
    await wait();

    let edited = true;
    let deleted = true;
    await act(() => {
      edited = b.edit(id, { body: "hijacked" });
      deleted = b.remove(id);
    });
    await wait();

    expect(edited).toBe(false);
    expect(deleted).toBe(false);
    expect(a.threads).toHaveLength(1);
    expect(a.threads![0].body).toBe("mine");

    await act(() => {
      edited = a.edit(id, { body: "mine, reworded" });
    });
    await wait();
    expect(edited).toBe(true);
    expect(b.threads![0].body).toBe("mine, reworded");

    await act(() => {
      deleted = a.remove(id);
    });
    await wait();
    expect(deleted).toBe(true);
    expect(a.threads).toEqual([]);
    expect(b.threads).toEqual([]);
  }, 10000);

  it("returns null / false for a thread that does not exist", async () => {
    const { a } = await twoUsers();
    let reply: string | null = "x";
    let edited = true;
    await act(() => {
      reply = a.reply("nope", "hello?");
      edited = a.edit("nope", { body: "x" });
      a.resolve("nope", true);
    });
    expect(reply).toBeNull();
    expect(edited).toBe(false);
    expect(a.threads).toEqual([]);
  }, 10000);

  it("filters by status and blockId, and useThread reads one", async () => {
    server = new LivelyServer();
    await server.start(0);
    const client = new LivelyClient({
      serverUrl: `ws://127.0.0.1:${server.port}`,
      WebSocket: WebSocket as any,
      reconnect: false,
    });
    clients.push(client);

    const view: {
      open?: Thread[] | null;
      resolved?: Thread[] | null;
      p2?: Thread[] | null;
      openP1?: Thread[] | null;
      one?: Thread | null;
      create?: ReturnType<typeof useCreateThread>;
      resolve?: ReturnType<typeof useResolveThread>;
    } = {};
    let oneId = "";

    function Harness() {
      view.open = useThreads({ status: "open" });
      view.resolved = useThreads({ status: "resolved" });
      view.p2 = useThreads({ blockId: "p2" });
      view.openP1 = useThreads({ status: "open", blockId: "p1" });
      view.one = useThread(oneId);
      view.create = useCreateThread();
      view.resolve = useResolveThread();
      return null;
    }

    const tree = () =>
      createElement(
        LivelyProvider,
        { client },
        createElement(
          RoomProvider,
          { roomId: "filter-room", userId: "a", displayName: "A", initialStorage: {} },
          createElement(Harness)
        )
      );
    const { unmount, rerender } = render(tree());
    unmounts.push(unmount);
    await wait();

    let first = "";
    let second = "";
    await act(() => {
      first = view.create!({ anchor: anchor("p1", "one"), kind: "comment", body: "1" });
      second = view.create!({ anchor: anchor("p2", "two"), kind: "comment", body: "2" });
      view.create!({ anchor: anchor("p1", "three"), kind: "comment", body: "3" });
    });
    await act(() => view.resolve!(first, true));

    expect(view.open!.map((t) => t.body).sort()).toEqual(["2", "3"]);
    expect(view.resolved!.map((t) => t.body)).toEqual(["1"]);
    expect(view.p2!.map((t) => t.id)).toEqual([second]);
    expect(view.openP1!.map((t) => t.body)).toEqual(["3"]);

    expect(view.one).toBeNull();
    oneId = second;
    rerender(tree());
    expect(view.one?.body).toBe("2");
  }, 10000);

  it("keeps thread identity stable across unrelated changes", async () => {
    const { a } = await twoUsers();

    let first = "";
    await act(() => {
      first = a.create({ anchor: anchor("p1", "one"), kind: "comment", body: "1" });
    });
    const before = a.threads!.find((t) => t.id === first)!;

    await act(() => {
      a.create({ anchor: anchor("p2", "two"), kind: "comment", body: "2" });
    });
    expect(a.threads).toHaveLength(2);
    expect(a.threads!.find((t) => t.id === first)).toBe(before);
  }, 10000);

  it("undo/redo covers create and resolve, and only the local user's threads", async () => {
    const { a, b } = await twoUsers();

    let aId = "";
    await act(() => {
      aId = a.create({ anchor: anchor("p1", "one"), kind: "comment", body: "from a" });
    });
    await wait();
    await act(() => {
      b.create({ anchor: anchor("p2", "two"), kind: "comment", body: "from b" });
    });
    await wait();
    expect(a.threads).toHaveLength(2);

    // A undoes their create: B's thread survives, although A's create was the
    // write that brought the threads map into existence.
    await act(() => a.undo());
    await wait();
    expect(a.threads!.map((t) => t.body)).toEqual(["from b"]);
    expect(b.threads!.map((t) => t.body)).toEqual(["from b"]);

    await act(() => a.redo());
    await wait();
    expect(b.threads!.map((t) => t.body).sort()).toEqual(["from a", "from b"]);

    await act(() => a.resolve(aId, true));
    await wait();
    expect(b.threads!.find((t) => t.id === aId)!.status).toBe("resolved");

    await act(() => a.undo());
    await wait();
    expect(a.threads!.find((t) => t.id === aId)!.status).toBe("open");
    expect(b.threads!.find((t) => t.id === aId)!.status).toBe("open");

    await act(() => a.redo());
    await wait();
    expect(b.threads!.find((t) => t.id === aId)!.status).toBe("resolved");

    // B's undo stack only holds B's own create.
    await act(() => b.undo());
    await wait();
    expect(a.threads!.map((t) => t.body)).toEqual(["from a"]);
  }, 10000);

  it("survives a late joiner loading threads from the server snapshot", async () => {
    server = new LivelyServer();
    await server.start(0);
    const a = mount("a");
    await wait();

    let id = "";
    await act(() => {
      id = a.create({ anchor: anchor(), kind: "comment", body: "early" });
      a.reply(id, "note to self");
    });
    await wait();

    const late = mount("late");
    await wait();
    expect(late.threads).toHaveLength(1);
    expect(late.threads![0].replies.map((r) => r.body)).toEqual(["note to self"]);

    await act(() => {
      late.reply(id, "caught up");
    });
    await wait();
    expect(a.threads![0].replies.map((r) => r.body)).toEqual(["note to self", "caught up"]);
  }, 10000);
});
