const DEMOS = [
  {
    name: "Whiteboard",
    href: "https://collab.waits.dev",
    detail: "Multi-user canvas — cursors, shapes, selection",
  },
  {
    name: "Collaborative editor",
    href: "https://editor.waits.dev",
    detail: "Rich text with presence and per-user undo",
  },
  {
    name: "Markdown",
    href: "https://markdown.waits.dev",
    detail: "Syntax-aware editing over a shared document",
  },
  {
    name: "Block editor",
    href: "https://notion.waits.dev",
    detail: "Draggable blocks, tables and checklists",
  },
  {
    name: "Todo list",
    href: "https://todo.waits.dev",
    detail: "The smallest useful LiveList example",
  },
  {
    name: "Workflows",
    href: "https://workflows.waits.dev",
    detail: "Connected nodes with shared graph state",
  },
];

/**
 * The real, interactive counterparts to the scripted previews above.
 * Each opens in a new tab so the reader keeps their place here.
 */
export function DemoIndex() {
  return (
    <section id="demos" className="border-t border-border py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mb-2 font-sans text-[clamp(1.375rem,2.4vw+0.4rem,1.875rem)] font-semibold leading-tight tracking-[-0.025em] text-text">
          Six apps you can open right now.
        </h2>
        <p className="mb-8 max-w-[48ch] text-sm text-muted">
          All six run against the same server, and their source is in the
          repository under <code className="font-mono text-[13px]">examples/</code>.
        </p>

        <ul className="m-0 list-none border-t border-border p-0">
          {DEMOS.map((demo) => (
            <li key={demo.href}>
              <a
                href={demo.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-baseline gap-x-4 gap-y-1 border-b border-border py-3 no-underline transition-colors hover:bg-panel max-sm:flex-wrap"
              >
                <span className="w-full shrink-0 whitespace-nowrap text-[15px] font-medium text-text sm:w-52">
                  {demo.name}
                </span>
                <span className="min-w-0 flex-1 text-[13px] text-muted">
                  {demo.detail}
                </span>
                <span className="shrink-0 whitespace-nowrap font-mono text-[11px] text-accent">
                  Open &#8599;
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
