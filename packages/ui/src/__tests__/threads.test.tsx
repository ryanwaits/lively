import "./setup";
import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import type { Thread } from "@waits/lively-types";

// Mock the react hooks before importing the components
const mockUseThreads = mock(() => [] as Thread[] | null);
const mockUseSelf = mock(() => ({ userId: "alice" }) as any);
const createThread = mock((_input: any) => "new-thread-id");
const replyToThread = mock((_id: string, _body: string) => "reply-id");
const resolveThread = mock((_id: string, _resolved: boolean) => {});
const deleteThread = mock((_id: string) => true);

mock.module("@waits/lively-react", () => ({
  useThreads: mockUseThreads,
  useSelf: mockUseSelf,
  useCreateThread: () => createThread,
  useReplyToThread: () => replyToThread,
  useResolveThread: () => resolveThread,
  useDeleteThread: () => deleteThread,
  // Kept so sibling test files sharing this module registry still resolve.
  useCursors: () => new Map(),
  useOthers: () => [],
}));

const { render, act, fireEvent, cleanup } = await import("@testing-library/react");
const React = await import("react");
const { ThreadMarginCards, stackCards } = await import("../thread-margin-cards.js");
const { ThreadHighlights } = await import("../thread-highlights.js");
const { SelectionCommentPopover } = await import("../selection-comment-popover.js");
const { withAlpha } = await import("../thread-dom.js");

function makeThread(overrides?: Partial<Thread>): Thread {
  return {
    id: "t1",
    anchor: { blockId: "p1", quote: "ships on Friday" },
    kind: "comment",
    body: "Is this date confirmed?",
    authorId: "alice",
    authorName: "Alice",
    authorColor: "#ef4444",
    status: "open",
    createdAt: 1_700_000_000_000,
    replies: [],
    ...overrides,
  };
}

/** A document with two blocks plus whichever thread component is under test. */
function Doc({ children }: { children: (ref: React.RefObject<HTMLDivElement | null>) => React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  return React.createElement(
    "div",
    null,
    React.createElement(
      "div",
      { ref, "data-testid": "doc" },
      React.createElement("p", { "data-lively-block": "p1" }, "The launch ships on Friday morning."),
      React.createElement("p", { "data-lively-block": "p2" }, "Budget is still open.")
    ),
    children(ref)
  );
}

/** Lets the container-version frame and any follow-up effects run. */
const settle = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 40));
  });

beforeEach(() => {
  mockUseThreads.mockReset();
  mockUseThreads.mockReturnValue([]);
  mockUseSelf.mockReset();
  mockUseSelf.mockReturnValue({ userId: "alice" });
  createThread.mockClear();
  replyToThread.mockClear();
  resolveThread.mockClear();
  deleteThread.mockClear();
});

afterEach(() => {
  cleanup();
  document.getSelection()?.removeAllRanges();
  delete (globalThis as any).Highlight;
  delete (globalThis as any).CSS;
});

describe("stackCards", () => {
  it("keeps cards at their highlight when they do not overlap", () => {
    const { tops, bottom } = stackCards(
      [
        { id: "a", top: 10, height: 50 },
        { id: "b", top: 200, height: 40 },
      ],
      8
    );
    expect(tops).toEqual({ a: 10, b: 200 });
    expect(bottom).toBe(240);
  });

  it("pushes overlapping cards down, in document order", () => {
    const { tops, bottom } = stackCards(
      [
        { id: "late", top: 30, height: 60 },
        { id: "early", top: 20, height: 100 },
        { id: "same-line", top: 20, height: 40 },
      ],
      8
    );
    expect(tops.early).toBe(20);
    expect(tops["same-line"]).toBe(128);
    expect(tops.late).toBe(176);
    expect(bottom).toBe(236);
  });

  it("never places a card above the column", () => {
    expect(stackCards([{ id: "a", top: -40, height: 10 }], 8).tops.a).toBe(0);
  });

  it("handles an empty list", () => {
    expect(stackCards([], 8)).toEqual({ tops: {}, bottom: 0 });
  });
});

