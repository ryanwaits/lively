import { useEffect, useState, useCallback, useRef, type JSX } from "react";
import type { Editor } from "@tiptap/react";
import { ToolbarButton } from "./toolbar.js";

// Inline SVG icons (16x16)
const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconBold() {
  return (
    <svg {...iconProps}>
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    </svg>
  );
}

function IconItalic() {
  return (
    <svg {...iconProps}>
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
  );
}

function IconUnderline() {
  return (
    <svg {...iconProps}>
      <path d="M6 4v6a6 6 0 0 0 12 0V4" />
      <line x1="4" y1="20" x2="20" y2="20" />
    </svg>
  );
}

function IconStrikethrough() {
  return (
    <svg {...iconProps}>
      <path d="M16 4H9a3 3 0 0 0-2.83 4" />
      <path d="M14 12a4 4 0 0 1 0 8H6" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  );
}

function IconCode() {
  return (
    <svg {...iconProps}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function IconHighlight() {
  return (
    <svg {...iconProps}>
      <path d="m9 11-6 6v3h9l3-3" />
      <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg {...iconProps}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

// ── Highlight Colors ──

const HIGHLIGHT_COLORS = [
  { value: "#fff8c5", label: "Yellow" },
  { value: "#fce8e8", label: "Red" },
  { value: "#e7f3fe", label: "Blue" },
  { value: "#e6f6e6", label: "Green" },
  { value: "#f3e8ff", label: "Purple" },
  { value: "#ffe8d6", label: "Orange" },
  { value: "#e8e8e8", label: "Gray" },
];

function HighlightPicker({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const currentColor = editor.isActive("highlight")
    ? (editor.getAttributes("highlight").color ?? HIGHLIGHT_COLORS[0].value)
    : null;

  return (
    <div
      className="ob-highlight-picker"
      onMouseDown={(e) => e.preventDefault()}
    >
      {HIGHLIGHT_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.label}
          className={`ob-highlight-swatch${c.value === currentColor ? " ob-highlight-swatch-active" : ""}`}
          style={{ backgroundColor: c.value }}
          onClick={() => {
            editor.chain().focus().toggleHighlight({ color: c.value }).run();
            onClose();
          }}
        />
      ))}
      {editor.isActive("highlight") && (
        <button
          type="button"
          title="Remove highlight"
          className="ob-highlight-remove"
          onClick={() => {
            editor.chain().focus().unsetHighlight().run();
            onClose();
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Link Input ──

function LinkInput({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(() => editor.getAttributes("link").href ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const apply = useCallback(() => {
    const trimmed = url.trim();
    if (trimmed) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: trimmed })
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    onClose();
  }, [editor, url, onClose]);

  return (
    <div
      className="flex items-center gap-1 px-1"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          apply();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
          editor.commands.focus();
        }
      }}
    >
      <input
        ref={inputRef}
        type="url"
        placeholder="Paste link..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="h-7 w-48 rounded border border-gray-200 bg-white px-2 text-sm outline-none focus:border-blue-400"
        onMouseDown={(e) => e.stopPropagation()}
      />
      <button
        type="button"
        onClick={apply}
        className="h-7 rounded bg-blue-500 px-2 text-xs font-medium text-white hover:bg-blue-600"
        onMouseDown={(e) => e.preventDefault()}
      >
        Apply
      </button>
    </div>
  );
}

// ── Position helpers ──

const TOOLBAR_GAP = 8; // px above selection

function getSelectionRect(): DOMRect | null {
  const domSelection = window.getSelection();
  if (!domSelection || domSelection.rangeCount === 0) return null;
  const range = domSelection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return rect;
}

function getEditorContainer(editor: Editor): HTMLElement | null {
  // The .ProseMirror element's parent is the editor wrapper
  return editor.view.dom.closest(".notion-editor") as HTMLElement | null
    ?? editor.view.dom.parentElement;
}

// ── FloatingToolbar ──

export interface FloatingToolbarProps {
  editor: Editor | null;
}

export function FloatingToolbar({ editor }: FloatingToolbarProps): JSX.Element | null {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!editor) return;

    const { from, to, empty } = editor.state.selection;
    if (empty || from === to) {
      setVisible(false);
      setShowLinkInput(false);
      setShowHighlightPicker(false);
      return;
    }

    const selRect = getSelectionRect();
    if (!selRect) {
      setVisible(false);
      return;
    }

    const container = getEditorContainer(editor);
    if (!container) {
      setVisible(false);
      return;
    }

    // Position relative to the editor container
    const containerRect = container.getBoundingClientRect();
    const toolbarWidth = toolbarRef.current?.offsetWidth ?? 200;
    const toolbarHeight = toolbarRef.current?.offsetHeight ?? 40;

    const top =
      selRect.top - containerRect.top - toolbarHeight - TOOLBAR_GAP;
    const left =
      selRect.left -
      containerRect.left +
      selRect.width / 2 -
      toolbarWidth / 2;

    setPosition({ top, left });
    setVisible(true);
  }, [editor]);

  const handleBlur = useCallback(() => {
    setVisible(false);
    setShowLinkInput(false);
    setShowHighlightPicker(false);
  }, []);

  useEffect(() => {
    if (!editor) return;

    editor.on("selectionUpdate", updatePosition);
    editor.on("blur", handleBlur);

    return () => {
      editor.off("selectionUpdate", updatePosition);
      editor.off("blur", handleBlur);
    };
  }, [editor, updatePosition, handleBlur]);

  // Cmd+K shortcut for link
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          e.preventDefault();
          setShowLinkInput((prev) => !prev);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editor]);

  if (!editor) return null;

  const hasUnderline = editor.extensionManager.extensions.some(
    (ext) => ext.name === "underline"
  );
  const hasHighlight = editor.extensionManager.extensions.some(
    (ext) => ext.name === "highlight"
  );
  const hasLink = editor.extensionManager.extensions.some(
    (ext) => ext.name === "link"
  );

  return (
    <div
      ref={toolbarRef}
      className="ob-floating-toolbar"
      style={{
        top: position.top,
        left: position.left,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="inline-flex items-center gap-0.5 bg-white shadow-lg rounded-lg border border-gray-200 p-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Bold"
        >
          <IconBold />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Italic"
        >
          <IconItalic />
        </ToolbarButton>
        {hasUnderline && (
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive("underline")}
            title="Underline"
          >
            <IconUnderline />
          </ToolbarButton>
        )}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="Strikethrough"
        >
          <IconStrikethrough />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
          title="Code"
        >
          <IconCode />
        </ToolbarButton>
        {hasHighlight && (
          <ToolbarButton
            onClick={() => {
              setShowHighlightPicker((prev) => !prev);
              setShowLinkInput(false);
            }}
            isActive={editor.isActive("highlight")}
            title="Highlight"
          >
            <IconHighlight />
          </ToolbarButton>
        )}
        {hasLink && (
          <>
            <div className="w-px h-5 bg-gray-200 mx-0.5" />
            <ToolbarButton
              onClick={() => {
                setShowLinkInput((prev) => !prev);
                setShowHighlightPicker(false);
              }}
              isActive={editor.isActive("link")}
              title="Link (⌘K)"
            >
              <IconLink />
            </ToolbarButton>
          </>
        )}
        {showLinkInput && hasLink && (
          <>
            <div className="w-px h-5 bg-gray-200 mx-0.5" />
            <LinkInput
              editor={editor}
              onClose={() => setShowLinkInput(false)}
            />
          </>
        )}
      </div>
      {showHighlightPicker && hasHighlight && (
        <HighlightPicker
          editor={editor}
          onClose={() => setShowHighlightPicker(false)}
        />
      )}
    </div>
  );
}
