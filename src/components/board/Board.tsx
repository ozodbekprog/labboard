"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Circle,
  Eraser,
  Hand,
  MousePointer2,
  Pen,
  Redo2,
  Square,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";
import { createShapeId } from "@/lib/board/store";
import type { BoardStore } from "@/lib/board/store";
import type {
  DrawShape,
  GeoShape,
  ImageShape,
  LineShape,
  PresenceUser,
  Shape,
  TextShape,
} from "@/lib/board/types";
import { drawShape, hitTest, shapeBounds } from "./render-shape";

export interface ScreenRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BoardApi {
  getShape(id: string): Shape | null;
  getShapeScreenRect(id: string): ScreenRect | null;
  getViewportCenterPage(): { x: number; y: number };
  addShape(s: Shape): void;
  updateShape(id: string, patch: Partial<Shape>): void;
  removeShapes(ids: string[]): void;
  screenToPage(p: { x: number; y: number }): { x: number; y: number };
  exportShapesPNG(ids: string[], scale?: number): Promise<{ dataUrl: string } | null>;
  subscribeViewport(fn: () => void): () => void;
}

export type Tool = "select" | "hand" | "pen" | "eraser" | "rect" | "ellipse" | "arrow" | "text";

const COLORS = ["#0f172a", "#6366f1", "#ef4444", "#16a34a", "#f59e0b"];
const WIDTHS = [2, 4, 8];

interface Viewport {
  tx: number;
  ty: number;
  zoom: number;
}

interface DragState {
  mode:
    | "pan"
    | "draw"
    | "geo"
    | "arrow"
    | "erase"
    | "move"
    | "rubber"
    | "resize";
  pointerId: number;
  startScreen: { x: number; y: number };
  lastScreen: { x: number; y: number };
  startViewport: Viewport;
  moveOrigin: Map<string, { x: number; y: number }> | null;
  rubberRect: ScreenRect | null;
  draft: DrawShape | GeoShape | LineShape | null;
  erasing: Set<string>;
  resizeOrigin: { id: string; x: number; y: number; w: number; h: number } | null;
}

interface TextEdit {
  id: string | null;
  pageX: number;
  pageY: number;
  value: string;
}

const TOOL_KEYS: Record<string, Tool> = {
  v: "select",
  h: "hand",
  p: "pen",
  e: "eraser",
  r: "rect",
  o: "ellipse",
  a: "arrow",
  t: "text",
};

