"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { compileExpression } from "../expr";

type Series = { expr: string; color: string; fn: ((x: number) => number) | null; error: string | null };

const COLORS = ["#6366f1", "#22d3ee", "#f59e0b"];
const PRESETS = ["sin(x)", "x^2 - 3", "1/x", "e^(-x^2)", "sqrt(abs(x))", "x^3 - 3x + 1"];

export default function MathGrapher() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [inputs, setInputs] = useState(["sin(x)", ""]);
  const [showDeriv, setShowDeriv] = useState(false);
  const [view, setView] = useState({ cx: 0, cy: 0, scale: 40 }); // scale: px per unit
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const series: Series[] = useMemo(
    () =>
      inputs.map((expr, i) => {
        if (!expr.trim()) return { expr, color: COLORS[i], fn: null, error: null };
        try {
          return { expr, color: COLORS[i], fn: compileExpression(expr), error: null };
        } catch (e) {
          return { expr, color: COLORS[i], fn: null, error: e instanceof Error ? e.message : "xato" };
        }
      }),
    [inputs],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const { cx, cy, scale } = view;
    const toPx = (x: number) => w / 2 + (x - cx) * scale;
    const toPy = (y: number) => h / 2 - (y - cy) * scale;

    // fon
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    // grid
    const step = niceStep(scale);
    ctx.strokeStyle = "rgba(15,23,42,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = Math.ceil((cx - w / 2 / scale) / step) * step; x <= cx + w / 2 / scale; x += step) {
      const px = toPx(x);
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
    }
    for (let y = Math.ceil((cy - h / 2 / scale) / step) * step; y <= cy + h / 2 / scale; y += step) {
      const py = toPy(y);
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
    }
    ctx.stroke();

    // o'qlar
    ctx.strokeStyle = "rgba(15,23,42,0.45)";
    ctx.beginPath();
    ctx.moveTo(0, toPy(0));
    ctx.lineTo(w, toPy(0));
    ctx.moveTo(toPx(0), 0);
    ctx.lineTo(toPx(0), h);
    ctx.stroke();

    // belgilar
    ctx.fillStyle = "#64748b";
    ctx.font = "10px var(--font-geist-mono), monospace";
    for (let x = Math.ceil((cx - w / 2 / scale) / step) * step; x <= cx + w / 2 / scale; x += step) {
      if (Math.abs(x) < step / 2) continue;
      ctx.fillText(formatTick(x), toPx(x) + 3, Math.min(Math.max(toPy(0) + 12, 12), h - 4));
    }
    for (let y = Math.ceil((cy - h / 2 / scale) / step) * step; y <= cy + h / 2 / scale; y += step) {
      if (Math.abs(y) < step / 2) continue;
      ctx.fillText(formatTick(y), Math.min(Math.max(toPx(0) + 4, 4), w - 30), toPy(y) - 3);
    }

    // grafiklar
    for (const s of series) {
      if (!s.fn) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      let started = false;
      let prevY: number | null = null;
      for (let px = 0; px <= w; px += 1) {
        const x = cx + (px - w / 2) / scale;
        const y = s.fn(x);
        if (!isFinite(y)) {
          started = false;
          prevY = null;
          continue;
        }
        const py = toPy(y);
        // juda katta sakrashlarda chiziq uziladi (asimptota)
        if (prevY !== null && Math.abs(py - prevY) > h * 3) started = false;
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else ctx.lineTo(px, py);
        prevY = py;
      }
      ctx.stroke();

      // hosila (birinchi funksiya uchun, sonli)
      if (showDeriv && s === series[0]) {
        const d = (x: number) => {
          const hh = 1e-4;
          return (s.fn!(x + hh) - s.fn!(x - hh)) / (2 * hh);
        };
        ctx.strokeStyle = s.color + "77";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        let st = false;
        for (let px = 0; px <= w; px += 1) {
          const x = cx + (px - w / 2) / scale;
          const y = d(x);
          if (!isFinite(y)) {
            st = false;
            continue;
          }
          const py = toPy(y);
          if (!st) {
            ctx.moveTo(px, py);
            st = true;
          } else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // hover kursor
    if (hover) {
      ctx.strokeStyle = "rgba(15,23,42,0.3)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(toPx(hover.x), 0);
      ctx.lineTo(toPx(hover.x), h);
      ctx.stroke();
      ctx.setLineDash([]);
      for (const s of series) {
        if (!s.fn) continue;
        const y = s.fn(hover.x);
        if (!isFinite(y)) continue;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(toPx(hover.x), toPy(y), 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [series, view, showDeriv, hover]);

  useEffect(() => {
    draw();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [draw]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left - rect.width / 2;
    const my = e.clientY - rect.top - rect.height / 2;
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setView((v) => {
      const ns = Math.min(400, Math.max(4, v.scale * factor));
      const k = v.scale / ns;
      return { cx: v.cx + (mx * (1 - k)) / v.scale, cy: v.cy + (my * (k - 1)) / v.scale, scale: ns };
    });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const wx = view.cx + (e.clientX - rect.left - rect.width / 2) / view.scale;
    setHover({ x: wx, y: 0 });
    if (dragRef.current) {
      const dx = e.clientX - dragRef.current.x;
      const dy = e.clientY - dragRef.current.y;
      dragRef.current = { x: e.clientX, y: e.clientY };
      setView((v) => ({ ...v, cx: v.cx - dx / v.scale, cy: v.cy + dy / v.scale }));
    }
  };
  const onMouseUp = () => (dragRef.current = null);
  const onLeave = () => {
    dragRef.current = null;
    setHover(null);
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-col gap-1.5 px-1">
        {inputs.map((expr, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[i] }} />
            <input
              value={expr}
              onChange={(e) => setInputs((p) => p.map((v, j) => (j === i ? e.target.value : v)))}
              placeholder={i === 0 ? "f(x) = sin(x)" : "bo'sh"}
              className="input w-full px-2 py-1 font-mono text-xs"
              spellCheck={false}
            />
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {PRESETS.slice(0, 4).map((p) => (
            <button
              key={p}
              onClick={() => setInputs((prev) => [p, prev[1]])}
              className="rounded-md border border-slate-200 px-1.5 py-0.5 font-mono text-slate-600 hover:bg-slate-100"
            >
              {p}
            </button>
          ))}
          <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-slate-600">
            <input type="checkbox" checked={showDeriv} onChange={(e) => setShowDeriv(e.target.checked)} />
            hosila f&apos;(x)
          </label>
          <button
            onClick={() => setView({ cx: 0, cy: 0, scale: 40 })}
            className="rounded-md border border-slate-200 px-1.5 py-0.5 text-slate-600 hover:bg-slate-100"
          >
            reset
          </button>
        </div>
        {series.map(
          (s, i) =>
            s.error && (
              <div key={i} className="text-[11px] text-rose-400">
                {s.expr}: {s.error}
              </div>
            ),
        )}
      </div>
      <div ref={wrapRef} className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <canvas
          ref={canvasRef}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onLeave}
          className="block cursor-crosshair"
        />
        {hover && (
          <div className="pointer-events-none absolute right-2 top-2 rounded-md border border-slate-200 bg-white/95 px-2 py-1 font-mono text-[10px] text-slate-700 shadow-sm">
            x = {hover.x.toFixed(3)}
            {series
              .filter((s) => s.fn)
              .map((s, i) => {
                const y = s.fn!(hover.x);
                return isFinite(y) ? (
                  <span key={i} style={{ color: s.color }}>
                    {"  "}y = {y.toFixed(3)}
                  </span>
                ) : null;
              })}
          </div>
        )}
      </div>
      <div className="px-1 text-[10px] text-slate-400">
        G&apos;ildirak — zoom · sichqonchani tortish — surish · yuqorida ifoda yozing (masalan: x^2, sin(x), 2x+1, ln(x))
      </div>
    </div>
  );
}

function niceStep(scale: number): number {
  const raw = 80 / scale;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / pow;
  const nice = m <= 1.5 ? 1 : m <= 3.5 ? 2 : m <= 7.5 ? 5 : 10;
  return nice * pow;
}

function formatTick(v: number): string {
  if (Math.abs(v) >= 10000 || (Math.abs(v) < 0.01 && v !== 0)) return v.toExponential(1);
  return String(Math.round(v * 1000) / 1000);
}
