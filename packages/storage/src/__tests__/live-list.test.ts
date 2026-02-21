import { describe, it, expect } from "bun:test";
import { LiveList } from "../live-list";
import { LiveObject } from "../live-object";
import { StorageDocument } from "../storage-document";

describe("LiveList", () => {
  function createDoc(list: LiveList) {
    const root = new LiveObject({ list });
    return new StorageDocument(root);
  }

  it("push appends items", () => {
    const list = new LiveList<number>();
    const doc = createDoc(list);
    list.push(1);
    list.push(2);
    list.push(3);
    expect(list.toArray()).toEqual([1, 2, 3]);
    expect(list.length).toBe(3);
  });

  it("insert at index", () => {
    const list = new LiveList<number>();
    const doc = createDoc(list);
    list.push(1);
    list.push(3);
    list.insert(2, 1);
    expect(list.toArray()).toEqual([1, 2, 3]);
  });

  it("delete by index", () => {
    const list = new LiveList<number>();
    const doc = createDoc(list);
    list.push(1);
    list.push(2);
    list.push(3);
    list.delete(1);
    expect(list.toArray()).toEqual([1, 3]);
  });

  it("move reorders items", () => {
    const list = new LiveList<string>();
    const doc = createDoc(list);
    list.push("a");
    list.push("b");
    list.push("c");
    list.move(0, 2); // move "a" to index 2
    expect(list.toArray()).toEqual(["b", "c", "a"]);
  });

  it("get by index", () => {
    const list = new LiveList<number>();
    const doc = createDoc(list);
    list.push(10);
    list.push(20);
    expect(list.get(0)).toBe(10);
    expect(list.get(1)).toBe(20);
    expect(list.get(5)).toBeUndefined();
  });

  it("forEach and map work", () => {
    const list = new LiveList<number>();
    const doc = createDoc(list);
    list.push(1);
    list.push(2);

    const items: number[] = [];
    list.forEach((v) => items.push(v));
    expect(items).toEqual([1, 2]);

    const doubled = list.map((v) => v * 2);
    expect(doubled).toEqual([2, 4]);
  });

  it("toImmutable returns frozen array", () => {
    const list = new LiveList<number>();
    const doc = createDoc(list);
    list.push(1);
    const imm = list.toImmutable();
    expect(imm).toEqual([1]);
    expect(Object.isFrozen(imm)).toBe(true);
  });

  it("serialization roundtrip", () => {
    const list = new LiveList<number>();
    const root = new LiveObject({ list });
    const doc = new StorageDocument(root);
    list.push(10);
    list.push(20);
    list.push(30);

    const serialized = doc.serialize();
    const doc2 = StorageDocument.deserialize(serialized);
    const root2 = doc2.getRoot();
    const list2 = root2.get("list") as LiveList<number>;
    expect(list2.toArray()).toEqual([10, 20, 30]);
  });

  it("concurrent inserts maintain order", () => {
    const list = new LiveList<number>();
    const doc = createDoc(list);
    list.push(1);
    list.push(2);

    // Simulate remote insert between positions
    const serialized = doc.serialize();
    const doc2 = StorageDocument.deserialize(serialized);
    const list2 = doc2.getRoot().get("list") as LiveList<number>;
    list2.insert(99, 1);
    expect(list2.toArray()).toEqual([1, 99, 2]);
  });

  it("generates ops on push", () => {
    const list = new LiveList<number>();
    const doc = createDoc(list);
    const ops: any[] = [];
    doc.setOnOpsGenerated((o) => ops.push(...o));
    list.push(42);
    expect(ops.length).toBe(1);
    expect(ops[0].type).toBe("list-insert");
  });
});
