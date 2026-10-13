"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type AiSource = "user" | "env" | null;

type AiStatus = {
  source: AiSource;
  hasKey: boolean;
  baseUrl: string;
  model: string;
  visionModel: string;
};

export default function AISettingsModal({
  open,
  onClose,
  autoAiOn,
  onAutoAiChange,
}: {
  open: boolean;
  onClose: () => void;
  autoAiOn: boolean;
  onAutoAiChange: (v: boolean) => void;
}) {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [baseUrl, setBaseUrl] = useState("https://zenmux.ai/api/v1");
  const [key, setKey] = useState("");
  const [model, setModel] = useState("");
  const [visionModel, setVisionModel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/ai");
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {
        source?: string;
        hasKey?: boolean;
        baseUrl?: string;
        model?: string;
        visionModel?: string;
      };
      const source: AiSource =
        data.source === "user" || data.source === "env" ? data.source : null;
      const next: AiStatus = {
        source,
        hasKey: Boolean(data.hasKey),
        baseUrl: data.baseUrl ?? "",
        model: data.model ?? "",
        visionModel: data.visionModel ?? "",
      };
      setStatus(next);
      setBaseUrl(next.baseUrl || "https://zenmux.ai/api/v1");
      setModel(next.model);
      setVisionModel(next.visionModel);
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setKey("");
    void refresh();
  }, [open, refresh]);

  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    },
    [],
  );

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 2500);
  };

  const save = async () => {
    setError(null);
    if (!key.trim() || !model.trim()) {
      setError("Kalit va modelni kiriting");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ baseUrl, key, model, visionModel }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Saqlashda xato");
      }
      showFeedback("Saqlandi ✓");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saqlashda xato");
    } finally {
      setSaving(false);
    }
  };

  const clearKey = async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: "" }),
      });
      if (!res.ok) throw new Error();
      showFeedback("Tozalandi ✓");
      setKey("");
      await refresh();
    } catch {
      setError("Tozalashda xato");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-900/30"
      onClick={onClose}
    >
      <div
        className="w-[460px] rounded-xl border border-slate-200 bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-800">
            ⚙️ AI sozlamalari
          </h3>
          <button
            onClick={onClose}
            aria-label="Yopish"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M3 3l8 8M11 3l-8 8" />
            </svg>
          </button>
        </div>

        {status?.source === "user" && (
          <div className="mt-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700">
            ✅ Shaxsiy kalit saqlangan
          </div>
        )}
        {status?.source === "env" && (
          <div className="mt-2 text-xs text-slate-500">
            ℹ️ Hozir markaziy (env) kalit ishlatilmoqda
          </div>
        )}
        {status !== null && status.source === null && (
          <div className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
            ⚠️ AI kaliti sozlanmagan
          </div>
        )}

        <div className="mt-3">
          <label className="text-xs text-slate-600">API Base URL</label>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://zenmux.ai/api/v1"
            className="input mt-1 w-full px-2.5 py-2 text-xs"
            spellCheck={false}
          />
        </div>
        <div className="mt-2.5">
          <label className="text-xs text-slate-600">API kalit</label>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-..."
            className="input mt-1 w-full px-2.5 py-2 text-xs"
            autoComplete="off"
          />
          {status?.hasKey && (
            <div className="mt-1 text-[10px] text-slate-400">
              Kalit saqlangan — almashtirish uchun yangisini kiriting
            </div>
          )}
        </div>
        <div className="mt-2.5">
          <label className="text-xs text-slate-600">Model</label>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="anthropic/claude-haiku-5.5"
            className="input mt-1 w-full px-2.5 py-2 text-xs"
            spellCheck={false}
          />
        </div>
        <div className="mt-2.5">
          <label className="text-xs text-slate-600">Vision model (ixtiyoriy)</label>
          <input
            value={visionModel}
            onChange={(e) => setVisionModel(e.target.value)}
            placeholder="bo'sh bo'lsa Model ishlatiladi"
            className="input mt-1 w-full px-2.5 py-2 text-xs"
            spellCheck={false}
          />
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={autoAiOn}
            onChange={(e) => onAutoAiChange(e.target.checked)}
            className="h-3.5 w-3.5 accent-slate-900"
          />
          🤖 Avto-AI (yozuvni o'zi o'qib, javobni yonida ko'rsatadi)
        </label>

        {error && <div className="mt-2 text-xs text-rose-600">{error}</div>}
        {feedback && (
          <div className="mt-2 text-xs text-emerald-600">{feedback}</div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => void clearKey()}
            disabled={saving}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Tozalash
          </button>
          <button
            onClick={() => void save()}
            disabled={saving}
            className="btn-primary rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Saqlash
          </button>
        </div>

        <p className="mt-3 text-[10px] text-slate-400">
          Kalit faqat sizning akkauntingizga bog'lanib serverda saqlanadi
          (boshqalarga ko'rinmaydi).
        </p>
      </div>
    </div>
  );
}
