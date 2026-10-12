import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, groupMembers, groups, rooms, users } from "@/db";
import { requireUser } from "@/server/auth";
import { addGroupMemberAction, createRoomAction } from "@/server/actions/platform";
import { initials } from "@/lib/format";
import { SUBJECTS, subjectColor, subjectLabel } from "@/lib/utils";

export const metadata = { title: "Guruh — LabBoard" };

export default async function GroupPage({ params }: PageProps<"/groups/[id]">) {
  const { id } = await params;
  const user = await requireUser();

  const group = db
    .select()
    .from(groups)
    .where(and(eq(groups.id, id), eq(groups.teacherId, user.id)))
    .get();
  if (!group) notFound();

  const members = db
    .select({ user: users })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(eq(groupMembers.groupId, id))
    .all();
  const groupRooms = db.select().from(rooms).where(eq(rooms.groupId, id)).all();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <Link href="/groups" className="text-xs text-slate-400 hover:text-slate-700">
        ← Guruhlar
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">{group.name}</h1>
      {group.description && <p className="mt-1 text-sm text-slate-500">{group.description}</p>}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">
            Talabalar ({members.length})
          </h2>
          <form action={addGroupMemberAction} className="card mb-3 flex gap-2 p-3">
            <input type="hidden" name="groupId" value={group.id} />
            <input name="email" type="email" placeholder="talaba@email.uz" className="input flex-1 px-3 py-2 text-sm" required />
            <button type="submit" className="btn-primary rounded-lg px-4 py-2 text-xs font-medium text-white">
              Qo&apos;shish
            </button>
          </form>
          <div className="flex flex-col gap-2">
            {members.length === 0 && (
              <div className="card p-5 text-sm text-slate-500">Hozircha talaba yo&apos;q. Email orqali qo&apos;shing.</div>
            )}
            {members.map(({ user: m }) => (
              <div key={m.id} className="card flex items-center gap-3 px-4 py-2.5">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ background: m.avatarColor }}
                >
                  {initials(m.name)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm text-slate-800">{m.name}</div>
                  <div className="truncate text-xs text-slate-400">{m.email}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">Guruh xonalari</h2>
          <form action={createRoomAction} className="card mb-3 grid gap-2 p-3">
            <input type="hidden" name="groupId" value={group.id} />
            <input name="name" placeholder="Yangi xona nomi" className="input px-3 py-2 text-sm" required />
            <div className="flex gap-2">
              <select name="subject" className="input flex-1 px-3 py-2 text-sm text-slate-800">
                {SUBJECTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn-primary rounded-lg px-4 py-2 text-xs font-medium text-white">
                Xona ochish
              </button>
            </div>
          </form>
          <div className="flex flex-col gap-2">
            {groupRooms.length === 0 && <div className="card p-5 text-sm text-slate-500">Guruhga bog&apos;langan xona yo&apos;q.</div>}
            {groupRooms.map((room) => (
              <Link key={room.id} href={`/room/${room.id}`} className="card card-hover flex items-center gap-3 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: subjectColor(room.subject) }} />
                <span className="text-sm text-slate-800">{room.name}</span>
                <span className="ml-auto text-xs text-slate-500">{subjectLabel(room.subject)}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
