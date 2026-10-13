import type { Shape } from "@/lib/board/types";

export interface ShapeToScreen {
  (px: number, py: number): { x: number; y: number };
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

function strokeWidth(w: number, zoom: number): number {
  return clamp(w * zoom, 1, 40);
}

function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  const t =
    len2 === 0 ? 0 : clamp(((px - x1) * dx + (py - y1) * dy) / len2, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

type BoxedShape = { h?: number };

function shapeH(shape: Shape): number {
  const h = (shape as unknown as BoxedShape).h;
  return typeof h === "number" && isFinite(h) ? h : shape.w;
}

export function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  toScreen: ShapeToScreen,
  zoom: number,
  images: Map<string, HTMLImageElement>,
): void {
  switch (shape.type) {
    case "draw": {
      const pts = shape.points;
      if (pts.length < 2) {
        const p = toScreen(shape.x, shape.y);
        ctx.save();
        ctx.fillStyle = shape.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, strokeWidth(shape.size, zoom) / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }
      ctx.save();
      ctx.strokeStyle = shape.color;
      ctx.lineWidth = strokeWidth(shape.size, zoom);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const first = toScreen(shape.x + pts[0], shape.y + pts[1]);
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < pts.length / 2 - 1; i++) {
        const a = toScreen(shape.x + pts[i * 2], shape.y + pts[i * 2 + 1]);
        const b = toScreen(
          shape.x + pts[i * 2 + 2],
          shape.y + pts[i * 2 + 3],
        );
        ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
      const last = toScreen(
        shape.x + pts[pts.length - 2],
        shape.y + pts[pts.length - 1],
      );
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
      ctx.restore();
      return;
    }
    case "rect":
    case "ellipse": {
      const hh = shapeH(shape);
      const a = toScreen(shape.x, shape.y);
      const b = toScreen(shape.x + shape.w, shape.y + hh);
      const x = Math.min(a.x, b.x);
      const y = Math.min(a.y, b.y);
      const w = Math.abs(b.x - a.x);
      const h = Math.abs(b.y - a.y);
      ctx.save();
      if (shape.fill) {
        ctx.fillStyle = shape.fill;
        ctx.beginPath();
        if (shape.type === "ellipse") {
          ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        } else {
          ctx.rect(x, y, w, h);
        }
        ctx.fill();
      }
      ctx.strokeStyle = shape.stroke;
      ctx.lineWidth = strokeWidth(shape.strokeW, zoom);
      ctx.beginPath();
      if (shape.type === "ellipse") {
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      } else {
        ctx.rect(x, y, w, h);
      }
      ctx.stroke();
      ctx.restore();
      return;
    }
    case "line":
    case "arrow": {
      const p0 = toScreen(shape.x, shape.y);
      const p1 = toScreen(shape.x + shape.x2, shape.y + shape.y2);
      ctx.save();
      ctx.strokeStyle = shape.stroke;
      ctx.lineWidth = strokeWidth(shape.strokeW, zoom);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
      if (shape.type === "arrow") {
        const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
        const headLen = clamp(10 * zoom, 4, 32);
        const headW = headLen * 0.45;
        const bx = p1.x - Math.cos(angle) * headLen;
        const by = p1.y - Math.sin(angle) * headLen;
        const ox = -Math.sin(angle) * headW;
        const oy = Math.cos(angle) * headW;
        ctx.fillStyle = shape.stroke;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(bx + ox, by + oy);
        ctx.lineTo(bx - ox, by - oy);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      return;
    }
    case "text": {
      const p = toScreen(shape.x, shape.y);
      const fs = shape.fontSize * zoom;
      ctx.save();
      ctx.font = `${fs}px sans-serif`;
      ctx.fillStyle = shape.color;
      ctx.textBaseline = "top";
      const lh = fs * 1.25;
      const lines = shape.text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], p.x, p.y + i * lh);
      }
      ctx.restore();
      return;
    }
    case "image": {
      const hh = shapeH(shape);
      const a = toScreen(shape.x, shape.y);
      const b = toScreen(shape.x + shape.w, shape.y + hh);
      const x = Math.min(a.x, b.x);
      const y = Math.min(a.y, b.y);
      const w = Math.abs(b.x - a.x);
      const h = Math.abs(b.y - a.y);
      const img = images.get(shape.src);
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, x, y, w, h);
      } else {
        ctx.save();
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("yuklanmoqda", x + w / 2, y + h / 2);
        ctx.restore();
      }
      return;
    }
  }
}

export function hitTest(
  shape: Shape,
  pageX: number,
  pageY: number,
  zoom: number,
): boolean {
  const pad = 6 / Math.max(zoom, 0.01);
  if (shape.type === "draw") {
    const pts = shape.points;
    const tol = shape.size / 2 + pad;
    if (pts.length < 2) {
      return Math.hypot(pageX - shape.x, pageY - shape.y) <= tol;
    }
    for (let i = 0; i < pts.length - 2; i += 2) {
      if (
        distToSegment(
          pageX,
          pageY,
          shape.x + pts[i],
          shape.y + pts[i + 1],
          shape.x + pts[i + 2],
          shape.y + pts[i + 3],
        ) <= tol
      ) {
        return true;
      }
    }
    return false;
  }
  const b = shapeBounds(shape);
  if (shape.type === "ellipse") {
    const rx = b.w / 2 + pad;
    const ry = b.h / 2 + pad;
    const nx = (pageX - (b.x + b.w / 2)) / (rx || 1);
    const ny = (pageY - (b.y + b.h / 2)) / (ry || 1);
    return nx * nx + ny * ny <= 1;
  }
  return (
    pageX >= b.x - pad &&
    pageX <= b.x + b.w + pad &&
    pageY >= b.y - pad &&
    pageY <= b.y + b.h + pad
  );
}

export function shapeBounds(shape: Shape): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  if (shape.type === "draw") {
    const pts = shape.points;
    let minX = 0;
    let minY = 0;
    let maxX = 0;
    let maxY = 0;
    if (pts.length >= 2) {
      minX = Infinity;
      minY = Infinity;
      maxX = -Infinity;
      maxY = -Infinity;
      for (let i = 0; i < pts.length; i += 2) {
        minX = Math.min(minX, pts[i]);
        minY = Math.min(minY, pts[i + 1]);
        maxX = Math.max(maxX, pts[i]);
        maxY = Math.max(maxY, pts[i + 1]);
      }
    }
    const pad = shape.size / 2;
    return {
      x: shape.x + minX - pad,
      y: shape.y + minY - pad,
      w: Math.max(1, maxX - minX + shape.size),
      h: Math.max(1, maxY - minY + shape.size),
    };
  }
  if (shape.type === "line" || shape.type === "arrow") {
    return {
      x: Math.min(shape.x, shape.x + shape.x2),
      y: Math.min(shape.y, shape.y + shape.y2),
      w: Math.max(1, Math.abs(shape.x2)),
      h: Math.max(1, Math.abs(shape.y2)),
    };
  }
  const hh = shapeH(shape);
  return {
    x: Math.min(shape.x, shape.x + shape.w),
    y: Math.min(shape.y, shape.y + hh),
    w: Math.max(1, Math.abs(shape.w)),
    h: Math.max(1, Math.abs(hh)),
  };
}
