import type { BoardDoc, BoardOp, Shape } from "./types";

export { createShapeId } from "./types";

interface HistoryEntry { ops: BoardOp[]; inverse: BoardOp[] }

const HISTORY_CAP = 200;

function cloneShape(s: Shape): Shape {
  const c = { ...s } as Shape;
  if (c.type === "draw") c.points = [...c.points];
  return c;
}

export class BoardStore {
  private items: Shape[] = [];
  private subscribers = new Set<() => void>();
  private localOpsCb: ((ops: BoardOp[]) => void) | null = null;
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private rev = 0;

  doc(): BoardDoc {
    return { v: 1, shapes: this.items.map(cloneShape) };
  }

  shapes(): Shape[] {
    return [...this.items];
  }

  getShape(id: string): Shape | null {
    return this.items.find((s) => s.id === id) ?? null;
  }

  add(s: Shape, origin: "local" | "remote" = "local"): void {
    this.applyOps([{ k: "add", s }], origin);
  }

  update(id: string, patch: Partial<Shape>, origin: "local" | "remote" = "local"): void {
    this.applyOps([{ k: "upd", id, p: patch }], origin);
  }

  remove(ids: string[], origin: "local" | "remote" = "local"): void {
    this.applyOps([{ k: "del", ids }], origin);
  }

  applyOps(ops: BoardOp[], origin: "local" | "remote" = "local"): void {
    if (ops.length === 0) return;
    const inverse: BoardOp[] = [];
    for (const op of ops) inverse.push(...this.applyOp(op));
    if (inverse.length === 0) return;
    if (origin === "local") {
      this.undoStack.push({ ops, inverse });
      if (this.undoStack.length > HISTORY_CAP) this.undoStack.shift();
      this.redoStack = [];
    }
    this.rev++;
    if (origin === "local" && this.localOpsCb) this.localOpsCb(ops);
    this.notify();
  }

  load(doc: BoardDoc): void {
    this.items = doc.shapes.map(cloneShape);
    this.undoStack = [];
    this.redoStack = [];
    this.rev++;
    this.notify();
  }

  undo(): void {
    const entry = this.undoStack.pop();
    if (!entry) return;
    for (const op of entry.inverse) this.applyOp(op);
    this.redoStack.push(entry);
    this.rev++;
    if (this.localOpsCb) this.localOpsCb(entry.inverse);
    this.notify();
  }

  redo(): void {
    const entry = this.redoStack.pop();
    if (!entry) return;
    for (const op of entry.ops) this.applyOp(op);
    this.undoStack.push(entry);
    this.rev++;
    if (this.localOpsCb) this.localOpsCb(entry.ops);
    this.notify();
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  subscribe(fn: () => void): () => void {
    this.subscribers.add(fn);
    return () => {
      this.subscribers.delete(fn);
    };
  }

  revision(): number {
    return this.rev;
  }

  setOnLocalOps(cb: ((ops: BoardOp[]) => void) | null): void {
    this.localOpsCb = cb;
  }

  private applyOp(op: BoardOp): BoardOp[] {
    switch (op.k) {
      case "add": {
        this.items.push(op.s);
        return [{ k: "del", ids: [op.s.id] }];
      }
      case "upd": {
        const i = this.items.findIndex((s) => s.id === op.id);
        if (i === -1) return [];
        const prev = this.items[i];
        this.items[i] = { ...prev, ...op.p } as Shape;
        return [{ k: "upd", id: op.id, p: prev }];
      }
      case "del": {
        const removed = this.items.filter((s) => op.ids.includes(s.id));
        if (removed.length === 0) return [];
        this.items = this.items.filter((s) => !op.ids.includes(s.id));
        return removed.map((s) => ({ k: "add", s } as BoardOp));
      }
    }
  }

  private notify(): void {
    for (const fn of this.subscribers) fn();
  }
}
