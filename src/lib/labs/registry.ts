import type { ComponentType } from "react";

export type LabSubject = "math" | "physics" | "chemistry" | "history" | "cs" | "general";

export interface LabModule {
  id: string;
  title: string;
  subject: LabSubject;
  description: string;
  icon: string;
  renderer: () => Promise<{ default: ComponentType }>;
}

/** Laboratoriya modullari reyestri — yangi simulyatsiya qo'shish uchun shu yerga yozing. */
export const LAB_MODULES: LabModule[] = [
  {
    id: "math-grapher",
    title: "Funksiya grafigi",
    subject: "math",
    description: "f(x) grafiklari, hosila, zoom/pan — interaktiv plotter",
    icon: "📈",
    renderer: () => import("./modules/math-grapher"),
  },
  {
    id: "physics-projectile",
    title: "Snaryad harakati",
    subject: "physics",
    description: "Ballistika: burchak, tezlik, tortishish, havo qarshiligi",
    icon: "🎯",
    renderer: () => import("./modules/physics-projectile"),
  },
  {
    id: "chem-periodic",
    title: "Mendeleyev jadvali",
    subject: "chemistry",
    description: "118 element, kategoriyalar bo'yicha filtr, tafsilotlar",
    icon: "⚗️",
    renderer: () => import("./modules/chem-periodic"),
  },
  {
    id: "history-timeline",
    title: "Tarix lentasi",
    subject: "history",
    description: "Miloddan avvaldan bugungacha — zoom qilinadigan interaktiv lenta",
    icon: "🏛️",
    renderer: () => import("./modules/history-timeline"),
  },
  {
    id: "code-runner",
    title: "Kod maydoni (JS)",
    subject: "cs",
    description: "JavaScript sandbox: yozing, ishga tushiring, natijani ko'ring",
    icon: "💻",
    renderer: () => import("./modules/code-runner"),
  },
];

export const SUBJECT_LABEL_UZ: Record<LabSubject, string> = {
  math: "Matematika",
  physics: "Fizika",
  chemistry: "Kimyo",
  history: "Tarix",
  cs: "Informatika",
  general: "Umumiy",
};
