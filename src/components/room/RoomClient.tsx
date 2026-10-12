"use client";

import "tldraw/tldraw.css";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSync } from "@tldraw/sync";
import type { Editor, TLAssetStore } from "tldraw";
import { ArrowLeft, FlaskConical, MessageSquare, Sparkles, Video } from "lucide-react";
import LabPanel, { type BoardEditor } from "./LabPanel";
import ChatPanel from "./ChatPanel";
import AIPanel from "./AIPanel";
import VideoPanel from "./VideoPanel";
import { subjectColor, subjectLabel } from "@/lib/utils";

const Tldraw = dynamic(async () => (await import("tldraw")).Tldraw, {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-slate-400">Doska yuklanmoqda…</div>,
});

export interface RoomInfo { id: string; name: string; subject: string; boardId: string; }
export interface RoomUser { id: string; name: string; avatarColor: string; }

type Tab = "labs" | "chat" | "video" | "ai";
const TABS: { id: Tab; label: string; icon: typeof FlaskConical }[] = [
  { id: "labs", label: "Lab", icon: FlaskConical },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "video", label: "Video", icon: Video },
  { id: "ai", label: "AI", icon: Sparkles },
];

export default function RoomClient({ room, user, syncUrl }: { room: RoomInfo; user: RoomUser; syncUrl: string }) {
  const [tab, setTab] = useState<Tab>("labs");
  const [editor, setEditor] = useState<Editor | null>(null);

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

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-black/30 px-4">
        <Link href="/dashboard" className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-slate-200" title="Orqaga">
          <ArrowLeft size={17} />
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: subjectColor(room.subject) }} />
          <span className="truncate font-medium text-slate-100">{room.name}</span>
          <span className="hidden shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-slate-400 sm:inline">
            {subjectLabel(room.subject)}
          </span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2 text-[11px] text-slate-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          real-time
          <span className="ml-1 hidden md:inline">· {user.name}</span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <Tldraw store={store} onMount={(e) => setEditor(e)} />
        </div>

        <aside className="flex w-[380px] shrink-0 flex-col border-l border-white/10 bg-black/20">
          <div className="flex shrink-0 gap-1 border-b border-white/10 p-2">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition ${
                    active ? "bg-indigo-500/25 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  }`}
                >
                  <Icon size={13} />
                  {t.label}
                </button>
              );
            })}
          </div>
          <div className="min-h-0 flex-1 overflow-hidden p-3">
            <div className={tab === "labs" ? "h-full" : "hidden"}>
              <LabPanel editor={editor as unknown as BoardEditor | null} roomId={room.id} />
            </div>
            <div className={tab === "chat" ? "h-full" : "hidden"}>
              <ChatPanel roomId={room.id} user={user} />
            </div>
            <div className={tab === "video" ? "h-full" : "hidden"}>
              <VideoPanel roomId={room.id} userName={user.name} />
            </div>
            <div className={tab === "ai" ? "h-full" : "hidden"}>
              <AIPanel roomName={room.name} subject={subjectLabel(room.subject)} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
