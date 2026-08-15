/**
 * A tiny declarative timeline for the scripted demos.
 *
 * A script is an initial state plus a list of timestamped transforms. The
 * runner walks them once and stops — deliberately not a loop, because an
 * ambient animation that never settles pulls the eye and never gives it back.
 *
 * The pure helpers (`stateAt`, `finalState`) carry all the logic worth
 * testing; the runner is a thin scheduler over them with injectable timers so
 * tests never wait on wall-clock time.
 */

export interface Step<S> {
  /** Milliseconds from the start of the script. */
  at: number;
  /** Must be pure — the runner may apply it from any starting point. */
  apply: (state: S) => S;
  /** Optional label, useful when debugging a script that reads wrong. */
  note?: string;
}

export interface Script<S> {
  initial: S;
  steps: Step<S>[];
}

/** Steps in ascending time order. Ties keep their declaration order. */
function ordered<S>(script: Script<S>): Step<S>[] {
  return script.steps
    .map((step, i) => ({ step, i }))
    .sort((a, b) => a.step.at - b.step.at || a.i - b.i)
    .map(({ step }) => step);
}

/** How long the script runs, in milliseconds. */
export function scriptDuration<S>(script: Script<S>): number {
  return script.steps.reduce((max, s) => Math.max(max, s.at), 0);
}

/** State after applying every step whose time is <= `t`. */
export function stateAt<S>(script: Script<S>, t: number): S {
  let state = script.initial;
  for (const step of ordered(script)) {
    if (step.at <= t) state = step.apply(state);
    else break;
  }
  return state;
}

/** State after the whole script has run. */
export function finalState<S>(script: Script<S>): S {
  return stateAt(script, Number.POSITIVE_INFINITY);
}

export interface RunnerDeps {
  now: () => number;
  setTimer: (fn: () => void, ms: number) => number;
  clearTimer: (id: number) => void;
}

const defaultDeps: RunnerDeps = {
  now: () => Date.now(),
  setTimer: (fn, ms) => setTimeout(fn, ms) as unknown as number,
  clearTimer: (id) => clearTimeout(id),
};

export interface Runner<S> {
  start: () => void;
  /** Freeze where we are. Safe to call when already paused or finished. */
  pause: () => void;
  /** Continue from where `pause` left off. */
  resume: () => void;
  /** Stop and reset to the initial state. */
  reset: () => void;
  /** Jump to the end without playing. Used for reduced-motion. */
  finish: () => void;
  isDone: () => boolean;
  elapsed: () => number;
}

/**
 * Walks a script once, emitting state as it goes.
 *
 * `onState` fires on every applied step, plus once on reset/finish, so a
 * React caller can simply push it into `setState`.
 */
export function createRunner<S>(
  script: Script<S>,
  onState: (state: S) => void,
  deps: Partial<RunnerDeps> = {}
): Runner<S> {
  const { now, setTimer, clearTimer } = { ...defaultDeps, ...deps };
  const steps = ordered(script);
  const total = scriptDuration(script);

  let index = 0;
  let elapsed = 0;
  let startedAt: number | null = null;
  let timer: number | null = null;

  function clear() {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
  }

  function currentElapsed() {
    return startedAt === null ? elapsed : elapsed + (now() - startedAt);
  }

  function schedule() {
    clear();
    if (index >= steps.length) return;
    const wait = Math.max(0, steps[index].at - currentElapsed());
    timer = setTimer(() => {
      timer = null;
      const at = steps[index].at;
      // Apply every step due at this instant before emitting.
      while (index < steps.length && steps[index].at <= at) {
        index += 1;
      }
      onState(stateAt(script, at));
      schedule();
    }, wait);
  }

  return {
    start() {
      if (startedAt !== null || index >= steps.length) return;
      startedAt = now();
      onState(stateAt(script, currentElapsed()));
      schedule();
    },
    pause() {
      if (startedAt === null) return;
      elapsed = currentElapsed();
      startedAt = null;
      clear();
    },
    resume() {
      if (startedAt !== null || index >= steps.length) return;
      startedAt = now();
      schedule();
    },
    reset() {
      clear();
      index = 0;
      elapsed = 0;
      startedAt = null;
      onState(script.initial);
    },
    finish() {
      clear();
      index = steps.length;
      elapsed = total;
      startedAt = null;
      onState(finalState(script));
    },
    isDone: () => index >= steps.length,
    elapsed: currentElapsed,
  };
}
