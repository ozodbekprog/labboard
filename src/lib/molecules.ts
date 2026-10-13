// Pure data module for the three.js molecule viewer.
// Coordinates are in Angstrom (Å), built with realistic bond lengths (~0.7–2.4 Å)
// and real molecular geometry (linear, bent, tetrahedral, pyramidal, rings).

export interface MoleculeAtom {
  element: string;
  x: number;
  y: number;
  z: number;
}

export interface MoleculeBond {
  a: number;
  b: number;
  order?: number;
}

export interface MoleculeData {
  formula: string;
  name: string;
  atoms: MoleculeAtom[];
  bonds: MoleculeBond[];
}

export const ELEMENT_COLORS: Record<string, string> = {
  H: "#e2e8f0",
  C: "#334155",
  O: "#ef4444",
  N: "#3b82f6",
  S: "#eab308",
  Cl: "#22c55e",
  Na: "#a855f7",
  Ca: "#94a3b8",
  P: "#f97316",
  default: "#64748b",
};

export const MOLECULES: Record<string, MoleculeData> = {
  H2O: {
    formula: "H2O",
    name: "Suv",
    // Bent, H-O-H = 104.5°, O-H = 0.96 Å. Bisector along +y.
    atoms: [
      { element: "O", x: 0, y: 0, z: 0 },
      { element: "H", x: 0.7591, y: 0.5875, z: 0 },
      { element: "H", x: -0.7591, y: 0.5875, z: 0 },
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 0, b: 2, order: 1 },
    ],
  },
  CO2: {
    formula: "CO2",
    name: "Karbonat angidrid",
    // Linear O=C=O, C=O = 1.16 Å.
    atoms: [
      { element: "O", x: -1.16, y: 0, z: 0 },
      { element: "C", x: 0, y: 0, z: 0 },
      { element: "O", x: 1.16, y: 0, z: 0 },
    ],
    bonds: [
      { a: 0, b: 1, order: 2 },
      { a: 1, b: 2, order: 2 },
    ],
  },
  CH4: {
    formula: "CH4",
    name: "Metan",
    // Tetrahedral, C-H = 1.09 Å, H-C-H = 109.47°.
    atoms: [
      { element: "C", x: 0, y: 0, z: 0 },
      { element: "H", x: 0.6293, y: 0.6293, z: 0.6293 },
      { element: "H", x: 0.6293, y: -0.6293, z: -0.6293 },
      { element: "H", x: -0.6293, y: 0.6293, z: -0.6293 },
      { element: "H", x: -0.6293, y: -0.6293, z: 0.6293 },
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 0, b: 2, order: 1 },
      { a: 0, b: 3, order: 1 },
      { a: 0, b: 4, order: 1 },
    ],
  },
  NH3: {
    formula: "NH3",
    name: "Ammiak",
    // Pyramidal, N-H = 1.01 Å, H-N-H = 107°, symmetry axis along +y.
    atoms: [
      { element: "N", x: 0, y: 0, z: 0 },
      { element: "H", x: 0.9374, y: 0.3757, z: 0 },
      { element: "H", x: -0.4687, y: 0.3757, z: 0.8117 },
      { element: "H", x: -0.4687, y: 0.3757, z: -0.8117 },
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 0, b: 2, order: 1 },
      { a: 0, b: 3, order: 1 },
    ],
  },
  O2: {
    formula: "O2",
    name: "Kislorod",
    // Linear diatomic, O=O = 1.21 Å.
    atoms: [
      { element: "O", x: 0, y: 0, z: 0 },
      { element: "O", x: 1.21, y: 0, z: 0 },
    ],
    bonds: [{ a: 0, b: 1, order: 2 }],
  },
  N2: {
    formula: "N2",
    name: "Azot",
    // Linear diatomic, N≡N = 1.10 Å.
    atoms: [
      { element: "N", x: 0, y: 0, z: 0 },
      { element: "N", x: 1.1, y: 0, z: 0 },
    ],
    bonds: [{ a: 0, b: 1, order: 3 }],
  },
  H2: {
    formula: "H2",
    name: "Vodorod",
    // Linear diatomic, H-H = 0.74 Å.
    atoms: [
      { element: "H", x: 0, y: 0, z: 0 },
      { element: "H", x: 0.74, y: 0, z: 0 },
    ],
    bonds: [{ a: 0, b: 1, order: 1 }],
  },
  HCl: {
    formula: "HCl",
    name: "Vodorod xlorid",
    // Linear diatomic, H-Cl = 1.27 Å.
    atoms: [
      { element: "H", x: 0, y: 0, z: 0 },
      { element: "Cl", x: 1.27, y: 0, z: 0 },
    ],
    bonds: [{ a: 0, b: 1, order: 1 }],
  },
  O3: {
    formula: "O3",
    name: "Ozon",
    // Bent, O-O = 1.28 Å, O-O-O = 116.8°, resonance order 1.5.
    atoms: [
      { element: "O", x: 0, y: 0, z: 0 },
      { element: "O", x: 1.0901, y: 0.6708, z: 0 },
      { element: "O", x: -1.0901, y: 0.6708, z: 0 },
    ],
    bonds: [
      { a: 0, b: 1, order: 1.5 },
      { a: 0, b: 2, order: 1.5 },
    ],
  },
  SO2: {
    formula: "SO2",
    name: "Oltingugurt oksid",
    // Bent, S=O = 1.43 Å, O-S-O = 119°.
    atoms: [
      { element: "S", x: 0, y: 0, z: 0 },
      { element: "O", x: 1.2356, y: 0.72, z: 0 },
      { element: "O", x: -1.2356, y: 0.72, z: 0 },
    ],
    bonds: [
      { a: 0, b: 1, order: 2 },
      { a: 0, b: 2, order: 2 },
    ],
  },
  C6H6: {
    formula: "C6H6",
    name: "Benzol",
    // Planar hexagon, radius 1.39 Å (C-C), C-H = 1.09 Å, alternating orders.
    atoms: [
      { element: "C", x: 1.39, y: 0, z: 0 },
      { element: "C", x: 0.695, y: 1.2038, z: 0 },
      { element: "C", x: -0.695, y: 1.2038, z: 0 },
      { element: "C", x: -1.39, y: 0, z: 0 },
      { element: "C", x: -0.695, y: -1.2038, z: 0 },
      { element: "C", x: 0.695, y: -1.2038, z: 0 },
      { element: "H", x: 2.48, y: 0, z: 0 },
      { element: "H", x: 1.24, y: 2.1477, z: 0 },
      { element: "H", x: -1.24, y: 2.1477, z: 0 },
      { element: "H", x: -2.48, y: 0, z: 0 },
      { element: "H", x: -1.24, y: -2.1477, z: 0 },
      { element: "H", x: 1.24, y: -2.1477, z: 0 },
    ],
    bonds: [
      { a: 0, b: 1, order: 2 },
      { a: 1, b: 2, order: 1 },
      { a: 2, b: 3, order: 2 },
      { a: 3, b: 4, order: 1 },
      { a: 4, b: 5, order: 2 },
      { a: 5, b: 0, order: 1 },
      { a: 0, b: 6, order: 1 },
      { a: 1, b: 7, order: 1 },
      { a: 2, b: 8, order: 1 },
      { a: 3, b: 9, order: 1 },
      { a: 4, b: 10, order: 1 },
      { a: 5, b: 11, order: 1 },
    ],
  },
  C2H5OH: {
    formula: "C2H5OH",
    name: "Etanol",
    // Zigzag C-C-O-H chain: C-C 1.54, C-O 1.43, O-H 0.96, C-H 1.09 Å.
    atoms: [
      { element: "C", x: 0, y: 0, z: 0 },
      { element: "C", x: 1.54, y: 0, z: 0 },
      { element: "O", x: 1.9819, y: -1.36, z: 0 },
      { element: "H", x: 1.2054, y: -1.9243, z: 0 },
      { element: "H", x: -0.3633, y: 1.0277, z: 0 },
      { element: "H", x: -0.3633, y: -0.5138, z: 0.89 },
      { element: "H", x: -0.3633, y: -0.5138, z: -0.89 },
      { element: "H", x: 1.9098, y: 0.5089, z: 0.8902 },
      { element: "H", x: 1.9098, y: 0.5089, z: -0.8902 },
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 1, b: 2, order: 1 },
      { a: 2, b: 3, order: 1 },
      { a: 0, b: 4, order: 1 },
      { a: 0, b: 5, order: 1 },
      { a: 0, b: 6, order: 1 },
      { a: 1, b: 7, order: 1 },
      { a: 1, b: 8, order: 1 },
    ],
  },
  H2SO4: {
    formula: "H2SO4",
    name: "Sulfat kislota",
    // Tetrahedral S: two S=O (1.43) and two S-OH (S-O 1.54, O-H 0.96 Å).
    atoms: [
      { element: "S", x: 0, y: 0, z: 0 },
      { element: "O", x: 0.8256, y: 0.8256, z: 0.8256 },
      { element: "O", x: 0.8256, y: -0.8256, z: -0.8256 },
      { element: "O", x: -0.8891, y: 0.8891, z: -0.8891 },
      { element: "O", x: -0.8891, y: -0.8891, z: 0.8891 },
      { element: "H", x: 0.0278, y: 1.0907, z: -1.0907 },
      { element: "H", x: -0.345, y: -0.345, z: 1.4635 },
    ],
    bonds: [
      { a: 0, b: 1, order: 2 },
      { a: 0, b: 2, order: 2 },
      { a: 0, b: 3, order: 1 },
      { a: 0, b: 4, order: 1 },
      { a: 3, b: 5, order: 1 },
      { a: 4, b: 6, order: 1 },
    ],
  },
  NaCl: {
    formula: "NaCl",
    name: "Osh tuzi",
    // Ionic pair, Na-Cl distance = 2.36 Å.
    atoms: [
      { element: "Na", x: 0, y: 0, z: 0 },
      { element: "Cl", x: 2.36, y: 0, z: 0 },
    ],
    bonds: [{ a: 0, b: 1, order: 1 }],
  },
  C6H12O6: {
    formula: "C6H12O6",
    name: "Glyukoza",
    // Simplified pyranose ring: 5 C + 1 O ring (radius 1.43 Å),
    // 4 OH groups, 1 CH2OH arm, ring C-H hydrogens.
    atoms: [
      { element: "O", x: 0, y: 1.43, z: 0 },
      { element: "C", x: 1.2384, y: 0.715, z: 0 },
      { element: "C", x: 1.2384, y: -0.715, z: 0 },
      { element: "C", x: 0, y: -1.43, z: 0 },
      { element: "C", x: -1.2384, y: -0.715, z: 0 },
      { element: "C", x: -1.2384, y: 0.715, z: 0 },
      { element: "O", x: 2.2528, y: 1.3007, z: 0.82 },
      { element: "H", x: 2.9338, y: 1.694, z: 1.3705 },
      { element: "H", x: 2.0116, y: 1.1615, z: -0.625 },
      { element: "H", x: 2.0116, y: -1.1615, z: 0.625 },
      { element: "O", x: 2.2528, y: -1.3007, z: -0.82 },
      { element: "H", x: 2.9338, y: -1.694, z: -1.3705 },
      { element: "O", x: 0, y: -2.4412, z: 1.0112 },
      { element: "H", x: 0, y: -3.118, z: 1.6904 },
      { element: "H", x: 0, y: -2.2007, z: -0.7707 },
      { element: "H", x: -2.0116, y: -1.1615, z: 0.625 },
      { element: "O", x: -2.2528, y: -1.3007, z: -0.82 },
      { element: "H", x: -2.9338, y: -1.694, z: -1.3705 },
      { element: "H", x: -2.0116, y: 1.1615, z: 0.625 },
      { element: "C", x: -2.3309, y: 1.3458, z: -0.883 },
      { element: "O", x: -3.5076, y: 2.0252, z: -1.3287 },
      { element: "H", x: -4.2976, y: 2.4813, z: -1.6279 },
      { element: "H", x: -3.1025, y: 0.6047, z: -1.0913 },
      { element: "H", x: -1.8898, y: 1.6844, z: -1.8203 },
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 1, b: 2, order: 1 },
      { a: 2, b: 3, order: 1 },
      { a: 3, b: 4, order: 1 },
      { a: 4, b: 5, order: 1 },
      { a: 5, b: 0, order: 1 },
      { a: 1, b: 6, order: 1 },
      { a: 6, b: 7, order: 1 },
      { a: 1, b: 8, order: 1 },
      { a: 2, b: 9, order: 1 },
      { a: 2, b: 10, order: 1 },
      { a: 10, b: 11, order: 1 },
      { a: 3, b: 12, order: 1 },
      { a: 12, b: 13, order: 1 },
      { a: 3, b: 14, order: 1 },
      { a: 4, b: 15, order: 1 },
      { a: 4, b: 16, order: 1 },
      { a: 16, b: 17, order: 1 },
      { a: 5, b: 18, order: 1 },
      { a: 5, b: 19, order: 1 },
      { a: 19, b: 20, order: 1 },
      { a: 20, b: 21, order: 1 },
      { a: 19, b: 22, order: 1 },
      { a: 19, b: 23, order: 1 },
    ],
  },
};

// Lookup helpers: lowercase (spaces stripped) -> canonical key,
// matching both formula keys and molecule names.
const LOOKUP: Record<string, string> = {};
for (const key of Object.keys(MOLECULES)) {
  LOOKUP[key.toLowerCase()] = key;
  LOOKUP[MOLECULES[key].name.toLowerCase().replace(/\s+/g, "")] = key;
}

export function getMolecule(query: string): MoleculeData | null {
  const normalized = query.trim().replace(/\s+/g, "");
  if (!normalized) return null;
  const exact = MOLECULES[normalized];
  if (exact) return exact;
  const key = LOOKUP[normalized.toLowerCase()];
  return key ? MOLECULES[key] : null;
}
