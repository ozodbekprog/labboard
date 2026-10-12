export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export function formatLessonRange(startsAt: number, endsAt: number): string {
  const d = new Date(startsAt);
  const date = d.toLocaleDateString("uz-UZ", { day: "numeric", month: "short", weekday: "short" });
  const t1 = d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  const t2 = new Date(endsAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${t1}–${t2}`;
}

export function toDateInputValue(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
