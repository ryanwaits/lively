import { describe, expect, test } from "bun:test";
import type { StorageOp } from "@waits/lively-types";
import { LiveList } from "../live-list.js";
import { LiveObject } from "../live-object.js";
import { StorageDocument } from "../storage-document.js";

// Regression tests for umbrel-apps PR #5852 review: mutating a LiveObject
// inside a LiveList neither synced nor persisted when the item was loaded
// from a snapshot (page refresh, reconnect, or joining a room with existing
// data). Root cause: snapshot hydration never assigned `_path` to LiveList
// children, so their ops were addressed at the storage root.

function docWithOneTodo(): StorageDocument {
  const root = new LiveObject({
    todos: new LiveList([
      new LiveObject({ id: "t1", text: "buy milk", completed: false }),
    ]),
  });
  return new StorageDocument(root);
}

function firstTodo(doc: StorageDocument): LiveObject {
  const list = doc.getRoot().get("todos") as LiveList<LiveObject>;
  return list.get(0)!;
}

function expectItemPath(ops: StorageOp[]): void {
  expect(ops).toHaveLength(1);
  expect(ops[0].path).toHaveLength(2); // ["todos", <position>]
  expect(ops[0].path[0]).toBe("todos");
}

describe("LiveList child paths", () => {
  test("item pushed onto an attached list emits correctly-pathed set op", () => {
    const root = new LiveObject({ todos: new LiveList<LiveObject>([]) });
    const doc = new StorageDocument(root);
    const list = root.get("todos") as LiveList<LiveObject>;
    list.push(new LiveObject({ id: "t1", text: "x", completed: false }));

    const ops: StorageOp[] = [];
    doc.setOnOpsGenerated((o) => ops.push(...o));
    (list.get(0) as LiveObject).set("completed", true);

    expectItemPath(ops);
  });

  test("item passed to LiveList constructor emits correctly-pathed set op", () => {
    const doc = docWithOneTodo();
    const ops: StorageOp[] = [];
    doc.setOnOpsGenerated((o) => ops.push(...o));

    firstTodo(doc).set("completed", true);

    expectItemPath(ops);
  });

  test("item loaded via StorageDocument.deserialize emits correctly-pathed set op", () => {
    const source = docWithOneTodo();
    const hydrated = StorageDocument.deserialize(source.serialize());
    const ops: StorageOp[] = [];
    hydrated.setOnOpsGenerated((o) => ops.push(...o));

    firstTodo(hydrated).set("completed", true);

    expectItemPath(ops);
  });

  test("set op from a snapshot-hydrated doc updates the todo on a remote doc", () => {
    const source = docWithOneTodo();
    const sender = StorageDocument.deserialize(source.serialize());
    const receiver = StorageDocument.deserialize(source.serialize());

    const ops: StorageOp[] = [];
    sender.setOnOpsGenerated((o) => ops.push(...o));
    firstTodo(sender).set("completed", true);
    receiver.applyOps(ops);

    expect(firstTodo(receiver).get("completed")).toBe(true);
    expect(receiver.getRoot().get("completed" as never)).toBeUndefined();
  });

  test("applySnapshot (reconnect path) preserves list-child paths", () => {
    const doc = docWithOneTodo();
    doc.applySnapshot(doc.serialize());
    const ops: StorageOp[] = [];
    doc.setOnOpsGenerated((o) => ops.push(...o));

    firstTodo(doc).set("completed", true);

    expectItemPath(ops);
  });

  test("nested CRDT inside a pushed subtree becomes addressable", () => {
    const root = new LiveObject({ todos: new LiveList<LiveObject>([]) });
    const doc = new StorageDocument(root);
    const list = root.get("todos") as LiveList<LiveObject>;

    // Build a detached subtree, then push — grandchild paths must be re-based
    const tags = new LiveList<string>([]);
    list.push(new LiveObject({ id: "t1", tags }));

    const ops: StorageOp[] = [];
    doc.setOnOpsGenerated((o) => ops.push(...o));
    tags.push("urgent");

    expect(ops).toHaveLength(1);
    expect(ops[0].path).toHaveLength(3); // ["todos", <position>, "tags"]
    expect(ops[0].path[0]).toBe("todos");
    expect(ops[0].path[2]).toBe("tags");

    // And the op round-trips into a fresh doc
    const remote = StorageDocument.deserialize(doc.serialize());
    const remoteTags = (
      (remote.getRoot().get("todos") as LiveList<LiveObject>).get(0) as LiveObject
    ).get("tags") as LiveList<string>;
    expect(remoteTags.toArray()).toEqual(["urgent"]);
  });

  test("remote list-item change notifies subscribers after applySnapshot", () => {
    const doc = docWithOneTodo();
    doc.applySnapshot(doc.serialize());

    let notified = 0;
    doc.subscribe(doc.getRoot(), () => notified++, { isDeep: true });

    const sender = StorageDocument.deserialize(doc.serialize());
    const ops: StorageOp[] = [];
    sender.setOnOpsGenerated((o) => ops.push(...o));
    firstTodo(sender).set("completed", true);

    doc.applyOps(ops);
    expect(firstTodo(doc).get("completed")).toBe(true);
    expect(notified).toBeGreaterThan(0);
  });
});
