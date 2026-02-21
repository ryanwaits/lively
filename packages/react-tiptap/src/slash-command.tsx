import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
  type JSX,
  type ReactNode,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { Extension, ReactRenderer } from "@tiptap/react";
import Suggestion, {
  type SuggestionOptions,
  type SuggestionProps,
  type SuggestionKeyDownProps,
} from "@tiptap/suggestion";

// ── Types ──

export interface SlashMenuItem {
  title: string;
  description: string;
  icon: ReactNode;
  section?: string;
  keywords?: string[];
  command: (editor: { chain: () => any }) => void;
}

// ── Default items ──

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const defaultItems: SlashMenuItem[] = [
  {
    title: "Text",
    description: "Plain text block",
    section: "Basic blocks",
    icon: (
      <svg {...iconProps}>
        <path d="M13 4v16" />
        <path d="M17 4v16" />
        <path d="M19 4H9.5a4.5 4.5 0 0 0 0 9H13" />
      </svg>
    ),
    command: ({ chain }) =>
      chain().focus().toggleNode("paragraph", "paragraph").run(),
  },
  {
    title: "Heading 1",
    description: "Large section heading",
    section: "Basic blocks",
    keywords: ["h1"],
    icon: (
      <svg {...iconProps}>
        <path d="M4 12h8" />
        <path d="M4 18V6" />
        <path d="M12 18V6" />
        <path d="M17 12l3-2v10" />
      </svg>
    ),
    command: ({ chain }) =>
      chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    section: "Basic blocks",
    keywords: ["h2"],
    icon: (
      <svg {...iconProps}>
        <path d="M4 12h8" />
        <path d="M4 18V6" />
        <path d="M12 18V6" />
        <path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" />
      </svg>
    ),
    command: ({ chain }) =>
      chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    section: "Basic blocks",
    keywords: ["h3"],
    icon: (
      <svg {...iconProps}>
        <path d="M4 12h8" />
        <path d="M4 18V6" />
        <path d="M12 18V6" />
        <path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2" />
        <path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2" />
      </svg>
    ),
    command: ({ chain }) =>
      chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: "To-do List",
    description: "Track tasks with a to-do list",
    section: "Basic blocks",
    keywords: ["todo", "checkbox", "task"],
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="5" width="6" height="6" rx="1" />
        <path d="M3 17l2 2 4-4" />
        <line x1="13" y1="6" x2="21" y2="6" />
        <line x1="13" y1="12" x2="21" y2="12" />
        <line x1="13" y1="18" x2="21" y2="18" />
      </svg>
    ),
    command: ({ chain }) => chain().focus().toggleTaskList().run(),
  },
  {
    title: "Bullet List",
    description: "Simple bulleted list",
    section: "Basic blocks",
    keywords: ["unordered", "ul"],
    icon: (
      <svg {...iconProps}>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <circle cx="3.5" cy="6" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="3.5" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="3.5" cy="18" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
    command: ({ chain }) => chain().focus().toggleBulletList().run(),
  },
  {
    title: "Numbered List",
    description: "List with numbering",
    section: "Basic blocks",
    keywords: ["ordered", "ol"],
    icon: (
      <svg {...iconProps}>
        <line x1="10" y1="6" x2="21" y2="6" />
        <line x1="10" y1="12" x2="21" y2="12" />
        <line x1="10" y1="18" x2="21" y2="18" />
        <path d="M4 6h1v4" />
        <path d="M4 10h2" />
        <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
      </svg>
    ),
    command: ({ chain }) => chain().focus().toggleOrderedList().run(),
  },
  {
    title: "Blockquote",
    description: "Capture a quote",
    section: "Basic blocks",
    keywords: ["quote"],
    icon: (
      <svg {...iconProps}>
        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
        <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
      </svg>
    ),
    command: ({ chain }) => chain().focus().toggleBlockquote().run(),
  },
  {
    title: "Code Block",
    description: "Code with syntax highlighting",
    section: "Basic blocks",
    keywords: ["pre", "```"],
    icon: (
      <svg {...iconProps}>
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    command: ({ chain }) => chain().focus().toggleCodeBlock().run(),
  },
  {
    title: "Divider",
    description: "Visual divider",
    section: "Basic blocks",
    keywords: ["hr", "separator", "line"],
    icon: (
      <svg {...iconProps}>
        <line x1="2" y1="12" x2="22" y2="12" />
      </svg>
    ),
    command: ({ chain }) => chain().focus().setHorizontalRule().run(),
  },
  {
    title: "Image",
    description: "Embed an image from URL",
    section: "Media",
    keywords: ["picture", "photo", "img"],
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
    command: ({ chain }) =>
      chain()
        .focus()
        .insertContent({ type: "image", attrs: { src: "" } })
        .run(),
  },
  {
    title: "Table",
    description: "Insert a table",
    section: "Advanced",
    keywords: ["grid", "spreadsheet"],
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M3 15h18" />
        <path d="M9 3v18" />
        <path d="M15 3v18" />
      </svg>
    ),
    command: ({ chain }) =>
      chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    title: "Callout",
    description: "Highlight important info",
    section: "Advanced",
    keywords: ["info", "warning", "tip", "alert", "note"],
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
    command: ({ chain }) =>
      chain()
        .focus()
        .insertContent({
          type: "callout",
          attrs: { type: "info", emoji: "💡" },
          content: [{ type: "paragraph" }],
        })
        .run(),
  },
];

// ── Section ordering ──

const SECTION_ORDER = ["Basic blocks", "Media", "Advanced"];

