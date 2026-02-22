export function Stats() {
  return (
    <section className="py-20 bg-body">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <Stat value="<30ms" label="Latency" />
          <Stat value="CRDT" label="Conflict-Free" />
          <Stat value="Yjs" label="Document Sync" />
          <Stat value="OSS" label="Open Source" />
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-4xl font-sans font-bold text-text mb-2 tracking-tighter">
        {value}
      </div>
      <div className="text-xs font-mono text-muted uppercase tracking-widest">
        {label}
      </div>
    </div>
  );
}
