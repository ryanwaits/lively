import { describe, it, expect } from "bun:test";
import { RoomPersistence, PersistenceBinding, sanitize } from "../persistence.js";

// Full coverage lives in @waits/lively-server; this guards the re-export.
describe("persistence re-export", () => {
  it("exposes the unified persistence API from @waits/lively-server", () => {
    expect(typeof RoomPersistence).toBe("function");
    expect(typeof PersistenceBinding).toBe("function");
    expect(sanitize("a/b")).toBe("a_b");

    const persistence = new RoomPersistence(".lively-test");
    expect(typeof persistence.loadStorage).toBe("function");
    expect(typeof persistence.loadYjs).toBe("function");
  });
});
