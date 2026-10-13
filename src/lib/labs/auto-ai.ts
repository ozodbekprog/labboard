import type { Editor } from "tldraw";
import {
  AssetRecordType,
  createShapeId,
  toRichText,
} from "tldraw";
import * as THREE from "three";
import { ELEMENT_COLORS, getMolecule } from "@/lib/molecules";
import { compileExpression } from "./expr";

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const ATOM_RADII: Record<string, number> = {
  H: 0.28,
  C: 0.45,
  O: 0.42,
  N: 0.42,
  S: 0.55,
  Cl: 0.5,
  Na: 0.55,
};

const EXPRESSION_CHARS = /^[0-9xX+\-*/^%(). a-z]+$/;
const PREFIX_RE = /^\s*(?:y\s*\(\s*x\s*\)\s*=|y\s*=|f\s*\(\s*x\s*\)\s*=)\s*/i;

export function looksLikeFunction(text: string): string | null {
  try {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 3);
    for (const line of lines) {
      const candidate = line.replace(PREFIX_RE, "").trim();
      if (!candidate || !/[xX]/.test(candidate)) continue;
      if (!EXPRESSION_CHARS.test(candidate)) continue;
      try {
        compileExpression(candidate);
        return candidate;
      } catch {
        // try next line
      }
    }
    return null;
  } catch (err) {
    console.warn("[auto-ai] looksLikeFunction failed", err);
    return null;
  }
}

export async function renderMoleculePNG(
  molecule: string,
  opts?: { width?: number; height?: number },
): Promise<File | null> {
  try {
    const data = getMolecule(molecule);
    if (!data) return null;

    const width = opts?.width ?? 640;
    const height = opts?.height ?? 480;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#ffffff");

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(2, 3, 4);
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(-2, 1, -3);
    scene.add(fill);

    const centroid = new THREE.Vector3();
    data.atoms.forEach((a) => centroid.add(new THREE.Vector3(a.x, a.y, a.z)));
    centroid.divideScalar(data.atoms.length || 1);

    const positions = data.atoms.map(
      (a) => new THREE.Vector3(a.x, a.y, a.z).sub(centroid),
    );

    positions.forEach((pos, i) => {
      const element = data.atoms[i].element;
      const radius = ATOM_RADII[element] ?? 0.4;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 32, 32),
        new THREE.MeshStandardMaterial({
          color: ELEMENT_COLORS[element] ?? "#64748b",
          roughness: 0.35,
          metalness: 0.05,
        }),
      );
      mesh.position.copy(pos);
      scene.add(mesh);
    });

    const bondColor = new THREE.Color("#94a3b8");
    data.bonds.forEach((bond) => {
      const a = positions[bond.a];
      const b = positions[bond.b];
      if (!a || !b) return;

      const start = a.clone();
      const end = b.clone();
      const dirVec = end.clone().sub(start);
      const length = dirVec.length();
      if (length === 0) return;
      dirVec.normalize();

      const mid = start.clone().add(end).multiplyScalar(0.5);

      const perp =
        Math.abs(dirVec.y) < 0.9
          ? new THREE.Vector3(0, 1, 0).cross(dirVec).normalize()
          : new THREE.Vector3(1, 0, 0).cross(dirVec).normalize();

      const n = bond.order ?? 1;
      const radius = n >= 2 ? 0.06 : 0.08;
      const count = n > 1 ? Math.round(n) : 1;
      for (let i = 0; i < count; i++) {
        const offset = count === 1 ? 0 : (i - (count - 1) / 2) * 0.24;
        const cylinder = new THREE.Mesh(
          new THREE.CylinderGeometry(radius, radius, length, 16),
          new THREE.MeshStandardMaterial({ color: bondColor, roughness: 0.6 }),
        );
        cylinder.position.copy(mid).addScaledVector(perp, offset);
        cylinder.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dirVec,
        );
        scene.add(cylinder);
      }
    });

    let radius = 1;
    positions.forEach((p) => {
      radius = Math.max(radius, p.length());
    });

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    const dist = Math.max(4, radius * 3);
    camera.position.set(dist * 0.6, dist * 0.4, dist * 0.7);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.position = "fixed";
    renderer.domElement.style.left = "-9999px";
    document.body.appendChild(renderer.domElement);

    renderer.render(scene, camera);

    const blob = await new Promise<Blob | null>((resolve) => {
      renderer.domElement.toBlob((b) => resolve(b), "image/png");
    });

    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
    if (renderer.domElement.parentElement) {
      renderer.domElement.parentElement.removeChild(renderer.domElement);
    }
    renderer.dispose();

    if (!blob) return null;
    return new File([blob], "molecule.png", { type: "image/png" });
  } catch (err) {
    console.warn("[auto-ai] renderMoleculePNG failed", err);
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

export async function insertImageShapeNextTo(
  editor: Editor,
  file: File,
  sourceBounds: Bounds | null,
  opts?: { gap?: number },
): Promise<string | null> {
  try {
    const url = URL.createObjectURL(file);
    let w: number;
    let h: number;
    try {
      const img = await loadImage(url);
      w = img.naturalWidth;
      h = img.naturalHeight;
      if (w > 520) {
        const scale = 520 / w;
        w = 520;
        h = h * scale;
      }
    } finally {
      URL.revokeObjectURL(url);
    }

    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/assets", { method: "POST", body: fd });
    if (!res.ok) throw new Error(`asset upload failed: ${res.status}`);
    const { src } = (await res.json()) as { src: string };

    const gap = opts?.gap ?? 48;
    let x: number;
    let y: number;
    if (sourceBounds) {
      x = sourceBounds.maxX + gap;
      y = sourceBounds.minY;
    } else {
      const vb = editor.getViewportPageBounds();
      x = vb.center.x - w / 2;
      y = vb.center.y - h / 2;
    }

    const assetId = AssetRecordType.createId();
    await editor.createAssets([
      {
        id: assetId,
        typeName: "asset",
        type: "image",
        meta: {},
        props: {
          name: file.name,
          src,
          w,
          h,
          mimeType: file.type,
          isAnimated: false,
        },
      },
    ]);

    const shapeId = createShapeId();
    editor.createShape({
      id: shapeId,
      type: "image",
      x,
      y,
      props: { assetId, w, h },
    });

    return shapeId;
  } catch (err) {
    console.warn("[auto-ai] insertImageShapeNextTo failed", err);
    return null;
  }
}

export async function insertNoteNextTo(
  editor: Editor,
  text: string,
  sourceBounds: Bounds | null,
  opts?: { belowOffset?: number },
): Promise<string | null> {
  try {
    const trimmed = text.slice(0, 300);
    const w = Math.max(60, Math.min(800, trimmed.length * 8));

    let x: number;
    let y: number;
    if (sourceBounds) {
      x = sourceBounds.maxX + 48;
      y = sourceBounds.maxY + (opts?.belowOffset ?? 12);
    } else {
      const vb = editor.getViewportPageBounds();
      x = vb.center.x - w / 2;
      y = vb.center.y - 20;
    }

    const shapeId = createShapeId();
    editor.createShape({
      id: shapeId,
      type: "text",
      x,
      y,
      props: {
        richText: toRichText(trimmed),
        color: "black",
        size: "s",
        font: "sans",
        textAlign: "start",
        autoSize: true,
        scale: 1,
        w,
      },
    });

    return shapeId;
  } catch (err) {
    console.warn("[auto-ai] insertNoteNextTo failed", err);
    return null;
  }
}
