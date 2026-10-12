import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function newId(prefix = ""): string {
  const rand = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  return prefix ? `${prefix}_${rand}` : rand;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

export const SUBJECTS = [
  { id: "math", label: "Matematika", color: "#6366f1" },
  { id: "physics", label: "Fizika", color: "#06b6d4" },
  { id: "chemistry", label: "Kimyo", color: "#10b981" },
  { id: "biology", label: "Biologiya", color: "#84cc16" },
  { id: "history", label: "Tarix", color: "#f59e0b" },
  { id: "cs", label: "Informatika", color: "#ec4899" },
  { id: "general", label: "Umumiy", color: "#64748b" },
] as const;

export type SubjectId = (typeof SUBJECTS)[number]["id"];

export function subjectLabel(id: string): string {
  return SUBJECTS.find((s) => s.id === id)?.label ?? id;
}

export function subjectColor(id: string): string {
  return SUBJECTS.find((s) => s.id === id)?.color ?? "#64748b";
}
