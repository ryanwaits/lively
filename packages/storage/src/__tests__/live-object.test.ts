import { describe, it, expect } from "bun:test";
import { LiveObject } from "../live-object";
import { StorageDocument } from "../storage-document";

describe("LiveObject", () => {
  it("get/set work", () => {
    const root = new LiveObject<{ name: string; count: number }>({
      name: "hello",
      count: 0,
    });
    const doc = new StorageDocument(root);
    expect(root.get("name")).toBe("hello");
    expect(root.get("count")).toBe(0);
    root.set("name", "world");
    expect(root.get("name")).toBe("world");
  });

  it("update sets multiple fields", () => {
    const root = new LiveObject<{ a: number; b: number }>({ a: 1, b: 2 });
    const doc = new StorageDocument(root);
    root.update({ a: 10, b: 20 });
    expect(root.get("a")).toBe(10);
    expect(root.get("b")).toBe(20);
  });

  it("toObject returns plain object", () => {
    const root = new LiveObject({ x: 1, y: "two" });
    expect(root.toObject()).toEqual({ x: 1, y: "two" });
  });

  it("toImmutable caching works", () => {
    const root = new LiveObject({ a: 1 });
    const doc = new StorageDocument(root);
    const imm1 = root.toImmutable();
    const imm2 = root.toImmutable();
    expect(imm1).toBe(imm2); // same reference
    root.set("a", 2);
    const imm3 = root.toImmutable();
    expect(imm3).not.toBe(imm1);
    expect(imm3.a).toBe(2);
  });

  it("LWW conflict resolution", () => {
    const root = new LiveObject<{ x: number }>({ x: 0 });
    const doc = new StorageDocument(root);

    // Simulate remote op with higher clock
    root._applyOp({ type: "set", path: [], key: "x", value: 100, clock: 10 });
    expect(root.get("x")).toBe(100);

    // Simulate remote op with lower clock — should be rejected
    root._applyOp({ type: "set", path: [], key: "x", value: 50, clock: 5 });
    expect(root.get("x")).toBe(100);
  });

  it("nested LiveObject", () => {
    const inner = new LiveObject({ val: 42 });
    const root = new LiveObject({ nested: inner });
    const doc = new StorageDocument(root);

    const nested = root.get("nested") as LiveObject<{ val: number }>;
    expect(nested.get("val")).toBe(42);
  });

  it("serialization roundtrip", () => {
    const root = new LiveObject({ name: "test", count: 5 });
    const doc = new StorageDocument(root);
    const serialized = doc.serialize();
    const doc2 = StorageDocument.deserialize(serialized);
    const root2 = doc2.getRoot();
    expect(root2.get("name")).toBe("test");
    expect(root2.get("count")).toBe(5);
  });

  it("generates ops on set", () => {
    const root = new LiveObject<{ x: number }>({ x: 0 });
    const doc = new StorageDocument(root);
    const ops: any[] = [];
    doc.setOnOpsGenerated((o) => ops.push(...o));
    root.set("x", 42);
    expect(ops.length).toBe(1);
    expect(ops[0].type).toBe("set");
    expect(ops[0].key).toBe("x");
    expect(ops[0].value).toBe(42);
  });
});
