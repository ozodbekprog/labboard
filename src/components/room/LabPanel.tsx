"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { LAB_MODULES, SUBJECT_LABEL_UZ } from "@/lib/labs/registry";

export interface BoardEditor {
  putExternalContent(info: { type: "files"; files: File[] }): Promise<void>;
}

export default function LabPanel({
  editor,
  roomId,
  initialModuleId,
}: {
  editor: BoardEditor | null;
  roomId: string;
  initialModuleId?: string;
}) {
  const [selectedId, setSelectedId] = useState(initialModuleId ?? LAB_MODULES[0].id);
  const [added, setAdded] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialModuleId) setSelectedId(initialModuleId);
  }, [initialModuleId]);

  const comps = useMemo(
    () =>
      Object.fromEntries(
        LAB_MODULES.map((m) => [
          m.id,
          dynamic(m.renderer, {
            ssr: false,
            loading: () => <div className="text-xs text-slate-500">Yuklanmoqda…</div>,
          }),
        ]),
      ),
    [],
  );

  const selected = LAB_MODULES.find((m) => m.id === selectedId) ?? LAB_MODULES[0];
  const Comp = comps[selectedId];

  const pinToBoard = async () => {
    if (!editor || !captureRef.current) return;
    const { default: html2canvas } = await import("html2canvas-pro");
    const canvas = await html2canvas(captureRef.current, { backgroundColor: "#ffffff", scale: 2 });
    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const file = new File([blob], "lab.png", { type: "image/png" });
        await editor.putExternalContent({ type: "files", files: [file] });
      },
      "image/png",
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex gap-1.5 overflow-x-auto px-1">
        {LAB_MODULES.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedId(m.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition ${
              m.id === selectedId
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>{m.icon}</span>
            <span className="whitespace-nowrap">{m.title}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 px-1">
        <h2 className="text-sm font-semibold text-slate-800">{selected.title}</h2>
        <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-400">
          {SUBJECT_LABEL_UZ[selected.subject]}
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <div ref={captureRef} className="h-full min-h-0">
          {Comp ? <Comp /> : null}
        </div>
      </div>
      <div className="flex items-center gap-2 px-1">
        <button
          onClick={() => void pinToBoard()}
          disabled={!editor}
          className="btn-primary rounded-lg px-3 py-2 text-xs text-white disabled:opacity-50"
        >
          📌 Doskaga qo'yish
        </button>
        {added && <span className="text-[10px] text-emerald-400">qo'shildi ✓</span>}
        <span className="ml-auto text-[10px] text-slate-400">Xona: {roomId}</span>
      </div>
    </div>
  );
}
