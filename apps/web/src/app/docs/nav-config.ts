/**
 * The single source of truth for docs navigation.
 *
 * The sidebar renders it grouped by section; the ⌘K palette searches it flat.
 * Keeping one list means the two can never drift out of sync — add a page here
 * and it appears in both.
 */

export interface DocEntry {
  href: string;
  label: string;
  section: string;
  /** What the page is, in one line. Shown as the palette result's subtitle. */
  summary: string;
  /** Extra search terms that do not appear in the label. */
  keywords: string[];
}

export const DOC_ENTRIES: DocEntry[] = [
  {
    href: "/docs",
    label: "Overview",
    section: "Getting Started",
    summary: "What Lively is and how the packages fit together",
    keywords: ["intro", "introduction", "start", "architecture", "packages"],
  },
  {
    href: "/docs/quick-start",
    label: "Quick Start",
    section: "Getting Started",
    summary: "Install, wrap your app, and render your first cursor",
    keywords: ["install", "setup", "getting started", "first", "tutorial"],
  },
  {
    href: "/docs/client",
    label: "Client",
    section: "Packages",
    summary: "Framework-agnostic SDK for the browser and Bun",
    keywords: ["sdk", "connect", "room", "websocket", "reconnect", "browser"],
  },
  {
    href: "/docs/react",
    label: "React",
    section: "Packages",
    summary: "41 hooks for presence, storage, history and cursors",
    keywords: [
      "hooks",
      "useStorage",
      "useMutation",
      "useOthers",
      "useMyPresence",
      "useUndo",
      "provider",
    ],
  },
  {
    href: "/docs/server",
    label: "Server",
    section: "Packages",
    summary: "The WebSocket server you host yourself",
    keywords: ["self-host", "selfhost", "deploy", "port", "persist", "rooms"],
  },
  {
    href: "/docs/storage",
    label: "Storage",
    section: "Packages",
    summary: "CRDT primitives — LiveObject, LiveMap and LiveList",
    keywords: ["crdt", "LiveObject", "LiveMap", "LiveList", "conflict", "sync"],
  },
];

/** External destinations the palette can reach but the sidebar does not list. */
export const EXTERNAL_ENTRIES: DocEntry[] = [
  {
    href: "https://github.com/ryanwaits/lively",
    label: "GitHub repository",
    section: "Elsewhere",
    summary: "Source, issues and releases",
    keywords: ["source", "repo", "issues", "mit", "license"],
  },
  {
    href: "https://collab.waits.dev",
    label: "Whiteboard demo",
    section: "Elsewhere",
    summary: "Multi-user canvas with live cursors",
    keywords: ["demo", "example", "canvas", "whiteboard", "shapes"],
  },
  {
    href: "https://editor.waits.dev",
    label: "Collaborative editor demo",
    section: "Elsewhere",
    summary: "Real-time text editing with presence",
    keywords: ["demo", "example", "editor", "text", "tiptap"],
  },
];

/** Sidebar shape: entries grouped by section, in declaration order. */
export const DOC_SECTIONS: { heading: string; links: DocEntry[] }[] =
  DOC_ENTRIES.reduce<{ heading: string; links: DocEntry[] }[]>((acc, entry) => {
    const existing = acc.find((s) => s.heading === entry.section);
    if (existing) {
      existing.links.push(entry);
    } else {
      acc.push({ heading: entry.section, links: [entry] });
    }
    return acc;
  }, []);

/** Everything the palette can find. */
export const SEARCHABLE: DocEntry[] = [...DOC_ENTRIES, ...EXTERNAL_ENTRIES];

/**
 * Rank entries against a query. Returns every entry when the query is empty,
 * so the palette opens showing the full index rather than a blank pane.
 */
export function searchEntries(query: string): DocEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return SEARCHABLE;

  return SEARCHABLE.map((entry) => {
    const label = entry.label.toLowerCase();
    const summary = entry.summary.toLowerCase();
    const keywords = entry.keywords.join(" ").toLowerCase();

    let score = 0;
    if (label === q) score = 100;
    else if (label.startsWith(q)) score = 80;
    else if (label.includes(q)) score = 60;
    else if (keywords.includes(q)) score = 40;
    else if (summary.includes(q)) score = 20;

    return { entry, score };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.entry);
}
