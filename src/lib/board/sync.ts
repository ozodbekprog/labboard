import { BoardStore } from "@/lib/board/store";
import type { BoardDoc, BoardOp, PresenceUser } from "@/lib/board/types";

export type SyncStatus = "connecting" | "online" | "offline";

type ClientMessage =
  | { t: "join"; room: string; name: string; color: string }
  | { t: "ops"; ops: BoardOp[] }
  | { t: "cursor"; x: number; y: number };

interface ServerMessage {
  t: string;
  doc?: BoardDoc;
  ops?: BoardOp[];
  users?: PresenceUser[];
}

const WS_OPEN = 1;
const CURSOR_THROTTLE_MS = 40;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15000;

export class BoardSync {
  private readonly url: string;
  private readonly roomId: string;
  private readonly name: string;
  private readonly color: string;
  private readonly store: BoardStore;
  private readonly onPresence?: (users: PresenceUser[]) => void;
  private readonly onStatus?: (s: SyncStatus) => void;

  private ws: WebSocket | null = null;
  private destroyed = false;

  private pendingOps: BoardOp[] = [];
  private flushScheduled = false;

  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private lastCursorAt = 0;
  private pendingCursor: { x: number; y: number } | null = null;
  private cursorTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: {
    url: string;
    roomId: string;
    name: string;
    color: string;
    store: BoardStore;
    onPresence?: (users: PresenceUser[]) => void;
    onStatus?: (s: SyncStatus) => void;
  }) {
    this.url = opts.url;
    this.roomId = opts.roomId;
    this.name = opts.name;
    this.color = opts.color;
    this.store = opts.store;
    this.onPresence = opts.onPresence;
    this.onStatus = opts.onStatus;
    this.store.setOnLocalOps((ops: BoardOp[]) => this.queueOps(ops));
  }

  connect(): void {
    if (this.destroyed || typeof WebSocket === "undefined") return;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.dropSocket();
    this.setStatus("connecting");
    const ws = new WebSocket(`${this.url}/connect/${encodeURIComponent(this.roomId)}`);
    this.ws = ws;
    ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus("online");
      this.send({ t: "join", room: this.roomId, name: this.name, color: this.color });
      this.flushOps();
    };
    ws.onmessage = (ev: MessageEvent) => {
      if (typeof ev.data !== "string") return;
      this.handleMessage(ev.data);
    };
    ws.onclose = () => {
      if (this.ws === ws) this.ws = null;
      this.setStatus("offline");
      this.scheduleReconnect();
    };
    ws.onerror = () => {
      this.setStatus("offline");
    };
  }

  sendCursor(p: { x: number; y: number }): void {
    this.pendingCursor = { x: p.x, y: p.y };
    const elapsed = Date.now() - this.lastCursorAt;
    if (elapsed >= CURSOR_THROTTLE_MS) {
      this.flushCursor();
      return;
    }
    if (this.cursorTimer === null) {
      this.cursorTimer = setTimeout(() => {
        this.cursorTimer = null;
        this.flushCursor();
      }, CURSOR_THROTTLE_MS - elapsed);
    }
  }

  destroy(): void {
    this.destroyed = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.cursorTimer !== null) {
      clearTimeout(this.cursorTimer);
      this.cursorTimer = null;
    }
    this.pendingCursor = null;
    this.pendingOps = [];
    this.flushScheduled = false;
    this.dropSocket();
    this.store.setOnLocalOps(null);
  }

  private queueOps(ops: BoardOp[]): void {
    if (ops.length === 0) return;
    this.pendingOps.push(...ops);
    if (this.flushScheduled) return;
    this.flushScheduled = true;
    queueMicrotask(() => {
      this.flushScheduled = false;
      this.flushOps();
    });
  }

  private flushOps(): void {
    if (this.pendingOps.length === 0 || !this.isOpen()) return;
    const ops = this.pendingOps;
    this.pendingOps = [];
    this.send({ t: "ops", ops });
  }

  private flushCursor(): void {
    if (this.cursorTimer !== null) {
      clearTimeout(this.cursorTimer);
      this.cursorTimer = null;
    }
    const p = this.pendingCursor;
    if (!p) return;
    this.pendingCursor = null;
    this.lastCursorAt = Date.now();
    this.send({ t: "cursor", x: p.x, y: p.y });
  }

  private handleMessage(raw: string): void {
    let msg: unknown;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!msg || typeof msg !== "object") return;
    const m = msg as ServerMessage;
    switch (m.t) {
      case "doc":
        if (m.doc) {
          this.store.load(m.doc);
          this.setStatus("online");
        }
        break;
      case "ops":
        if (Array.isArray(m.ops)) this.store.applyOps(m.ops, "remote");
        break;
      case "presence":
        if (Array.isArray(m.users)) this.onPresence?.(m.users);
        break;
    }
  }

  private scheduleReconnect(): void {
    if (this.destroyed || this.reconnectTimer !== null) return;
    const base = Math.min(RECONNECT_BASE_MS * 2 ** this.reconnectAttempts, RECONNECT_MAX_MS);
    this.reconnectAttempts++;
    const wait = base + Math.random() * base * 0.3;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, wait);
  }

  private send(msg: ClientMessage): void {
    if (!this.isOpen()) return;
    this.ws?.send(JSON.stringify(msg));
  }

  private isOpen(): boolean {
    return this.ws !== null && this.ws.readyState === WS_OPEN;
  }

  private setStatus(s: SyncStatus): void {
    this.onStatus?.(s);
  }

  private dropSocket(): void {
    const ws = this.ws;
    this.ws = null;
    if (!ws) return;
    ws.onopen = null;
    ws.onmessage = null;
    ws.onclose = null;
    ws.onerror = null;
    ws.close();
  }
}

export default BoardSync;
