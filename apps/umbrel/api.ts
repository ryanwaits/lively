import type http from "node:http";
import type { BoardsIndex } from "./boards.js";

export interface ApiContext {
  boards: BoardsIndex;
  /** Capability flags surfaced to the bundled apps. */
  config: { ai: boolean };
}

const MAX_BODY_BYTES = 64 * 1024;
const MAX_NAME_LENGTH = 200;

// Allows browser apps served from another origin (e.g. next dev) to call
// the API. In production everything is same-origin, so this is inert.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(
  res: http.ServerResponse,
  status: number,
  body: unknown
): true {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...CORS_HEADERS,
  });
  res.end(JSON.stringify(body));
  return true;
}

async function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("body too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
}

/**
 * Handle requests under /api/*. Returns true when a response was written,
 * false for anything outside the /api namespace (falls through to static).
 */
export async function handleApiRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  ctx: ApiContext
): Promise<boolean> {
  const pathname = (req.url ?? "/").split("?")[0].replace(/\/+$/, "") || "/";
  if (pathname !== "/api" && !pathname.startsWith("/api/")) return false;

  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return true;
  }

  if (pathname === "/api/config" && req.method === "GET") {
    return json(res, 200, ctx.config);
  }

  if (pathname === "/api/boards") {
    if (req.method === "GET") {
      return json(res, 200, { boards: await ctx.boards.list() });
    }

    if (req.method === "POST") {
      let body: unknown;
      try {
        body = await readJsonBody(req);
      } catch {
        return json(res, 400, { error: "invalid JSON body" });
      }

      const { name, created_by } = (body ?? {}) as {
        name?: unknown;
        created_by?: unknown;
      };
      if (typeof name !== "string" || !name.trim()) {
        return json(res, 400, { error: "name is required" });
      }
      if (name.trim().length > MAX_NAME_LENGTH) {
        return json(res, 400, { error: "name too long" });
      }
      if (created_by !== undefined && created_by !== null && typeof created_by !== "string") {
        return json(res, 400, { error: "created_by must be a string" });
      }

      const board = await ctx.boards.create(
        name.trim(),
        (created_by as string | null | undefined) ?? null
      );
      return json(res, 201, { board });
    }

    return json(res, 405, { error: "method not allowed" });
  }

  return json(res, 404, { error: "not found" });
}
