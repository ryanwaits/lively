import { describe, it, expect } from "bun:test";
import { LiveMap } from "../live-map";
import { LiveObject } from "../live-object";
import { StorageDocument } from "../storage-document";

describe("LiveMap", () => {
  function createDoc(map: LiveMap) {
    const root = new LiveObject({ map });
    return new StorageDocument(root);
  }

  it("get/set/has work", () => {
    const map = new LiveMap<number>();
    const doc = createDoc(map);
    map.set("a", 1);
    expect(map.get("a")).toBe(1);
    expect(map.has("a")).toBe(true);
    expect(map.has("b")).toBe(false);
  });

  it("delete marks as tombstone", () => {
    const map = new LiveMap<number>();
    const doc = createDoc(map);
    map.set("a", 1);
    map.delete("a");
    expect(map.has("a")).toBe(false);
    expect(map.get("a")).toBeUndefined();
  });

  it("size skips tombstones", () => {
    const map = new LiveMap<number>();
    const doc = createDoc(map);
    map.set("a", 1);
    map.set("b", 2);
    expect(map.size).toBe(2);
    map.delete("a");
    expect(map.size).toBe(1);
  });

  it("iteration skips tombstones", () => {
    const map = new LiveMap<number>();
    const doc = createDoc(map);
    map.set("a", 1);
    map.set("b", 2);
    map.set("c", 3);
    map.delete("b");

    const keys: string[] = [];
    map.forEach((_, key) => keys.push(key));
    expect(keys).toEqual(["a", "c"]);

    const entries = Array.from(map.entries());
    expect(entries).toEqual([
      ["a", 1],
      ["c", 3],
    ]);
  });

  it("toImmutable returns ReadonlyMap", () => {
    const map = new LiveMap<number>();
    const doc = createDoc(map);
    map.set("x", 10);
    const imm = map.toImmutable();
    expect(imm.get("x")).toBe(10);
    expect(imm.size).toBe(1);
  });

  it("nested LiveObject in map", () => {
    const map = new LiveMap<LiveObject>();
    const doc = createDoc(map);
    const inner = new LiveObject({ value: 42 });
    map.set("item", inner);
    const retrieved = map.get("item") as LiveObject<{ value: number }>;
    expect(retrieved.get("value")).toBe(42);
  });

  it("serialization roundtrip", () => {
    const map = new LiveMap<number>();
    const root = new LiveObject({ map });
    const doc = new StorageDocument(root);
    map.set("a", 1);
    map.set("b", 2);

    const serialized = doc.serialize();
    const doc2 = StorageDocument.deserialize(serialized);
    const root2 = doc2.getRoot();
    const map2 = root2.get("map") as LiveMap<number>;
    expect(map2.get("a")).toBe(1);
    expect(map2.get("b")).toBe(2);
  });

  it("generates ops on set", () => {
    const map = new LiveMap<number>();
    const doc = createDoc(map);
    const ops: any[] = [];
    doc.setOnOpsGenerated((o) => ops.push(...o));
    map.set("key", 99);
    expect(ops.length).toBe(1);
    expect(ops[0].type).toBe("set");
    expect(ops[0].key).toBe("key");
  });
});
