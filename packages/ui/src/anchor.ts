import type { ThreadAnchor } from "@waits/lively-types";

/** Attribute apps put on each commentable element: `data-lively-block="<id>"`. */
export const BLOCK_ATTRIBUTE = "data-lively-block";

/** Characters of surrounding text stored as `prefix` / `suffix`. */
const CONTEXT_LENGTH = 32;

/** Finds the block element with the given id inside `container`. */
export function findBlock(container: HTMLElement, blockId: string): HTMLElement | null {
  // Compared by attribute value rather than built into a selector, so ids need no escaping.
  for (const el of Array.from(container.querySelectorAll(`[${BLOCK_ATTRIBUTE}]`))) {
    if (el.getAttribute(BLOCK_ATTRIBUTE) === blockId) return el as HTMLElement;
  }
  return null;
}

function textNodesOf(root: Node): Text[] {
  const nodes: Text[] = [];
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 3) nodes.push(child as Text);
      else if (child.nodeType === 1) walk(child);
    }
  };
  walk(root);
  return nodes;
}

/** Picks the occurrence of `quote` whose surroundings best match the anchor's context. */
function findQuote(text: string, anchor: ThreadAnchor): number {
  const { quote, prefix, suffix } = anchor;
  if (!quote) return -1;

  let best = -1;
  let bestScore = -1;
  for (let at = text.indexOf(quote); at !== -1; at = text.indexOf(quote, at + 1)) {
    let score = 0;
    if (prefix && text.slice(0, at).endsWith(prefix)) score++;
    if (suffix && text.slice(at + quote.length).startsWith(suffix)) score++;
    if (score > bestScore) {
      best = at;
      bestScore = score;
    }
    if (!prefix && !suffix) break; // nothing to disambiguate with: first wins
  }
  return best;
}

/**
 * Resolves a thread anchor to a DOM `Range`: finds the element marked
 * `data-lively-block="<anchor.blockId>"` inside `container`, then the quote in
 * its text, across inline elements. When the quote repeats, `prefix` /
 * `suffix` pick the occurrence; otherwise the first one wins.
 *
 * Returns `null` when the block or the quote is gone, which is how a thread
 * becomes "detached".
 *
 * @example
 * const range = resolveAnchor(containerRef.current, thread.anchor);
 * range?.startContainer.parentElement?.scrollIntoView({ block: "center" });
 */
export function resolveAnchor(container: HTMLElement, anchor: ThreadAnchor): Range | null {
  const block = findBlock(container, anchor.blockId);
  if (!block) return null;

  const nodes = textNodesOf(block);
  const text = nodes.map((n) => n.data).join("");
  const start = findQuote(text, anchor);
  if (start === -1) return null;
  const end = start + anchor.quote.length;

  const range = block.ownerDocument.createRange();
  let offset = 0;
  let startSet = false;
  for (const node of nodes) {
    const next = offset + node.data.length;
    // Start lands at the head of a node rather than the tail of the one before it.
    if (!startSet && start < next) {
      range.setStart(node, start - offset);
      startSet = true;
    }
    if (startSet && end <= next) {
      range.setEnd(node, end - offset);
      return range;
    }
    offset = next;
  }
  return null;
}

function closestBlock(node: Node | null, container: HTMLElement): HTMLElement | null {
  let el: Node | null = node;
  while (el && el !== container) {
    if (el.nodeType === 1 && (el as Element).hasAttribute(BLOCK_ATTRIBUTE)) {
      return el as HTMLElement;
    }
    el = el.parentNode;
  }
  return null;
}

/** Text length inside `block` that precedes the DOM boundary point `(node, offset)`. */
function textOffsetOf(nodes: Text[], node: Node, offset: number): number {
  const FOLLOWING = 4; // Node.DOCUMENT_POSITION_FOLLOWING
  let total = 0;

  if (node.nodeType === 3) {
    for (const t of nodes) {
      if (t === node) return total + offset;
      total += t.data.length;
    }
    return total;
  }

  // Element boundary: the point sits just before childNodes[offset].
  const after = node.childNodes[offset] ?? null;
  for (const t of nodes) {
    const before = after
      ? t !== after && (t.compareDocumentPosition(after) & FOLLOWING) !== 0
      : node.contains(t) || (t.compareDocumentPosition(node) & FOLLOWING) !== 0;
    if (!before) break;
    total += t.data.length;
  }
  return total;
}

/**
 * Builds a thread anchor from a live selection: the block is the nearest
 * ancestor with `data-lively-block`, the quote is the selected text, and
 * `prefix` / `suffix` capture the text around it.
 *
 * Returns `null` for a collapsed or whitespace-only selection, one outside
 * `container` or outside any block, and one that spans two blocks.
 *
 * @example
 * const anchor = anchorFromSelection(containerRef.current, window.getSelection());
 * if (anchor) createThread({ anchor, kind: "comment", body });
 */
export function anchorFromSelection(
  container: HTMLElement,
  selection: Selection | null
): ThreadAnchor | null {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);

  const block = closestBlock(range.startContainer, container);
  if (!block || !container.contains(block)) return null;
  const blockId = block.getAttribute(BLOCK_ATTRIBUTE);
  if (!blockId) return null;

  const nodes = textNodesOf(block);
  const text = nodes.map((n) => n.data).join("");
  let start = textOffsetOf(nodes, range.startContainer, range.startOffset);
  let end: number;

  if (block.contains(range.endContainer)) {
    end = textOffsetOf(nodes, range.endContainer, range.endOffset);
  } else {
    // A triple-click ends the range at the very start of the next block. That
    // still selects one block's text; anything further spans blocks.
    const tail = range.cloneRange();
    tail.setStart(block, block.childNodes.length);
    if (tail.toString().trim() !== "") return null;
    end = text.length;
  }

  while (start < end && /\s/.test(text[start])) start++;
  while (end > start && /\s/.test(text[end - 1])) end--;
  if (start >= end) return null;

  const anchor: ThreadAnchor = { blockId, quote: text.slice(start, end) };
  const prefix = text.slice(Math.max(0, start - CONTEXT_LENGTH), start);
  const suffix = text.slice(end, end + CONTEXT_LENGTH);
  if (prefix) anchor.prefix = prefix;
  if (suffix) anchor.suffix = suffix;
  return anchor;
}
