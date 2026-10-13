"use client";

import "tldraw/tldraw.css";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSync } from "@tldraw/sync";
import type { Editor, TLAssetStore } from "tldraw";
import { ArrowLeft, Copy, MessageSquare, Sparkles, Users, Video, X, FlaskConical } from "lucide-react";
import LabPanel, { type BoardEditor } from "./LabPanel";
import ChatPanel from "./ChatPanel";
import AIPanel from "./AIPanel";
import VideoPanel from "./VideoPanel";
import { PresenceAvatars, PresenceList } from "./Presence";
import LaTeXDialog from "./LaTeXDialog";
import { subjectColor, subjectLabel } from "@/lib/utils";
import { LAB_MODULES } from "@/lib/labs/registry";

const Tldraw = dynamic(async () => (await import("tldraw")).Tldraw, {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-slate-400">Dosha yuklanmoqda…</div>,
});

export interface RoomInfo { id: string; name: string; subject: string; boardId: string; }
export interface RoomUser { id: string; name: string; avatarColor: string; }

type SidePanel = "lab" | "ai" | "people";

export default function RoomClient({ room, user, syncUrl }: { room: RoomInfo; user: RoomUser; syncUrl: string }) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [labPopover, setLabPopover] = useState(false);
  const [labModule, setLabModule] = useState<string | undefined>(undefined);
  const [sidePanel, setSidePanel] = useState<SidePanel | null>("lab");
  const [chatOpen, setChatOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [latexOpen, setLatexOpen] = useState(false);
  const [invited, setInvited] = useState(false);
  const inviteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const openSide = (panel: SidePanel) => setSidePanel(sidePanel === panel ? null : panel);

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
          <button
            onClick={() => openSide("people")}
            className={`rounded-lg p-2 ${sidePanel === "people" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-100"}`}
            title="Ishtirokchilar"
          >
            <Users size={17} />
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <Tldraw store={store} onMount={(e) => setEditor(e)} />
        </div>

        <div className="absolute left-3 top-28 z-[600] flex gap-2">
          <button
            onClick={() => { setLabPopover(v => !v); setSidePanel(null); }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <FlaskConical size={14} />
            Laboratoriya
          </button>
          <button
            onClick={() => { setLatexOpen(true); setSidePanel(null); }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Σ LaTeX
          </button>
          {labPopover && (
            <div className="absolute left-0 top-12 z-[590] w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
              {LAB_MODULES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setLabModule(m.id); setSidePanel("lab"); setLabPopover(false); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                >
                  <span>{m.icon}</span>
                  {m.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {sidePanel && (
          <div className={`absolute bottom-16 right-3 top-3 z-[550] flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ${sidePanel === "people" ? "w-72" : "w-[400px]"}`}>
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-2">
              <span className="text-sm font-medium text-slate-800">
                {sidePanel === "lab" ? "Laboratoriya" : sidePanel === "ai" ? "AI yordamchi" : "Ishtirokchilar"}
              </span>
              <button
                onClick={() => setSidePanel(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={15} />
              </button>
            </div>
            <div className="min-h-0 flex-1 p-3">
              {sidePanel === "lab" && (
                <LabPanel editor={editor as unknown as BoardEditor | null} roomId={room.id} initialModuleId={labModule} />
              )}
              {sidePanel === "ai" && <AIPanel roomName={room.name} subject={subjectLabel(room.subject)} />}
              {sidePanel === "people" && (
                <div className="flex h-full flex-col gap-3">
                  <div className="min-h-0 flex-1">
                    <PresenceList editor={editor} self={{ name: user.name, color: user.avatarColor }} />
                  </div>
                  <button
                    onClick={copyInvite}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700"
                  >
                    <Copy size={13} />
                    {invited ? "Nusxalandi ✓" : "Taklif qilish"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {videoOpen && (
          <div className="absolute bottom-3 left-3 z-[600] flex h-[300px] w-[420px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-2">
              <span className="text-sm font-medium text-slate-800">Video dars</span>
              <button
                onClick={() => setVideoOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={15} />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <VideoPanel roomId={room.id} userName={user.name} />
            </div>
          </div>
        )}

        {chatOpen && (
          <div className="absolute bottom-20 right-4 z-[590] flex h-[480px] w-[360px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-2">
              <span className="text-sm font-medium text-slate-800">Chat</span>
              <button
                onClick={() => setChatOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={15} />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <ChatPanel roomId={room.id} user={user} />
            </div>
          </div>
        )}

        <div className="absolute bottom-4 right-4 z-[600] flex gap-2">
          <button
            onClick={() => { setChatOpen(v => !v); setSidePanel(null); setVideoOpen(false); }}
            className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-md ${chatOpen ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:bg-slate-50"}`}
            title="Chat"
          >
            <MessageSquare size={18} />
          </button>
          <button
            onClick={() => { setVideoOpen(v => !v); setChatOpen(false); setSidePanel(null); }}
            className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-md ${videoOpen ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:bg-slate-50"}`}
            title="Video"
          >
            <Video size={18} />
          </button>
          <button
            onClick={() => { openSide("ai"); setChatOpen(false); setVideoOpen(false); }}
            className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-md ${sidePanel === "ai" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:bg-slate-50"}`}
            title="AI yordamchi"
          >
            <Sparkles size={18} />
          </button>
        </div>
      </div>

      <LaTeXDialog editor={editor as unknown as BoardEditor | null} open={latexOpen} onClose={() => setLatexOpen(false)} />
    </div>
  );
}
