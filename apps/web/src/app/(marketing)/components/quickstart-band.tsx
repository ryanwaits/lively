/**
 * The page's one dark beat, giving it a light → dark → light rhythm.
 * Every command here exists in @waits/lively-cli.
 */
export function QuickstartBand() {
  return (
    <section className="bg-graphite py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mb-2 font-sans text-[clamp(1.25rem,2.2vw+0.4rem,1.625rem)] font-semibold leading-tight tracking-[-0.025em] text-body">
          Run the server yourself.
        </h2>
        <p className="mb-8 max-w-[46ch] text-sm text-tok-mut">
          One command starts it. No account, no dashboard, no egress bill.
        </p>

        <div className="max-w-[36rem] overflow-x-auto border-y border-graphite-2 py-3 font-mono text-[13px] leading-[2] text-on-dark">
          <div className="whitespace-nowrap">
            <span className="text-tok-key">$</span> npx lively dev
          </div>
          <div className="whitespace-nowrap text-tok-mut">
            {"  Lively dev server on :1999"}
          </div>
          <div className="whitespace-nowrap">
            <span className="text-tok-key">$</span> npx lively rooms list
          </div>
          <div className="whitespace-nowrap text-tok-mut">
            {"  board-1  ·  landing  ·  todo-default"}
          </div>
          <div className="whitespace-nowrap">
            <span className="text-tok-key">$</span> npx lively rooms inspect
            board-1
          </div>
          <div className="whitespace-nowrap text-tok-mut">
            {"  shapes: LiveList(4)"}
          </div>
        </div>
      </div>
    </section>
  );
}
