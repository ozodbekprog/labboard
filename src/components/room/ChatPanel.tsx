"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

const PALETTE = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

interface ChatUser {
  id: string;
  name: string;
}

interface ChatMessage {
  id: string;
  body: string;
  createdAt: string | number;
  user: ChatUser;
}

function colorFor(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return PALETTE[sum % PALETTE.length];
}

export default function ChatPanel({ roomId, user }: { roomId: string; user: { id: string; name: string } }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/messages?roomId=${encodeURIComponent(roomId)}`);
        if (!res.ok || !alive) return;
        const data = (await res.json()) as { messages?: ChatMessage[] };
        if (Array.isArray(data.messages)) setMessages(data.messages);
      } catch {
        // keyingi urinishda qayta yuklanadi
      }
    };
    void load();
    const t = setInterval(load, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [roomId]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setBody("");
    setSending(true);
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, body: text }),
      });
      const res = await fetch(`/api/messages?roomId=${encodeURIComponent(roomId)}`);
      if (res.ok) {
        const data = (await res.json()) as { messages?: ChatMessage[] };
        if (Array.isArray(data.messages)) setMessages(data.messages);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <h2 className="text-sm font-semibold text-slate-100">Chat</h2>
        <span className="ml-auto text-[10px] text-slate-500">{user.name}</span>
      </div>
      <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-1">
        {messages.length === 0 && (
          <div className="mt-4 text-center text-xs text-slate-500">Hozircha xabar yo'q — birinch bo'ling</div>
        )}
        {messages.map((m) => {
          const own = m.user.id === user.id;
          return (
            <div key={m.id} className={`flex gap-2 ${own ? "rounded-xl bg-indigo-500/10 p-2" : ""}`}>
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                style={{ background: colorFor(m.user.name) }}
              >
                {m.user.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium text-slate-300">{m.user.name}</span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(m.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="break-words text-sm text-slate-200">{m.body}</div>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={send} className="flex gap-1.5">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Xabar yozing…"
          className="input w-full px-2.5 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="btn-primary rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          Yuborish
        </button>
      </form>
    </div>
  );
}
