"use client";

import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { looksLikeFunction } from "@/lib/labs/auto-ai";
import { compileExpression } from "@/lib/labs/expr";
import type { PopupSuggestion } from "@/lib/ai/popup";
import type { BoardAnalysis } from "@/lib/ai/types";
import type { BoardApi } from "@/components/board/Board";
import type { BoardStore } from "@/lib/board/store";
import type { Shape, TextShape } from "@/lib/board/types";

const DEBOUNCE_MS = 1800;
const MIN_SIZE = 8;

function shapeText(shape: Shape): string {
  if (shape.type === "text") return (shape as TextShape).text ?? "";
  return "";
}

function shapeSize(shape: Shape): { w: number; h: number } | null {
  const s = shape as unknown as {
    points?: unknown;
    x2?: number;
    y2?: number;
    w?: number;
    h?: number;
    size?: number;
  };
  if (shape.type === "draw") {
    const pts = s.points;
    if (!Array.isArray(pts) || pts.length === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const first = pts[0];
    if (typeof first === "number") {
      // flat [x0,y0,x1,y1,...] RELATIVE to x,y
      for (let i = 0; i + 1 < pts.length; i += 2) {
        const px = Number(pts[i]) || 0;
        const py = Number(pts[i + 1]) || 0;
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);
      }
    } else {
      for (const raw of pts) {
        if (raw && typeof raw === "object") {
          const px = Number((raw as { x?: number }).x) || 0;
          const py = Number((raw as { y?: number }).y) || 0;
          minX = Math.min(minX, px);
          minY = Math.min(minY, py);
          maxX = Math.max(maxX, px);
          maxY = Math.max(maxY, py);
        }
      }
    }
    if (!isFinite(minX) || !isFinite(maxX)) return null;
    const size = s.size ?? 2;
    return {
      w: Math.max(1, maxX - minX + size),
      h: Math.max(1, maxY - minY + size),
    };
  }
  if (shape.type === "line" || shape.type === "arrow") {
    return {
      w: Math.max(1, Math.abs(s.x2 ?? 0)),
      h: Math.max(1, Math.abs(s.y2 ?? 0)),
    };
  }
  return {
    w: Math.max(1, Math.abs(s.w ?? 0)),
    h: Math.max(1, Math.abs(s.h ?? 0)),
  };
}

export function useAutoAI(opts: {
  store: BoardStore | null;
  apiRef: MutableRefObject<BoardApi | null>;
  enabled: boolean;
  onSuggest: (s: PopupSuggestion) => void;
}): { processing: boolean } {
  const { store, apiRef, enabled, onSuggest } = opts;
  const [processing, setProcessing] = useState(false);
  const processedIds = useRef<Set<string> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const disabledOnce = useRef(false);
  const suggestRef = useRef(onSuggest);
  suggestRef.current = onSuggest;

  useEffect(() => {
    if (!store || !enabled) return;

    if (!processedIds.current) {
      processedIds.current = new Set(store.shapes().map((s) => s.id));
    }
    const processed = processedIds.current;

    const run = async () => {
      if (!store || inFlight.current || !processedIds.current) return;

      const newIds: string[] = [];
      for (const shape of store.shapes()) {
        if (processed.has(shape.id)) continue;
        const size = shapeSize(shape);
        if (!size || (size.w < MIN_SIZE && size.h < MIN_SIZE)) continue;
        if (shape.type === "text" && !shapeText(shape).trim()) continue;
        newIds.push(shape.id);
      }
      if (newIds.length === 0) return;

      inFlight.current = true;
      setProcessing(true);
      try {
        const anchorShapeId = newIds[newIds.length - 1];
        const suggest = (data: PopupSuggestion["data"]) =>
          suggestRef.current({
            id: `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
            anchorShapeId,
            data,
          });

        const remaining: string[] = [];

        // FAST PATH (local, no API)
        for (const id of newIds) {
          const shape = store.getShape(id);
          if (!shape || shape.type !== "text") {
            remaining.push(id);
            continue;
          }
          const t = shapeText(shape).trim().replace(/=+$/, "");
          if (/[xy]|y=/.test(t)) {
            const expr = looksLikeFunction(t);
            if (expr) {
              processed.add(id);
              suggest({ kind: "graph", title: "Funksiya aniqlandi", expression: expr });
              continue;
            }
          } else if (/^[0-9+\-*/^%(). ]+$/.test(t)) {
            try {
              const fn = compileExpression(t);
              const v = fn(0);
              if (isFinite(v)) {
                processed.add(id);
                const pv = Number(v.toPrecision(10));
                suggest({
                  kind: "answer",
                  title: "Natija",
                  answer: String(pv),
                  description: `${t} = ${pv}`,
                });
                continue;
              }
            } catch {
              // fall through to vision path
            }
          }
          remaining.push(id);
        }

        // VISION PATH (background AI)
        if (remaining.length > 0 && !disabledOnce.current) {
          const api = apiRef.current;
          if (api) {
            let analysis: BoardAnalysis | null = null;
            try {
              const img = await api.exportShapesPNG(remaining, 1.5);
              if (img) {
                const res = await fetch("/api/ai/vision", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ image: img.dataUrl }),
                });
                if (res.status === 501) {
                  disabledOnce.current = true;
                  console.info("[auto-ai] vision API not configured — disabled for this session");
                } else if (res.ok) {
                  const data = (await res.json()) as { analysis?: BoardAnalysis };
                  analysis = data.analysis ?? null;
                }
              }
            } catch {
              analysis = null;
            }

            if (analysis) {
              const description = analysis.description ?? "";
              if (analysis.expression) {
                suggest({
                  kind: "graph",
                  title: analysis.title,
                  expression: analysis.expression,
                  description,
                });
              } else if (analysis.kind === "equation" || analysis.equation) {
                suggest({
                  kind: "equation",
                  title: analysis.title,
                  equation: analysis.equation ?? analysis.latex,
                  description,
                });
              } else if (analysis.kind === "molecule" || analysis.molecule) {
                suggest({
                  kind: "molecule",
                  title: analysis.title,
                  molecule: analysis.molecule ?? analysis.title,
                  description,
                });
              } else if (analysis.kind === "physics") {
                suggest({
                  kind: "physics",
                  title: analysis.title,
                  params: analysis.params,
                  description,
                });
              } else {
                suggest({
                  kind: "info",
                  title: analysis.title,
                  description: `${description}${analysis.latex ? " | " + analysis.latex : ""}`,
                });
              }
            }
          }
        }
      } catch (e) {
        console.warn("[auto-ai] background analysis failed", e);
      } finally {
        for (const id of newIds) processed.add(id);
        inFlight.current = false;
        setProcessing(false);
      }
    };

    const schedule = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        void run();
      }, DEBOUNCE_MS);
    };

    const unsub = store.subscribe(schedule);
    return () => {
      unsub();
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [store, apiRef, enabled]);

  return { processing };
}
