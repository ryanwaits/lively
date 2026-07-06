import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import type http from "node:http";
import path from "node:path";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".wasm": "application/wasm",
  ".map": "application/json",
  ".webmanifest": "application/manifest+json",
};

function contentType(filePath: string): string {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

/**
 * Serve a file from `staticDir` for the given request.
 *
 * Resolution order (matches Next.js static-export output):
 *   /foo/      → foo/index.html
 *   /foo       → foo, foo.html, foo/index.html
 *
 * Returns true if a response was written, false if nothing matched
 * (caller decides the 404). Requests escaping `staticDir` never match.
 */
export async function serveStaticFile(
  staticDir: string,
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<boolean> {
  let pathname: string;
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return false;
  }

  const base = path.resolve(staticDir);
  const resolved = path.normalize(path.join(base, pathname));
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    return false; // path traversal
  }

  const candidates = pathname.endsWith("/")
    ? [path.join(resolved, "index.html")]
    : path.extname(resolved)
      ? [resolved]
      : [resolved, `${resolved}.html`, path.join(resolved, "index.html")];

  for (const filePath of candidates) {
    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat?.isFile()) continue;

    const immutable = pathname.includes("/_next/static/");
    res.writeHead(200, {
      "Content-Type": contentType(filePath),
      "Content-Length": stat.size,
      "Cache-Control": immutable
        ? "public, max-age=31536000, immutable"
        : "no-cache",
    });

    if (req.method === "HEAD") {
      res.end();
      return true;
    }

    await new Promise<void>((resolve) => {
      const stream = createReadStream(filePath);
      stream.pipe(res);
      stream.on("error", () => {
        res.destroy();
        resolve();
      });
      stream.on("end", () => resolve());
    });
    return true;
  }

  return false;
}
