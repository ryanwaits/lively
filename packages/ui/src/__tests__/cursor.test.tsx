import "./setup";
import { describe, it, expect } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Cursor } from "../cursor.js";

const base = {
  x: 10,
  y: 20,
  color: "#ef4444",
  displayName: "Alice",
};

describe("Cursor", () => {
  it("renders name label by default (mode omitted)", () => {
    const html = renderToStaticMarkup(createElement(Cursor, base));
    expect(html).toContain("Alice");
    // Should contain the name span, not an img
    expect(html).not.toContain("<img");
  });

  it("renders name label in mode='name'", () => {
    const html = renderToStaticMarkup(
      createElement(Cursor, { ...base, mode: "name" })
    );
    expect(html).toContain("Alice");
    expect(html).not.toContain("<img");
  });

  it("renders img element in avatar mode with avatarUrl", () => {
    const html = renderToStaticMarkup(
      createElement(Cursor, {
        ...base,
        mode: "avatar",
        avatarUrl: "https://example.com/pic.jpg",
      })
    );
    expect(html).toContain("<img");
    expect(html).toContain('src="https://example.com/pic.jpg"');
    expect(html).toContain('alt="Alice"');
    // Should NOT contain the name label span
    expect(html).not.toContain(
      ">Alice</span>"
    );
  });

  it("falls back to initials circle when avatar mode but no avatarUrl", () => {
    const html = renderToStaticMarkup(
      createElement(Cursor, { ...base, mode: "avatar" })
    );
    // Should show the first letter of displayName
    expect(html).toContain("A");
    // Should NOT contain img
    expect(html).not.toContain("<img");
    // Should contain a round div (initials fallback) with the color
    expect(html).toContain("rounded-full");
    expect(html).toContain("#ef4444");
  });

  it("accepts custom style prop (for opacity)", () => {
    const html = renderToStaticMarkup(
      createElement(Cursor, { ...base, style: { opacity: 0 } })
    );
    expect(html).toContain("opacity:0");
  });

  it("preserves transform positioning", () => {
    const html = renderToStaticMarkup(createElement(Cursor, base));
    expect(html).toContain("translate(10px, 20px)");
  });

  it("applies className", () => {
    const html = renderToStaticMarkup(
      createElement(Cursor, { ...base, className: "my-class" })
    );
    expect(html).toContain("my-class");
  });
});
