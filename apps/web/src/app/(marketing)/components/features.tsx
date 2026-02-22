export function Features() {
  return (
    <section id="primitives" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16">
          <h2 className="font-sans text-3xl md:text-4xl font-semibold tracking-tight text-text mb-4 di-separator">
            Primitives
          </h2>
          <p className="text-muted max-w-xl text-lg">
            Low-level APIs for high-fidelity experiences. We handle the
            WebSocket scaling so you can focus on the UI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-border">
          <FeatureCard
            color="text-[#3b82f6]"
            icon={
              <>
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
              </>
            }
            title="Live Presence"
            description='Show who is online, what they are selecting, and where their cursor is focused in <10ms.'
            code={
              <>
                <span className="text-code-keyword">const</span>{" "}
                <span className="text-text">others</span> ={" "}
                <span className="text-code-func">useOthers</span>();
                <br />
                <span className="text-code-comment">
                  {"// Returns list of active users"}
                </span>
              </>
            }
          />

          <FeatureCard
            color="text-[#14b8a6]"
            icon={
              <>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </>
            }
            title="Shared Storage"
            description="Conflict-free replicated data types (CRDTs) — JSON storage that syncs automatically."
            code={
              <>
                <span className="text-text">storage</span>.
                <span className="text-code-func">set</span>(
                <span className="text-code-string">&quot;layer&quot;</span>,{" "}
                {"{ x: "}
                <span className="text-code-func">10</span>
                {" }"});
                <br />
                <span className="text-code-comment">
                  {"// Syncs to all clients instantly"}
                </span>
              </>
            }
          />

          <FeatureCard
            color="text-[#f97316]"
            icon={
              <>
                <path d="M4 11a9 9 0 0 1 9 9" />
                <path d="M4 4a16 16 0 0 1 16 16" />
                <circle cx="5" cy="19" r="1" />
              </>
            }
            title="Event Broadcasting"
            description='Send ephemeral events like "User is typing..." or emojis without persisting data.'
            code={
              <>
                <span className="text-text">room</span>.
                <span className="text-code-func">broadcast</span>(
                <span className="text-code-string">&quot;emoji&quot;</span>,{" "}
                <span className="text-code-string">&quot;🔥&quot;</span>);
                <br />
                <span className="text-code-comment">
                  {"// High frequency, low latency"}
                </span>
              </>
            }
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  code,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  code: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="group border-r border-b border-border bg-body p-8 hover:bg-panel transition-colors relative overflow-hidden">
      <div className={`w-10 h-10 border border-border bg-panel flex items-center justify-center mb-6 ${color ?? "text-text"}`}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          {icon}
        </svg>
      </div>
      <h3 className="font-mono text-text text-lg font-medium mb-3">
        {title}
      </h3>
      <p className="text-muted text-sm leading-relaxed mb-6">{description}</p>
      <div className="bg-code-bg border border-code-border p-4 font-mono text-xs overflow-hidden">
        {code}
      </div>
    </div>
  );
}
