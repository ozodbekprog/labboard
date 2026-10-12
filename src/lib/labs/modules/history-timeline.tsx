"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Cat = "civ" | "sci" | "war" | "cul" | "tec";

const CATS: Record<Cat, { label: string; color: string }> = {
  civ: { label: "Sivilizatsiya", color: "#f59e0b" },
  sci: { label: "Ilm-fan", color: "#22d3ee" },
  war: { label: "Urush", color: "#f43f5e" },
  cul: { label: "Madaniyat", color: "#a78bfa" },
  tec: { label: "Texnologiya", color: "#10b981" },
};

// yil | sarlavha | izoh | kategoriya
const EVENTS: [number, string, string, Cat][] = [
  [-3200, "Yozuv ixtirosi (Sumer)", "Kulolchilik usulidagi mixxat yozuvi — tarix boshlanishi", "civ"],
  [-2600, "Giza piramidalari", "Misrda Xufu piramidasi quriladi", "civ"],
  [-1750, "Hammurabi qonunlari", "Birinchi yozma qonunlar to'plami", "civ"],
  [-1200, "Troy urushi", "Minoy va axey sivilizatsiyalari to'qnashuvi", "war"],
  [-776, "Birinchi Olimpiya", "Yunonistonda Olimpiya o'yinlari boshlanadi", "cul"],
  [-550, "Ahamoniylar davlati", "Kir II Fors imperiyasini tuzadi", "civ"],
  [-331, "Gaugamela jangi", "Iskandar Zulqarnayn Forsni egallaydi", "war"],
  [-221, "Xitoy birlashadi", "Qin Shi Huang birinchi imperiyani tuzadi", "civ"],
  [-130, "Ipak yo'li", "Xitoy va O'rta Osiyodan Yevropaga savdo yo'li ochiladi", "tec"],
  [-45, "Yuliy Tsezar", "Rim respublikasi imperiyaga aylanadi", "war"],
  [105, "Qog'oz ixtirosi", "Xitoyda Tsai Lun qog'oz ishlab chiqarishni takomillashtiradi", "tec"],
  [476, "G'arbiy Rim quladi", "Antik davr tugaydi, o'rta asrlar boshlanadi", "civ"],
  [622, "Hijra", "Islom dini davlatining shakllanishi — Madina", "civ"],
  [800, "Karoling uyg'onishi", "Buyuk Karl imperiyasi Yevropada ta'limni tiklaydi", "cul"],
  [1000, "Ipak yo'lining gullashi", "Somoniylar, Xorazm — ilm va savdo markazlari", "civ"],
  [1025, "Ibn Sino (Avitsenna)", "«Tib qonunlari» — tibbiyot entsiklopediyasi", "sci"],
  [1206, "Chingizxon", "Mo'g'ul imperiyasi tuziladi", "war"],
  [1258, "Bag'dod quladi", "Abbosiylar xalifaligi tugaydi", "war"],
  [1370, "Amir Temur", "Temuriylar davlati — O'rta Osiyo markazi", "civ"],
  [1440, "Gutenberg bosma stanogi", "Kitob chop etish boshlanadi", "tec"],
  [1450, "Ulug'bek rasadxonasi", "Samarqandda yulduzlar jadvali tuziladi", "sci"],
  [1492, "Amerika ochiladi", "Kolumb ekspeditsiyasi", "civ"],
  [1517, "Reformatsiya", "Lyuter 95 tezisini e'lon qiladi", "cul"],
  [1543, "Kopernik tizimi", "Quyosh markazli olam modeli", "sci"],
  [1687, "Nyuton qonunlari", "«Naturalis Principia Mathematica»", "sci"],
  [1776, "AQSH mustaqilligi", "Birinchi zamonaviy demokratik davlat", "civ"],
  [1789, "Fransuz inqilobi", "Ozodlik, tenglik, birodarlik", "civ"],
  [1825, "Birinchi temiryo'l", "Stokton—Darlington, Buyuk Britaniya", "tec"],
  [1859, "Darvin nazariyasi", "«Turlarning kelib chiqishi»", "sci"],
  [1876, "Telefon", "Aleksandr Bell ixtirosi", "tec"],
  [1895, "Rentgen nurlari", "Vilgelm Rentgen tibbiyotni o'zgartiradi", "sci"],
  [1903, "Aeroplan", "Rayt aka-ukalar birinchi parvoz", "tec"],
  [1914, "Birinchi jahon urushi", "Butun dunyo qamrovli urush", "war"],
  [1928, "Penitsillin", "Aleksandr Fleming antibiotikni kashf etadi", "sci"],
  [1945, "BMT tuziladi", "Ikkinchi jahon urushidan keyin tinchlik instituti", "civ"],
  [1957, "Sputnik", "Kosmos davri boshlanadi", "tec"],
  [1961, "Gagarin koinotda", "Birinchi odam kosmosda", "sci"],
  [1969, "Oyga qadam", "Apollon 11 — Armstrong", "sci"],
  [1983, "Internet (TCP/IP)", "ARPANET yangi protokolga o'tadi", "tec"],
  [1991, "O'zbekiston mustaqilligi", "31-avgust — yangi davlat tug'iladi", "civ"],
  [2007, "iPhone", "Smartfon davri boshlanadi", "tec"],
  [2020, "COVID-19 pandemiyasi", "Dunyo onlayn ta'limga o'tadi", "sci"],
];

