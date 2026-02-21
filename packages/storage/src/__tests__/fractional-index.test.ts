import { describe, it, expect } from "bun:test";
import { generateKeyBetween, generateNKeysBetween } from "../fractional-index";

describe("generateKeyBetween", () => {
  it("generates a key between nulls", () => {
    const key = generateKeyBetween(null, null);
    expect(typeof key).toBe("string");
    expect(key.length).toBeGreaterThan(0);
  });

  it("generates a key before an existing key", () => {
    const b = generateKeyBetween(null, null);
    const a = generateKeyBetween(null, b);
    expect(a < b).toBe(true);
  });

  it("generates a key after an existing key", () => {
    const a = generateKeyBetween(null, null);
    const b = generateKeyBetween(a, null);
    expect(b > a).toBe(true);
  });

  it("generates a key between two existing keys", () => {
    const a = generateKeyBetween(null, null);
    const c = generateKeyBetween(a, null);
    const b = generateKeyBetween(a, c);
    expect(b > a).toBe(true);
    expect(b < c).toBe(true);
  });

  it("ordering is preserved across many insertions", () => {
    const keys: string[] = [];
    let prev: string | null = null;
    for (let i = 0; i < 20; i++) {
      const key = generateKeyBetween(prev, null);
      keys.push(key);
      prev = key;
    }
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i] > keys[i - 1]).toBe(true);
    }
  });
});

describe("generateNKeysBetween", () => {
  it("returns empty for n=0", () => {
    expect(generateNKeysBetween(null, null, 0)).toEqual([]);
  });

  it("returns 1 key for n=1", () => {
    const keys = generateNKeysBetween(null, null, 1);
    expect(keys.length).toBe(1);
  });

  it("returns N ordered keys", () => {
    const keys = generateNKeysBetween(null, null, 5);
    expect(keys.length).toBe(5);
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i] > keys[i - 1]).toBe(true);
    }
  });

  it("returns keys between bounds", () => {
    const a = "A";
    const b = "Z";
    const keys = generateNKeysBetween(a, b, 3);
    for (const key of keys) {
      expect(key > a).toBe(true);
      expect(key < b).toBe(true);
    }
  });
});
