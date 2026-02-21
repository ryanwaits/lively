import { Node, mergeAttributes, type AnyExtension } from "@tiptap/react";

export type CalloutType = "info" | "warning" | "tip" | "danger";

export interface CalloutOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: {
        type?: CalloutType;
        emoji?: string;
      }) => ReturnType;
    };
  }
}

export const Callout: Node<CalloutOptions> = Node.create<CalloutOptions>({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      type: {
        default: "info",
        parseHTML: (el) => el.getAttribute("data-callout-type") ?? "info",
        renderHTML: (attrs) => ({ "data-callout-type": attrs.type }),
      },
      emoji: {
        default: "💡",
        parseHTML: (el) => el.getAttribute("data-callout-emoji") ?? "💡",
        renderHTML: (attrs) => ({ "data-callout-emoji": attrs.emoji }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-callout-type]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: "ob-callout",
      }),
      [
        "span",
        { class: "ob-callout-emoji", contenteditable: "false" },
        HTMLAttributes["data-callout-emoji"] ?? "💡",
      ],
      ["div", { class: "ob-callout-content" }, 0],
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              type: attrs?.type ?? "info",
              emoji: attrs?.emoji ?? "💡",
            },
            content: [{ type: "paragraph" }],
          });
        },
    };
  },
});