export default function HistoryTimeline() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ center: 0, scale: 0.04 }); // px / yil
  const [selected, setSelected] = useState<number | null>(18);
  const [filter, setFilter] = useState<Cat | "all">("all");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const dragRef = useRef<{ x: number; center: number } | null>(null);

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
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const { center, scale } = view;
    const toPx = (year: number) => w / 2 + (year - center) * scale;
    const axisY = h / 2 + 20;

    ctx.fillStyle = "#0a0f1c";
    ctx.fillRect(0, 0, w, h);

    // o'q
    ctx.strokeStyle = "rgba(148,163,184,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, axisY);
    ctx.lineTo(w, axisY);
    ctx.stroke();

    // belgilash (avtomatik daraja)
    const rawStep = 110 / scale;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const stepCand = [1, 2, 5, 10].map((m) => m * mag);
    const step = stepCand.find((s) => s >= rawStep) ?? stepCand[3];
    const x0 = center - w / 2 / scale;
    const x1 = center + w / 2 / scale;
    ctx.font = "10px var(--font-geist-mono), monospace";
    for (let year = Math.ceil(x0 / step) * step; year <= x1; year += step) {
      const px = toPx(year);
      ctx.strokeStyle = "rgba(148,163,184,0.25)";
      ctx.beginPath();
      ctx.moveTo(px, axisY - 5);
      ctx.lineTo(px, axisY + 5);
      ctx.stroke();
      ctx.fillStyle = "rgba(148,163,184,0.8)";
      const label = year < 0 ? `${Math.abs(year)} m.a.` : `${year}`;
      ctx.fillText(label, px - ctx.measureText(label).width / 2, axisY + 18);
    }

    // voqealar
    const visible = EVENTS.map((e, i) => ({ e, i })).filter(
      ({ e }) => e[0] >= x0 - 200 && e[0] <= x1 + 200 && (filter === "all" || e[3] === filter),
    );
    visible.forEach(({ e, i }, k) => {
      const [year, title, , cat] = e;
      const px = toPx(year);
      const above = k % 2 === 0;
      const y = above ? axisY - 40 - (k % 4) * 14 : axisY + 40 + (k % 4) * 14;
      const color = CATS[cat].color;
      const isActive = selected === i || hoverIdx === i;

      ctx.strokeStyle = color + (isActive ? "ff" : "66");
      ctx.lineWidth = isActive ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(px, axisY);
      ctx.lineTo(px, y + (above ? 10 : -10));
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, axisY, isActive ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fill();

      if (scale > 0.006 || isActive) {
        ctx.fillStyle = isActive ? "#f1f5f9" : "rgba(226,232,240,0.85)";
        ctx.font = `${isActive ? "bold " : ""}10px var(--font-geist-sans), sans-serif`;
        const tw = ctx.measureText(title).width;
        const tx = Math.min(Math.max(px - tw / 2, 4), w - tw - 4);
        ctx.fillText(title, tx, y + (above ? 0 : 4));
        ctx.fillStyle = "rgba(148,163,184,0.7)";
        ctx.font = "9px var(--font-geist-mono), monospace";
        const yl = year < 0 ? `${Math.abs(year)} m.a.` : `${year}-yil`;
        const yw = ctx.measureText(yl).width;
        ctx.fillText(yl, Math.min(Math.max(px - yw / 2, 4), w - yw - 4), y + (above ? 12 : 16));
      }
    });

    // markaziy yil
    ctx.fillStyle = "rgba(99,102,241,0.9)";
    const cy = Math.round(center);
    const cl = cy < 0 ? `${Math.abs(cy)} m.a.` : `${cy}-yil`;
    ctx.font = "11px var(--font-geist-mono), monospace";
    ctx.fillText(cl, w / 2 - ctx.measureText(cl).width / 2, axisY - 10);
  }, [view, selected, filter, hoverIdx]);

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
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left - rect.width / 2;
    const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
    setView((v) => {
      const ns = Math.min(2, Math.max(0.0015, v.scale * factor));
      const k = v.scale / ns;
      return { center: v.center + (mx * (1 - k)) / v.scale, scale: ns };
    });
  };

  const onMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (dragRef.current) {
      const dx = e.clientX - dragRef.current.x;
      setView((v) => ({ ...v, center: dragRef.current!.center - dx / v.scale }));
      return;
    }
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const axisY = h / 2 + 20;
    let best: number | null = null;
    let bestD = 2200;
    if (Math.abs(my - axisY) < 110) {
      EVENTS.forEach((ev, i) => {
        const px = w / 2 + (ev[0] - view.center) * view.scale;
        const d = Math.abs(px - mx) + Math.abs(my - axisY);
        if (d < bestD && d < 60) {
          bestD = d;
          best = i;
        }
      });
    }
    setHoverIdx(best);
  };

  const onClick = () => {
    if (hoverIdx !== null) setSelected(hoverIdx);
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1 px-1">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-md px-1.5 py-0.5 text-[10px] ${filter === "all" ? "bg-white/15 text-white" : "text-slate-400 hover:bg-white/10"}`}
        >
          Barchasi
        </button>
        {(Object.keys(CATS) as Cat[]).map((c) => (
          <button
            key={c}
            onClick={() => setFilter(filter === c ? "all" : c)}
            className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] ${filter === c ? "bg-white/15 text-white" : "text-slate-400 hover:bg-white/10"}`}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: CATS[c].color }} />
            {CATS[c].label}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-slate-500">g&apos;ildirak — zoom · tortish — surish · nuqtaga bosing</span>
      </div>

      <div ref={wrapRef} className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-700/40">
        <canvas
          ref={canvasRef}
          className="block cursor-grab"
          onWheel={onWheel}
          onMouseDown={(e) => (dragRef.current = { x: e.clientX, center: view.center })}
          onMouseUp={() => (dragRef.current = null)}
          onMouseMove={onMove}
          onMouseLeave={() => {
            dragRef.current = null;
            setHoverIdx(null);
          }}
          onClick={onClick}
        />
      </div>

      {selected !== null && (
        <div className="rounded-xl border border-slate-700/40 px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: CATS[EVENTS[selected][3]].color }} />
            <span className="font-semibold text-slate-100">{EVENTS[selected][1]}</span>
            <span className="font-mono text-[10px] text-slate-400">
              {EVENTS[selected][0] < 0 ? `${Math.abs(EVENTS[selected][0])} m.a.` : `${EVENTS[selected][0]}-yil`}
            </span>
            <span className="ml-auto text-[10px] text-slate-500">{CATS[EVENTS[selected][3]].label}</span>
          </div>
          <div className="mt-1 text-slate-400">{EVENTS[selected][2]}</div>
        </div>
      )}
    </div>
  );
}
