import Link from "next/link";
import { CopyInstall } from "./copy-install";
import { CodeCard } from "./code-card";

/**
 * Left-biased two-column hero: title and lede left, code card right.
 * Never centred, never full-viewport — the fold ends where the content does.
 */
export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-10 px-6 pb-14 pt-28 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-16 lg:pb-20 lg:pt-32">
      <div className="min-w-0">
        <h1 className="mb-3 font-sans text-[clamp(2rem,4.2vw+0.5rem,3.1rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-text [overflow-wrap:anywhere]">
          Multiplayer in eight lines.
        </h1>

        <p className="mb-6 max-w-[40ch] text-[15px] text-text-2">
          Presence, live cursors and CRDT storage over one WebSocket. 41 React
          hooks, and a server you run yourself.
        </p>

        <div className="mb-4">
          <CopyInstall />
        </div>

        <Link
          href="/docs"
          className="whitespace-nowrap border-b border-transparent text-[13px] text-accent no-underline transition-colors hover:border-accent"
        >
          Read the docs &rarr;
        </Link>
      </div>

      <div className="min-w-0">
        <CodeCard />
      </div>
    </section>
  );
}
