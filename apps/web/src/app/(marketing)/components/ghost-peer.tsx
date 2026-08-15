"use client";

/**
 * The scripted stand-ins used inside demo previews.
 *
 * These are not real people and never claim to be — the surrounding
 * `<DemoFrame>` labels the pane as a replay. Names are fixed constants rather
 * than generated, so the server and the client always render the same thing.
 */

export interface Peer {
  name: string;
  /** A `--color-peer-*` token name, not a raw colour. */
  token: "peer-1" | "peer-2" | "peer-3";
}

export const PEERS: Record<string, Peer> = {
  maya: { name: "Maya", token: "peer-1" },
  jonas: { name: "Jonas", token: "peer-2" },
  elena: { name: "Elena", token: "peer-3" },
};

const BG: Record<Peer["token"], string> = {
  "peer-1": "bg-peer-1",
  "peer-2": "bg-peer-2",
  "peer-3": "bg-peer-3",
};

const FILL: Record<Peer["token"], string> = {
  "peer-1": "fill-peer-1",
  "peer-2": "fill-peer-2",
  "peer-3": "fill-peer-3",
};

export function GhostCursor({
  peer,
  x,
  y,
  visible = true,
}: {
  peer: Peer;
  /** Percentage of the stage, so the cursor tracks a fluid container. */
  x: number;
  y: number;
  visible?: boolean;
}) {
  // The moving element spans the whole stage, so a percentage translate is a
  // percentage OF THE STAGE. Translating the small cursor box directly would
  // resolve the percentage against its own ~50px width and never leave the
  // corner. Transform-only, so this still composites on the GPU.
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 will-change-transform"
      style={{
        transform: `translate(${x}%, ${y}%)`,
        opacity: visible ? 1 : 0,
        transition:
          "transform var(--dur-long) var(--ease-out), opacity var(--dur-short) var(--ease-out)",
      }}
    >
      <div className="absolute left-0 top-0 flex items-start gap-0.5">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          className={FILL[peer.token]}
        >
          <path
            d="M5.6 12.4H5.5l-5 4.5V1.2l11.3 11.2H5.6z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
        <span
          className={`mt-2 whitespace-nowrap rounded-[3px] px-1.5 py-0.5 font-mono text-[9px] font-medium text-accent-fg ${BG[peer.token]}`}
        >
          {peer.name}
        </span>
      </div>
    </div>
  );
}

export function GhostAvatars({ peers }: { peers: Peer[] }) {
  return (
    <div aria-hidden="true" className="flex">
      {peers.map((peer, i) => (
        <span
          key={peer.name}
          className={`grid h-6 w-6 place-items-center rounded-full border-2 border-panel font-mono text-[9px] font-medium text-accent-fg ${BG[peer.token]}`}
          style={{ marginLeft: i === 0 ? 0 : "-6px" }}
        >
          {peer.name.slice(0, 2).toUpperCase()}
        </span>
      ))}
    </div>
  );
}
