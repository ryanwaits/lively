"use client";

import { useEffect, useRef, useState } from "react";
import { LivelyClient } from "@waits/lively-client";
import {
  LivelyProvider,
  RoomProvider,
  useMutation,
  useStorage,
  useThreads,
} from "@waits/lively-react";
import {
  CollabPills,
  ConnectionBadge,
  SelectionCommentPopover,
  ThreadHighlights,
  ThreadMarginCards,
} from "@waits/lively-ui";

const serverUrl =
  process.env.NEXT_PUBLIC_LIVELY_HOST ||
  (typeof window !== "undefined" && process.env.NODE_ENV === "production"
    ? window.location.origin
    : "http://localhost:2003");
const client = new LivelyClient({ serverUrl, reconnect: true });

/**
 * Review a rendered document together: select text to comment or suggest an
 * edit, and everyone in the room sees the thread appear beside it.
 *
 * Open /review in two windows. `?name=Ada` skips the name prompt.
 */
export default function ReviewPage() {
  const [userId] = useState(() => crypto.randomUUID().slice(0, 8));
  const [displayName, setDisplayName] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const name = new URLSearchParams(window.location.search).get("name")?.trim();
    if (name) {
      setDisplayName(name);
      setJoined(true);
    }
  }, []);

  if (!joined) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-100 dark:bg-neutral-950">
        <form
          className="w-80 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
          onSubmit={(e) => {
            e.preventDefault();
            if (displayName.trim()) setJoined(true);
          }}
        >
          <h1 className="mb-1 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            Join the review
          </h1>
          <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
            Your name appears on the comments you leave
          </p>
          <input
            className="mb-3 w-full rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
            placeholder="Display name"
            aria-label="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            className="w-full rounded-md bg-neutral-800 py-1.5 text-xs font-medium text-white hover:bg-neutral-600 disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
            disabled={!displayName.trim()}
          >
            Join
          </button>
        </form>
      </div>
    );
  }

  return (
    <LivelyProvider client={client}>
      {/* Threads need loaded storage but no key of their own: the hooks create
          `threads` on the first comment. `revision` is this demo's own state. */}
      <RoomProvider
        roomId="review-default"
        userId={userId}
        displayName={displayName}
        initialStorage={{ revision: 1 }}
      >
        <Review />
      </RoomProvider>
    </LivelyProvider>
  );
}

function Review() {
  const docRef = useRef<HTMLElement>(null);
  const [showResolved, setShowResolved] = useState(false);
  const open = useThreads({ status: "open" });

  // Stands in for "the agent rewrote the doc": revision 2 rewords the timeline
  // paragraph, so threads quoting its old text become detached for everyone.
  const revision = useStorage((root) => root.get("revision") as number) ?? 1;
  const toggleRevision = useMutation(({ storage }) => {
    storage.root.set("revision", storage.root.get("revision") === 2 ? 1 : 2);
  }, []);

  return (
    <div className="h-screen overflow-y-auto bg-white text-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-neutral-200 bg-white/90 px-6 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
        <span className="text-sm font-semibold">Initiative review</span>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {open === null ? "Loading…" : `${open.length} open`}
        </span>
        <ConnectionBadge />
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
            />
            Show resolved
          </label>
          <button
            type="button"
            onClick={toggleRevision}
            className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {revision === 2 ? "Restore original" : "Simulate rewrite"}
          </button>
          <CollabPills max={4} />
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-6 py-10 md:grid-cols-[minmax(0,1fr)_18rem]">
        {/* `relative` gives the highlight fallback rectangles an origin */}
        <div className="relative">
          <ThreadHighlights containerRef={docRef} showResolved={showResolved} />
          <article ref={docRef} className="space-y-4 text-[15px] leading-7">
            <h1 data-lively-block="title" className="text-2xl font-semibold tracking-tight">
              Initiative: self-serve workspace invites
            </h1>
            <p data-lively-block="summary">
              Workspace owners currently email support to add a teammate, which takes{" "}
              <b>two business days on average</b> and accounts for a fifth of all tickets. This
              initiative lets an owner invite people directly, with a link that expires after{" "}
              <code className="rounded bg-neutral-100 px-1 py-0.5 text-[13px] dark:bg-neutral-800">
                72 hours
              </code>
              .
            </p>

            <h2 data-lively-block="scope-heading" className="pt-2 text-lg font-semibold">
              Scope
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li data-lively-block="scope-1">
                Owners can invite by email from the members page.
              </li>
              <li data-lively-block="scope-2">
                Invited people join with the viewer role; an owner can change the role later.
              </li>
              <li data-lively-block="scope-3">
                Pending invites can be revoked. Revoking an invite also invalidates its link.
              </li>
            </ul>

            <h2 data-lively-block="timeline-heading" className="pt-2 text-lg font-semibold">
              Timeline
            </h2>
            <p data-lively-block="timeline">
              {revision === 2
                ? "Build runs for three weeks with a staged rollout: internal workspaces first, then ten percent of customers, then everyone once the invite acceptance rate holds above ninety percent."
                : "Build takes two weeks. We ship to every workspace on the same Friday and watch the support queue the following week to confirm ticket volume drops."}
            </p>

            <h2 data-lively-block="risks-heading" className="pt-2 text-lg font-semibold">
              Risks
            </h2>
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="py-2 pr-4 font-medium">Risk</th>
                  <th className="py-2 font-medium">Mitigation</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  data-lively-block="risk-abuse"
                  className="border-b border-neutral-200 align-top dark:border-neutral-800"
                >
                  <td className="py-2 pr-4">Invite links get forwarded outside the company</td>
                  <td className="py-2">Links are single-use and bound to the invited email</td>
                </tr>
                <tr data-lively-block="risk-seats" className="align-top">
                  <td className="py-2 pr-4">Owners exceed their seat count without noticing</td>
                  <td className="py-2">Show remaining seats in the invite dialog</td>
                </tr>
              </tbody>
            </table>
          </article>
        </div>

        <aside aria-label="Comments">
          <ThreadMarginCards containerRef={docRef} showResolved={showResolved} />
          {open !== null && open.length === 0 && (
            <p className="text-xs leading-5 text-neutral-500 dark:text-neutral-400">
              Select any text in the document to comment on it or suggest an edit.
            </p>
          )}
        </aside>
      </main>

      <SelectionCommentPopover containerRef={docRef} metadata={{ batch: "review-1" }} />
    </div>
  );
}
