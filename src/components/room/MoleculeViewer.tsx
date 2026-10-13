"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ELEMENT_COLORS, getMolecule } from "@/lib/molecules";
import type { BoardEditor } from "./LabPanel";

const ATOM_RADII: Record<string, number> = {
  H: 0.28,
  C: 0.45,
  O: 0.42,
  N: 0.42,
  S: 0.55,
  Cl: 0.5,
  Na: 0.55,
};

const AVAILABLE_HINT =
  "H2O, CO2, CH4, NH3, O2, N2, H2, HCl, O3, SO2, C6H6, C2H5OH, H2SO4, NaCl, C6H12O6";

export default function MoleculeViewer({
  molecule,
  editor,
}: {
  molecule: string;
  editor: BoardEditor | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const data = getMolecule(molecule);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !data) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f8fafc");

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

      const perp = Math.abs(dirVec.y) < 0.9
        ? new THREE.Vector3(0, 1, 0).cross(dirVec).normalize()
        : new THREE.Vector3(1, 0, 0).cross(dirVec).normalize();

      const n = bond.order ?? 1;
      const radius = n >= 2 ? 0.06 : 0.08;
      for (let i = 0; i < n; i++) {
        const offset = n === 1 ? 0 : (i - (n - 1) / 2) * 0.24;
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
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;
    controls.enablePan = false;

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      controls.dispose();
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
      if (rendererRef.current === renderer) rendererRef.current = null;
    };
  }, [molecule, data]);

  const pinToBoard = () => {
    if (!editor) return;
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.domElement.toBlob(
      async (blob) => {
        if (!blob) return;
        const file = new File([blob], "molecule.png", { type: "image/png" });
        await editor.putExternalContent({ type: "files", files: [file] });
        setFeedback("qo'shildi ✓");
        setTimeout(() => setFeedback(null), 2000);
      },
      "image/png",
    );
  };

  if (!data) {
    return (
      <div className="w-full rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="text-sm font-medium text-slate-700">{molecule}</div>
        <div className="mt-1 text-sm text-slate-600">
          3D model topilmadi: {molecule}
        </div>
        <div className="mt-2 text-xs text-slate-400">
          Mavjudlar: {AVAILABLE_HINT}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-slate-800">
          {data.name}{" "}
          <span className="text-slate-400">— {data.formula}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={pinToBoard}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
          >
            📌 Doskaga qo&apos;yish
          </button>
          {feedback && (
            <span className="text-xs text-emerald-600">{feedback}</span>
          )}
        </div>
      </div>
      <div
        ref={containerRef}
        className="h-[300px] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
      />
    </div>
  );
}
