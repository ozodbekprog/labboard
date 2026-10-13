"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor, TLShape, TLShapeId } from "tldraw";
import { isShape } from "tldraw";
import { looksLikeFunction } from "@/lib/labs/auto-ai";
import { compileExpression } from "@/lib/labs/expr";
import type { PopupSuggestion } from "@/lib/ai/popup";
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

export function useAutoAI(
  editor: Editor | null,
  enabled: boolean,
  onSuggest: (s: PopupSuggestion) => void,
): { processing: boolean } {
  const [processing, setProcessing] = useState(false);
  const processedIds = useRef<Set<string> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const disabledOnce = useRef(false);
  const suggestRef = useRef(onSuggest);
  suggestRef.current = onSuggest;

  useEffect(() => {
    if (!editor || !enabled) return;

    if (!processedIds.current) {
      processedIds.current = new Set(editor.getCurrentPageShapeIds());
    }
    const processed = processedIds.current;

    const run = async () => {
      if (!editor || inFlight.current || !processedIds.current) return;

      const newIds: TLShapeId[] = [];
      for (const id of editor.getCurrentPageShapeIds()) {
        if (processed.has(id)) continue;
        const shape = editor.store.get(id);
        if (
          !shape ||
          !isShape(shape) ||
          shape.type === "image" ||
          shape.type === "note"
        )
          continue;
        const b = editor.getShapePageBounds(id);
        if (!b || b.maxX - b.minX < MIN_SIZE || b.maxY - b.minY < MIN_SIZE)
          continue;
        if (shape.type === "text" && !shapeText(shape).trim()) continue;
        newIds.push(id);
      }
      if (newIds.length === 0) return;

      inFlight.current = true;
      setProcessing(true);
      try {
        let hasBounds = false;
        for (const id of newIds) {
          if (editor.getShapePageBounds(id)) {
            hasBounds = true;
            break;
          }
        }
        if (!hasBounds) return;
        const anchorShapeId = newIds[newIds.length - 1];
        const suggest = (data: PopupSuggestion["data"]) =>
          suggestRef.current({
            id: `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
            anchorShapeId,
            data,
          });

        const remaining: TLShapeId[] = [];

        // FAST PATH (local, no API)
        for (const id of newIds) {
          const shape = editor.store.get(id);
          if (!shape || !isShape(shape) || shape.type !== "text") {
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

    const unsub = editor.store.listen(schedule, { scope: "document", source: "user" });
    return () => {
      unsub();
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [editor, enabled]);

  return { processing };
}
