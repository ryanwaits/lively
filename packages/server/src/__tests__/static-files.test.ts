import { describe, it, expect, afterEach, beforeAll, afterAll } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { LivelyServer } from "../server";

let staticDir: string;

beforeAll(async () => {
  staticDir = await fs.mkdtemp(path.join(os.tmpdir(), "lively-static-"));
  await fs.writeFile(path.join(staticDir, "index.html"), "<h1>landing</h1>");
  await fs.writeFile(path.join(staticDir, "styles.css"), "body{}");
  await fs.mkdir(path.join(staticDir, "notes"), { recursive: true });
  await fs.writeFile(path.join(staticDir, "notes", "index.html"), "<h1>notes</h1>");
  await fs.writeFile(path.join(staticDir, "board.html"), "<h1>board</h1>");
  await fs.mkdir(path.join(staticDir, "_next", "static"), { recursive: true });
  await fs.writeFile(
    path.join(staticDir, "_next", "static", "app.js"),
    "console.log(1)"
  );
});

afterAll(async () => {
  await fs.rm(staticDir, { recursive: true, force: true });
});

describe("Static file serving", () => {
  let server: LivelyServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }
  });

  async function start(config = {}) {
    server = new LivelyServer({ staticDir, ...config });
    await server.start(0);
    return `http://127.0.0.1:${server.port}`;
  }

  it("serves index.html at /", async () => {
    const base = await start();
    const res = await fetch(`${base}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toBe("<h1>landing</h1>");
  });

  it("serves exact file with correct mime type", async () => {
    const base = await start();
    const res = await fetch(`${base}/styles.css`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/css");
  });

  it("falls back extensionless path to .html (Next export layout)", async () => {
    const base = await start();
    const res = await fetch(`${base}/board`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<h1>board</h1>");
  });

  it("falls back directory path to index.html, with and without slash", async () => {
    const base = await start();
    for (const p of ["/notes/", "/notes"]) {
      const res = await fetch(`${base}${p}`);
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("<h1>notes</h1>");
    }
  });

  it("marks /_next/static assets immutable", async () => {
    const base = await start();
    const res = await fetch(`${base}/_next/static/app.js`);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("immutable");
  });

  it("returns 404 for missing files", async () => {
    const base = await start();
    const res = await fetch(`${base}/nope.js`);
    expect(res.status).toBe(404);
  });

  it("blocks path traversal", async () => {
    const base = await start();
    // fetch normalizes "..", so exercise the raw socket path via encoded dots
    const res = await fetch(`${base}/%2e%2e/%2e%2e/etc/passwd`);
    expect(res.status).toBe(404);
    const res2 = await fetch(`${base}/notes/%2e%2e%2f%2e%2e%2fsecret`);
    expect(res2.status).toBe(404);
  });

  it("supports HEAD with headers but no body", async () => {
    const base = await start();
    const res = await fetch(`${base}/`, { method: "HEAD" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-length")).toBe("16");
    expect(await res.text()).toBe("");
  });

  it("health endpoint still wins over static files", async () => {
    const base = await start();
    const res = await fetch(`${base}/health`);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("keeps 426 behavior when no staticDir is configured", async () => {
    server = new LivelyServer();
    await server.start(0);
    const res = await fetch(`http://127.0.0.1:${server.port}/anything`);
    expect(res.status).toBe(426);
  });
});

describe("onRequest hook", () => {
  let server: LivelyServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }
  });

  it("handles matched requests and falls through otherwise", async () => {
    server = new LivelyServer({
      staticDir,
      onRequest: (req, res) => {
        if (req.url?.startsWith("/api/boards")) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ boards: [] }));
          return true;
        }
        return false;
      },
    });
    await server.start(0);
    const base = `http://127.0.0.1:${server.port}`;

    const api = await fetch(`${base}/api/boards`);
    expect(api.status).toBe(200);
    expect(await api.json()).toEqual({ boards: [] });

    const page = await fetch(`${base}/`);
    expect(await page.text()).toBe("<h1>landing</h1>");
  });

  it("supports async handlers and POST", async () => {
    server = new LivelyServer({
      onRequest: async (req, res) => {
        if (req.method === "POST" && req.url === "/api/echo") {
          res.writeHead(201);
          res.end("created");
          return true;
        }
        return false;
      },
    });
    await server.start(0);

    const res = await fetch(`http://127.0.0.1:${server.port}/api/echo`, {
      method: "POST",
    });
    expect(res.status).toBe(201);
    expect(await res.text()).toBe("created");
  });

  it("returns 500 if the handler throws", async () => {
    server = new LivelyServer({
      onRequest: () => {
        throw new Error("boom");
      },
    });
    await server.start(0);

    const res = await fetch(`http://127.0.0.1:${server.port}/anything`);
    expect(res.status).toBe(500);
  });
});
