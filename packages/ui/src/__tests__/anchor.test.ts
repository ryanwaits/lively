import "./setup";
import { describe, it, expect, beforeEach } from "bun:test";

const { resolveAnchor, anchorFromSelection, findBlock } = await import("../anchor.js");

let container: HTMLElement;

function mountHtml(html: string): HTMLElement {
  container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

/** Selects from (startNode, startOffset) to (endNode, endOffset) and returns the selection. */
function select(startNode: Node, startOffset: number, endNode: Node, endOffset: number): Selection {
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  const selection = document.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  return selection;
}

function textNode(el: Element | null, index = 0): Text {
  const nodes: Text[] = [];
  const walk = (n: Node) => {
    for (const c of n.childNodes) {
      if (c.nodeType === 3) nodes.push(c as Text);
      else walk(c);
    }
  };
  walk(el!);
  return nodes[index];
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("findBlock", () => {
  it("finds a block by id without selector escaping", () => {
    mountHtml(`<p data-lively-block='a"b]'>x</p><p data-lively-block="p2">y</p>`);
    expect(findBlock(container, 'a"b]')?.textContent).toBe("x");
    expect(findBlock(container, "p2")?.textContent).toBe("y");
    expect(findBlock(container, "nope")).toBeNull();
  });
});

describe("resolveAnchor", () => {
  it("resolves a quote inside a single text node", () => {
    mountHtml(`<p data-lively-block="p1">The launch ships on Friday morning.</p>`);
    const range = resolveAnchor(container, { blockId: "p1", quote: "ships on Friday" })!;
    expect(range).not.toBeNull();
    expect(range.toString()).toBe("ships on Friday");
    expect(range.startContainer).toBe(range.endContainer);
    expect(range.startOffset).toBe(11);
  });

  it("resolves a quote that crosses inline elements", () => {
    mountHtml(
      `<p data-lively-block="p1">Run <b>bun <code>test</code></b> before you commit.</p>`
    );
    const range = resolveAnchor(container, { blockId: "p1", quote: "bun test before" })!;
    expect(range.toString()).toBe("bun test before");
    expect(range.startContainer.parentElement?.tagName).toBe("B");
    expect(range.startOffset).toBe(0);
    expect(range.endContainer.parentElement?.tagName).toBe("P");
  });

  it("uses the prefix to pick between repeats", () => {
    mountHtml(`<p data-lively-block="p1">red apple, green apple, blue apple</p>`);
    const first = resolveAnchor(container, { blockId: "p1", quote: "apple" })!;
    expect(first.startOffset).toBe(4);

    const second = resolveAnchor(container, { blockId: "p1", quote: "apple", prefix: "green " })!;
    expect(second.startOffset).toBe(17);

    const third = resolveAnchor(container, { blockId: "p1", quote: "apple", suffix: "" , prefix: "blue " })!;
    expect(third.startOffset).toBe(29);
  });

  it("uses the suffix to pick between repeats", () => {
    mountHtml(`<p data-lively-block="p1">apple pie and apple tart</p>`);
    const range = resolveAnchor(container, { blockId: "p1", quote: "apple", suffix: " tart" })!;
    expect(range.startOffset).toBe(14);
  });

  it("falls back to the first occurrence when the context no longer matches", () => {
    mountHtml(`<p data-lively-block="p1">one apple, two apple</p>`);
    const range = resolveAnchor(container, { blockId: "p1", quote: "apple", prefix: "gone " })!;
    expect(range.startOffset).toBe(4);
  });

  it("returns null when the quote is missing", () => {
    mountHtml(`<p data-lively-block="p1">The text was rewritten.</p>`);
    expect(resolveAnchor(container, { blockId: "p1", quote: "ships on Friday" })).toBeNull();
    expect(resolveAnchor(container, { blockId: "p1", quote: "" })).toBeNull();
  });

  it("returns null when the block is missing", () => {
    mountHtml(`<p data-lively-block="p1">hello</p>`);
    expect(resolveAnchor(container, { blockId: "p9", quote: "hello" })).toBeNull();
  });

  it("only searches inside the anchor's block", () => {
    mountHtml(`<p data-lively-block="p1">alpha</p><p data-lively-block="p2">beta alpha</p>`);
    const range = resolveAnchor(container, { blockId: "p2", quote: "alpha" })!;
    expect(range.startContainer.parentElement?.getAttribute("data-lively-block")).toBe("p2");
    expect(range.startOffset).toBe(5);
  });
});

describe("anchorFromSelection", () => {
  it("builds an anchor with context from a selection in one text node", () => {
    mountHtml(`<p data-lively-block="p1">The launch ships on Friday morning.</p>`);
    const t = textNode(container.querySelector("p"));
    const anchor = anchorFromSelection(container, select(t, 11, t, 26));
    expect(anchor).toEqual({
      blockId: "p1",
      quote: "ships on Friday",
      prefix: "The launch ",
      suffix: " morning.",
    });
  });

  it("round-trips through resolveAnchor across inline elements", () => {
    mountHtml(
      `<p data-lively-block="p1">Run <b>bun <code>test</code></b> before you commit.</p>`
    );
    const p = container.querySelector("p");
    const anchor = anchorFromSelection(
      container,
      select(textNode(p, 1), 0, textNode(p, 3), 7)
    )!;
    expect(anchor.quote).toBe("bun test before");
    expect(resolveAnchor(container, anchor)!.toString()).toBe("bun test before");
  });

  it("disambiguates a repeated quote on the way back", () => {
    mountHtml(`<p data-lively-block="p1">red apple, green apple, blue apple</p>`);
    const t = textNode(container.querySelector("p"));
    const anchor = anchorFromSelection(container, select(t, 17, t, 22))!;
    expect(anchor.quote).toBe("apple");
    expect(resolveAnchor(container, anchor)!.startOffset).toBe(17);
  });

  it("handles element-boundary selections (select all of an inline element)", () => {
    mountHtml(`<p data-lively-block="p1">Run <b>bun test</b> first.</p>`);
    const p = container.querySelector("p")!;
    // (p, 1) → (p, 2) wraps exactly the <b>
    const anchor = anchorFromSelection(container, select(p, 1, p, 2));
    expect(anchor).toEqual({ blockId: "p1", quote: "bun test", prefix: "Run ", suffix: " first." });
  });

  it("trims surrounding whitespace from the quote", () => {
    mountHtml(`<p data-lively-block="p1">one two three</p>`);
    const t = textNode(container.querySelector("p"));
    const anchor = anchorFromSelection(container, select(t, 3, t, 8))!;
    expect(anchor.quote).toBe("two");
    expect(anchor.prefix).toBe("one ");
  });

  it("rejects a selection that spans two blocks", () => {
    mountHtml(`<p data-lively-block="p1">first block</p><p data-lively-block="p2">second block</p>`);
    const [p1, p2] = container.querySelectorAll("p");
    expect(anchorFromSelection(container, select(textNode(p1), 6, textNode(p2), 6))).toBeNull();
  });

  it("accepts a triple-click range that ends at the start of the next block", () => {
    mountHtml(`<p data-lively-block="p1">first block</p><p data-lively-block="p2">second block</p>`);
    const [p1, p2] = container.querySelectorAll("p");
    const anchor = anchorFromSelection(container, select(textNode(p1), 0, p2, 0));
    expect(anchor).toEqual({ blockId: "p1", quote: "first block" });
  });

  it("rejects collapsed, whitespace-only and out-of-block selections", () => {
    mountHtml(`<h1>Title outside</h1><p data-lively-block="p1">one two</p>`);
    const t = textNode(container.querySelector("p"));
    expect(anchorFromSelection(container, select(t, 2, t, 2))).toBeNull();
    expect(anchorFromSelection(container, select(t, 3, t, 4))).toBeNull();
    const h = textNode(container.querySelector("h1"));
    expect(anchorFromSelection(container, select(h, 0, h, 5))).toBeNull();
    expect(anchorFromSelection(container, null)).toBeNull();
  });

  it("rejects a block that lives outside the container", () => {
    mountHtml(`<p data-lively-block="p1">inside</p>`);
    const outside = document.createElement("p");
    outside.setAttribute("data-lively-block", "p9");
    outside.textContent = "outside text";
    document.body.appendChild(outside);
    const t = textNode(outside);
    expect(anchorFromSelection(container, select(t, 0, t, 7))).toBeNull();
  });
});
