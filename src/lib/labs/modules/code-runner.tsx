"use client";

import { useEffect, useRef, useState } from "react";

const STARTERS: Record<string, string> = {
  "Fibonachchi": `// n-chi Fibonachchi sonini hisoblang
let a = 0, b = 1;
const n = 10;
for (let i = 0; i < n; i++) {
  console.log(a);
  [a, b] = [b, a + b];
}`,
  "Tub sonlar": `// 2 dan 50 gacha tub sonlar
const isPrime = (n) => {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
};
for (let n = 2; n <= 50; n++) if (isPrime(n)) console.log(n);`,
  "Massiv": `// Massivni saralash va yig'indi
const sonlar = [42, 7, 19, 3, 88, 21];
console.log("saralangan:", [...sonlar].sort((a, b) => a - b));
console.log("yig'indi:", sonlar.reduce((s, x) => s + x, 0));
console.log("o'rtacha:", sonlar.reduce((s, x) => s + x, 0) / sonlar.length);`,
  "Faktorial": `// Rekursiya: faktorial
const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
for (let i = 1; i <= 8; i++) console.log(i + "! =", fact(i));`,
};

type LogLine = { kind: "log" | "error" | "info"; text: string };

export default function CodeRunner() {
  const [code, setCode] = useState(STARTERS["Fibonachchi"]);
  const [logs, setLogs] = useState<LogLine[]>([{ kind: "info", text: "▶ «Ishga tushirish» tugmasini bosing" }]);
  const [running, setRunning] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      const data = e.data as { type?: string; kind?: LogLine["kind"]; text?: string };
      if (data?.type === "labboard-console" && data.text !== undefined) {
        setLogs((prev) => [...prev.slice(-199), { kind: data.kind ?? "log", text: data.text! }]);
      } else if (data?.type === "labboard-done") {
        setRunning(false);
        setLogs((prev) => [...prev, { kind: "info", text: "✓ Tugadi" }]);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const run = () => {
    setLogs([]);
    setRunning(true);
    const doc = `<!doctype html><html><body><script>
      const fmt = (v) => {
        try { return typeof v === 'string' ? v : JSON.stringify(v, (k, x) => typeof x === 'function' ? '[function]' : x); }
        catch { return String(v); }
      };
      const send = (kind, text) => parent.postMessage({ type: 'labboard-console', kind, text }, '*');
      console.log = (...a) => send('log', a.map(fmt).join(' '));
      console.error = (...a) => send('error', a.map(fmt).join(' '));
      window.onerror = (m) => { send('error', 'Xato: ' + m); send('done'); };
      try {
        ${code}
      } catch (e) { send('error', 'Xato: ' + (e && e.message ? e.message : e)); }
      send('done');
    <\/script></body></html>`;
    if (iframeRef.current) {
      iframeRef.current.srcdoc = doc;
    }
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1 px-1">
        {Object.keys(STARTERS).map((k) => (
          <button
            key={k}
            onClick={() => setCode(STARTERS[k])}
            className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-slate-100"
          >
            {k}
          </button>
        ))}
        <button
          onClick={run}
          disabled={running}
          className="btn-primary ml-auto rounded-lg px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {running ? "Ishlayapti…" : "▶ Ishga tushirish"}
        </button>
      </div>

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        className="input h-40 resize-none p-2 font-mono text-xs leading-relaxed"
      />

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-2 font-mono text-[11px]">
        {logs.length === 0 && <div className="text-slate-500">Natija…</div>}
        {logs.map((l, i) => (
          <div
            key={i}
            className={l.kind === "error" ? "text-rose-600" : l.kind === "info" ? "text-slate-500" : "text-emerald-700"}
          >
            {l.kind === "log" ? "› " : ""}
            {l.text}
          </div>
        ))}
      </div>

      <iframe ref={iframeRef} sandbox="allow-scripts" className="hidden" title="code-sandbox" />
      <div className="px-1 text-[10px] text-slate-400">
        JavaScript sandbox (iframes izolyatsiyasi). Tez orada: Python (Pyodide), C++ va SQL runnerlari.
      </div>
    </div>
  );
}
