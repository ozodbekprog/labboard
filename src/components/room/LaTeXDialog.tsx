"use client";

import { useEffect, useRef, useState } from "react";
import type { BoardEditor } from "./LabPanel";

let mathJaxLoader: Promise<void> | null = null;

function loadMathJax(): Promise<void> {
  if (!mathJaxLoader) {
    mathJaxLoader = new Promise<void>((resolve, reject) => {
      const w = window as unknown as { MathJax?: { tex2svg?: (s: string) => Element } };
      if (w.MathJax?.tex2svg) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg-full.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("MathJax yuklanmadi"));
      document.head.appendChild(script);
    });
  }
  return mathJaxLoader;
}

export default function LaTeXDialog({
  editor,
  open,
  onClose,
}: {
  editor: BoardEditor | null;
  open: boolean;
  onClose: () => void;
}) {
  const [latex, setLatex] = useState("E = mc^2");
  const [svgOuterHtml, setSvgOuterHtml] = useState("");
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const renderPreview = (value: string) => {
    loadMathJax()
      .then(() => {
        const w = window as unknown as { MathJax?: { tex2svg?: (s: string) => Element } };
        if (!w.MathJax?.tex2svg) return;
        const outer = w.MathJax.tex2svg(value).outerHTML;
        setSvgOuterHtml(outer);
        if (previewRef.current) previewRef.current.innerHTML = outer;
      })
      .catch(() => setError("MathJax yuklanmadi"));
  };

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => renderPreview(latex), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [latex, open]);

  if (!open) return null;

  const insert = async () => {
    if (!editor) {
      setError("Doska ulanmagan");
      return;
    }
    const svgEl = previewRef.current?.querySelector("svg");
    if (!svgEl) {
      setError("Formula hali tayyor emas");
      return;
    }
    try {
      const rect = svgEl.getBoundingClientRect();
      const scale = 3;
      const w = Math.max(1, Math.round((rect.width || 200) * scale));
      const h = Math.max(1, Math.round((rect.height || 60) * scale));
      const clone = svgEl.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("width", String(w));
      clone.setAttribute("height", String(h));
      const svgString = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Rasm yuklanmadi"));
        img.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas xatosi");
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("PNG yaratilmadi");
      const file = new File([blob], "formula.png", { type: "image/png" });
      await editor.putExternalContent({ type: "files", files: [file] });
      onClose();
    } catch {
      setError("Doskaga qo'shishda xato");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-900/30"
      onClick={onClose}
    >
      <div
        className="w-[440px] rounded-xl border border-slate-200 bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-medium text-slate-800">LaTeX formula</h3>
        <textarea
          value={latex}
          onChange={(e) => setLatex(e.target.value)}
          placeholder="\frac{a}{b} + \sqrt{x}"
          className="input mt-2 w-full h-24 font-mono text-sm p-2"
          spellCheck={false}
        />
        <div
          ref={previewRef}
          className="mt-3 min-h-[80px] rounded-lg border border-slate-200 bg-slate-50 p-3 text-center text-slate-900"
        />
        {error && <div className="mt-2 text-xs text-rose-600">{error}</div>}
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Bekor qilish
          </button>
          <button
            onClick={() => void insert()}
            disabled={!editor || !latex.trim()}
            className="btn-primary rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Doskaga qo'shish
          </button>
        </div>
      </div>
    </div>
  );
}