describe("withAlpha", () => {
  it("converts hex colours to rgba", () => {
    expect(withAlpha("#ef4444", 0.25)).toBe("rgba(239, 68, 68, 0.25)");
    expect(withAlpha("#0f0", 0.5)).toBe("rgba(0, 255, 0, 0.5)");
  });

  it("falls back to color-mix for other colour syntaxes", () => {
    expect(withAlpha("hsl(10 80% 50%)", 0.25)).toBe(
      "color-mix(in srgb, hsl(10 80% 50%) 25%, transparent)"
    );
  });
});

describe("ThreadMarginCards", () => {
  const renderCards = (props?: Record<string, unknown>) =>
    render(
      React.createElement(Doc, null, (ref: any) =>
        React.createElement(ThreadMarginCards, { containerRef: ref, ...props })
      )
    );

  it("renders a card per open thread and hides resolved ones", async () => {
    mockUseThreads.mockReturnValue([
      makeThread(),
      makeThread({ id: "t2", body: "Done already", status: "resolved" }),
    ]);
    const { container } = renderCards();
    await settle();

    const cards = container.querySelectorAll("[data-thread-id]");
    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toContain("Alice");
    expect(cards[0].textContent).toContain("Is this date confirmed?");
    expect(container.textContent).not.toContain("Done already");
    expect(container.textContent).not.toContain("Detached");
  });

  it("shows resolved threads with a reopen action when showResolved is set", async () => {
    mockUseThreads.mockReturnValue([makeThread({ status: "resolved" })]);
    const { container, getByLabelText } = renderCards({ showResolved: true });
    await settle();

    expect(container.querySelector("[data-thread-status='resolved']")).not.toBeNull();
    fireEvent.click(getByLabelText("Reopen thread"));
    expect(resolveThread).toHaveBeenCalledWith("t1", false);
    // A resolved thread takes no new replies until reopened.
    expect(container.querySelector("textarea")).toBeNull();
  });

  it("groups threads whose quote is gone under Detached, with the quote", async () => {
    mockUseThreads.mockReturnValue([
      makeThread(),
      makeThread({ id: "t2", anchor: { blockId: "p1", quote: "text that was rewritten" }, body: "orphan" }),
      makeThread({ id: "t3", anchor: { blockId: "gone", quote: "Budget" }, body: "block removed" }),
    ]);
    const { container } = renderCards();
    await settle();

    const detached = container.querySelector("[aria-label='Detached threads']")!;
    expect(detached).not.toBeNull();
    expect(detached.querySelectorAll("[data-thread-id]")).toHaveLength(2);
    expect(detached.textContent).toContain("text that was rewritten");
    expect(detached.textContent).toContain("block removed");
    // The attached one stays out of the group.
    expect(detached.querySelector("[data-thread-id='t1']")).toBeNull();
    expect(container.querySelector("[data-card-for='t1']")).not.toBeNull();
  });

  it("re-attaches when the document changes so the quote resolves again", async () => {
    mockUseThreads.mockReturnValue([
      makeThread({ anchor: { blockId: "p2", quote: "Budget is approved" } }),
    ]);
    const { container, getByTestId } = renderCards();
    await settle();
    expect(container.querySelector("[aria-label='Detached threads']")).not.toBeNull();

    await act(async () => {
      getByTestId("doc").querySelector("[data-lively-block='p2']")!.textContent = "Budget is approved.";
    });
    await settle();

    expect(container.querySelector("[aria-label='Detached threads']")).toBeNull();
    expect(container.querySelector("[data-card-for='t1']")).not.toBeNull();
  });

  it("shows a suggestion as struck quote plus replacement", async () => {
    mockUseThreads.mockReturnValue([
      makeThread({ kind: "suggestion", replacement: "ships next Tuesday", body: "" }),
    ]);
    const { container } = renderCards();
    await settle();

    expect(container.querySelector("del")?.textContent).toBe("ships on Friday");
    expect(container.querySelector("ins")?.textContent).toBe("ships next Tuesday");
    expect(container.querySelector("article")?.getAttribute("aria-label")).toBe("Suggestion by Alice");
  });

  it("lists replies and sends a new one on Enter", async () => {
    mockUseThreads.mockReturnValue([
      makeThread({
        replies: [{ id: "r1", authorId: "bob", authorName: "Bob", body: "Yes, confirmed.", createdAt: 1_700_000_100_000 }],
      }),
    ]);
    const { container, getByLabelText } = renderCards();
    await settle();

    expect(container.textContent).toContain("Bob");
    expect(container.textContent).toContain("Yes, confirmed.");

    const input = getByLabelText("Reply") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "  Thanks!  " } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(replyToThread).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter" });
    expect(replyToThread).toHaveBeenCalledWith("t1", "Thanks!");
    expect(input.value).toBe("");
  });

  it("does not send an empty reply", async () => {
    mockUseThreads.mockReturnValue([makeThread()]);
    const { getByLabelText } = renderCards();
    await settle();
    fireEvent.keyDown(getByLabelText("Reply"), { key: "Enter" });
    expect(replyToThread).not.toHaveBeenCalled();
  });

  it("resolves from the card", async () => {
    mockUseThreads.mockReturnValue([makeThread()]);
    const { getByLabelText } = renderCards();
    await settle();
    fireEvent.click(getByLabelText("Resolve thread"));
    expect(resolveThread).toHaveBeenCalledWith("t1", true);
  });

  it("offers delete to the author only", async () => {
    mockUseThreads.mockReturnValue([makeThread()]);
    const first = renderCards();
    await settle();
    fireEvent.click(first.getByLabelText("Delete thread"));
    expect(deleteThread).toHaveBeenCalledWith("t1");
    first.unmount();

    mockUseSelf.mockReturnValue({ userId: "bob" });
    const second = renderCards();
    await settle();
    expect(second.queryByLabelText("Delete thread")).toBeNull();
    expect(second.queryByLabelText("Resolve thread")).not.toBeNull();
  });

  it("renders nothing while storage is loading", async () => {
    mockUseThreads.mockReturnValue(null);
    const { container } = renderCards();
    await settle();
    expect(container.querySelectorAll("[data-thread-id]")).toHaveLength(0);
  });
});

