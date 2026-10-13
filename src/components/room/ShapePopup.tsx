"use client";

import { useEffect, useState } from "react";
import { useValue } from "tldraw";
import type { Editor, TLShapeId } from "tldraw";
import { renderGraphPNG } from "@/lib/labs/graph-render";
import {
  insertImageShapeNextTo,
  insertNoteNextTo,
  renderMoleculePNG,
} from "@/lib/labs/auto-ai";
import type { Bounds } from "@/lib/labs/auto-ai";
import type { PopupSuggestion } from "@/lib/ai/popup";
import MoleculeViewer from "./MoleculeViewer";

const PIN_BUTTON =
  "rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-slate-700";

export default function ShapePopup({
  editor,
  suggestion,
  onClose,
}: {
  editor: Editor | null;
  suggestion: PopupSuggestion;
  onClose: () => void;
}) {
  const camera = useValue(
    "cam",
    () => {
      if (!editor) return null;
      void editor.getViewportScreenBounds();
      return editor.getCamera();
    },
    [editor],
  );

  if (!editor || !camera) return null;

  const bounds = editor.getShapePageBounds(
    suggestion.anchorShapeId as TLShapeId,
  );
  if (!bounds) return null;

  const viewport = editor.getViewportScreenBounds();
  const screenPos = editor.pageToScreen({
    x: bounds.maxX + 16,
    y: bounds.minY + 8,
  });
  const left = Math.max(8, Math.min(screenPos.x, viewport.width - 300));
  const top = Math.max(20, Math.min(screenPos.y, viewport.height - 260));

  const data = suggestion.data;
  const sourceBounds: Bounds = {
    minX: bounds.minX,
    minY: bounds.minY,
    maxX: bounds.maxX,
    maxY: bounds.maxY,
  };

  return (
    <div
      className="absolute z-[650] w-[280px]"
      style={{ left, top }}
    >
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl text-slate-800">
        <div className="flex items-start justify-between gap-2">
          <div className="text-xs font-medium">{data.title}</div>
          <button
            type="button"
            aria-label="Yopish"
            onClick={onClose}
            className="text-xs leading-none text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
        <PopupBody
          editor={editor}
          suggestion={suggestion}
          sourceBounds={sourceBounds}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

function PopupBody({
  editor,
  suggestion,
  sourceBounds,
  onClose,
}: {
  editor: Editor;
  suggestion: PopupSuggestion;
  sourceBounds: Bounds;
  onClose: () => void;
}) {
  const data = suggestion.data;
  const kind = data.expression ? "graph" : data.kind;

  if (kind === "answer") {
    return (
      <>
        <div className="mt-1 text-2xl font-semibold text-emerald-600">
          = {data.answer}
        </div>
        {data.description ? (
          <div className="text-[11px] text-slate-500">{data.description}</div>
        ) : null}
      </>
    );
  }

  if (kind === "graph") {
    return (
      <GraphBody
        expression={data.expression ?? ""}
        editor={editor}
        sourceBounds={sourceBounds}
        onClose={onClose}
      />
    );
  }

  if (kind === "equation") {
    return (
      <EquationBody
        equation={data.equation ?? ""}
        editor={editor}
        sourceBounds={sourceBounds}
        onClose={onClose}
      />
    );
  }

  if (kind === "molecule") {
    return (
      <MoleculeBody
        molecule={data.molecule ?? data.title}
        editor={editor}
        sourceBounds={sourceBounds}
        onClose={onClose}
      />
    );
  }

  if (kind === "physics") {
    const params = data.params ?? {};
    const text = `🎯 ${data.title}: ${Object.entries(params)
      .map(([k, v]) => `${k} = ${v}`)
      .join(", ")}`;
    return (
      <PinNoteBody
        editor={editor}
        sourceBounds={sourceBounds}
        onClose={onClose}
        text={text}
        rows={Object.entries(params).map(([k, v]) => (
          <div key={k} className="font-mono text-xs">
            {k} = {v}
          </div>
        ))}
      />
    );
  }

  return data.description ? (
    <div className="text-xs text-slate-600">{data.description}</div>
  ) : null;
}

function PinFeedback({ pinned }: { pinned: boolean }) {
  return pinned ? (
    <span className="text-[11px] text-emerald-600">qo&apos;shildi ✓</span>
  ) : null;
}

function GraphBody({
  expression,
  editor,
  sourceBounds,
  onClose,
}: {
  expression: string;
  editor: Editor;
  sourceBounds: Bounds;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;
    (async () => {
      try {
        const f = await renderGraphPNG(expression, {
          width: 520,
          height: 330,
        });
        if (!alive) return;
        if (f) {
          objectUrl = URL.createObjectURL(f);
          setFile(f);
          setUrl(objectUrl);
        } else {
          setFile(null);
          setUrl(null);
        }
      } catch (err) {
        console.warn("[ShapePopup] renderGraphPNG failed", err);
        if (alive) {
          setFile(null);
          setUrl(null);
        }
      }
    })();
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [expression]);

  return (
    <>
      {url ? (
        <img
          src={url}
          alt={expression}
          className="mt-2 w-full rounded-lg border border-slate-200"
        />
      ) : null}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          className={PIN_BUTTON}
          disabled={pinned || !file}
          onClick={async () => {
            if (!file) return;
            try {
              await insertImageShapeNextTo(editor, file, sourceBounds, {
                gap: 48,
              });
              setPinned(true);
              setTimeout(onClose, 800);
            } catch (err) {
              console.warn("[ShapePopup] pin graph failed", err);
            }
          }}
        >
          📌 Doskaga qo&apos;yish
        </button>
        <PinFeedback pinned={pinned} />
      </div>
    </>
  );
}

function EquationBody({
  equation,
  editor,
  sourceBounds,
  onClose,
}: {
  equation: string;
  editor: Editor;
  sourceBounds: Bounds;
  onClose: () => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/math", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ op: "solve", expression: equation }),
        });
        if (!res.ok) throw new Error(`math api failed: ${res.status}`);
        const json = (await res.json()) as { roots?: number[] };
        if (!alive) return;
        const roots = json.roots ?? [];
        setText(
          roots.length > 0
            ? roots.map((r) => `x = ${r}`).join(", ")
            : "Yechim topilmadi",
        );
      } catch (err) {
        console.warn("[ShapePopup] solve failed", err);
        if (alive) setText("Yechim topilmadi");
      }
    })();
    return () => {
      alive = false;
    };
  }, [equation]);

  return (
    <>
      <div className="mt-1 font-mono text-sm">{text ?? "…"}</div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          className={PIN_BUTTON}
          disabled={pinned || !text}
          onClick={async () => {
            if (!text) return;
            try {
              await insertNoteNextTo(editor, `🧮 ${text}`, sourceBounds);
              setPinned(true);
              setTimeout(onClose, 800);
            } catch (err) {
              console.warn("[ShapePopup] pin equation failed", err);
            }
          }}
        >
          📌 Yozib qo&apos;yish
        </button>
        <PinFeedback pinned={pinned} />
      </div>
    </>
  );
}

