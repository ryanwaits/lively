"use client";

import type { Script } from "../../lib/timeline";
import { useTimeline } from "../../lib/use-timeline";
import { DemoFrame } from "../demo-frame";
import { GhostAvatars, GhostCursor, PEERS } from "../ghost-peer";

interface CursorState {
  maya: { x: number; y: number; visible: boolean };
  jonas: { x: number; y: number; visible: boolean };
  selected: boolean;
}

const script: Script<CursorState> = {
  initial: {
    maya: { x: 12, y: 18, visible: false },
    jonas: { x: 74, y: 66, visible: false },
    selected: false,
  },
  steps: [
    { at: 200, note: "maya joins", apply: (s) => ({ ...s, maya: { ...s.maya, visible: true } }) },
    { at: 700, note: "jonas joins", apply: (s) => ({ ...s, jonas: { ...s.jonas, visible: true } }) },
    { at: 1200, apply: (s) => ({ ...s, maya: { x: 46, y: 34, visible: true } }) },
    { at: 1900, apply: (s) => ({ ...s, jonas: { x: 52, y: 48, visible: true } }) },
    { at: 2500, apply: (s) => ({ ...s, maya: { x: 58, y: 40, visible: true }, selected: true }) },
    { at: 3400, apply: (s) => ({ ...s, jonas: { x: 22, y: 60, visible: true } }) },
    { at: 4200, apply: (s) => ({ ...s, maya: { x: 68, y: 24, visible: true } }) },
  ],
};

const CODE = `const others = useOthers();
const [, update] = useMyPresence();

function onPointerMove(e) {
  update({ cursor: { x: e.clientX, y: e.clientY } });
}`;

export function CursorsDemo() {
  const { ref, state, status, replay, reduced } = useTimeline(script);

  return (
    <DemoFrame
      title="Live cursors"
      filename="Canvas.tsx"
      copyText={CODE}
      status={status}
      onReplay={replay}
      showReplay={!reduced}
      stageRef={ref}
      code={
        <>
          <span className="text-code-keyword">const</span> others ={" "}
          <span className="text-code-func">useOthers</span>();{"\n"}
          <span className="text-code-keyword">const</span> [, update] ={" "}
          <span className="text-code-func">useMyPresence</span>();{"\n\n"}
          <span className="text-code-keyword">function</span>{" "}
          <span className="text-code-func">onPointerMove</span>(e) {"{"}
          {"\n  "}
          <span className="text-code-func">update</span>({"{"} cursor: {"{"} x:
          e.clientX, y: e.clientY {"}"} {"}"});{"\n"}
          {"}"}
        </>
      }
    >
      <div className="absolute inset-0">
        <GhostCursor peer={PEERS.maya} {...state.maya} />
        <GhostCursor peer={PEERS.jonas} {...state.jonas} />
      </div>

      <div className="relative flex flex-col items-center gap-3">
        <div
          className={`grid h-16 w-24 place-items-center rounded-[6px] border transition-colors duration-200 ${
            state.selected
              ? "border-peer-1 bg-peer-1/10"
              : "border-border bg-body"
          }`}
        >
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            shape
          </span>
        </div>
        <GhostAvatars peers={[PEERS.maya, PEERS.jonas]} />
      </div>
    </DemoFrame>
  );
}