describe("ThreadHighlights", () => {
  const renderHighlights = (props?: Record<string, unknown>) =>
    render(
      React.createElement(Doc, null, (ref: any) =>
        React.createElement(ThreadHighlights, { containerRef: ref, ...props })
      )
    );

  function installHighlightApi() {
    const registry = new Map<string, { ranges: Range[] }>();
    (globalThis as any).Highlight = class {
      ranges: Range[];
      constructor(...ranges: Range[]) {
        this.ranges = ranges;
      }
    };
    (globalThis as any).CSS = { highlights: registry };
    return registry;
  }

  it("registers one highlight per author colour and kind, without touching the document", async () => {
    const registry = installHighlightApi();
    mockUseThreads.mockReturnValue([
      makeThread(),
      makeThread({ id: "t2", anchor: { blockId: "p2", quote: "Budget" } }),
      makeThread({ id: "t3", anchor: { blockId: "p2", quote: "open" }, authorColor: "#3b82f6", kind: "suggestion", replacement: "closed" }),
      makeThread({ id: "t4", anchor: { blockId: "p2", quote: "still" }, status: "resolved" }),
      makeThread({ id: "t5", anchor: { blockId: "p2", quote: "not in the text" } }),
    ]);
    const { container, getByTestId, unmount } = renderHighlights();
    const before = getByTestId("doc").innerHTML;
    await settle();

    expect(registry.size).toBe(2);
    const [red, blue] = Array.from(registry.values());
    expect(red.ranges.map((r) => r.toString())).toEqual(["ships on Friday", "Budget"]);
    expect(blue.ranges.map((r) => r.toString())).toEqual(["open"]);

    const css = container.querySelector("style")!.textContent!;
    const [redName, blueName] = Array.from(registry.keys());
    expect(css).toContain(`::highlight(${redName}){background-color:rgba(239, 68, 68, 0.25);}`);
    expect(css).toContain(`::highlight(${blueName}){background-color:rgba(59, 130, 246, 0.25);text-decoration:underline`);

    expect(getByTestId("doc").innerHTML).toBe(before);
    expect(container.querySelectorAll("[data-testid='thread-highlight-rect']")).toHaveLength(0);

    unmount();
    expect(registry.size).toBe(0);
  });

  it("includes resolved threads when showResolved is set", async () => {
    const registry = installHighlightApi();
    mockUseThreads.mockReturnValue([
      makeThread({ status: "resolved" }),
    ]);
    renderHighlights({ showResolved: true });
    await settle();
    expect(registry.size).toBe(1);
  });

  it("falls back to positioned rectangles without the Highlight API", async () => {
    const original = (Range.prototype as any).getClientRects;
    (Range.prototype as any).getClientRects = function () {
      const rect = (left: number, top: number, width: number, height: number) => ({
        left, top, width, height, right: left + width, bottom: top + height,
      });
      // Two wrapped lines, plus a nested inline box the first line swallows.
      return [rect(100, 20, 200, 18), rect(120, 21, 40, 16), rect(10, 40, 80, 18)];
    };
    try {
      mockUseThreads.mockReturnValue([makeThread()]);
      const { container } = renderHighlights();
      await settle();

      const rects = container.querySelectorAll<HTMLElement>("[data-testid='thread-highlight-rect']");
      expect(rects).toHaveLength(2);
      expect(rects[0].style.left).toBe("100px");
      expect(rects[0].style.width).toBe("200px");
      expect(rects[1].style.top).toBe("40px");
      expect(rects[0].style.backgroundColor).toContain("239");
      expect(container.querySelector("style")).toBeNull();
    } finally {
      (Range.prototype as any).getClientRects = original;
    }
  });

  it("uses rectangles when mode is rects even if the Highlight API exists", async () => {
    const registry = installHighlightApi();
    mockUseThreads.mockReturnValue([makeThread()]);
    renderHighlights({ mode: "rects" });
    await settle();
    expect(registry.size).toBe(0);
  });
});

