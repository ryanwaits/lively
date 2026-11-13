# Comment thread components

Three components that turn any rendered document into something a team can review: select text to comment or suggest an edit, see every thread highlighted in its author's colour, and read, reply to and resolve threads in the margin.

```tsx
import {
  SelectionCommentPopover,
  ThreadHighlights,
  ThreadMarginCards,
} from "@waits/lively-ui";
```

> **Requirement:** Render inside a `<RoomProvider>` whose storage has loaded. They are built on the [thread hooks](../hooks/use-threads.md), which you can use directly for a custom UI.

---

## Quick Start

Mark each commentable element with a stable `data-lively-block` id, then point all three components at the element that contains them.

```tsx
function Review() {
  const ref = useRef<HTMLElement>(null);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_18rem] gap-8">
      <div className="relative">
        <ThreadHighlights containerRef={ref} />
        <article ref={ref}>
          <p data-lively-block="summary">Owners can invite teammates directly.</p>
          <p data-lively-block="timeline">Build takes two weeks.</p>
        </article>
      </div>

      <ThreadMarginCards containerRef={ref} />
      <SelectionCommentPopover containerRef={ref} />
    </div>
  );
}
```

Block ids must be stable across renders and identical for every user: derive them from your content (a heading slug, a database id), not from array indexes that shift when a paragraph is inserted.

A block can be any element: a paragraph, a list item, a table row. A selection has to stay inside one block.

---

## `SelectionCommentPopover`

Appears above a text selection made inside a block, with two actions: **Comment** and **Suggest edit**. Picking one opens a short form.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `containerRef` | `RefObject<HTMLElement \| null>` | -- | The element holding the blocks. |
| `onCreate` | `(threadId: string) => void` | -- | Called after a thread is created. |
| `metadata` | `Record<string, unknown>` | -- | Attached to every thread created here, e.g. `{ batch: "review-3" }`. |
| `className` | `string` | -- | Additional CSS classes on the popover. |

- Opens on mouse selection and on keyboard selection (Shift+arrows).
- **Cmd/Ctrl+Enter** saves, **Esc** closes.
- Suggest edit starts from the selected text, so the reviewer edits it in place. An unchanged suggestion cannot be saved; neither can an empty comment.
- Selections that span two blocks, or sit outside any block, show nothing.
- Renders into `document.body` and flips below the selection when there is no room above.

---

## `ThreadHighlights`

Tints each open thread's quote with its author's colour. Suggestions are underlined as well.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `containerRef` | `RefObject<HTMLElement \| null>` | -- | The element holding the blocks. |
| `showResolved` | `boolean` | `false` | Also highlight resolved threads. |
| `alpha` | `number` | `0.25` | Opacity of the author colour behind the text. |
| `mode` | `"auto" \| "rects"` | `"auto"` | `"rects"` forces the rectangle fallback. |
| `className` | `string` | -- | Additional CSS classes on the overlay element. |

Uses the [CSS Custom Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API) where the browser has it, so your document's DOM is never modified. Elsewhere it draws absolutely positioned rectangles; for those, render the component inside a `position: relative` ancestor of the content, as in the Quick Start.

Highlights follow the text through resizes, reflows and content changes.

---

## `ThreadMarginCards`

One card per thread, aligned to the top of its highlight. Cards that would overlap are pushed down.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `containerRef` | `RefObject<HTMLElement \| null>` | -- | The element holding the blocks. |
| `showResolved` | `boolean` | `false` | Also show resolved threads, dimmed, with a reopen action. |
| `gap` | `number` | `8` | Vertical space kept between stacked cards, in px. |
| `className` | `string` | -- | Additional CSS classes on the outer container. |

Each card shows the author, time, body and replies, with:

- a reply box (**Enter** sends, **Shift+Enter** adds a line),
- a resolve / reopen button, available to everyone,
- a delete button, shown to the thread's author only.

A suggestion card shows the quote struck through next to its replacement.

Place the component in a column that scrolls together with the content. It measures against its own position, so the column does not need to start at the same height as the document.

### Detached threads

When a thread's quoted text is no longer in its block (the document was rewritten), the thread has nothing to align to. Those cards move to a **Detached** group at the bottom and show the original quote, so a reviewer can still see what the comment was about. If the text comes back, the card re-attaches.

---

## Styling

The components use Tailwind utility classes, like the rest of `@waits/lively-ui`. Add the package to your Tailwind sources so the classes are generated:

```css
@import "tailwindcss";
@source "../node_modules/@waits/lively-ui/dist";
```

Dark styles use Tailwind's `dark:` variant, so they follow whatever dark-mode strategy your app configures. Position transitions respect `prefers-reduced-motion`.

Each component also carries a stable class for targeted overrides: `ob-selection-comment-popover`, `ob-thread-highlights`, `ob-thread-margin-cards`, `ob-thread-card`.

---

## Custom UI

The pieces are available separately when the stock components do not fit:

```tsx
import { useThreads, useCreateThread } from "@waits/lively-react";
import { anchorFromSelection, resolveAnchor } from "@waits/lively-ui";

// Build an anchor from the current selection
const anchor = anchorFromSelection(containerRef.current, window.getSelection());

// Find a thread's text again (null = detached)
const range = resolveAnchor(containerRef.current, thread.anchor);
range?.startContainer.parentElement?.scrollIntoView({ block: "center" });
```

---

## Example

[`examples/nextjs-markdown-editor`](../../examples/nextjs-markdown-editor/) has a `/review` route: a rendered document with paragraphs, list items and table rows as blocks. Open it in two windows to watch threads sync, and use "Simulate rewrite" to see threads detach.

```bash
cd examples/nextjs-markdown-editor
bun run dev:server   # Lively server on :2003
bun run dev          # http://localhost:3003/review
```
