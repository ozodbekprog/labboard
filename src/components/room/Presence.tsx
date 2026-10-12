"use client";

import { useValue } from "tldraw";
import type { Editor } from "tldraw";

interface PresenceUser {
  userName: string;
  color?: string;
}

interface PresenceSelf {
  name: string;
  color: string;
}

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

export function PresenceAvatars({ editor, self }: { editor: Editor | null; self: PresenceSelf }) {
  if (!editor) {
    return (
      <div className="flex items-center">
        <Avatar name={self.name} color={self.color} className="h-7 w-7 text-[10px]" />
      </div>
    );
  }
  return <PresenceAvatarsInner editor={editor} self={self} />;
}

function PresenceAvatarsInner({ editor, self }: { editor: Editor; self: PresenceSelf }) {
  const presences = useValue<PresenceUser[]>(
    "presence",
    () => Array.from(editor.store.query.records("instance_presence").get() as unknown as PresenceUser[]),
    [editor],
  );
  const seen = new Set<string>([self.name]);
  const others: PresenceUser[] = [];
  for (const p of presences) {
    if (!p || !p.userName || seen.has(p.userName)) continue;
    seen.add(p.userName);
    others.push(p);
  }
  const shown = others.slice(0, 4);
  return (
    <div className="flex items-center">
      <Avatar name={self.name} color={self.color} className="h-7 w-7 text-[10px]" />
      {shown.map((p) => (
        <Avatar
          key={p.userName}
          name={p.userName}
          color={p.color ?? "#64748b"}
          className="-ml-1.5 h-7 w-7 text-[10px]"
        />
      ))}
    </div>
  );
}

export function PresenceList({ editor, self }: { editor: Editor | null; self: PresenceSelf }) {
  if (!editor) {
    return (
      <div className="flex flex-col gap-1">
        <PresenceRow name={self.name} color={self.color} self />
      </div>
    );
  }
  return <PresenceListInner editor={editor} self={self} />;
}

function PresenceListInner({ editor, self }: { editor: Editor; self: PresenceSelf }) {
  const presences = useValue<PresenceUser[]>(
    "presence",
    () => Array.from(editor.store.query.records("instance_presence").get() as unknown as PresenceUser[]),
    [editor],
  );
  const seen = new Set<string>([self.name]);
  const others: PresenceUser[] = [];
  for (const p of presences) {
    if (!p || !p.userName || seen.has(p.userName)) continue;
    seen.add(p.userName);
    others.push(p);
  }
  return (
    <div className="flex flex-col gap-1">
      <PresenceRow name={self.name} color={self.color} self />
      {others.map((p) => (
        <PresenceRow key={p.userName} name={p.userName} color={p.color} />
      ))}
    </div>
  );
}

function PresenceRow({ name, color, self }: { name: string; color?: string; self?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50">
      <Avatar
        name={name}
        color={color ?? "#64748b"}
        className="h-9 w-9 text-xs"
      />
      <div className="min-w-0">
        <div className="truncate text-sm text-slate-800">
          {name}
          {self ? " (Siz)" : ""}
        </div>
        <div className="text-[11px] text-slate-400">online</div>
      </div>
      <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
    </div>
  );
}
