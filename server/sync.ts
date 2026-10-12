import http from "node:http";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import Database from "better-sqlite3";
import { WebSocketServer } from "ws";
import { NodeSqliteWrapper, SQLiteSyncStorage, TLSocketRoom } from "@tldraw/sync-core";

const PORT = Number(process.env.SYNC_PORT ?? 5858);

mkdirSync("./data", { recursive: true });
const db = new Database("./data/sync.db");
db.pragma("journal_mode = WAL");

const rooms = new Map<string, TLSocketRoom>();

function getRoom(roomId: string): TLSocketRoom {
  let room = rooms.get(roomId);
  if (!room) {
    const safe = roomId.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 64);
    room = new TLSocketRoom({
      storage: new SQLiteSyncStorage({ sql: new NodeSqliteWrapper(db, { tablePrefix: `room_${safe}_` }) }),
    });
    rooms.set(roomId, room);
    console.log(`[sync] room opened: ${roomId}`);
  }
  return room;
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }
  res.writeHead(404, { "content-type": "text/plain" });
  res.end("not found");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (socket, req) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const match = url.pathname.match(/^\/connect\/(.+)$/);
  if (!match) {
    socket.close(1008, "invalid path");
    return;
  }
  const roomId = decodeURIComponent(match[1]);
  const sessionId = url.searchParams.get("sessionId") || randomUUID();
  const room = getRoom(roomId);
  room.handleSocketConnect({ sessionId, socket });
  console.log(`[sync] connected room=${roomId} session=${sessionId}`);
});

server.listen(PORT, () => {
  console.log(`[sync] LabBoard sync server ready: ws://localhost:${PORT}/connect/:roomId`);
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    console.log("[sync] shutting down");
    wss.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1000);
  });
}
