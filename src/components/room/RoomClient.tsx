"use client";

import "tldraw/tldraw.css";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSync } from "@tldraw/sync";
import type { Editor, TLAssetStore } from "tldraw";
import { ArrowLeft, Copy, Settings } from "lucide-react";
import { PresenceAvatars } from "./Presence";
import AISettingsModal from "./AISettingsModal";
import ShapePopup from "./ShapePopup";
import { useAutoAI } from "./useAutoAI";
import type { PopupSuggestion } from "@/lib/ai/popup";
import { subjectColor, subjectLabel } from "@/lib/utils";

const Tldraw = dynamic(async () => (await import("tldraw")).Tldraw, {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-slate-400">Dosha yuklanmoqda…</div>,
});

export interface RoomInfo { id: string; name: string; subject: string; boardId: string; }
export interface RoomUser { id: string; name: string; avatarColor: string; }

export default function RoomClient({ room, user, syncUrl }: { room: RoomInfo; user: RoomUser; syncUrl: string }) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoAiOn, setAutoAiOn] = useState(true);
  const [suggestions, setSuggestions] = useState<PopupSuggestion[]>([]);
  const [invited, setInvited] = useState(false);
  const inviteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSuggest = useCallback((s: PopupSuggestion) => {
    setSuggestions((prev) => [...prev.filter((x) => x.anchorShapeId !== s.anchorShapeId).slice(-2), s]);
  }, []);

  const { processing: autoAiBusy } = useAutoAI(editor, autoAiOn, handleSuggest);

  useEffect(() => {
    return () => {
      if (inviteTimer.current) clearTimeout(inviteTimer.current);
    };
  }, []);

  const assets = useMemo<TLAssetStore>(() => ({
    upload: async (asset, file) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/assets", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Fayl yuklanmadi");
      const data = (await res.json()) as { src: string };
      return { src: data.src };
    },
    resolve: (asset) => (asset.props as { src?: string }).src ?? null,
  }), []);

  const store = useSync({
    uri: `${syncUrl}/connect/${encodeURIComponent(room.boardId)}`,
    assets,
  });

  const copyInvite = async () => {
    const link = window.location.origin + "/room/" + room.id;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = link;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
    setInvited(true);
    if (inviteTimer.current) clearTimeout(inviteTimer.current);
    inviteTimer.current = setTimeout(() => setInvited(false), 2000);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f7f8fa]">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3">
        <Link
          href="/dashboard"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          title="Orqaga"
        >
          <ArrowLeft size={17} />
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: subjectColor(room.subject) }} />
          <span className="truncate font-medium text-slate-900">{room.name}</span>
          <span className="hidden shrink-0 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-500 sm:inline">
            {subjectLabel(room.subject)}
          </span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {autoAiBusy && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              AI o&apos;qiyapti…
            </span>
          )}
          <span className="hidden items-center gap-1.5 text-[11px] text-slate-400 sm:flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            real-time
          </span>
          <PresenceAvatars editor={editor} self={{ name: user.name, color: user.avatarColor }} />
          <button
            onClick={copyInvite}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
          >
            <Copy size={13} />
            {invited ? "Nusxalandi ✓" : "Taklif qilish"}
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <Tldraw store={store} onMount={(e) => setEditor(e)} />
        </div>

        <button
          onClick={() => setSettingsOpen(true)}
          title="AI sozlamalari"
          aria-label="AI sozlamalari"
          className="absolute right-3 top-28 z-[600] flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
        >
          <Settings size={18} />
        </button>

        {suggestions.map((s) => (
          <ShapePopup
            key={s.id}
            editor={editor}
            suggestion={s}
            onClose={() => setSuggestions((p) => p.filter((x) => x.id !== s.id))}
          />
        ))}
      </div>

      <AISettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        autoAiOn={autoAiOn}
        onAutoAiChange={setAutoAiOn}
      />
    </div>
  );
}
