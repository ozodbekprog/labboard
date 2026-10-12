"use client";

import { useMemo, useState } from "react";

type Cat = "am" | "ae" | "tm" | "pt" | "ml" | "nm" | "hl" | "ng" | "la" | "ac" | "un";

const CAT_STYLE: Record<Cat, { label: string; color: string }> = {
  am: { label: "Ishqoriy metall", color: "#f59e0b" },
  ae: { label: "Ishqoriy-yer metall", color: "#fbbf24" },
  tm: { label: "O'tish metall", color: "#6366f1" },
  pt: { label: "Post-o'tish metall", color: "#8b5cf6" },
  ml: { label: "Metalloid", color: "#10b981" },
  nm: { label: "Nometall", color: "#22d3ee" },
  hl: { label: "Galogen", color: "#14b8a6" },
  ng: { label: "Noble gaz", color: "#e879f9" },
  la: { label: "Lantanoid", color: "#f472b6" },
  ac: { label: "Aktinoid", color: "#fb7185" },
  un: { label: "Noma'lum", color: "#64748b" },
};

// Z|Symbol|Nomi|Massa|Kategoriya
const ELEMENTS: [number, string, string, number, Cat][] = [
  [1, "H", "Hydrogen", 1.008, "nm"], [2, "He", "Helium", 4.003, "ng"],
  [3, "Li", "Lithium", 6.94, "am"], [4, "Be", "Beryllium", 9.012, "ae"], [5, "B", "Boron", 10.81, "ml"],
  [6, "C", "Carbon", 12.011, "nm"], [7, "N", "Nitrogen", 14.007, "nm"], [8, "O", "Oxygen", 15.999, "nm"],
  [9, "F", "Fluorine", 18.998, "hl"], [10, "Ne", "Neon", 20.18, "ng"],
  [11, "Na", "Sodium", 22.99, "am"], [12, "Mg", "Magnesium", 24.305, "ae"], [13, "Al", "Aluminium", 26.982, "pt"],
  [14, "Si", "Silicon", 28.085, "ml"], [15, "P", "Phosphorus", 30.974, "nm"], [16, "S", "Sulfur", 32.06, "nm"],
  [17, "Cl", "Chlorine", 35.45, "hl"], [18, "Ar", "Argon", 39.948, "ng"],
  [19, "K", "Potassium", 39.098, "am"], [20, "Ca", "Calcium", 40.078, "ae"], [21, "Sc", "Scandium", 44.956, "tm"],
  [22, "Ti", "Titanium", 47.867, "tm"], [23, "V", "Vanadium", 50.942, "tm"], [24, "Cr", "Chromium", 51.996, "tm"],
  [25, "Mn", "Manganese", 54.938, "tm"], [26, "Fe", "Iron", 55.845, "tm"], [27, "Co", "Cobalt", 58.933, "tm"],
  [28, "Ni", "Nickel", 58.693, "tm"], [29, "Cu", "Copper", 63.546, "tm"], [30, "Zn", "Zinc", 65.38, "tm"],
  [31, "Ga", "Gallium", 69.723, "pt"], [32, "Ge", "Germanium", 72.63, "ml"], [33, "As", "Arsenic", 74.922, "ml"],
  [34, "Se", "Selenium", 78.971, "nm"], [35, "Br", "Bromine", 79.904, "hl"], [36, "Kr", "Krypton", 83.798, "ng"],
  [37, "Rb", "Rubidium", 85.468, "am"], [38, "Sr", "Strontium", 87.62, "ae"], [39, "Y", "Yttrium", 88.906, "tm"],
  [40, "Zr", "Zirconium", 91.224, "tm"], [41, "Nb", "Niobium", 92.906, "tm"], [42, "Mo", "Molybdenum", 95.95, "tm"],
  [43, "Tc", "Technetium", 98, "tm"], [44, "Ru", "Ruthenium", 101.07, "tm"], [45, "Rh", "Rhodium", 102.906, "tm"],
  [46, "Pd", "Palladium", 106.42, "tm"], [47, "Ag", "Silver", 107.868, "tm"], [48, "Cd", "Cadmium", 112.414, "tm"],
  [49, "In", "Indium", 114.818, "pt"], [50, "Sn", "Tin", 118.71, "pt"], [51, "Sb", "Antimony", 121.76, "ml"],
  [52, "Te", "Tellurium", 127.6, "ml"], [53, "I", "Iodine", 126.904, "hl"], [54, "Xe", "Xenon", 131.293, "ng"],
  [55, "Cs", "Caesium", 132.905, "am"], [56, "Ba", "Barium", 137.327, "ae"], [57, "La", "Lanthanum", 138.905, "la"],
  [58, "Ce", "Cerium", 140.116, "la"], [59, "Pr", "Praseodymium", 140.908, "la"], [60, "Nd", "Neodymium", 144.242, "la"],
  [61, "Pm", "Promethium", 145, "la"], [62, "Sm", "Samarium", 150.36, "la"], [63, "Eu", "Europium", 151.964, "la"],
  [64, "Gd", "Gadolinium", 157.25, "la"], [65, "Tb", "Terbium", 158.925, "la"], [66, "Dy", "Dysprosium", 162.5, "la"],
  [67, "Ho", "Holmium", 164.93, "la"], [68, "Er", "Erbium", 167.259, "la"], [69, "Tm", "Thulium", 168.934, "la"],
  [70, "Yb", "Ytterbium", 173.045, "la"], [71, "Lu", "Lutetium", 174.967, "la"], [72, "Hf", "Hafnium", 178.486, "tm"],
  [73, "Ta", "Tantalum", 180.948, "tm"], [74, "W", "Tungsten", 183.84, "tm"], [75, "Re", "Rhenium", 186.207, "tm"],
  [76, "Os", "Osmium", 190.23, "tm"], [77, "Ir", "Iridium", 192.217, "tm"], [78, "Pt", "Platinum", 195.084, "tm"],
  [79, "Au", "Gold", 196.967, "tm"], [80, "Hg", "Mercury", 200.592, "tm"], [81, "Tl", "Thallium", 204.38, "pt"],
  [82, "Pb", "Lead", 207.2, "pt"], [83, "Bi", "Bismuth", 208.98, "pt"], [84, "Po", "Polonium", 209, "pt"],
  [85, "At", "Astatine", 210, "hl"], [86, "Rn", "Radon", 222, "ng"],
  [87, "Fr", "Francium", 223, "am"], [88, "Ra", "Radium", 226, "ae"], [89, "Ac", "Actinium", 227, "ac"],
  [90, "Th", "Thorium", 232.038, "ac"], [91, "Pa", "Protactinium", 231.036, "ac"], [92, "U", "Uranium", 238.029, "ac"],
  [93, "Np", "Neptunium", 237, "ac"], [94, "Pu", "Plutonium", 244, "ac"], [95, "Am", "Americium", 243, "ac"],
  [96, "Cm", "Curium", 247, "ac"], [97, "Bk", "Berkelium", 247, "ac"], [98, "Cf", "Californium", 251, "ac"],
  [99, "Es", "Einsteinium", 252, "ac"], [100, "Fm", "Fermium", 257, "ac"], [101, "Md", "Mendelevium", 258, "ac"],
  [102, "No", "Nobelium", 259, "ac"], [103, "Lr", "Lawrencium", 266, "ac"], [104, "Rf", "Rutherfordium", 267, "tm"],
  [105, "Db", "Dubnium", 268, "tm"], [106, "Sg", "Seaborgium", 269, "tm"], [107, "Bh", "Bohrium", 270, "tm"],
  [108, "Hs", "Hassium", 269, "tm"], [109, "Mt", "Meitnerium", 278, "un"], [110, "Ds", "Darmstadtium", 281, "un"],
  [111, "Rg", "Roentgenium", 282, "un"], [112, "Cn", "Copernicium", 285, "tm"], [113, "Nh", "Nihonium", 286, "un"],
  [114, "Fl", "Flerovium", 289, "un"], [115, "Mc", "Moscovium", 290, "un"], [116, "Lv", "Livermorium", 293, "un"],
  [117, "Ts", "Tennessine", 294, "un"], [118, "Og", "Oganesson", 294, "un"],
];

