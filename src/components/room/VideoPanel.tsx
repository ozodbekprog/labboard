"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import "@livekit/components-styles";
import type { LiveKitRoomProps, VideoConferenceProps } from "@livekit/components-react";

const LiveKitRoom = dynamic<LiveKitRoomProps>(
  async () => (await import("@livekit/components-react")).LiveKitRoom,
  { ssr: false },
);
const VideoConference = dynamic<VideoConferenceProps>(
  async () => (await import("@livekit/components-react")).VideoConference,
  { ssr: false },
);

type Status = "idle" | "connecting" | "joined" | "error";

export default function VideoPanel({ roomId, userName }: { roomId: string; userName: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [token, setToken] = useState<string | undefined>(undefined);
  const [url, setUrl] = useState<string | undefined>(undefined);
  const [error, setError] = useState("");
  const [notConfigured, setNotConfigured] = useState(false);

  const join = async () => {
    setStatus("connecting");
    setError("");
    setNotConfigured(false);
    try {
      const res = await fetch(
        `/api/livekit/token?room=${encodeURIComponent(roomId)}&name=${encodeURIComponent(userName)}`,
      );
      if (res.status === 501) {
        setNotConfigured(true);
        setStatus("idle");
        return;
      }
      if (!res.ok) {
        setError(`Xatolik: ${res.status} ${res.statusText}`);
        setStatus("error");
        return;
      }
      const data = (await res.json()) as { token?: string; url?: string };
      if (!data.token || !data.url) {
        setError("Token yoki server manzili kelmadi.");
        setStatus("error");
        return;
      }
      setToken(data.token);
      setUrl(data.url);
      setStatus("joined");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ulanish xatosi");
      setStatus("error");
    }
  };

  const disconnect = () => {
    setStatus("idle");
    setToken(undefined);
    setUrl(undefined);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <h2 className="text-sm font-semibold text-slate-800">Video dars</h2>
        {status === "joined" && (
          <button
            onClick={disconnect}
            className="ml-auto rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
          >
            Ajratish
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1">
        {status === "idle" && !notConfigured && (
          <div className="flex h-full min-h-[420px] items-center justify-center">
            <button onClick={() => void join()} className="btn-primary rounded-xl px-4 py-2.5 text-sm text-white">
              🎥 Darsga qo'shilish
            </button>
          </div>
        )}
        {status === "connecting" && (
          <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-slate-500">
            Ulanmoqda…
          </div>
        )}
        {notConfigured && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Video xizmat sozlanmagan — .env.local da LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET to'ldiring.
          </div>
        )}
        {status === "error" && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-600">
            <p className="mb-2">{error}</p>
            <button onClick={() => void join()} className="btn-primary rounded-lg px-3 py-1.5 text-xs text-white">
              Qayta urinish
            </button>
          </div>
        )}
        {status === "joined" && (
          <div className="lk-theme-dark h-full min-h-[420px] overflow-hidden rounded-xl">
            <LiveKitRoom
              token={token}
              serverUrl={url}
              connect
              audio
              video
              style={{ height: "100%" }}
              data-lk-theme="default"
            >
              <VideoConference />
            </LiveKitRoom>
          </div>
        )}
      </div>
    </div>
  );
}
