import { describe, it, expect } from "bun:test";
import { LamportClock } from "../clock";

describe("LamportClock", () => {
  it("starts at 0", () => {
    const clock = new LamportClock();
    expect(clock.value).toBe(0);
  });

  it("tick increments by 1", () => {
    const clock = new LamportClock();
    expect(clock.tick()).toBe(1);
    expect(clock.tick()).toBe(2);
    expect(clock.tick()).toBe(3);
    expect(clock.value).toBe(3);
  });

  it("merge takes max+1", () => {
    const clock = new LamportClock();
    clock.tick(); // 1
    clock.merge(5);
    expect(clock.value).toBe(6);
  });

  it("merge with lower value still increments", () => {
    const clock = new LamportClock();
    clock.tick(); // 1
    clock.tick(); // 2
    clock.tick(); // 3
    clock.merge(1);
    expect(clock.value).toBe(4); // max(3,1)+1
  });
});
