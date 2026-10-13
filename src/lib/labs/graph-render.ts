import { compileExpression } from "./expr";

export async function renderGraphPNG(
  expression: string,
  opts?: { width?: number; height?: number },
): Promise<File | null> {
  const width = opts?.width && opts.width > 0 ? opts.width : 640;
  const height = opts?.height && opts.height > 0 ? opts.height : 400;

  let fn: (x: number) => number;
  try {
    fn = compileExpression(expression);
  } catch {
    return null;
  }

  // Auto window: sample x from -10..10 step 0.05
  const ys: number[] = [];
  for (let x = -10; x <= 10.0001; x += 0.05) {
    const y = fn(x);
    if (isFinite(y)) ys.push(y);
  }
  if (ys.length < 5) return null;

  let min = Infinity;
  let max = -Infinity;
  for (const y of ys) {
    if (y < min) min = y;
    if (y > max) max = y;
  }
  const range = max - min;
  let yMin: number;
  let yMax: number;
  if (!isFinite(range) || range > 1e3) {
    // juda katta cheksiz diapazon (masalan 1/x yaqinida): persentil yondashuvi
    const sorted = [...ys].sort((a, b) => a - b);
    const lo = sorted[Math.floor(0.02 * (sorted.length - 1))];
    const hi = sorted[Math.ceil(0.98 * (sorted.length - 1))];
    const pRange = hi - lo;
    const pad = pRange > 0 ? pRange * 0.2 : 1;
    yMin = lo - pad;
    yMax = hi + pad;
  } else {
    const pad = range > 0 ? range * 0.1 : 1;
    yMin = min - pad;
    yMax = max + pad;
  }
  if (!(yMax > yMin)) {
    yMin -= 1;
    yMax += 1;
  }

  const xMin = -10;
  const xMax = 10;

  const canvas = document.createElement("canvas");
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(2, 2);

  const toPx = (x: number) => ((x - xMin) / (xMax - xMin)) * width;
  const toPy = (y: number) => height - ((y - yMin) / (yMax - yMin)) * height;

  // fon
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // grid
  const gridStepX = niceStep(width / (xMax - xMin));
  const gridStepY = niceStep(height / (yMax - yMin));
  ctx.strokeStyle = "rgba(15,23,42,0.07)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = Math.ceil(xMin / gridStepX) * gridStepX; x <= xMax; x += gridStepX) {
    const px = toPx(x);
    ctx.moveTo(px, 0);
    ctx.lineTo(px, height);
  }
  for (let y = Math.ceil(yMin / gridStepY) * gridStepY; y <= yMax; y += gridStepY) {
    const py = toPy(y);
    ctx.moveTo(0, py);
    ctx.lineTo(width, py);
  }
  ctx.stroke();

  // o'qlar
  ctx.strokeStyle = "rgba(15,23,42,0.5)";
  ctx.beginPath();
  if (yMin <= 0 && yMax >= 0) {
    const py = toPy(0);
    ctx.moveTo(0, py);
    ctx.lineTo(width, py);
  }
  if (xMin <= 0 && xMax >= 0) {
    const px = toPx(0);
    ctx.moveTo(px, 0);
    ctx.lineTo(px, height);
  }
  ctx.stroke();

  // grafik
  ctx.strokeStyle = "#6366f1";
  ctx.lineWidth = 2;
  ctx.beginPath();
  let started = false;
  let prevY: number | null = null;
  let finiteCount = 0;
  for (let px = 0; px <= width; px += 1) {
    const x = xMin + (px / width) * (xMax - xMin);
    const y = fn(x);
    if (!isFinite(y)) {
      started = false;
      prevY = null;
      continue;
    }
    finiteCount++;
    const py = toPy(y);
    // juda katta sakrashlarda chiziq uziladi (asimptota)
    if (prevY !== null && Math.abs(py - prevY) > height * 3) started = false;
    if (!started) {
      ctx.moveTo(px, py);
      started = true;
    } else ctx.lineTo(px, py);
    prevY = py;
  }
  ctx.stroke();
  if (finiteCount < 5) return null;

  // belgilar: x va y ning min/max
  ctx.fillStyle = "#64748b";
  ctx.font = "10px monospace";
  const xMaxLabel = formatTick(xMax);
  const yMinLabel = formatTick(yMin);
  const yMaxLabel = formatTick(yMax);
  ctx.fillText(formatTick(xMin), 2, height - 4);
  ctx.fillText(xMaxLabel, width - ctx.measureText(xMaxLabel).width - 2, height - 4);
  ctx.fillText(yMinLabel, 2, height - 16);
  ctx.fillText(yMaxLabel, 2, 28);

  // ifoda yozuvi (chap yuqori burchak)
  ctx.fillStyle = "#334155";
  ctx.font = "12px monospace";
  ctx.fillText("y = " + expression, 4, 14);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return null;
  return new File([blob], "graph.png", { type: "image/png" });
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
