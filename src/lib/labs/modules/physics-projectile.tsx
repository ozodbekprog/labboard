"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PLANETS = [
  { id: "earth", label: "Yer", g: 9.81 },
  { id: "moon", label: "Oy", g: 1.62 },
  { id: "mars", label: "Mars", g: 3.71 },
  { id: "jupiter", label: "Yupiter", g: 24.79 },
] as const;

type Trail = { pts: { x: number; y: number }[]; color: string };

export default function PhysicsProjectile() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [v0, setV0] = useState(25);
  const [angle, setAngle] = useState(45);
  const [planet, setPlanet] = useState<(typeof PLANETS)[number]["id"]>("earth");
  const [drag, setDrag] = useState(0);
  const [running, setRunning] = useState(false);
  const [readout, setReadout] = useState({ t: 0, x: 0, y: 0, vy: 0, maxH: 0 });

  const stateRef = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    t: 0,
    maxH: 0,
    trail: [] as { x: number; y: number }[],
    ghosts: [] as Trail[],
    bounds: { maxX: 60, maxY: 25 },
    animId: 0,
    last: 0,
  });

  const g = PLANETS.find((p) => p.id === planet)?.g ?? 9.81;

  const launch = useCallback(() => {
    const st = stateRef.current;
    if (st.trail.length > 10) st.ghosts = [...st.ghosts.slice(-3), { pts: st.trail, color: "#94a3b8" }];
    const rad = (angle * Math.PI) / 180;
    st.x = 0;
    st.y = 0;
    st.vx = v0 * Math.cos(rad);
    st.vy = v0 * Math.sin(rad);
    st.t = 0;
    st.maxH = 0;
    st.trail = [{ x: 0, y: 0 }];
    st.last = performance.now();
    setRunning(true);
  }, [angle, v0]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d")!;
    let stop = false;

    const render = (now: number) => {
      if (stop) return;
      const st = stateRef.current;
      const dpr = window.devicePixelRatio || 1;
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (canvas.width !== w * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
      }

      const dtReal = Math.min(0.05, (now - st.last) / 1000);
      st.last = now;

      if (running) {
        const steps = 4;
        const dt = (dtReal / steps) * 2.2; // vaqt tezligi 2.2x
        for (let i = 0; i < steps; i++) {
          const speed = Math.hypot(st.vx, st.vy);
          const ax = -drag * st.vx * speed;
          const ay = -g - drag * st.vy * speed;
          st.vx += ax * dt;
          st.vy += ay * dt;
          st.x += st.vx * dt;
          st.y += st.vy * dt;
          st.t += dt;
          st.maxH = Math.max(st.maxH, st.y);
        }
        st.trail.push({ x: st.x, y: st.y });
        if (st.y <= 0 && st.t > 0.05) {
          st.y = 0;
          setRunning(false);
        }
        setReadout({ t: st.t, x: st.x, y: st.y, vy: st.vy, maxH: st.maxH });
      }

      // dunyo chegaralari (avtomatik moslash)
      const maxX = Math.max(30, st.x * 1.15, st.trail.reduce((m, p) => Math.max(m, p.x), 0) * 1.15);
      const maxY = Math.max(15, st.maxH * 1.35);
      st.bounds = { maxX, maxY };

      const marginL = 46;
      const marginB = 34;
      const marginT = 16;
      const marginR = 16;
      const plotW = w - marginL - marginR;
      const plotH = h - marginT - marginB;
      const sx = (x: number) => marginL + (x / maxX) * plotW;
      const sy = (y: number) => h - marginB - (y / maxY) * plotH;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#0a0f1c";
      ctx.fillRect(0, 0, w, h);

      // grid + masshtab
      const stepX = niceStep(maxX, 8);
      const stepY = niceStep(maxY, 5);
      ctx.strokeStyle = "rgba(148,163,184,0.1)";
      ctx.fillStyle = "rgba(148,163,184,0.6)";
      ctx.font = "10px var(--font-geist-mono), monospace";
      ctx.beginPath();
      for (let x = stepX; x <= maxX; x += stepX) {
        ctx.moveTo(sx(x), marginT);
        ctx.lineTo(sx(x), h - marginB);
        ctx.fillText(String(Math.round(x)) + "m", sx(x) - 8, h - marginB + 14);
      }
      for (let y = stepY; y <= maxY; y += stepY) {
        ctx.moveTo(marginL, sy(y));
        ctx.lineTo(w - marginR, sy(y));
        ctx.fillText(String(Math.round(y)) + "m", 6, sy(y) + 3);
      }
      ctx.stroke();

      // yer chizig'i
      ctx.strokeStyle = "rgba(148,163,184,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(marginL, sy(0));
      ctx.lineTo(w - marginR, sy(0));
      ctx.stroke();

      // eski izlar (ghost)
      for (const gh of st.ghosts) {
        ctx.strokeStyle = "rgba(148,163,184,0.22)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        gh.pts.forEach((p, i) => (i === 0 ? ctx.moveTo(sx(p.x), sy(p.y)) : ctx.lineTo(sx(p.x), sy(p.y))));
        ctx.stroke();
      }

      // joriy iz
      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 2;
      ctx.beginPath();
      st.trail.forEach((p, i) => (i === 0 ? ctx.moveTo(sx(p.x), sy(p.y)) : ctx.lineTo(sx(p.x), sy(p.y))));
      ctx.stroke();

      // cho'qqi belgisi
      if (st.maxH > 0) {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "rgba(245,158,11,0.5)";
        ctx.beginPath();
        ctx.moveTo(marginL, sy(st.maxH));
        ctx.lineTo(w - marginR, sy(st.maxH));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#f59e0b";
        ctx.fillText(`h max = ${st.maxH.toFixed(1)} m`, marginL + 6, sy(st.maxH) - 4);
      }

      // snaryad
      ctx.fillStyle = "#f43f5e";
      ctx.beginPath();
      ctx.arc(sx(st.x), sy(st.y), 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(244,63,94,0.35)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx(st.x), sy(st.y), 11, 0, Math.PI * 2);
      ctx.stroke();

      // uchirish moslamasi
      ctx.save();
      ctx.translate(marginL, sy(0));
      ctx.rotate((-angle * Math.PI) / 180);
      ctx.fillStyle = "#6366f1";
      ctx.fillRect(0, -3, 26, 6);
      ctx.restore();

      st.animId = requestAnimationFrame(render);
    };

    stateRef.current.animId = requestAnimationFrame(render);
    return () => {
      stop = true;
      cancelAnimationFrame(stateRef.current.animId);
    };
  }, [running, drag, g, angle]);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-1 text-[11px] text-slate-300">
        <Slider label={`v₀ = ${v0} m/s`} min={5} max={80} value={v0} onChange={setV0} />
        <Slider label={`burchak = ${angle}°`} min={5} max={85} value={angle} onChange={setAngle} />
        <Slider label={`havo qarshiligi k = ${drag.toFixed(3)}`} min={0} max={0.05} step={0.001} value={drag} onChange={setDrag} />
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Sayyora:</span>
          <select
            value={planet}
            onChange={(e) => setPlanet(e.target.value as typeof planet)}
            className="input px-2 py-1 text-xs"
          >
            {PLANETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} (g={p.g})
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <button onClick={launch} className="btn-primary rounded-lg px-3 py-1.5 text-xs font-medium text-white">
            {running ? "Qayta uchirish" : "Uchirish"}
          </button>
          {running && (
            <button
              onClick={() => setRunning(false)}
              className="rounded-lg border border-slate-600/50 px-3 py-1.5 text-xs hover:bg-white/10"
            >
              Pauza
            </button>
          )}
          <div className="ml-auto flex gap-3 font-mono text-[10px] text-slate-400">
            <span>t = {readout.t.toFixed(2)} s</span>
            <span>x = {readout.x.toFixed(1)} m</span>
            <span>y = {readout.y.toFixed(1)} m</span>
            <span>h max = {readout.maxH.toFixed(1)} m</span>
          </div>
        </div>
      </div>
      <div ref={wrapRef} className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-700/40">
        <canvas ref={canvasRef} className="block" />
      </div>
    </div>
  );
}

function Slider(props: {
  label: string;
  min: number;
  max: number;
  value: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-slate-400">{props.label}</span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        onChange={(e) => props.onChange(parseFloat(e.target.value))}
        className="accent-indigo-500"
      />
    </label>
  );
}

function niceStep(max: number, target: number): number {
  const raw = max / target;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / pow;
  const nice = m <= 1.5 ? 1 : m <= 3.5 ? 2 : m <= 7.5 ? 5 : 10;
  return nice * pow;
}
