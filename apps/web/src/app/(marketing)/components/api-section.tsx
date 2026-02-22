"use client";

import { useState } from "react";

interface DxItem {
  title: string;
  description: string;
  filename: string;
  code: React.ReactNode;
}

const ITEMS: DxItem[] = [
  {
    title: "Type-Safe by Default",
    description:
      "Full TypeScript support out of the box. Auto-inferred types for presence, storage, and events.",
    filename: "client.ts — lively-react",
    code: (
      <>
        <Line>
          <span className="text-code-keyword">import</span>
          {" { "}
          <span className="text-text">LivelyClient</span>
          {" } "}
          <span className="text-code-keyword">from</span>{" "}
          <span className="text-code-string">
            &quot;@waits/lively-client&quot;
          </span>
          ;
        </Line>
        <Line>{""}</Line>
        <Line>
          <span className="text-code-keyword">const</span> client ={" "}
          <span className="text-code-func">new LivelyClient</span>
          {"({"}
        </Line>
        <Line indent>
          serverUrl:{" "}
          <span className="text-code-string">
            &quot;ws://localhost:1999&quot;
          </span>
          ,
        </Line>
        <Line indent>
          reconnect: <span className="text-code-keyword">true</span>,{" "}
          <span className="text-code-comment">{"// auto-reconnect"}</span>
        </Line>
        <Line>{"});"}</Line>
        <Line>{""}</Line>
        <Line>
          <span className="text-code-keyword">export default</span> client;
        </Line>
      </>
    ),
  },
  {
    title: "Self-Hosted",
    description:
      "Run the Lively server on your own infrastructure. No vendor lock-in, no third-party dependencies.",
    filename: "server/lively.ts",
    code: (
      <>
        <Line>
          <span className="text-code-keyword">import</span>
          {" { "}
          <span className="text-text">LivelyServer</span>
          {" } "}
          <span className="text-code-keyword">from</span>{" "}
          <span className="text-code-string">
            &quot;@waits/lively-server&quot;
          </span>
          ;
        </Line>
        <Line>{""}</Line>
        <Line>
          <span className="text-code-keyword">const</span> server ={" "}
          <span className="text-code-func">new LivelyServer</span>
          {"({"}
        </Line>
        <Line indent>
          port: <span className="text-code-func">1999</span>,
        </Line>
        <Line indent>
          persist: <span className="text-code-keyword">true</span>,
        </Line>
        <Line>{"});"}</Line>
        <Line>{""}</Line>
        <Line>
          server.<span className="text-code-func">start</span>();
        </Line>
        <Line>
          <span className="text-code-comment">
            {"// ✓ Lively running on :1999"}
          </span>
        </Line>
      </>
    ),
  },
  {
    title: "Framework Hooks",
    description:
      "React hooks for presence, storage, rooms, and more. Just wrap your app and start building.",
    filename: "app.tsx — react",
    code: (
      <>
        <Line>
          <span className="text-code-keyword">import</span>
          {" { "}
          <span className="text-text">useOthers, useMyPresence</span>
          {" } "}
        </Line>
        <Line indent>
          <span className="text-code-keyword">from</span>{" "}
          <span className="text-code-string">
            &quot;@waits/lively-react&quot;
          </span>
          ;
        </Line>
        <Line>{""}</Line>
        <Line>
          <span className="text-code-keyword">function</span>{" "}
          <span className="text-code-func">Cursors</span>() {"{"}
        </Line>
        <Line indent>
          <span className="text-code-keyword">const</span> others ={" "}
          <span className="text-code-func">useOthers</span>();
        </Line>
        <Line indent>
          <span className="text-code-keyword">const</span> [me, update] ={" "}
          <span className="text-code-func">useMyPresence</span>();
        </Line>
        <Line>{""}</Line>
        <Line indent>
          <span className="text-code-keyword">return</span> others.
          <span className="text-code-func">map</span>
          {"(("}user{")"} {"=> ("}
        </Line>
        <Line indent>
          {"  <"}
          <span className="text-code-func">Cursor</span>{" "}
          <span className="text-text">key</span>=
          {"{"}user.id{"}"}{" "}
          <span className="text-text">point</span>=
          {"{"}user.cursor{"}"} {"/>"}
        </Line>
        <Line indent>{"));"}</Line>
        <Line>{"}"}</Line>
      </>
    ),
  },
  {
    title: "CLI Tools",
    description:
      "Dev server, room inspection, and data management from the command line.",
    filename: "terminal",
    code: (
      <>
        <Line>
          <span className="text-code-comment">
            {"# Start the dev server"}
          </span>
        </Line>
        <Line>
          <span className="text-code-keyword">$</span>{" "}
          <span className="text-text">npx lively dev</span>
        </Line>
        <Line>
          <span className="text-code-comment">
            {"  ✓ Lively running on :1999"}
          </span>
        </Line>
        <Line>{""}</Line>
        <Line>
          <span className="text-code-comment">
            {"# List active rooms"}
          </span>
        </Line>
        <Line>
          <span className="text-code-keyword">$</span>{" "}
          <span className="text-text">npx lively rooms list</span>
        </Line>
        <Line>{""}</Line>
        <Line>
          <span className="text-code-comment">
            {"# Inspect a room's storage"}
          </span>
        </Line>
        <Line>
          <span className="text-code-keyword">$</span>{" "}
          <span className="text-text">npx lively rooms inspect my-room</span>
        </Line>
      </>
    ),
  },
];

export function ApiSection() {
  const [active, setActive] = useState(0);
  const item = ITEMS[active];

  return (
    <section
      id="api"
      className="py-24 border-y border-border bg-panel relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Code window */}
        <div className="w-full lg:sticky lg:top-24">
          <div className="rounded-sm border border-code-border bg-code-bg shadow-sm overflow-hidden">
            {/* Title bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-code-border bg-surface">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/40 border border-red-400/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/40 border border-yellow-400/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400/40 border border-green-400/60" />
              <span className="ml-2 font-mono text-[10px] text-muted">
                {item.filename}
              </span>
            </div>

            {/* Code */}
            <div className="p-6 font-mono text-sm leading-relaxed overflow-x-auto min-h-[280px]">
              {item.code}
            </div>
          </div>
        </div>

        {/* Right — timeline */}
        <div className="pl-0 lg:pl-12">
          <h2 className="font-sans text-3xl md:text-4xl font-semibold tracking-tight text-text mb-10">
            Designed for{" "}
            <span className="text-muted">Developer Velocity</span>.
          </h2>
          <div className="space-y-6">
            {ITEMS.map((it, i) => (
              <button
                key={it.title}
                onClick={() => setActive(i)}
                className={`flex gap-4 w-full text-left transition-opacity ${
                  i === active ? "opacity-100" : "opacity-50 hover:opacity-80"
                }`}
              >
                <div className="mt-1.5 w-px h-12 bg-border relative shrink-0">
                  <div
                    className={`absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 transition-colors ${
                      i === active ? "bg-primary" : "bg-border"
                    }`}
                  />
                </div>
                <div>
                  <h4 className="text-text font-mono font-bold mb-1">
                    {it.title}
                  </h4>
                  <p className="text-muted text-sm">{it.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Line({
  indent,
  children,
}: {
  indent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`${indent ? "pl-6" : ""} min-h-[1.5em]`}>{children}</div>
  );
}