function gridPos(z: number): { col: number; row: number } {
  if (z === 1) return { col: 1, row: 1 };
  if (z === 2) return { col: 18, row: 1 };
  if (z <= 4) return { col: z - 2, row: 2 };
  if (z <= 10) return { col: z + 8, row: 2 };
  if (z <= 12) return { col: z - 10, row: 3 };
  if (z <= 18) return { col: z, row: 3 };
  if (z <= 36) return { col: z - 18, row: 4 };
  if (z <= 54) return { col: z - 36, row: 5 };
  if (z <= 56) return { col: z - 54, row: 6 };
  if (z <= 71) return { col: z - 54, row: 9 }; // lantanoidlar
  if (z <= 86) return { col: z - 68, row: 6 };
  if (z <= 88) return { col: z - 86, row: 7 };
  if (z <= 103) return { col: z - 86, row: 10 }; // aktinoidlar
  return { col: z - 100, row: 7 };
}

export default function ChemPeriodic() {
  const [selected, setSelected] = useState<number>(6);
  const [filter, setFilter] = useState<Cat | "all">("all");

  const byPos = useMemo(() => {
    const map = new Map<string, (typeof ELEMENTS)[number]>();
    for (const el of ELEMENTS) {
      const { col, row } = gridPos(el[0]);
      map.set(`${col}-${row}`, el);
    }
    return map;
  }, []);

  const sel = ELEMENTS.find((e) => e[0] === selected)!;

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 px-1">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-md px-1.5 py-0.5 text-[10px] ${filter === "all" ? "bg-white/15 text-white" : "text-slate-400 hover:bg-white/10"}`}
        >
          Barchasi
        </button>
        {(Object.keys(CAT_STYLE) as Cat[]).map((c) => (
          <button
            key={c}
            onClick={() => setFilter(filter === c ? "all" : c)}
            className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] ${filter === c ? "bg-white/15 text-white" : "text-slate-400 hover:bg-white/10"}`}
          >
            <span className="h-2 w-2 rounded-sm" style={{ background: CAT_STYLE[c].color }} />
            {CAT_STYLE[c].label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-700/40 p-2">
        <div
          className="grid gap-[3px]"
          style={{ gridTemplateColumns: "repeat(18, minmax(26px, 1fr))", gridTemplateRows: "repeat(10, minmax(26px, auto))" }}
        >
          {Array.from({ length: 180 }, (_, i) => {
            const col = (i % 18) + 1;
            const row = Math.floor(i / 18) + 1;
            const el = byPos.get(`${col}-${row}`);
            const dim = el && filter !== "all" && el[4] !== filter;
            return (
              <div key={i} style={{ gridColumn: col, gridRow: row }}>
                {el && (
                  <button
                    onClick={() => setSelected(el[0])}
                    className={`flex h-full w-full flex-col items-center justify-center rounded-[5px] border text-center transition ${
                      selected === el[0] ? "border-white/80 ring-1 ring-white/60" : "border-black/20"
                    } ${dim ? "opacity-20" : "hover:brightness-125"}`}
                    style={{ background: CAT_STYLE[el[4]].color + "33" }}
                    title={`${el[2]} (${el[1]})`}
                  >
                    <span className="text-[7px] leading-none text-slate-400">{el[0]}</span>
                    <span className="text-[10px] font-semibold leading-tight text-slate-100">{el[1]}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-slate-700/40 px-3 py-2">
        <div
          className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl"
          style={{ background: CAT_STYLE[sel[4]].color + "33", border: `1px solid ${CAT_STYLE[sel[4]].color}` }}
        >
          <span className="font-mono text-[10px] text-slate-300">{sel[0]}</span>
          <span className="text-xl font-bold text-white">{sel[1]}</span>
        </div>
        <div className="min-w-0 text-xs">
          <div className="font-semibold text-slate-100">{sel[2]}</div>
          <div className="text-slate-400">
            Atom massasi: <span className="font-mono text-slate-200">{sel[3]}</span> a.m.b. · {CAT_STYLE[sel[4]].label}
          </div>
          <div className="text-slate-500">
            Z = {sel[0]} · proton {sel[0]} · elektron {sel[0]} · neytron ≈ {Math.round(sel[3]) - sel[0]}
          </div>
        </div>
      </div>
    </div>
  );
}
