import "./setup";
import { describe, it, expect } from "bun:test";

const { render, act } = await import("@testing-library/react");
const { createElement, useState, useEffect } = await import("react");
const { ClientSideSuspense } = await import("../client-side-suspense.js");

describe("ClientSideSuspense", () => {
  it("renders fallback initially, then children after mount", async () => {
    function Inner() {
      return createElement("div", { "data-testid": "inner" }, "loaded");
    }

    const { container } = render(
      createElement(ClientSideSuspense, {
        fallback: createElement("span", { "data-testid": "fallback" }, "loading..."),
        children: () => createElement(Inner),
      })
    );

    // After act, useEffect has fired and mounted = true
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const inner = container.querySelector("[data-testid='inner']");
    expect(inner).not.toBeNull();
    expect(inner!.textContent).toBe("loaded");
  });

  it("renders fallback while children suspend", async () => {
    let resolvePromise!: () => void;
    const promise = new Promise<void>((r) => { resolvePromise = r; });

    function Suspending(): never {
      throw promise;
    }

    const { container } = render(
      createElement(ClientSideSuspense, {
        fallback: createElement("span", { "data-testid": "fallback" }, "loading..."),
        children: () => createElement(Suspending),
      })
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const fallback = container.querySelector("[data-testid='fallback']");
    expect(fallback).not.toBeNull();
    expect(fallback!.textContent).toBe("loading...");
  });
});
