import { WebSocketServer, WebSocket } from "ws";
import http from "node:http";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";

const PORT = Number(process.env.SYNC_PORT ?? 5858);

mkdirSync("./data", { recursive: true });
const db = new Database("./data/board.db");
db.pragma("journal_mode = WAL");
db.prepare(
  "CREATE TABLE IF NOT EXISTS board_docs (room TEXT PRIMARY KEY, doc TEXT NOT NULL, updated_at INTEGER NOT NULL)"
).run();

type Cursor = { x: number; y: number };
type ClientInfo = { id: string; name: string; color: string; cursor: Cursor };
type RoomEntry = { clients: Map<WebSocket, ClientInfo> };

const rooms = new Map<string, RoomEntry>();

type Shape = { id: string; [key: string]: unknown };
type Doc = { v: number; shapes: Shape[] };
type Op = {
  type: string;
  id?: string;
  s?: Shape;
  patch?: Record<string, unknown>;
  [key: string]: unknown;
};

function applyOps(doc: Doc, ops: Op[]): Doc {
  const shapes = [...doc.shapes];
  for (const op of ops) {
    try {
      if (!op || typeof op !== "object") continue;
      if (op.type === "add" && op.s && typeof op.s === "object") {
        shapes.push(op.s as Shape);
      } else if (op.type === "upd") {
        const i = shapes.findIndex((s) => s.id === op.id);
        if (i !== -1 && op.patch && typeof op.patch === "object") {
          shapes[i] = { ...shapes[i], ...(op.patch as Record<string, unknown>) } as Shape;
        }
      } else if (op.type === "del") {
        const kept = shapes.filter((s) => s.id !== op.id);
        shapes.length = 0;
        shapes.push(...kept);
      }
    } catch {
      // ignore malformed op
    }
  }
  return { ...doc, shapes };
}

function getOrCreateRoom(roomId: string): RoomEntry {
  let room = rooms.get(roomId);
  if (!room) {
    room = { clients: new Map<WebSocket, ClientInfo>() };
    rooms.set(roomId, room);
    console.log(`[board] room opened: ${roomId}`);
  }
  return room;
}

function presenceList(room: RoomEntry) {
  return [...room.clients.values()].map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    cursor: c.cursor,
  }));
}

function broadcast(room: RoomEntry, msg: unknown, except?: WebSocket) {
  const data = JSON.stringify(msg);
  for (const ws of room.clients.keys()) {
    if (ws !== except && ws.readyState === WebSocket.OPEN) ws.send(data);
  }
}

function loadDoc(roomId: string): Doc {
  const row = db.prepare("SELECT doc FROM board_docs WHERE room = ?").get(roomId) as
    | { doc: string }
    | undefined;
  if (!row) return { v: 1, shapes: [] };
  try {
    return JSON.parse(row.doc) as Doc;
  } catch {
    return { v: 1, shapes: [] };
  }
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
  const room = getOrCreateRoom(roomId);
  const client: ClientInfo = {
    id: `u_${Math.random().toString(36).slice(2, 10)}`,
    name: "anon",
    color: "#888888",
    cursor: { x: 0, y: 0 },
  };
  room.clients.set(socket, client);

  socket.on("message", (data) => {
    let m: any;
    try {
      m = JSON.parse(data.toString());
    } catch {
      return;
    }
    if (!m || typeof m !== "object") return;

    if (m.t === "join") {
      client.name = String(m.name ?? "anon");
      client.color = String(m.color ?? "#888888");
      console.log(`[board] client join room=${roomId} id=${client.id} name=${client.name}`);
      socket.send(JSON.stringify({ t: "doc", doc: loadDoc(roomId) }));
      broadcast(room, { t: "presence", users: presenceList(room) });
    } else if (m.t === "ops" && Array.isArray(m.ops)) {
      const doc = loadDoc(roomId);
      const next = applyOps(doc, m.ops as Op[]);
      db.prepare("INSERT OR REPLACE INTO board_docs (room, doc, updated_at) VALUES (?, ?, ?)").run(
        roomId,
        JSON.stringify(next),
        Date.now()
      );
      console.log(`[board] ops room=${roomId} n=${m.ops.length}`);
      broadcast(room, { t: "ops", ops: m.ops }, socket);
    } else if (m.t === "cursor") {
      client.cursor = { x: Number(m.x) || 0, y: Number(m.y) || 0 };
      broadcast(room, { t: "presence", users: presenceList(room) }, socket);
    }
  });

  socket.on("close", () => {
    room.clients.delete(socket);
    console.log(`[board] client leave room=${roomId} id=${client.id}`);
    broadcast(room, { t: "presence", users: presenceList(room) });
    if (room.clients.size === 0) rooms.delete(roomId);
  });
});

server.listen(PORT, () => {
  console.log(`[board] LabBoard board server ready: ws://localhost:${PORT}/connect/:roomId`);
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    console.log("[board] shutting down");
    wss.close();
    server.close(() => process.exit(0));
    db.close();
    setTimeout(() => process.exit(0), 1000);
  });
}
