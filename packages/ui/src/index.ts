// Hook
export { useCursorTracking } from "./use-cursor-tracking.js";
export type { CursorTrackingOptions } from "./use-cursor-tracking.js";

// Utilities
export {
  generateName,
  generateFunName,
  adjectives,
  animals,
  colors,
  names,
  NumberDictionary,
} from "./generate-name.js";
export type { GenerateNameConfig } from "./generate-name.js";

// Thread anchors
export { resolveAnchor, anchorFromSelection, findBlock, BLOCK_ATTRIBUTE } from "./anchor.js";

// Components
export { Cursor } from "./cursor.js";
export type { CursorProps } from "./cursor.js";
export { CursorOverlay } from "./cursor-overlay.js";
export type { CursorOverlayProps } from "./cursor-overlay.js";
export { Avatar } from "./avatar.js";
export type { AvatarProps } from "./avatar.js";
export { AvatarStack } from "./avatar-stack.js";
export type { AvatarStackProps } from "./avatar-stack.js";
export { ConnectionBadge } from "./connection-badge.js";
export type { ConnectionBadgeProps } from "./connection-badge.js";
export { CollabPills } from "./collab-pills.js";
export type { CollabPillsProps } from "./collab-pills.js";

// Comment threads
export { SelectionCommentPopover } from "./selection-comment-popover.js";
export type { SelectionCommentPopoverProps } from "./selection-comment-popover.js";
export { ThreadHighlights } from "./thread-highlights.js";
export type { ThreadHighlightsProps } from "./thread-highlights.js";
export { ThreadMarginCards } from "./thread-margin-cards.js";
export type { ThreadMarginCardsProps } from "./thread-margin-cards.js";
