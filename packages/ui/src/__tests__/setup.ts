import { Window } from "happy-dom";

const win = new Window({ url: "http://localhost" });

(win as any).SyntaxError = SyntaxError;
(win as any).TypeError = TypeError;
(win as any).RangeError = RangeError;
(win as any).Error = Error;
(win as any).DOMException = (win as any).DOMException ?? DOMException;

const DOM_GLOBALS = [
  "document", "navigator", "location", "history", "self", "top", "parent",
  "HTMLElement", "HTMLDivElement", "HTMLSpanElement", "HTMLInputElement",
  "HTMLButtonElement", "HTMLFormElement", "HTMLAnchorElement", "HTMLImageElement",
  "HTMLTemplateElement", "HTMLStyleElement", "Element", "Node", "Text", "Comment",
  "DocumentFragment", "Document", "DocumentType", "DOMParser", "NodeList",
  "HTMLCollection", "NamedNodeMap", "Attr", "CharacterData", "CSSStyleDeclaration",
  "CSSStyleSheet", "StyleSheet", "TreeWalker", "Range", "Selection", "NodeFilter",
  "NodeIterator", "XMLSerializer", "DOMTokenList", "Event", "CustomEvent",
  "MouseEvent", "KeyboardEvent", "FocusEvent", "InputEvent", "PointerEvent",
  "TouchEvent", "UIEvent", "AnimationEvent", "ClipboardEvent", "ErrorEvent",
  "EventTarget", "MessageEvent", "MutationObserver", "IntersectionObserver",
  "ResizeObserver", "getComputedStyle", "requestAnimationFrame",
  "cancelAnimationFrame", "Headers", "Request", "Response", "URL",
  "URLSearchParams", "FormData", "Blob", "File", "FileList",
  "AbortController", "AbortSignal", "localStorage", "sessionStorage", "Storage",
] as const;

for (const key of DOM_GLOBALS) {
  const val = (win as any)[key];
  if (val !== undefined) {
    (globalThis as any)[key] = val;
  }
}

(globalThis as any).window = globalThis;
