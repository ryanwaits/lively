# Lively — single-container image: standalone server + four static app exports.
# Build:  docker build -t lively .
# Run:    docker run -p 8080:8080 -v lively-data:/data lively

# ---- build ----
# Runs on the build host's native arch; all outputs (bundled server.js,
# static exports) are arch-independent JS, so cross-builds never execute
# anything under emulation (bun crashes under qemu/Rosetta).
FROM --platform=$BUILDPLATFORM oven/bun:1 AS build
WORKDIR /repo
ENV NEXT_TELEMETRY_DISABLED=1

COPY . .
RUN bun install --frozen-lockfile
RUN bun run build:packages

# Static exports (UMBREL_BUILD bakes each app's /board, /notes, etc. basePath
# into the export; without it the same configs build root-served for Vercel)
ENV UMBREL_BUILD=1
RUN cd examples/nextjs-whiteboard && bunx next build && \
    cd ../nextjs-notion-editor && bunx next build && \
    cd ../nextjs-markdown-editor && bunx next build && \
    cd ../nextjs-todo && bunx next build

# Bundle the server into a single file and assemble the static tree
RUN bun build apps/umbrel/server.ts --target=bun --outfile=/out/server.js && \
    mkdir -p /out/static /out/data && \
    cp apps/umbrel/static/index.html /out/static/index.html && \
    cp -r examples/nextjs-whiteboard/out /out/static/board && \
    cp -r examples/nextjs-notion-editor/out /out/static/notes && \
    cp -r examples/nextjs-markdown-editor/out /out/static/markdown && \
    cp -r examples/nextjs-todo/out /out/static/todo

# ---- runtime ----
FROM oven/bun:1-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/data \
    STATIC_DIR=/app/static

# COPY-only below — no RUN, so cross-arch builds never execute emulated code
COPY --from=build --chown=bun:bun /out/server.js ./server.js
COPY --from=build --chown=bun:bun /out/static ./static
COPY --from=build --chown=bun:bun /out/data /data
USER bun

VOLUME /data
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD ["bun", "-e", "fetch(`http://127.0.0.1:${process.env.PORT || 8080}/health`).then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["bun", "run", "server.js"]
