"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Copy, Settings } from "lucide-react";
import Board from "@/components/board/Board";
import type { BoardApi } from "@/components/board/Board";
import { BoardStore } from "@/lib/board/store";
import type { PresenceUser } from "@/lib/board/types";
import BoardSync from "@/lib/board/sync";
import { PresenceAvatars } from "./Presence";
import AISettingsModal from "./AISettingsModal";
import ShapePopup from "./ShapePopup";
import { useAutoAI } from "./useAutoAI";
import type { PopupSuggestion } from "@/lib/ai/popup";
import { subjectColor, subjectLabel } from "@/lib/utils";

export interface RoomInfo { id: string; name: string; subject: string; boardId: string; }
export interface RoomUser { id: string; name: string; avatarColor: string; }

export default function RoomClient({ room, user, syncUrl }: { room: RoomInfo; user: RoomUser; syncUrl: string }) {
  const [store] = useState(() => new BoardStore());
  const apiRef = useRef<BoardApi | null>(null);
  const syncRef = useRef<BoardSync | null>(null);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [status, setStatus] = useState<"connecting" | "online" | "offline">("connecting");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoAiOn, setAutoAiOn] = useState(true);
  const [suggestions, setSuggestions] = useState<PopupSuggestion[]>([]);
  const [invited, setInvited] = useState(false);
  const inviteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCursor = useRef(0);

  const handleSuggest = useCallback((s: PopupSuggestion) => {
    setSuggestions((prev) => [...prev.filter((x) => x.anchorShapeId !== s.anchorShapeId).slice(-2), s]);
  }, []);

  const { processing: autoAiBusy } = useAutoAI({ store, apiRef, enabled: autoAiOn, onSuggest: handleSuggest });

  const handleCursor = useCallback((p: { x: number; y: number }) => {
    const now = Date.now();
    if (now - lastCursor.current < 40) return;
    lastCursor.current = now;
    syncRef.current?.sendCursor(p);
  }, []);

  useEffect(() => {
    return () => {
      if (inviteTimer.current) clearTimeout(inviteTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!syncUrl || !room.boardId) return;
    const sync = new BoardSync({
      url: syncUrl.replace(/^ws/, "ws"),
      roomId: room.boardId,
      name: user.name,
      color: user.avatarColor,
      store,
      onPresence: setPresence,
      onStatus: setStatus,
    });
    syncRef.current = sync;
    sync.connect();
    const unsub = store.subscribe(() => {});
    return () => {
      sync.destroy();
      unsub();
      syncRef.current = null;
    };
  }, [syncUrl, room.boardId, store, user.name, user.avatarColor]);

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
            {status === "online" && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
            {status === "connecting" && <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />}
            {status === "offline" && <span className="h-2 w-2 rounded-full bg-rose-500" />}
            real-time
          </span>
          <PresenceAvatars self={{ name: user.name, color: user.avatarColor }} users={presence} />
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
        <Board
          store={store}
          presence={presence}
          userName={user.name}
          onReady={(api) => { apiRef.current = api; }}
          onCursor={handleCursor}
        />

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
            api={apiRef.current}
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
