import "./setup";
import { describe, it, expect, mock, beforeEach } from "bun:test";

const mockUseCursors = mock(() => new Map());
const mockUseSelf = mock(() => ({ userId: "self" }));
const mockUseOthers = mock(() => [] as any[]);

mock.module("@waits/lively-react", () => ({
  useCursors: mockUseCursors,
  useSelf: mockUseSelf,
  useOthers: mockUseOthers,
}));

const { render } = await import("@testing-library/react");
const React = await import("react");
const { CursorOverlay } = await import("../cursor-overlay.js");

function cursor(overrides: Record<string, unknown> = {}) {
  return {
    userId: "peer",
    displayName: "Peer",
    color: "#3b82f6",
    x: 0.5,
    y: 0.25,
    lastUpdate: Date.now(),
    ...overrides,
  };
}

/** The <Cursor> wrapper is the element carrying the translate transform. */
function transformOf(container: HTMLElement): string {
  const el = container.querySelector<HTMLElement>("div[style*='translate']");
  return el?.style.transform ?? "";
}

/** A ref to a container that reports a fixed size. */
function containerRef(width: number, height: number) {
  const el = document.createElement("div");
  el.getBoundingClientRect = () =>
    ({ width, height, left: 0, top: 0, right: width, bottom: height, x: 0, y: 0 }) as DOMRect;
  return { current: el };
}

beforeEach(() => {
  mockUseCursors.mockReset();
  mockUseSelf.mockReset();
  mockUseOthers.mockReset();
  mockUseSelf.mockReturnValue({ userId: "self" } as never);
  mockUseOthers.mockReturnValue([] as never);
});

describe("cursor coordinate space", () => {
  it("treats a cursor with no space as pixels", () => {
    mockUseCursors.mockReturnValue(
      new Map([["peer", cursor({ x: 120, y: 40 })]]) as never
    );
    const { container } = render(React.createElement(CursorOverlay, {}));
    expect(transformOf(container)).toBe("translate(120px, 40px)");
  });

  it("keeps explicit pixel cursors unscaled even with a containerRef", () => {
    mockUseCursors.mockReturnValue(
      new Map([["peer", cursor({ x: 120, y: 40, space: "pixel" })]]) as never
    );
    const { container } = render(
      React.createElement(CursorOverlay, {
        containerRef: containerRef(800, 600),
      })
    );
    // The canvas case must be untouched by this feature.
    expect(transformOf(container)).toBe("translate(120px, 40px)");
  });

  it("scales fraction cursors by the container size", () => {
    mockUseCursors.mockReturnValue(
      new Map([["peer", cursor({ x: 0.5, y: 0.25, space: "fraction" })]]) as never
    );
    const { container } = render(
      React.createElement(CursorOverlay, {
        containerRef: containerRef(800, 600),
      })
    );
    expect(transformOf(container)).toBe("translate(400px, 150px)");
  });

  it("puts the same fraction at a proportional spot in a different container", () => {
    mockUseCursors.mockReturnValue(
      new Map([["peer", cursor({ x: 0.5, y: 0.25, space: "fraction" })]]) as never
    );
    const { container } = render(
      React.createElement(CursorOverlay, {
        containerRef: containerRef(1200, 400),
      })
    );
    // Same fraction, wider window — the whole point of the feature.
    expect(transformOf(container)).toBe("translate(600px, 100px)");
  });

  it("warns when fraction cursors arrive without a containerRef", () => {
    const warnings: string[] = [];
    const original = console.warn;
    console.warn = (msg: string) => warnings.push(String(msg));

    mockUseCursors.mockReturnValue(
      new Map([["peer", cursor({ space: "fraction" })]]) as never
    );
    render(React.createElement(CursorOverlay, {}));

    console.warn = original;
    expect(warnings.join(" ")).toContain("containerRef");
  });
});