function MoleculeBody({
  molecule,
  editor,
  sourceBounds,
  onClose,
}: {
  molecule: string;
  editor: Editor;
  sourceBounds: Bounds;
  onClose: () => void;
}) {
  const [pinFile, setPinFile] = useState<File | null>(null);
  const [pinned, setPinned] = useState(false);

  return (
    <>
      <div className="mt-2 h-[240px] overflow-hidden rounded-lg">
        <MoleculeViewer molecule={molecule} editor={null} />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          className={PIN_BUTTON}
          disabled={pinned}
          onClick={async () => {
            try {
              let f = pinFile;
              if (!f) {
                f = await renderMoleculePNG(molecule);
                if (f) setPinFile(f);
              }
              if (!f) return;
              await insertImageShapeNextTo(editor, f, sourceBounds, {
                gap: 48,
              });
              setPinned(true);
              setTimeout(onClose, 800);
            } catch (err) {
              console.warn("[ShapePopup] pin molecule failed", err);
            }
          }}
        >
          📌 Doskaga qo&apos;yish
        </button>
        <PinFeedback pinned={pinned} />
      </div>
    </>
  );
}

function PinNoteBody({
  editor,
  sourceBounds,
  onClose,
  text,
  rows,
}: {
  editor: Editor;
  sourceBounds: Bounds;
  onClose: () => void;
  text: string;
  rows: React.ReactNode[];
}) {
  const [pinned, setPinned] = useState(false);

  return (
    <>
      <div className="mt-1 space-y-0.5">{rows}</div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          className={PIN_BUTTON}
          disabled={pinned}
          onClick={async () => {
            try {
              await insertNoteNextTo(editor, text, sourceBounds);
              setPinned(true);
              setTimeout(onClose, 800);
            } catch (err) {
              console.warn("[ShapePopup] pin note failed", err);
            }
          }}
        >
          📌 Yozib qo&apos;yish
        </button>
        <PinFeedback pinned={pinned} />
      </div>
    </>
  );
}
