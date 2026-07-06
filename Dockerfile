# Lively — single-container image: standalone server + four static app exports.
# Build:  docker build -t lively .
# Run:    docker run -p 8080:8080 -v lively-data:/data lively

# ---- build ----
FROM oven/bun:1 AS build
WORKDIR /repo
ENV NEXT_TELEMETRY_DISABLED=1

COPY . .
RUN bun install --frozen-lockfile
RUN bun run build:packages

# Static exports (basePath baked into each app's next.config.ts)
RUN cd examples/nextjs-whiteboard && bunx next build && \
    cd ../nextjs-notion-editor && bunx next build && \
    cd ../nextjs-markdown-editor && bunx next build && \
    cd ../nextjs-todo && bunx next build

# Bundle the server into a single file and assemble the static tree
RUN bun build apps/umbrel/server.ts --target=bun --outfile=/out/server.js && \
    mkdir -p /out/static && \
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

COPY --from=build /out/server.js ./server.js
COPY --from=build /out/static ./static

RUN mkdir -p /data && chown -R bun:bun /data /app
USER bun

VOLUME /data
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD ["bun", "-e", "fetch(`http://127.0.0.1:${process.env.PORT || 8080}/health`).then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["bun", "run", "server.js"]