export default function Board({
  store,
  presence,
  userName,
  onReady,
  onCursor,
}: {
  store: BoardStore;
  presence: PresenceUser[];
  userName: string;
  onReady: (api: BoardApi) => void;
  onCursor: (p: { x: number; y: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const viewportRef = useRef<Viewport>({ tx: 40, ty: 40, zoom: 1 });
  const subscribersRef = useRef<Set<() => void>>(new Set());
  const dirtyRef = useRef(true);
  const dragRef = useRef<DragState | null>(null);
  const spaceHeldRef = useRef(false);
  const selectionRef = useRef<string[]>([]);
  const [selection, setSelection] = useState<string[]>([]);
  const [tool, setToolState] = useState<Tool>("select");
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(2);
  const [, forceRender] = useState(0);
  const [textEdit, setTextEdit] = useState<TextEdit | null>(null);
  const textEditRef = useRef<TextEdit | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const toolRef = useRef<Tool>("select");
  const colorRef = useRef(color);
  const widthRef = useRef(width);
  const presenceRef = useRef<PresenceUser[]>(presence);
  const onCursorRef = useRef(onCursor);

  const setTool = useCallback((t: Tool) => {
    toolRef.current = t;
    setToolState(t);
  }, []);

  const setSelectionIds = useCallback((ids: string[]) => {
    selectionRef.current = ids;
    setSelection(ids);
  }, []);

  const setViewport = useCallback((v: Viewport) => {
    viewportRef.current = v;
    dirtyRef.current = true;
    subscribersRef.current.forEach((fn) => fn());
  }, []);

  const screenToPage = useCallback((p: { x: number; y: number }) => {
    const v = viewportRef.current;
    return { x: (p.x - v.tx) / v.zoom, y: (p.y - v.ty) / v.zoom };
  }, []);

  const pageToScreen = useCallback((p: { x: number; y: number }) => {
    const v = viewportRef.current;
    return { x: p.x * v.zoom + v.tx, y: p.y * v.zoom + v.ty };
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
    }
    const v = viewportRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    if (v.zoom > 0.4) {
      const spacing = 10 * v.zoom;
      const startX = ((v.tx % spacing) + spacing) % spacing;
      const startY = ((v.ty % spacing) + spacing) % spacing;
      ctx.fillStyle = "rgba(15,23,42,0.06)";
      for (let x = startX; x <= w; x += spacing) {
        for (let y = startY; y <= h; y += spacing) {
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    const toScreen = (px: number, py: number) => ({
      x: px * v.zoom + v.tx,
      y: py * v.zoom + v.ty,
    });
    for (const shape of store.shapes()) {
      drawShape(ctx, shape, toScreen, v.zoom, imagesRef.current);
    }
    const drag = dragRef.current;
    if (drag?.draft) {
      drawShape(ctx, drag.draft, toScreen, v.zoom, imagesRef.current);
    }
    if (drag?.mode === "rubber" && drag.rubberRect) {
      const r = drag.rubberRect;
      ctx.save();
      ctx.strokeStyle = "#64748b";
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = "rgba(99,102,241,0.08)";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.restore();
    }
    if (selectionRef.current.length > 0) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const id of selectionRef.current) {
        const s = store.getShape(id);
        if (!s) continue;
        const b = shapeBounds(s);
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.w);
        maxY = Math.max(maxY, b.y + b.h);
      }
      if (minX !== Infinity) {
        const tl = toScreen(minX, minY);
        const br = toScreen(maxX, maxY);
        ctx.save();
        ctx.strokeStyle = "#6366f1";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
        if (selectionRef.current.length === 1) {
          const size = 8;
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#6366f1";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.rect(br.x - size / 2, br.y - size / 2, size, size);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    for (const user of presenceRef.current) {
      const pt = toScreen(user.x, user.y);
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 16);
      ctx.lineTo(4.5, 12);
      ctx.lineTo(7, 17);
      ctx.lineTo(9.5, 15.8);
      ctx.lineTo(7, 11);
      ctx.lineTo(12, 11);
      ctx.closePath();
      ctx.fillStyle = user.color || "#6366f1";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.font = "10px ui-sans-serif, system-ui, sans-serif";
      const label = user.name || "User";
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = user.color || "#6366f1";
      ctx.beginPath();
      ctx.roundRect(pt.x + 10, pt.y + 14, tw + 10, 16, 4);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, pt.x + 15, pt.y + 25.5);
      ctx.restore();
    }
  }, [store]);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (dirtyRef.current) {
        dirtyRef.current = false;
        redraw();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [redraw]);

  useEffect(() => {
    return store.subscribe(() => {
      dirtyRef.current = true;
      forceRender((n) => n + 1);
    });
  }, [store]);

  useEffect(() => {
    presenceRef.current = presence;
    dirtyRef.current = true;
  }, [presence]);

  useEffect(() => {
    onCursorRef.current = onCursor;
  }, [onCursor]);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  useEffect(() => {
    textEditRef.current = textEdit;
  }, [textEdit]);

  const textEditSeed = textEdit
    ? (textEdit.id ?? "new") + ":" + textEdit.pageX + ":" + textEdit.pageY
    : null;
  useEffect(() => {
    if (!textEditSeed) return;
    const t = setTimeout(() => textareaRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [textEditSeed]);

  const apiRef = useRef<BoardApi | null>(null);
  if (!apiRef.current) {
    apiRef.current = {
      getShape: (id: string) => store.getShape(id),
      getShapeScreenRect: (id: string) => {
        const s = store.getShape(id);
        if (!s) return null;
        const b = shapeBounds(s);
        const tl = pageToScreen({ x: b.x, y: b.y });
        const br = pageToScreen({ x: b.x + b.w, y: b.y + b.h });
        return { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y };
      },
      getViewportCenterPage: () => {
        const canvas = canvasRef.current;
        if (!canvas) return screenToPage({ x: 0, y: 0 });
        return screenToPage({ x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 });
      },
      addShape: (s: Shape) => store.add(s),
      updateShape: (id: string, patch: Partial<Shape>) => store.update(id, patch),
      removeShapes: (ids: string[]) => store.remove(ids),
      screenToPage,
      exportShapesPNG: async (ids: string[], scale = 2) => {
        const shapes = ids
          .map((id) => store.getShape(id))
          .filter((s): s is Shape => Boolean(s));
        if (shapes.length === 0) return null;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const s of shapes) {
          const b = shapeBounds(s);
          minX = Math.min(minX, b.x);
          minY = Math.min(minY, b.y);
          maxX = Math.max(maxX, b.x + b.w);
          maxY = Math.max(maxY, b.y + b.h);
        }
        if (!isFinite(minX) || !isFinite(minY)) return null;
        const w = Math.max(1, Math.ceil((maxX - minX) * scale));
        const h = Math.max(1, Math.ceil((maxY - minY) * scale));
        const off = document.createElement("canvas");
        off.width = w;
        off.height = h;
        const ctx = off.getContext("2d");
        if (!ctx) return null;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        const toScreen = (px: number, py: number) => ({
          x: (px - minX) * scale,
          y: (py - minY) * scale,
        });
        for (const s of shapes) {
          drawShape(ctx, s, toScreen, scale, imagesRef.current);
        }
        return { dataUrl: off.toDataURL("image/png") };
      },
      subscribeViewport: (fn: () => void) => {
        subscribersRef.current.add(fn);
        return () => {
          subscribersRef.current.delete(fn);
        };
      },
    };
  }

  useEffect(() => {
    if (apiRef.current) onReady(apiRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensureImage = useCallback((src: string) => {
    if (imagesRef.current.has(src)) return;
    const img = new Image();
    img.onload = () => {
      imagesRef.current.set(src, img);
      dirtyRef.current = true;
    };
    img.src = src;
  }, []);

  useEffect(() => {
    for (const s of store.shapes()) {
      if (s.type === "image") ensureImage((s as ImageShape).src);
    }
  });

  const hitAny = useCallback(
    (pageX: number, pageY: number): string | null => {
      const shapes = store.shapes();
      for (let i = shapes.length - 1; i >= 0; i--) {
        if (hitTest(shapes[i], pageX, pageY, viewportRef.current.zoom)) return shapes[i].id;
      }
      return null;
    },
    [store]
  );

  const commitDraft = useCallback(() => {
    const drag = dragRef.current;
    if (!drag?.draft) return;
    const d = drag.draft;
    drag.draft = null;
    if (d.type === "draw") {
      if (d.points.length >= 2) store.add(d);
    } else if (d.type === "line" || d.type === "arrow") {
      if (Math.abs(d.x2) > 2 || Math.abs(d.y2) > 2) store.add(d);
    } else {
      const g = d as GeoShape & { h: number };
      if (g.w > 2 && g.h > 2) store.add(d);
    }
  }, [store]);

  const commitTextEdit = useCallback(() => {
    const edit = textEditRef.current;
    if (!edit) return;
    const value = edit.value.replace(/\s+$/, "");
    textEditRef.current = null;
    setTextEdit(null);
    if (edit.id) {
      if (value.length === 0) {
        store.remove([edit.id]);
      } else {
        store.update(edit.id, { text: value } as Partial<Shape>);
      }
    } else if (value.length > 0) {
      store.add({
        id: createShapeId(),
        type: "text",
        x: edit.pageX,
        y: edit.pageY,
        text: value,
        color: colorRef.current,
        fontSize: 16,
        w: 120,
        h: 24,
      } as TextShape);
    }
  }, [store]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (textEditRef.current && !(e.target instanceof HTMLTextAreaElement)) {
        commitTextEdit();
      }
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, [commitTextEdit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLInputElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        store.redo();
        return;
      }
      if (mod) return;
      if (e.key === " ") {
        e.preventDefault();
        spaceHeldRef.current = true;
        return;
      }
      if (e.key === "Escape") {
        if (dragRef.current) {
          dragRef.current = null;
          dirtyRef.current = true;
        }
        if (textEditRef.current) {
          commitTextEdit();
          return;
        }
        if (selectionRef.current.length > 0) setSelectionIds([]);
        else setTool("select");
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectionRef.current.length > 0) {
          e.preventDefault();
          store.remove(selectionRef.current);
          setSelectionIds([]);
        }
        return;
      }
      if (e.key.length === 1) {
        const t = TOOL_KEYS[e.key.toLowerCase()];
        if (t) setTool(t);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === " ") spaceHeldRef.current = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
    };
  }, [store, setTool, setSelectionIds, commitTextEdit]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (textEditRef.current) commitTextEdit();
      if (dragRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const page = screenToPage({ x: sx, y: sy });
      const v = viewportRef.current;
      const panGesture = toolRef.current === "hand" || spaceHeldRef.current || e.button === 1;

      if (e.button === 2) {
        dragRef.current = {
          mode: "pan",
          pointerId: e.pointerId,
          startScreen: { x: sx, y: sy },
          lastScreen: { x: sx, y: sy },
          startViewport: { ...v },
          moveOrigin: null,
          rubberRect: null,
          draft: null,
          erasing: new Set(),
          resizeOrigin: null,
        };
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          /* synthetic pointer */
        }
        return;
      }

      if (panGesture) {
        dragRef.current = {
          mode: "pan",
          pointerId: e.pointerId,
          startScreen: { x: sx, y: sy },
          lastScreen: { x: sx, y: sy },
          startViewport: { ...v },
          moveOrigin: null,
          rubberRect: null,
          draft: null,
          erasing: new Set(),
          resizeOrigin: null,
        };
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          /* synthetic pointer */
        }
        return;
      }

      const t = toolRef.current;
      if (t === "select") {
        if (selectionRef.current.length === 1) {
          const sel = store.getShape(selectionRef.current[0]);
          if (sel) {
            const b = shapeBounds(sel);
            const br = pageToScreen({ x: b.x + b.w, y: b.y + b.h });
            if (Math.abs(sx - br.x) <= 6 && Math.abs(sy - br.y) <= 6) {
              dragRef.current = {
                mode: "resize",
                pointerId: e.pointerId,
                startScreen: { x: sx, y: sy },
                lastScreen: { x: sx, y: sy },
                startViewport: { ...v },
                moveOrigin: null,
                rubberRect: null,
                draft: null,
                erasing: new Set(),
                resizeOrigin: { id: sel.id, x: b.x, y: b.y, w: b.w, h: b.h },
              };
              try {
                canvas.setPointerCapture(e.pointerId);
              } catch {
                /* synthetic pointer */
              }
              return;
            }
          }
        }
        const hit = hitAny(page.x, page.y);
        if (hit) {
          let ids: string[];
          if (e.shiftKey) {
            ids = selectionRef.current.includes(hit)
              ? selectionRef.current
              : [...selectionRef.current, hit];
          } else {
            ids = selectionRef.current.includes(hit) ? selectionRef.current : [hit];
          }
          setSelectionIds(ids);
          const origin = new Map<string, { x: number; y: number }>();
          for (const id of ids) {
            const s = store.getShape(id);
            if (s) origin.set(id, { x: s.x, y: s.y });
          }
          dragRef.current = {
            mode: "move",
            pointerId: e.pointerId,
            startScreen: { x: sx, y: sy },
            lastScreen: { x: sx, y: sy },
            startViewport: { ...v },
            moveOrigin: origin,
            rubberRect: null,
            draft: null,
            erasing: new Set(),
            resizeOrigin: null,
          };
        } else {
          if (!e.shiftKey) setSelectionIds([]);
          dragRef.current = {
            mode: "rubber",
            pointerId: e.pointerId,
            startScreen: { x: sx, y: sy },
            lastScreen: { x: sx, y: sy },
            startViewport: { ...v },
            moveOrigin: null,
            rubberRect: { x: sx, y: sy, w: 0, h: 0 },
            draft: null,
            erasing: new Set(),
            resizeOrigin: null,
          };
        }
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          /* synthetic pointer */
        }
        return;
      }

      if (t === "eraser") {
        dragRef.current = {
          mode: "erase",
          pointerId: e.pointerId,
          startScreen: { x: sx, y: sy },
          lastScreen: { x: sx, y: sy },
          startViewport: { ...v },
          moveOrigin: null,
          rubberRect: null,
          draft: null,
          erasing: new Set(),
          resizeOrigin: null,
        };
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          /* synthetic pointer */
        }
        const id = hitAny(page.x, page.y);
        if (id) {
          dragRef.current.erasing.add(id);
          store.remove([id]);
          setSelectionIds(selectionRef.current.filter((x) => x !== id));
        }
        return;
      }

      if (t === "pen") {
        const draft: DrawShape = {
          id: createShapeId(),
          type: "draw",
          x: page.x,
          y: page.y,
          w: 0,
          points: [0, 0],
          color: colorRef.current,
          size: widthRef.current,
        };
        dragRef.current = {
          mode: "draw",
          pointerId: e.pointerId,
          startScreen: { x: sx, y: sy },
          lastScreen: { x: sx, y: sy },
          startViewport: { ...v },
          moveOrigin: null,
          rubberRect: null,
          draft,
          erasing: new Set(),
          resizeOrigin: null,
        };
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          /* synthetic pointer */
        }
        return;
      }

      if (t === "rect" || t === "ellipse") {
        const draft = {
          id: createShapeId(),
          type: t,
          x: page.x,
          y: page.y,
          w: 0,
          h: 0,
          stroke: colorRef.current,
          fill: null,
          strokeW: widthRef.current,
        } as GeoShape;
        dragRef.current = {
          mode: "geo",
          pointerId: e.pointerId,
          startScreen: { x: sx, y: sy },
          lastScreen: { x: sx, y: sy },
          startViewport: { ...v },
          moveOrigin: null,
          rubberRect: null,
          draft,
          erasing: new Set(),
          resizeOrigin: null,
        };
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          /* synthetic pointer */
        }
        return;
      }

      if (t === "arrow") {
        const draft: LineShape = {
          id: createShapeId(),
          type: "arrow",
          x: page.x,
          y: page.y,
          w: 0,
          x2: 0,
          y2: 0,
          stroke: colorRef.current,
          strokeW: widthRef.current,
        };
        dragRef.current = {
          mode: "arrow",
          pointerId: e.pointerId,
          startScreen: { x: sx, y: sy },
          lastScreen: { x: sx, y: sy },
          startViewport: { ...v },
          moveOrigin: null,
          rubberRect: null,
          draft,
          erasing: new Set(),
          resizeOrigin: null,
        };
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          /* synthetic pointer */
        }
        return;
      }

      if (t === "text") {
        const id = createShapeId();
        textEditRef.current = { id: null, pageX: page.x, pageY: page.y, value: "" };
        setTextEdit({ id: null, pageX: page.x, pageY: page.y, value: "" });
        return;
      }
    },
    [store, screenToPage, hitAny, setSelectionIds, commitTextEdit]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const page = screenToPage({ x: sx, y: sy });
      onCursorRef.current?.(page);
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const v = viewportRef.current;
      drag.lastScreen = { x: sx, y: sy };

      if (drag.mode === "pan") {
        setViewport({
          tx: drag.startViewport.tx + (sx - drag.startScreen.x),
          ty: drag.startViewport.ty + (sy - drag.startScreen.y),
          zoom: drag.startViewport.zoom,
        });
        return;
      }

      if (drag.mode === "draw" && drag.draft && drag.draft.type === "draw") {
        const d = drag.draft;
        d.points.push(page.x - d.x, page.y - d.y);
        dirtyRef.current = true;
        return;
      }

      if (
        drag.mode === "geo" &&
        drag.draft &&
        (drag.draft.type === "rect" || drag.draft.type === "ellipse")
      ) {
        const d = drag.draft as GeoShape & { h: number };
        d.w = page.x - d.x;
        d.h = page.y - d.y;
        dirtyRef.current = true;
        return;
      }

      if (
        drag.mode === "arrow" &&
        drag.draft &&
        (drag.draft.type === "line" || drag.draft.type === "arrow")
      ) {
        const d = drag.draft;
        d.x2 = page.x - d.x;
        d.y2 = page.y - d.y;
        dirtyRef.current = true;
        return;
      }

      if (drag.mode === "erase") {
        const id = hitAny(page.x, page.y);
        if (id && !drag.erasing.has(id)) {
          drag.erasing.add(id);
          store.remove([id]);
          setSelectionIds(selectionRef.current.filter((x) => x !== id));
        }
        return;
      }

      if (drag.mode === "move" && drag.moveOrigin) {
        const dx = (sx - drag.startScreen.x) / v.zoom;
        const dy = (sy - drag.startScreen.y) / v.zoom;
        const patches: Array<[string, { x: number; y: number }]> = [];
        for (const [id, origin] of drag.moveOrigin) {
          patches.push([id, { x: origin.x + dx, y: origin.y + dy }]);
        }
        for (const [id, p] of patches) {
          store.update(id, p as Partial<Shape>);
        }
        return;
      }

      if (drag.mode === "rubber" && drag.rubberRect) {
        const r = drag.rubberRect;
        r.x = Math.min(drag.startScreen.x, sx);
        r.y = Math.min(drag.startScreen.y, sy);
        r.w = Math.abs(sx - drag.startScreen.x);
        r.h = Math.abs(sy - drag.startScreen.y);
        const tl = screenToPage({ x: r.x, y: r.y });
        const br = screenToPage({ x: r.x + r.w, y: r.y + r.h });
        const ids: string[] = [];
        for (const s of store.shapes()) {
          const b = shapeBounds(s);
          if (b.x < br.x && b.x + b.w > tl.x && b.y < br.y && b.y + b.h > tl.y) {
            ids.push(s.id);
          }
        }
        setSelectionIds(ids);
        dirtyRef.current = true;
        return;
      }

      if (drag.mode === "resize" && drag.resizeOrigin) {
        const o = drag.resizeOrigin;
        const dw = (sx - drag.startScreen.x) / v.zoom;
        const dh = (sy - drag.startScreen.y) / v.zoom;
        const nw = Math.max(1, o.w + dw);
        const nh = Math.max(1, o.h + dh);
        const s = store.getShape(o.id);
        if (!s) return;
        if (s.type === "draw") {
          const rx = o.w > 0 ? nw / o.w : 1;
          const ry = o.h > 0 ? nh / o.h : 1;
          const pts = s.points.map((n, i) => n * (i % 2 === 0 ? rx : ry));
          store.update(o.id, { points: pts } as Partial<Shape>);
        } else if (s.type === "line" || s.type === "arrow") {
          store.update(o.id, { x2: s.x2 * (o.w > 0 ? nw / o.w : 1), y2: s.y2 * (o.h > 0 ? nh / o.h : 1) } as Partial<Shape>);
        } else if (s.type === "rect" || s.type === "ellipse") {
          store.update(o.id, { w: nw, h: nh } as Partial<Shape>);
        } else if (s.type === "text") {
          store.update(o.id, { w: nw, h: nh } as Partial<Shape>);
        }
        return;
      }
    },
    [screenToPage, setViewport, store, hitAny, setSelectionIds]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      try {
        if (drag.draft) commitDraft();
      } finally {
        dragRef.current = null;
        dirtyRef.current = true;
      }
    },
    [commitDraft]
  );

  const onDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (toolRef.current !== "select") return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const page = screenToPage({ x: sx, y: sy });
      const id = hitAny(page.x, page.y);
      if (!id) return;
      const s = store.getShape(id);
      if (!s || s.type !== "text") return;
      textEditRef.current = { id, pageX: s.x, pageY: s.y, value: s.text };
      setTextEdit({ id, pageX: s.x, pageY: s.y, value: s.text });
    },
    [screenToPage, hitAny, store]
  );

  const onWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      const v = viewportRef.current;
      if (e.ctrlKey || e.metaKey) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const factor = Math.exp(-e.deltaY * 0.0015);
        const nextZoom = Math.min(8, Math.max(0.1, v.zoom * factor));
        const k = nextZoom / v.zoom;
        setViewport({
          tx: sx - (sx - v.tx) * k,
          ty: sy - (sy - v.ty) * k,
          zoom: nextZoom,
        });
      } else {
        setViewport({ tx: v.tx - e.deltaX, ty: v.ty - e.deltaY, zoom: v.zoom });
      }
    },
    [setViewport]
  );

  const canUndo = store.canUndo();
  const canRedo = store.canRedo();

  const showsSwatches = tool === "pen" || tool === "rect" || tool === "ellipse" || tool === "arrow" || tool === "text";

  const toolButtons: Array<{ tool: Tool; icon: React.ReactNode; label: string }> = [
    { tool: "select", icon: <MousePointer2 size={18} />, label: "Select (V)" },
    { tool: "hand", icon: <Hand size={18} />, label: "Hand (H)" },
    { tool: "pen", icon: <Pen size={18} />, label: "Pen (P)" },
    { tool: "eraser", icon: <Eraser size={18} />, label: "Eraser (E)" },
    { tool: "rect", icon: <Square size={18} />, label: "Rectangle (R)" },
    { tool: "ellipse", icon: <Circle size={18} />, label: "Ellipse (O)" },
    { tool: "arrow", icon: <ArrowUpRight size={18} />, label: "Arrow (A)" },
    { tool: "text", icon: <Type size={18} />, label: "Text (T)" },
  ];

  const textScreen = textEdit ? pageToScreen({ x: textEdit.pageX, y: textEdit.pageY }) : null;
  const editingShape = textEdit?.id ? store.getShape(textEdit.id) : null;
  const editingFontSize = editingShape && editingShape.type === "text" ? editingShape.fontSize : 16;

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-white">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        style={{ cursor: tool === "hand" ? "grab" : "crosshair" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
      />

      {textEdit && textScreen && (
        <textarea
          ref={textareaRef}
          autoFocus
          value={textEdit.value}
          onChange={(e) => {
            const v = e.target.value;
            textEditRef.current = { ...textEdit, value: v };
            setTextEdit({ ...textEdit, value: v });
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              commitTextEdit();
            }
            e.stopPropagation();
          }}
          style={{
            position: "absolute",
            left: textScreen.x,
            top: textScreen.y,
            fontSize: editingFontSize * viewportRef.current.zoom,
            color: color,
            background: "transparent",
            border: "1px dashed #6366f1",
            outline: "none",
            minWidth: 120,
            minHeight: 24,
            lineHeight: 1.2,
            padding: 0,
            margin: 0,
            resize: "none",
            zIndex: 30,
          }}
        />
      )}

      {showsSwatches && (
        <div className="absolute bottom-16 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 shadow-md">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="h-5 w-5 rounded-full border border-slate-300"
              style={{
                background: c,
                outline: color === c ? "2px solid #6366f1" : "none",
                outlineOffset: 1,
              }}
              title={c}
            />
          ))}
          <div className="h-4 w-px bg-slate-200" />
          {WIDTHS.map((wv) => (
            <button
              key={wv}
              onClick={() => setWidth(wv)}
              className="grid h-6 w-6 place-items-center rounded-full"
              style={{ background: width === wv ? "#0f172a" : "transparent" }}
              title={`${wv}px`}
            >
              <span
                className="rounded-full"
                style={{
                  width: Math.min(wv, 10),
                  height: Math.min(wv, 10),
                  background: width === wv ? "#ffffff" : "#0f172a",
                }}
              />
            </button>
          ))}
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-slate-200 bg-white/95 px-2 py-1.5 shadow-md">
        {toolButtons.map((b) => (
          <button
            key={b.tool}
            onClick={() => setTool(b.tool)}
            title={b.label}
            className="grid h-10 w-10 place-items-center rounded-full"
            style={{
              background: tool === b.tool ? "#0f172a" : "transparent",
              color: tool === b.tool ? "#ffffff" : "#334155",
            }}
          >
            {b.icon}
          </button>
        ))}
        <div className="mx-1 h-5 w-px bg-slate-200" />
        <button
          onClick={() => store.undo()}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="grid h-10 w-10 place-items-center rounded-full text-slate-700 disabled:opacity-30"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={() => store.redo()}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          className="grid h-10 w-10 place-items-center rounded-full text-slate-700 disabled:opacity-30"
        >
          <Redo2 size={18} />
        </button>
        <button
          onClick={() => {
            if (selectionRef.current.length > 0) {
              store.remove(selectionRef.current);
              setSelectionIds([]);
            }
          }}
          disabled={selection.length === 0}
          title="Delete selection"
          className="grid h-10 w-10 place-items-center rounded-full text-slate-700 disabled:opacity-30"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
