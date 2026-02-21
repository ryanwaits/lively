import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type JSX,
} from "react";
import type { Editor } from "@tiptap/react";

// ── Helpers ──

const LIST_CONTAINERS = new Set([
  "bulletList",
  "orderedList",
  "taskList",
]);

function resolveBlockPos(
  editor: Editor,
  clientX: number,
  clientY: number
): number | null {
  const posInfo = editor.view.posAtCoords({ left: clientX, top: clientY });
  if (!posInfo) return null;

  const $pos = editor.state.doc.resolve(posInfo.pos);
  if ($pos.depth < 1) return null;

  // Walk up to find the right target depth:
  // - For list items, resolve to the individual item (depth 2)
  // - For everything else, resolve to the top-level block (depth 1)
  let depth = $pos.depth;
  while (depth > 1) {
    const parentNode = $pos.node(depth - 1);
    if (LIST_CONTAINERS.has(parentNode.type.name)) {
      // This node is a list item — stop here
      break;
    }
    depth--;
  }

  return $pos.before(depth);
}

function getBlockDomRect(
  editor: Editor,
  pos: number
): DOMRect | null {
  const dom = editor.view.nodeDOM(pos);
  if (dom instanceof HTMLElement) return dom.getBoundingClientRect();
  return null;
}

// ── Icons ──

