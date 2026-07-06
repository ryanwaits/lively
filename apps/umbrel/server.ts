import path from "node:path";
import {
  LivelyServer,
  RoomPersistence,
  PersistenceBinding,
} from "@waits/lively-server";
import { BoardsIndex } from "./boards.js";
import { handleApiRequest } from "./api.js";

const PORT = parseInt(process.env.PORT || "8080", 10);
const DATA_DIR = process.env.DATA_DIR || path.join(import.meta.dir, ".data");
const STATIC_DIR =
  process.env.STATIC_DIR || path.join(import.meta.dir, "static");

const persistence = new RoomPersistence(DATA_DIR);
await persistence.ensureDir();

const boards = new BoardsIndex(DATA_DIR, persistence);
const binding = new PersistenceBinding(persistence, {
  onError: (roomId, flavor, error) => {
    console.error(`[lively] persist failed (${flavor}) room=${roomId}`, error);
  },
});

const server = new LivelyServer({
  ...binding.hooks(),
  staticDir: STATIC_DIR,
  onRequest: (req, res) =>
    handleApiRequest(req, res, { boards, config: { ai: false } }),
});
binding.attach(server);

await server.start(PORT);
console.log(`[lively] serving static UI from ${STATIC_DIR}`);
console.log(`[lively] persisting rooms to ${DATA_DIR}`);
console.log(`[lively] listening on :${server.port}`);

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[lively] ${signal} received — flushing rooms`);
  try {
    await binding.flush();
  } finally {
    await server.stop();
    process.exit(0);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
