"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { BoardAnalysis } from "@/lib/ai/types";
import type { BoardEditor } from "./LabPanel";
import { renderGraphPNG } from "@/lib/labs/graph-render";
import MoleculeViewer from "./MoleculeViewer";

const KIND_LABELS: Record<string, string> = {
  formula: "Formula",
  equation: "Tenglama",
  graph: "Grafik",
  molecule: "Molekula",
  physics: "Fizika",
  text: "Matn",
  unknown: "Noma'lum",
};

interface BoardEditorText {
  putExternalContent(info: { type: "text"; text: string }): Promise<void>;
}

const PRIMARY =
  "rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50";
const SECONDARY =
  "rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50";

export default function BoardAIPanel({
  analysis,
  loading,
  error,
  editor,
  onClose,
  onOpenLab,
}: {
  analysis: BoardAnalysis | null;
  loading: boolean;
  error: string | null;
  editor: BoardEditor | null;
  onClose: () => void;
  onOpenLab: (moduleId: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const flash = (msg: string) => {
    setDone(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDone(null), 2500);
  };

  const drawGraph = async () => {
    if (!analysis?.expression) return;
    const expression = analysis.expression;
    setBusy("graph");
    setDone(null);
    setActionErr(null);
    try {
      const file = await renderGraphPNG(expression);
      if (file && editor) {
        await editor.putExternalContent({ type: "files", files: [file] });
        flash("Grafik doskaga qo'shildi ✓");
      } else {
        setActionErr("Grafik chizilmadi");
      }
    } catch {
      setActionErr("Grafik chizilmadi");
    } finally {
      setBusy(null);
    }
  };

  const solve = async () => {
    if (!analysis?.equation) return;
    const equation = analysis.equation;
    setBusy("solve");
    setDone(null);
    setActionErr(null);
    try {
      const res = await fetch("/api/math", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "solve", expression: equation }),
      });
      if (!res.ok) {
        setActionErr(`Yechilmadi: ${res.status} ${res.statusText}`);
        return;
      }
      const data = (await res.json()) as { roots?: unknown };
      const roots = Array.isArray(data?.roots) ? data.roots : [];
      if (roots.length > 0) {
        flash(`Yechimlar: ${roots.map((r) => `x = ${String(r)}`).join(", ")}`);
      } else {
        flash("Yechim topilmadi");
      }
    } catch {
      setActionErr("Yechilmadi");
    } finally {
      setBusy(null);
    }
  };

  const pasteSummary = async () => {
    if (!analysis || !editor) return;
    setBusy("summary");
    setDone(null);
    setActionErr(null);
    try {
      await (editor as unknown as BoardEditorText).putExternalContent({
        type: "text",
        text: `${analysis.title ?? ""}\n${analysis.description ?? ""}`,
      });
      flash("Yozildi ✓");
    } catch {
      setActionErr("Xulosa yozilmadi");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-700">AI tahlili</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Yopish"
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={14} />
        </button>
      </div>

      {loading && (
        <div className="animate-pulse text-xs text-slate-500">
          🤖 AI doskani o'qiyapti…
        </div>
      )}

      {error === "ai_not_configured" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
          AI sozlanmagan — .env.local faylida AI_API_KEY va AI_MODEL ni to'ldiring.
        </div>
      )}

      {error && error !== "ai_not_configured" && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      {analysis && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-500">
              {KIND_LABELS[analysis.kind ?? "unknown"] ?? KIND_LABELS.unknown}
            </span>
            <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-400">
              Isbonch: {Math.round((analysis.confidence ?? 0) * 100)}%
            </span>
          </div>

          {analysis.title ? (
            <h3 className="text-sm font-medium text-slate-900">{analysis.title}</h3>
          ) : null}
          {analysis.description ? (
            <p className="text-xs text-slate-600">{analysis.description}</p>
          ) : null}

          {analysis.latex ? (
            <div className="break-all rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-xs text-slate-700">
              {analysis.latex}
            </div>
          ) : null}

          {analysis.params
            ? Object.entries(analysis.params).map(([key, value]) => (
                <div key={key} className="font-mono text-xs text-slate-600">
                  {key} = {String(value)}
                </div>
              ))
            : null}

          <div className="flex flex-wrap gap-2">
            {analysis.expression ? (
              <button
                type="button"
                onClick={() => void drawGraph()}
                disabled={!editor || busy === "graph"}
                title={!editor ? "Doska yuklanmagan" : undefined}
                className={PRIMARY}
              >
                📈 Grafik chizish{busy === "graph" ? "…" : ""}
              </button>
            ) : null}
            {analysis.kind === "physics" ? (
              <button
                type="button"
                onClick={() => onOpenLab("physics-projectile")}
                disabled={!editor}
                title={!editor ? "Doska yuklanmagan" : undefined}
                className={PRIMARY}
              >
                🎯 Simulyatsiyani ochish
              </button>
            ) : null}
            {analysis.equation ? (
              <button
                type="button"
                onClick={() => void solve()}
                disabled={!editor || busy === "solve"}
                title={!editor ? "Doska yuklanmagan" : undefined}
                className={PRIMARY}
              >
                🧮 Yechish{busy === "solve" ? "…" : ""}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void pasteSummary()}
              disabled={!editor || busy === "summary"}
              title={!editor ? "Doska yuklanmagan" : undefined}
              className={SECONDARY}
            >
              📝 Xulosani doskaga{busy === "summary" ? "…" : ""}
            </button>
          </div>

          {analysis.kind === "molecule" || analysis.molecule ? (
            <div className="min-h-0">
              <MoleculeViewer
                molecule={analysis.molecule ?? analysis.title}
                editor={editor}
              />
            </div>
          ) : null}

          {done ? <p className="text-xs text-emerald-600">{done}</p> : null}
          {actionErr ? <p className="text-xs text-rose-600">{actionErr}</p> : null}
        </div>
      )}

      <p className="text-[10px] text-slate-400">
        AI xatolik qilishi mumkin — natijani tekshirib ko'ring.
      </p>
    </div>
  );
}
