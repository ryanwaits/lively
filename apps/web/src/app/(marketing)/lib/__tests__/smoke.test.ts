import { expect, test } from "bun:test";

test("dom globals are registered", () => {
  const el = document.createElement("div");
  el.textContent = "lively";
  expect(el.textContent).toBe("lively");
});