describe("SelectionCommentPopover", () => {
  const onCreate = mock((_id: string) => {});

  const renderPopover = (props?: Record<string, unknown>) =>
    render(
      React.createElement(Doc, null, (ref: any) =>
        React.createElement(SelectionCommentPopover, { containerRef: ref, onCreate, ...props })
      )
    );

  /** Selects `quote` inside a block and fires the event a browser would. */
  async function selectText(doc: HTMLElement, blockId: string, quote: string, event = "mouseup") {
    const text = doc.querySelector(`[data-lively-block='${blockId}']`)!.firstChild as Text;
    const start = text.data.indexOf(quote);
    const range = document.createRange();
    range.setStart(text, start);
    range.setEnd(text, start + quote.length);
    const selection = document.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    fireEvent(document, new Event(event, { bubbles: true }));
    await settle();
  }

  beforeEach(() => onCreate.mockClear());

  it("stays hidden until text inside a block is selected", async () => {
    const { getByTestId } = renderPopover();
    await settle();
    expect(document.querySelector("[role='toolbar']")).toBeNull();

    await selectText(getByTestId("doc"), "p1", "ships on Friday");
    const toolbar = document.querySelector("[role='toolbar']")!;
    expect(toolbar).not.toBeNull();
    expect(Array.from(toolbar.querySelectorAll("button")).map((b) => b.textContent)).toEqual([
      "Comment",
      "Suggest edit",
    ]);
  });

  it("opens from a keyboard selection too", async () => {
    const { getByTestId } = renderPopover();
    await selectText(getByTestId("doc"), "p2", "Budget", "keyup");
    expect(document.querySelector("[role='toolbar']")).not.toBeNull();
  });

  it("creates a comment with Cmd/Ctrl+Enter", async () => {
    const { getByTestId, getByText, getByLabelText } = renderPopover({ metadata: { batch: "review-3" } });
    await selectText(getByTestId("doc"), "p1", "ships on Friday");

    fireEvent.click(getByText("Comment"));
    const field = getByLabelText("Comment") as HTMLTextAreaElement;
    expect(document.activeElement).toBe(field);

    // Empty comments are not saved.
    fireEvent.keyDown(field, { key: "Enter", metaKey: true });
    expect(createThread).not.toHaveBeenCalled();

    fireEvent.change(field, { target: { value: "Is this confirmed?" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(createThread).not.toHaveBeenCalled();
    fireEvent.keyDown(field, { key: "Enter", metaKey: true });

    expect(createThread).toHaveBeenCalledTimes(1);
    expect(createThread.mock.calls[0][0]).toEqual({
      anchor: { blockId: "p1", quote: "ships on Friday", prefix: "The launch ", suffix: " morning." },
      kind: "comment",
      body: "Is this confirmed?",
      metadata: { batch: "review-3" },
    });
    expect(onCreate).toHaveBeenCalledWith("new-thread-id");
    expect(document.querySelector("[role='dialog']")).toBeNull();
  });

  it("pre-fills a suggestion with the quote and saves the replacement", async () => {
    const { getByTestId, getByText, getByLabelText } = renderPopover();
    await selectText(getByTestId("doc"), "p1", "ships on Friday");

    fireEvent.click(getByText("Suggest edit"));
    const replacement = getByLabelText("Replacement text") as HTMLTextAreaElement;
    expect(replacement.value).toBe("ships on Friday");
    expect(document.activeElement).toBe(replacement);

    // Unchanged text is not a suggestion.
    fireEvent.keyDown(replacement, { key: "Enter", ctrlKey: true });
    expect(createThread).not.toHaveBeenCalled();

    fireEvent.change(replacement, { target: { value: "ships next Tuesday" } });
    fireEvent.keyDown(replacement, { key: "Enter", ctrlKey: true });

    expect(createThread.mock.calls[0][0]).toEqual({
      anchor: { blockId: "p1", quote: "ships on Friday", prefix: "The launch ", suffix: " morning." },
      kind: "suggestion",
      body: "",
      replacement: "ships next Tuesday",
    });
  });

  it("closes on Escape without creating anything", async () => {
    const { getByTestId, getByText } = renderPopover();
    await selectText(getByTestId("doc"), "p1", "ships on Friday");
    fireEvent.click(getByText("Comment"));
    expect(document.querySelector("[role='dialog']")).not.toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.querySelector("[role='dialog']")).toBeNull();
    expect(document.querySelector("[role='toolbar']")).toBeNull();
    expect(createThread).not.toHaveBeenCalled();
  });

  it("keeps a form in progress when the selection changes", async () => {
    const { getByTestId, getByText, getByLabelText } = renderPopover();
    await selectText(getByTestId("doc"), "p1", "ships on Friday");
    fireEvent.click(getByText("Comment"));
    fireEvent.change(getByLabelText("Comment"), { target: { value: "half-typed" } });

    await selectText(getByTestId("doc"), "p2", "Budget");
    expect((getByLabelText("Comment") as HTMLTextAreaElement).value).toBe("half-typed");
  });

  it("shows nothing for a selection that spans two blocks", async () => {
    const { getByTestId } = renderPopover();
    const doc = getByTestId("doc");
    const range = document.createRange();
    range.setStart(doc.querySelector("[data-lively-block='p1']")!.firstChild!, 4);
    range.setEnd(doc.querySelector("[data-lively-block='p2']")!.firstChild!, 6);
    const selection = document.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    fireEvent(document, new Event("mouseup", { bubbles: true }));
    await settle();
    expect(document.querySelector("[role='toolbar']")).toBeNull();
  });

  it("hides the menu when the selection is cleared", async () => {
    const { getByTestId } = renderPopover();
    await selectText(getByTestId("doc"), "p1", "ships on Friday");
    expect(document.querySelector("[role='toolbar']")).not.toBeNull();

    document.getSelection()!.removeAllRanges();
    fireEvent(document, new Event("mouseup", { bubbles: true }));
    await settle();
    expect(document.querySelector("[role='toolbar']")).toBeNull();
  });
});
