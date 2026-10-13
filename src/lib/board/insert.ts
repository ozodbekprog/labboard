import type { BoardApi } from "@/components/board/Board";
import { createShapeId } from "@/lib/board/store";
import type { Shape } from "@/lib/board/types";

export async function uploadFile(file: File): Promise<string | null> {
  try {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/assets", { method: "POST", body: fd });
    if (!res.ok) return null;
    const data = (await res.json()) as { src?: string };
    return typeof data.src === "string" ? data.src : null;
  } catch (err) {
    console.warn("[board/insert] upload failed", err);
    return null;
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("rasm yuklanmadi"));
    img.src = url;
  });
}

export async function imageDimensions(
  file: File,
): Promise<{ w: number; h: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    let w = img.naturalWidth || 520;
    let h = img.naturalHeight || 330;
    if (w > 520) {
      const scale = 520 / w;
      w = 520;
      h = h * scale;
    }
    return { w, h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function insertImageFromFile(
  api: BoardApi,
  file: File,
  anchorShapeId?: string | null,
): Promise<string | null> {
  try {
    const src = await uploadFile(file);
    if (!src) return null;
    const { w, h } = await imageDimensions(file);

    let x: number;
    let y: number;
    if (anchorShapeId) {
      const anchor = api.getShapeScreenRect(anchorShapeId);
      if (anchor) {
        const p = api.screenToPage({ x: anchor.x + anchor.w + 48, y: anchor.y });
        x = p.x;
        y = p.y;
      } else {
        const c = api.getViewportCenterPage();
        x = c.x - w / 2;
        y = c.y - h / 2;
      }
    } else {
      const c = api.getViewportCenterPage();
      x = c.x - w / 2;
      y = c.y - h / 2;
    }

    const id = createShapeId();
    api.addShape({ id, type: "image", x, y, w, h, src } as Shape);
    return id;
  } catch (err) {
    console.warn("[board/insert] insertImageFromFile failed", err);
    return null;
  }
}

export function insertNote(
  api: BoardApi,
  text: string,
  anchorShapeId?: string | null,
): string {
  const trimmed = text.slice(0, 300);
  const lines = trimmed.split("\n").length || 1;
  const w = Math.min(420, Math.max(120, trimmed.length * 7));
  const h = 24 * lines;

  let x: number;
  let y: number;
  const anchor = anchorShapeId ? api.getShapeScreenRect(anchorShapeId) : null;
  if (anchor) {
    const p = api.screenToPage({
      x: anchor.x + anchor.w + 48,
      y: anchor.y + anchor.h + 12,
    });
    x = p.x;
    y = p.y;
  } else {
    const c = api.getViewportCenterPage();
    x = c.x - w / 2;
    y = c.y - h / 2;
  }

  const id = createShapeId();
  api.addShape({
    id,
    type: "text",
    x,
    y,
    w,
    h,
    text: trimmed,
    fontSize: 14,
    color: "#0f172a",
  } as Shape);
  return id;
}
