import { describe, expect, test } from "bun:test";
import {
  createRunner,
  finalState,
  type RunnerDeps,
  type Script,
  scriptDuration,
  stateAt,
} from "../timeline";

const script: Script<string[]> = {
  initial: [],
  steps: [
    { at: 100, apply: (s) => [...s, "a"] },
    { at: 300, apply: (s) => [...s, "b"] },
    { at: 200, apply: (s) => [...s, "c"] },
  ],
};

/** A clock the test drives by hand, so nothing waits on real time. */
function fakeClock() {
  let t = 0;
  let next = 1;
  const timers = new Map<number, { fn: () => void; due: number }>();

  const deps: RunnerDeps = {
    now: () => t,
    setTimer: (fn, ms) => {
      const id = next++;
      timers.set(id, { fn, due: t + ms });
      return id;
    },
    clearTimer: (id) => {
      timers.delete(id);
    },
  };

  function advance(ms: number) {
    const target = t + ms;
    // Fire timers in due order, letting each one schedule the next.
    for (;;) {
      const pending = [...timers.entries()]
        .filter(([, v]) => v.due <= target)
        .sort((a, b) => a[1].due - b[1].due)[0];
      if (!pending) break;
      const [id, { fn, due }] = pending;
      timers.delete(id);
      t = due;
      fn();
    }
    t = target;
  }

  return { deps, advance, pending: () => timers.size };
}

describe("pure helpers", () => {
  test("orders steps by time regardless of declaration order", () => {
    expect(finalState(script)).toEqual(["a", "c", "b"]);
  });

  test("stateAt applies only steps at or before the given time", () => {
    expect(stateAt(script, 0)).toEqual([]);
    expect(stateAt(script, 99)).toEqual([]);
    expect(stateAt(script, 100)).toEqual(["a"]);
    expect(stateAt(script, 250)).toEqual(["a", "c"]);
    expect(stateAt(script, 10_000)).toEqual(["a", "c", "b"]);
  });

  test("duration is the last step's timestamp", () => {
    expect(scriptDuration(script)).toBe(300);
    expect(scriptDuration({ initial: 0, steps: [] })).toBe(0);
  });

  test("does not mutate the initial state", () => {
    const initial: string[] = [];
    finalState({ initial, steps: script.steps });
    expect(initial).toEqual([]);
  });
});

describe("runner", () => {
  test("emits each step in time order and then reports done", () => {
    const seen: string[][] = [];
    const clock = fakeClock();
    const runner = createRunner(script, (s) => seen.push(s), clock.deps);

    runner.start();
    expect(runner.isDone()).toBe(false);

    clock.advance(100);
    expect(seen.at(-1)).toEqual(["a"]);

    clock.advance(100);
    expect(seen.at(-1)).toEqual(["a", "c"]);

    clock.advance(100);
    expect(seen.at(-1)).toEqual(["a", "c", "b"]);
    expect(runner.isDone()).toBe(true);
  });

  test("pause freezes progress and resume continues from there", () => {
    const seen: string[][] = [];
    const clock = fakeClock();
    const runner = createRunner(script, (s) => seen.push(s), clock.deps);

    runner.start();
    clock.advance(100);
    expect(seen.at(-1)).toEqual(["a"]);

    runner.pause();
    expect(clock.pending()).toBe(0);

    // Time passes while paused; nothing should fire.
    clock.advance(5_000);
    expect(seen.at(-1)).toEqual(["a"]);

    runner.resume();
    clock.advance(100);
    expect(seen.at(-1)).toEqual(["a", "c"]);
  });

  test("finish jumps to the end without scheduling anything", () => {
    const seen: string[][] = [];
    const clock = fakeClock();
    const runner = createRunner(script, (s) => seen.push(s), clock.deps);

    runner.finish();
    expect(seen.at(-1)).toEqual(["a", "c", "b"]);
    expect(runner.isDone()).toBe(true);
    expect(clock.pending()).toBe(0);
  });

  test("reset returns to the initial state and can replay", () => {
    const seen: string[][] = [];
    const clock = fakeClock();
    const runner = createRunner(script, (s) => seen.push(s), clock.deps);

    runner.start();
    clock.advance(300);
    expect(runner.isDone()).toBe(true);

    runner.reset();
    expect(seen.at(-1)).toEqual([]);
    expect(runner.isDone()).toBe(false);

    runner.start();
    clock.advance(300);
    expect(seen.at(-1)).toEqual(["a", "c", "b"]);
  });

  test("start is idempotent — a second call does not double-schedule", () => {
    const seen: string[][] = [];
    const clock = fakeClock();
    const runner = createRunner(script, (s) => seen.push(s), clock.deps);

    runner.start();
    runner.start();
    clock.advance(100);

    expect(seen.filter((s) => s.length === 1)).toHaveLength(1);
  });

  test("leaves no timer pending once reset", () => {
    const clock = fakeClock();
    const runner = createRunner(script, () => {}, clock.deps);
    runner.start();
    clock.advance(50);
    expect(clock.pending()).toBe(1);
    runner.reset();
    expect(clock.pending()).toBe(0);
  });

  test("applies steps sharing a timestamp together", () => {
    const together: Script<number> = {
      initial: 0,
      steps: [
        { at: 50, apply: (n) => n + 1 },
        { at: 50, apply: (n) => n + 10 },
      ],
    };
    const seen: number[] = [];
    const clock = fakeClock();
    const runner = createRunner(together, (n) => seen.push(n), clock.deps);

    runner.start();
    clock.advance(50);
    expect(seen.at(-1)).toBe(11);
    expect(runner.isDone()).toBe(true);
  });
});
