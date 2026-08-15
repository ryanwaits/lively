"use client";

import type { Script } from "../../lib/timeline";
import { useTimeline } from "../../lib/use-timeline";
import { DemoFrame } from "../demo-frame";
import { GhostCursor, PEERS } from "../ghost-peer";

interface Todo {
  id: string;
  text: string;
  done: boolean;
}

interface TodoState {
  todos: Todo[];
  cursor: { x: number; y: number; visible: boolean };
  /** The row currently being written into, so the caret lands in one place. */
  typingId: string | null;
}

const base: Todo[] = [
  { id: "1", text: "Wire up the room provider", done: true },
  { id: "2", text: "Add cursor overlay", done: false },
];

/**
 * Every step below is something the API beside it can actually do:
 * `LiveList.push`, a `set` on a list item, and `LiveList.delete`.
 */
const script: Script<TodoState> = {
  initial: { todos: base, cursor: { x: 8, y: 70, visible: false }, typingId: null },
  steps: [
    { at: 300, apply: (s) => ({ ...s, cursor: { ...s.cursor, visible: true } }) },
    { at: 900, apply: (s) => ({ ...s, cursor: { x: 20, y: 78, visible: true } }) },
    {
      at: 1400,
      note: "push a new item",
      apply: (s) => ({
        ...s,
        typingId: "3",
        todos: [...s.todos, { id: "3", text: "", done: false }],
      }),
    },
    { at: 1800, apply: (s) => ({ ...s, todos: setText(s.todos, "3", "Persist ") }) },
    { at: 2200, apply: (s) => ({ ...s, todos: setText(s.todos, "3", "Persist snapshots") }) },
    { at: 2500, apply: (s) => ({ ...s, typingId: null }) },
    { at: 3100, apply: (s) => ({ ...s, cursor: { x: 12, y: 40, visible: true } }) },
    {
      at: 3600,
      note: "toggle the second item",
      apply: (s) => ({ ...s, todos: toggle(s.todos, "2") }),
    },
    { at: 4400, apply: (s) => ({ ...s, cursor: { x: 78, y: 18, visible: true } }) },
    {
      at: 4900,
      note: "delete the first item",
      apply: (s) => ({ ...s, todos: s.todos.filter((t) => t.id !== "1") }),
    },
    { at: 5600, apply: (s) => ({ ...s, cursor: { x: 60, y: 82, visible: true } }) },
  ],
};

function setText(todos: Todo[], id: string, text: string): Todo[] {
  return todos.map((t) => (t.id === id ? { ...t, text } : t));
}

function toggle(todos: Todo[], id: string): Todo[] {
  return todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
}

const CODE = `const todos = useStorage(root => root.get("todos"));

const addTodo = useMutation(({ storage }, text) => {
  storage.root.get("todos").push({ text, done: false });
}, []);`;

export function TodoDemo() {
  const { ref, state, status, replay, reduced } = useTimeline(script);

  return (
    <DemoFrame
      title="Shared state"
      filename="TodoList.tsx"
      copyText={CODE}
      status={status}
      onReplay={replay}
      showReplay={!reduced}
      stageRef={ref}
      code={
        <>
          <span className="text-code-keyword">const</span> todos ={" "}
          <span className="text-code-func">useStorage</span>(root ={">"} root.
          <span className="text-code-func">get</span>(
          <span className="text-code-string">&quot;todos&quot;</span>));{"\n\n"}
          <span className="text-code-keyword">const</span> addTodo ={" "}
          <span className="text-code-func">useMutation</span>(({"{"} storage {"}"}
          , text) ={">"} {"{"}
          {"\n  "}storage.root.<span className="text-code-func">get</span>(
          <span className="text-code-string">&quot;todos&quot;</span>).
          <span className="text-code-func">push</span>({"{"} text, done:{" "}
          <span className="text-code-keyword">false</span> {"}"});{"\n"}
          {"}"}, []);
        </>
      }
    >
      <div className="absolute inset-0">
        <GhostCursor peer={PEERS.elena} {...state.cursor} />
      </div>

      <ul className="relative m-0 w-full max-w-[240px] list-none space-y-1.5 p-0">
        {state.todos.map((todo) => (
          <li
            key={todo.id}
            className="flex items-center gap-2 rounded-[6px] border border-border bg-body px-2.5 py-1.5"
          >
            <span
              aria-hidden="true"
              className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[3px] border ${
                todo.done
                  ? "border-peer-3 bg-peer-3"
                  : "border-border-hover bg-body"
              }`}
            >
              {todo.done && (
                <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true">
                  <path
                    d="M1.5 5.2 L4 7.5 L8.5 2.5"
                    fill="none"
                    stroke="var(--color-accent-fg)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            <span
              className={`min-w-0 flex-1 truncate text-[12px] ${
                todo.done ? "text-muted line-through" : "text-text"
              }`}
            >
              {todo.text || " "}
              {state.typingId === todo.id && (
                <span className="ml-px inline-block h-3 w-px translate-y-[2px] bg-peer-3" />
              )}
            </span>
          </li>
        ))}
      </ul>
    </DemoFrame>
  );
}
