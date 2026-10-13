"use client";

import type { PresenceUser } from "@/lib/board/types";

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase();
}

function Avatar({
  name,
  color,
  className,
  title,
}: {
  name: string;
  color: string;
  className: string;
  title?: string;
}) {
  return (
    <span
      title={title ?? name}
      className={`flex items-center justify-center rounded-full border-2 border-white font-semibold text-white ${className}`}
      style={{ backgroundColor: color || "#64748b" }}
    >
      {initials(name)}
    </span>
  );
}

export function PresenceAvatars({
  self,
  users,
}: {
  self: { name: string; color: string };
  users: PresenceUser[];
}) {
  const seen = new Set<string>([self.name]);
  const others: PresenceUser[] = [];
  for (const p of users) {
    if (!p || !p.name || seen.has(p.name)) continue;
    seen.add(p.name);
    others.push(p);
  }
  const shown = others.slice(0, 4);
  const extra = others.length - shown.length;
  return (
    <div className="flex items-center">
      <Avatar name={self.name} color={self.color} title="Siz" className="h-7 w-7 text-[10px]" />
      {shown.map((p) => (
        <Avatar
          key={p.name}
          name={p.name}
          color={p.color ?? "#64748b"}
          className="-ml-1.5 h-7 w-7 text-[10px]"
        />
      ))}
      {extra > 0 && (
        <span className="-ml-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-300 text-[10px] font-semibold text-slate-700">
          +{extra}
        </span>
      )}
    </div>
  );
}
