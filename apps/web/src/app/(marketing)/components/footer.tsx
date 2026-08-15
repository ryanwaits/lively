/**
 * Ft4 — dense typographic colophon. One block of small mono text: what this
 * is, what ships in it, and where the source lives. No four-column sitemap,
 * no social row.
 */
export function Footer() {
  return (
    <footer className="border-t border-border py-10 lg:py-14">
      <div className="mx-auto max-w-6xl px-6">
        <p className="m-0 max-w-[68ch] font-mono text-[11.5px] leading-[1.9] tracking-[0.01em] text-muted">
          <span className="text-text">Lively v0.1.1</span> — real-time
          collaboration for React, hosted by you. Ten packages under{" "}
          <span className="text-text">@waits/lively-*</span>: types, storage,
          client, server, react, ui, cli, yjs, react-codemirror, react-tiptap.
          CRDT storage through LiveObject, LiveMap and LiveList; document sync
          through Yjs. MIT licensed. Source at{" "}
          <a
            href="https://github.com/ryanwaits/lively"
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap text-accent no-underline hover:underline"
          >
            github.com/ryanwaits/lively
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
