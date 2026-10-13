"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor, TLShape, TLShapeId } from "tldraw";
import { isShape } from "tldraw";
import {
  looksLikeFunction,
  renderMoleculePNG,
  insertImageShapeNextTo,
  insertNoteNextTo,
} from "@/lib/labs/auto-ai";
import type { Bounds } from "@/lib/labs/auto-ai";
import { renderGraphPNG } from "@/lib/labs/graph-render";
import type { BoardAnalysis } from "@/lib/ai/types";

const DEBOUNCE_MS = 1800;
const MIN_SIZE = 8;

function shapeText(shape: TLShape): string {
  const p = (shape as { props?: { richText?: unknown; text?: unknown } }).props;
  const rt = p?.richText as
    | { type?: string; content?: Array<{ content?: Array<{ text?: string }> }> }
    | undefined;
  if (rt && Array.isArray(rt.content)) {
    return rt.content
      .flatMap((b) => (Array.isArray(b.content) ? b.content : []))
      .map((n) => n.text ?? "")
      .join("");
  }
  return typeof p?.text === "string" ? p.text : "";
}

export function useAutoAI(editor: Editor | null, enabled: boolean): { processing: boolean } {
  const [processing, setProcessing] = useState(false);
  const processedIds = useRef<Set<string> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const disabledOnce = useRef(false);

  useEffect(() => {
    if (!editor || !enabled) return;

    if (!processedIds.current) {
      processedIds.current = new Set(editor.getCurrentPageShapeIds());
    }
    const processed = processedIds.current;

    const toBounds = (id: TLShapeId): Bounds | null => {
      const b = editor.getShapePageBounds(id);
      if (!b) return null;
      return { minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY };
    };

    const run = async () => {
      if (!editor || inFlight.current || !processedIds.current) return;

      const newIds: TLShapeId[] = [];
      for (const id of editor.getCurrentPageShapeIds()) {
        if (processed.has(id)) continue;
        const shape = editor.store.get(id);
        if (!shape || !isShape(shape) || shape.type === "image") continue;
        const b = editor.getShapePageBounds(id);
        if (!b || b.maxX - b.minX < MIN_SIZE || b.maxY - b.minY < MIN_SIZE) continue;
        if (shape.type === "text" && !shapeText(shape).trim()) continue;
        newIds.push(id);
      }
      if (newIds.length === 0) return;

      inFlight.current = true;
      setProcessing(true);
      const created: TLShapeId[] = [];
      try {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        let hasBounds = false;
        for (const id of newIds) {
          const b = editor.getShapePageBounds(id);
          if (!b) continue;
          hasBounds = true;
          minX = Math.min(minX, b.minX);
          minY = Math.min(minY, b.minY);
          maxX = Math.max(maxX, b.maxX);
          maxY = Math.max(maxY, b.maxY);
        }
        const bounds: Bounds | null = hasBounds ? { minX, minY, maxX, maxY } : null;

        const remaining: TLShapeId[] = [];

        // FAST PATH (local, no API): text shapes that look like functions
        for (const id of newIds) {
          const shape = editor.store.get(id);
          if (!shape || !isShape(shape) || shape.type !== "text") {
            remaining.push(id);
            continue;
          }
          const expr = looksLikeFunction(shapeText(shape));
          if (!expr) {
            remaining.push(id);
            continue;
          }
          processed.add(id);
          const sb = toBounds(id);
          const file = await renderGraphPNG(expr);
          if (!file) continue;
          const imgId = await insertImageShapeNextTo(editor, file, sb);
          if (!imgId) continue;
          created.push(imgId as TLShapeId);
          processed.add(imgId);
          const noteId = await insertNoteNextTo(editor, `📈 ${expr}`, sb);
          if (noteId) {
            created.push(noteId as TLShapeId);
            processed.add(noteId);
          }
        }

        // VISION PATH (background AI)
        if (remaining.length > 0 && bounds && !disabledOnce.current) {
          let analysis: BoardAnalysis | null = null;
          try {
            const { url } = await editor.toImageDataUrl(remaining, {
              format: "png",
              scale: 1.5,
            });
            const res = await fetch("/api/ai/vision", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ image: url }),
            });
            if (res.status === 501) {
              disabledOnce.current = true;
              console.info("[auto-ai] vision API not configured — disabled for this session");
            } else if (res.ok) {
              const data = (await res.json()) as { analysis?: BoardAnalysis };
              analysis = data.analysis ?? null;
            }
          } catch {
            analysis = null;
          }

          if (analysis) {
            if (analysis.expression) {
              const file = await renderGraphPNG(analysis.expression);
              if (file) {
                const id = await insertImageShapeNextTo(editor, file, bounds);
                if (id) created.push(id as TLShapeId);
                const nid = await insertNoteNextTo(editor, `✨ ${analysis.title}`, bounds);
                if (nid) created.push(nid as TLShapeId);
              }
            } else if (analysis.equation) {
              const res = await fetch("/api/math", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ op: "solve", expression: analysis.equation }),
              });
              if (res.ok) {
                const data = (await res.json()) as { roots?: number[] };
                const roots = data.roots ?? [];
                const text =
                  `🧮 Yechim: ${roots.map((r) => `x = ${r}`).join(", ") || "topilmadi"}` +
                  `\n✨ ${analysis.title}`;
                const nid = await insertNoteNextTo(editor, text, bounds);
                if (nid) created.push(nid as TLShapeId);
              }
            } else if (analysis.molecule || analysis.kind === "molecule") {
              const file = await renderMoleculePNG(analysis.molecule ?? analysis.title);
              if (file) {
                const id = await insertImageShapeNextTo(editor, file, bounds);
                if (id) created.push(id as TLShapeId);
                const nid = await insertNoteNextTo(editor, `✨ ${analysis.title}`, bounds);
                if (nid) created.push(nid as TLShapeId);
              }
            } else if (analysis.kind === "physics") {
              const params = Object.entries(analysis.params ?? {})
                .map(([k, v]) => `${k}=${v}`)
                .join(", ");
              const nid = await insertNoteNextTo(
                editor,
                `🎯 ${analysis.title}: ${params}`,
                bounds,
              );
              if (nid) created.push(nid as TLShapeId);
            } else {
              const nid = await insertNoteNextTo(
                editor,
                `✨ ${analysis.title}: ${analysis.description.slice(0, 200)}`,
                bounds,
              );
              if (nid) created.push(nid as TLShapeId);
            }
          }
        }
      } catch (e) {
        console.warn("[auto-ai] background analysis failed", e);
      } finally {
        for (const id of newIds) processed.add(id);
        for (const id of created) processed.add(id);
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

    const unsub = editor.store.listen(schedule, { scope: "document", source: "user" });
    return () => {
      unsub();
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [editor, enabled]);

  return { processing };
}