const menuIcons = {
  delete: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  duplicate: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  moveUp: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`,
  moveDown: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
};

// ── BlockHandle component ──

export interface BlockHandleProps {
  editor: Editor | null;
}

export function BlockHandle({ editor }: BlockHandleProps): JSX.Element | null {
  const [blockPos, setBlockPos] = useState<number | null>(null);
  const [handleStyle, setHandleStyle] = useState<React.CSSProperties>({
    opacity: 0,
    pointerEvents: "none",
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const handleRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  // Find the .notion-editor container on mount
  useEffect(() => {
    if (!editor) return;
    const el =
      (editor.view.dom.closest(".notion-editor") as HTMLElement) ??
      editor.view.dom.parentElement;
    containerRef.current = el;
  }, [editor]);

  const showHandle = useCallback(
    (pos: number) => {
      if (!editor || !containerRef.current) return;
      const blockRect = getBlockDomRect(editor, pos);
      if (!blockRect) return;
      const containerRect = containerRef.current.getBoundingClientRect();

      setBlockPos(pos);
      setHandleStyle({
        position: "absolute",
        top: blockRect.top - containerRect.top + 4,
        left: 8,
        opacity: 1,
        pointerEvents: "auto",
      });
    },
    [editor]
  );

  const hideHandle = useCallback(() => {
    setHandleStyle({ opacity: 0, pointerEvents: "none" });
    setBlockPos(null);
    setMenuOpen(false);
  }, []);

  // Mouse tracking
  useEffect(() => {
    if (!editor) return;
    const container = containerRef.current;
    if (!container) return;

    const onMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Ignore handle/menu hover
      if (
        handleRef.current?.contains(target) ||
        menuRef.current?.contains(target) ||
        target.closest?.("[data-block-handle]") ||
        target.closest?.(".ob-block-menu")
      )
        return;

      // Only update handle position when inside ProseMirror content.
      // If mouse is in the padding/gap area (between content and handle),
      // just leave the handle where it is — don't hide it.
      if (!editor.view.dom.contains(target)) return;

      const pos = resolveBlockPos(editor, e.clientX, e.clientY);
      if (pos != null) {
        showHandle(pos);
      }
    };

    const onMouseLeave = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (
        related &&
        (handleRef.current?.contains(related) ||
          menuRef.current?.contains(related) ||
          related.closest?.("[data-block-handle]") ||
          related.closest?.(".ob-block-menu"))
      )
        return;
      if (!menuOpen) hideHandle();
    };

    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseleave", onMouseLeave);
    return () => {
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [editor, showHandle, hideHandle, menuOpen]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        !menuRef.current?.contains(e.target as HTMLElement) &&
        !handleRef.current?.contains(e.target as HTMLElement)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // ── Actions ──

  const deleteBlock = useCallback(() => {
    if (!editor || blockPos == null) return;
    const node = editor.state.doc.nodeAt(blockPos);
    if (!node) return;
    editor.view.dispatch(
      editor.state.tr.delete(blockPos, blockPos + node.nodeSize)
    );
    editor.view.focus();
    setMenuOpen(false);
    hideHandle();
  }, [editor, blockPos, hideHandle]);

  const duplicateBlock = useCallback(() => {
    if (!editor || blockPos == null) return;
    const node = editor.state.doc.nodeAt(blockPos);
    if (!node) return;
    const insertPos = blockPos + node.nodeSize;
    editor.view.dispatch(
      editor.state.tr.insert(insertPos, node.copy(node.content))
    );
    editor.view.focus();
    setMenuOpen(false);
  }, [editor, blockPos]);

  const moveUp = useCallback(() => {
    if (!editor || blockPos == null) return;
    const node = editor.state.doc.nodeAt(blockPos);
    if (!node || blockPos === 0) return;
    const $pos = editor.state.doc.resolve(blockPos);
    if ($pos.index($pos.depth) === 0) return;
    let siblingPos = -1;
    editor.state.doc.nodesBetween(
      $pos.start($pos.depth),
      blockPos,
      (n, p, parent) => {
        if (p < blockPos && parent === $pos.parent) siblingPos = p;
        return p < blockPos;
      }
    );
    if (siblingPos < 0) return;
    let tr = editor.state.tr;
    tr = tr.delete(blockPos, blockPos + node.nodeSize);
    tr = tr.insert(siblingPos, node.copy(node.content));
    editor.view.dispatch(tr);
    editor.view.focus();
    setMenuOpen(false);
  }, [editor, blockPos]);

  const moveDown = useCallback(() => {
    if (!editor || blockPos == null) return;
    const node = editor.state.doc.nodeAt(blockPos);
    if (!node) return;
    const endPos = blockPos + node.nodeSize;
    const nextNode = editor.state.doc.nodeAt(endPos);
    if (!nextNode) return;
    let tr = editor.state.tr;
    tr = tr.insert(endPos + nextNode.nodeSize, node.copy(node.content));
    tr = tr.delete(blockPos, blockPos + node.nodeSize);
    editor.view.dispatch(tr);
    editor.view.focus();
    setMenuOpen(false);
  }, [editor, blockPos]);

  const openMenu = useCallback(() => {
    if (!handleRef.current) return;
    const rect = handleRef.current.getBoundingClientRect();
    setMenuStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      zIndex: 100,
    });
    setMenuOpen((v) => !v);
  }, []);

  if (!editor) return null;

  return (
    <>
      {/* Handle */}
      <div
        ref={handleRef}
        className="ob-block-handle"
        data-block-handle=""
        style={handleStyle}
        onMouseDown={(e) => e.preventDefault()}
        onClick={openMenu}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <circle cx="4.5" cy="3" r="1.2" />
          <circle cx="9.5" cy="3" r="1.2" />
          <circle cx="4.5" cy="7" r="1.2" />
          <circle cx="9.5" cy="7" r="1.2" />
          <circle cx="4.5" cy="11" r="1.2" />
          <circle cx="9.5" cy="11" r="1.2" />
        </svg>
      </div>

      {/* Menu */}
      {menuOpen && (
        <div ref={menuRef} className="ob-block-menu" style={menuStyle}>
          <button
            type="button"
            className="ob-block-menu-item"
            onMouseDown={(e) => {
              e.preventDefault();
              deleteBlock();
            }}
          >
            <span
              className="ob-block-menu-icon"
              dangerouslySetInnerHTML={{ __html: menuIcons.delete }}
            />
            <span>Delete</span>
          </button>
          <button
            type="button"
            className="ob-block-menu-item"
            onMouseDown={(e) => {
              e.preventDefault();
              duplicateBlock();
            }}
          >
            <span
              className="ob-block-menu-icon"
              dangerouslySetInnerHTML={{ __html: menuIcons.duplicate }}
            />
            <span>Duplicate</span>
          </button>
          <button
            type="button"
            className="ob-block-menu-item"
            onMouseDown={(e) => {
              e.preventDefault();
              moveUp();
            }}
          >
            <span
              className="ob-block-menu-icon"
              dangerouslySetInnerHTML={{ __html: menuIcons.moveUp }}
            />
            <span>Move up</span>
          </button>
          <button
            type="button"
            className="ob-block-menu-item"
            onMouseDown={(e) => {
              e.preventDefault();
              moveDown();
            }}
          >
            <span
              className="ob-block-menu-icon"
              dangerouslySetInnerHTML={{ __html: menuIcons.moveDown }}
            />
            <span>Move down</span>
          </button>
        </div>
      )}
    </>
  );
}
