"use client";

import { useState } from "react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const CHIPS = ["Tushuntir: mavzuni soddaroq qilib", "Misol keltir", "5 ta test savoli tuz"];

export default function AIPanel({ roomName, subject }: { roomName: string; subject: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    setInput("");
    setError(null);
    setWarning(null);
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setStreaming(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          context: `Xona: ${roomName}, fan: ${subject}`,
        }),
      });
      if (res.status === 501) {
        setWarning("AI sozlanmagan — .env.local faylida AI_API_KEY, AI_MODEL ni to'ldiring.");
        return;
      }
      if (!res.ok) {
        setError(`Xatolik: ${res.status} ${res.statusText}`);
        return;
      }
      if (!res.body) {
        const plain = await res.text();
        setMessages((prev) => [...prev, { role: "assistant", content: plain }]);
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buffer = "";
      let acc = "";

      const handleLine = (raw: string) => {
        const t = raw.trim();
        if (!t) return;
        if (t.startsWith("data:")) {
          const payload = t.slice(5).trim();
          if (payload === "[DONE]") return;
          try {
            const json = JSON.parse(payload);
            const delta = json?.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta) acc += delta;
          } catch {
            acc += payload;
          }
        } else {
          acc += raw + "\n";
        }
      };

      const apply = () => {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += dec.decode(value, { stream: true });
        let idx = buffer.indexOf("\n");
        while (idx !== -1) {
          handleLine(buffer.slice(0, idx));
          buffer = buffer.slice(idx + 1);
          idx = buffer.indexOf("\n");
        }
        apply();
      }
      handleLine(buffer);
      apply();
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI bilan bog'lanishda xatolik");
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <h2 className="text-sm font-semibold text-slate-100">AI yordamchisi</h2>
        <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] text-cyan-300">{subject}</span>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-1">
        {messages.length === 0 && (
          <div className="mt-4 text-center text-xs text-slate-500">
            Savol yozing — dars materiali bo'yicha yordam oling
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-xl p-2 text-sm whitespace-pre-wrap ${
              m.role === "user"
                ? "ml-4 bg-indigo-500/15 text-slate-100"
                : "card text-slate-200"
            }`}
          >
            {m.content || (m.role === "assistant" ? "…" : "")}
          </div>
        ))}
      </div>
      {warning && (
        <div className="card border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          {warning}
        </div>
      )}
      {error && (
        <div className="card border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {CHIPS.map((c) => (
          <button
            key={c}
            onClick={() => setInput(c)}
            className="rounded-md border border-slate-600/40 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10"
          >
            {c}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex gap-1.5"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Savol yozing…"
          className="input w-full px-2.5 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="btn-primary rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          Yuborish
        </button>
      </form>
    </div>
  );
}