function groupBySection(items: SlashMenuItem[]): [string, SlashMenuItem[]][] {
  const groups = new Map<string, SlashMenuItem[]>();
  for (const item of items) {
    const section = item.section ?? "Basic blocks";
    const list = groups.get(section);
    if (list) {
      list.push(item);
    } else {
      groups.set(section, [item]);
    }
  }
  // Sort by SECTION_ORDER, then any unknown sections at end
  const result: [string, SlashMenuItem[]][] = [];
  for (const section of SECTION_ORDER) {
    const list = groups.get(section);
    if (list) result.push([section, list]);
  }
  for (const [section, list] of groups) {
    if (!SECTION_ORDER.includes(section)) {
      result.push([section, list]);
    }
  }
  return result;
}

// ── Slash Menu Component ──

interface SlashMenuProps {
  items: SlashMenuItem[];
  command: (item: SlashMenuItem) => void;
}

interface SlashMenuHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

function SlashMenuComponent({
  items,
  command,
  ref,
}: SlashMenuProps & { ref: React.RefObject<SlashMenuHandle | null> }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  // Scroll active item into view
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const active = menu.querySelector("[data-active=true]");
    if (active) {
      active.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const upHandler = useCallback(() => {
    setSelectedIndex((i) => (i + items.length - 1) % items.length);
  }, [items.length]);

  const downHandler = useCallback(() => {
    setSelectedIndex((i) => (i + 1) % items.length);
  }, [items.length]);

  const enterHandler = useCallback(() => {
    const item = items[selectedIndex];
    if (item) command(item);
  }, [items, selectedIndex, command]);

  useEffect(() => {
    if (!ref) return;
    (ref as React.MutableRefObject<SlashMenuHandle | null>).current = {
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === "ArrowUp") {
          upHandler();
          return true;
        }
        if (event.key === "ArrowDown") {
          downHandler();
          return true;
        }
        if (event.key === "Enter") {
          enterHandler();
          return true;
        }
        return false;
      },
    };
  }, [ref, upHandler, downHandler, enterHandler]);

  if (items.length === 0) {
    return (
      <div className="ob-slash-menu">
        <div className="ob-slash-menu-empty">No results</div>
      </div>
    );
  }

  const groups = groupBySection(items);
  let flatIndex = 0;

  return (
    <div className="ob-slash-menu" ref={menuRef}>
      {groups.map(([section, sectionItems]) => (
        <div key={section}>
          <div className="ob-slash-menu-header">{section}</div>
          {sectionItems.map((item) => {
            const idx = flatIndex++;
            return (
              <button
                key={item.title}
                type="button"
                className={`ob-slash-menu-item${idx === selectedIndex ? " ob-slash-menu-item-active" : ""}`}
                data-active={idx === selectedIndex}
                onClick={() => command(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className="ob-slash-menu-icon">{item.icon}</div>
                <div className="ob-slash-menu-text">
                  <span className="ob-slash-menu-title">{item.title}</span>
                  <span className="ob-slash-menu-description">
                    {item.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Extension Factory ──

export function createSlashCommandExtension(
  items?: SlashMenuItem[]
): Extension {
  const menuItems = items ?? defaultItems;

  return Extension.create({
    name: "slashCommand",

    addOptions() {
      return {
        suggestion: {
          char: "/",
          startOfLine: false,
          command: ({
            editor,
            range,
            props,
          }: {
            editor: any;
            range: any;
            props: { command: SlashMenuItem["command"] };
          }) => {
            props.command({ chain: () => editor.chain().deleteRange(range) });
          },
          items: ({ query }: { query: string }) => {
            const q = query.toLowerCase();
            return menuItems.filter(
              (item) =>
                item.title.toLowerCase().includes(q) ||
                item.keywords?.some((kw) => kw.toLowerCase().includes(q))
            );
          },
          render: () => {
            let popup: HTMLDivElement | null = null;
            let root: Root | null = null;
            let menuHandleRef: React.RefObject<SlashMenuHandle | null> = {
              current: null,
            };

            return {
              onStart(props: SuggestionProps) {
                popup = document.createElement("div");
                popup.style.position = "absolute";
                popup.style.zIndex = "50";
                document.body.appendChild(popup);

                root = createRoot(popup);
                root.render(
                  <SlashMenuComponent
                    ref={menuHandleRef}
                    items={props.items as SlashMenuItem[]}
                    command={(item) =>
                      props.command({ command: item.command } as any)
                    }
                  />
                );

                updatePosition(props, popup);
              },

              onUpdate(props: SuggestionProps) {
                root?.render(
                  <SlashMenuComponent
                    ref={menuHandleRef}
                    items={props.items as SlashMenuItem[]}
                    command={(item) =>
                      props.command({ command: item.command } as any)
                    }
                  />
                );

                if (popup) updatePosition(props, popup);
              },

              onKeyDown(props: SuggestionKeyDownProps) {
                if (props.event.key === "Escape") {
                  return true;
                }
                return menuHandleRef.current?.onKeyDown(props.event) ?? false;
              },

              onExit() {
                // Defer unmount to avoid React warnings about synchronous unmount
                const capturedRoot = root;
                const capturedPopup = popup;
                setTimeout(() => {
                  capturedRoot?.unmount();
                  capturedPopup?.remove();
                }, 0);
                root = null;
                popup = null;
              },
            };
          },
        } satisfies Partial<SuggestionOptions>,
      };
    },

    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          ...this.options.suggestion,
        }),
      ];
    },
  });
}

// ── Position helper ──

function updatePosition(props: SuggestionProps, popup: HTMLDivElement) {
  const { clientRect } = props;
  if (!clientRect) return;

  const rect = typeof clientRect === "function" ? clientRect() : clientRect;
  if (!rect) return;

  popup.style.top = `${rect.bottom + window.scrollY + 4}px`;
  popup.style.left = `${rect.left + window.scrollX}px`;
}
