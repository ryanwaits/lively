"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createRunner, finalState, type Runner, type Script } from "./timeline";

export type TimelineStatus = "idle" | "playing" | "done";

/**
 * Plays a script once, when its element first scrolls into view.
 *
 * Three things this deliberately does:
 *  - never loops. It stops at the end and offers a replay instead.
 *  - never runs off-screen or in a background tab. No burning frames where
 *    nobody is looking.
 *  - never animates under `prefers-reduced-motion: reduce`. The block renders
 *    its finished state immediately and hides the replay control.
 */
export function useTimeline<S>(script: Script<S>) {
  const [state, setState] = useState<S>(script.initial);
  const [status, setStatus] = useState<TimelineStatus>("idle");
  const [reduced, setReduced] = useState(false);

  const ref = useRef<HTMLDivElement>(null);
  const runnerRef = useRef<Runner<S> | null>(null);
  const scriptRef = useRef(script);
  scriptRef.current = script;

  // Build the runner once. The script is a module constant in practice, so
  // rebuilding on every render would just restart the animation.
  if (runnerRef.current === null) {
    runnerRef.current = createRunner(script, (s) => {
      setState(s);
    });
  }

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReduced(mq.matches);
      if (mq.matches) {
        runnerRef.current?.pause();
        setState(finalState(scriptRef.current));
        setStatus("done");
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Start on first intersection; pause whenever it leaves the viewport.
  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const runner = runnerRef.current;
        if (!runner) return;
        if (entry.isIntersecting) {
          if (runner.isDone()) return;
          runner.start();
          runner.resume();
          setStatus("playing");
        } else {
          runner.pause();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced]);

  // A backgrounded tab should cost nothing.
  useEffect(() => {
    if (reduced) return;
    const onVisibility = () => {
      const runner = runnerRef.current;
      if (!runner) return;
      if (document.hidden) runner.pause();
      else if (!runner.isDone()) runner.resume();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [reduced]);

  // Mark done once the runner runs out of steps.
  useEffect(() => {
    if (status !== "playing") return;
    const id = window.setInterval(() => {
      if (runnerRef.current?.isDone()) {
        setStatus("done");
        window.clearInterval(id);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [status]);

  useEffect(() => {
    return () => runnerRef.current?.pause();
  }, []);

  const replay = useCallback(() => {
    const runner = runnerRef.current;
    if (!runner) return;
    runner.reset();
    runner.start();
    setStatus("playing");
  }, []);

  return { ref, state, status, replay, reduced };
}
