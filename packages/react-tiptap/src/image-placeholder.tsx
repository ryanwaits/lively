import { useState, useCallback, type JSX } from "react";
import { Node, mergeAttributes, type Editor } from "@tiptap/react";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";

// ── NodeView component ──

function ImagePlaceholderView({
  node,
  updateAttributes,
  editor,
}: {
  node: any;
  updateAttributes: (attrs: Record<string, any>) => void;
  editor: Editor;
}): JSX.Element {
  const src = node.attrs.src as string;
  const [url, setUrl] = useState("");

  const handleEmbed = useCallback(() => {
    const trimmed = url.trim();
    if (!trimmed) return;
    updateAttributes({ src: trimmed });
  }, [url, updateAttributes]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleEmbed();
      }
    },
    [handleEmbed]
  );

  if (src) {
    return (
      <NodeViewWrapper>
        <img src={src} alt="" className="ob-image" />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <div className="ob-image-placeholder" contentEditable={false}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <div className="ob-image-placeholder-input">
          <input
            type="url"
            placeholder="Paste image URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button type="button" onClick={handleEmbed}>
            Embed image
          </button>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

// ── Extension ──

export const ImagePlaceholder: Node = Node.create({
  name: "image",
  group: "block",
  atom: false,
  draggable: true,

  addAttributes() {
    return {
      src: { default: "" },
      alt: { default: null },
      title: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    if (!HTMLAttributes.src) {
      return [
        "div",
        mergeAttributes(HTMLAttributes, { class: "ob-image-placeholder" }),
      ];
    }
    return ["img", mergeAttributes(HTMLAttributes, { class: "ob-image" })];
  },

  addCommands() {
    return {
      setImage:
        (attrs: { src?: string } = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { src: attrs.src ?? "" },
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImagePlaceholderView);
  },
});
