import { CursorsDemo } from "./demos/cursors-demo";
import { TodoDemo } from "./demos/todo-demo";

/**
 * The page's primary content: preview-and-code blocks, each showing a real
 * call signature next to a scripted illustration of what it does.
 */
export function Playground() {
  return (
    <section id="playground" className="border-t border-border py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mb-2 font-sans text-[clamp(1.375rem,2.4vw+0.4rem,1.875rem)] font-semibold leading-tight tracking-[-0.025em] text-text">
          Every example runs. Copy the one you need.
        </h2>
        <p className="mb-10 max-w-[48ch] text-sm text-muted">
          The previews below are scripted so they behave the same every time.
          The six links further down are the real thing, running on the same
          server.
        </p>

        <CursorsDemo />
        <TodoDemo />
      </div>
    </section>
  );
}
