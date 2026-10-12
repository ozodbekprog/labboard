import Link from "next/link";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { db, groups, lessons, rooms } from "@/db";
import { requireUser } from "@/server/auth";
import { createRoomAction } from "@/server/actions/platform";
import { formatLessonRange } from "@/lib/format";
import { SUBJECTS, subjectColor, subjectLabel } from "@/lib/utils";

export const metadata = { title: "Xonalar — LabBoard" };

export default async function DashboardPage() {
  const user = await requireUser();

  const myRooms = db
    .select()
    .from(rooms)
    .where(eq(rooms.ownerId, user.id))
    .orderBy(desc(rooms.createdAt))
    .all();
  const myGroups = db.select().from(groups).where(eq(groups.teacherId, user.id)).all();
  const upcoming = db
    .select({ lesson: lessons, room: rooms })
    .from(lessons)
    .innerJoin(rooms, eq(lessons.roomId, rooms.id))
    .where(and(eq(rooms.ownerId, user.id), gte(lessons.startsAt, Date.now())))
    .orderBy(asc(lessons.startsAt))
    .limit(5)
    .all();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Salom, {user.name.split(" ")[0]} 👋</h1>
          <p className="mt-1 text-sm text-slate-400">
            {myRooms.length} xona · {myGroups.length} guruh · {upcoming.length} rejalashtirilgan dars
          </p>
        </div>
      </div>

      <details className="card mt-6 overflow-hidden">
        <summary className="cursor-pointer select-none px-5 py-4 text-sm font-medium text-slate-200">
          + Yangi dars xonasi ochish
        </summary>
        <form action={createRoomAction} className="grid gap-3 border-t border-white/10 px-5 py-4 md:grid-cols-[1fr_180px_200px_auto]">
          <input name="name" placeholder="Xona nomi (masalan: Fizika — 101-guruh)" className="input px-3 py-2.5" required />
          <select name="subject" className="input px-3 py-2.5 text-slate-200">
            {SUBJECTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <select name="groupId" className="input px-3 py-2.5 text-slate-200">
            <option value="">Guruhsiz</option>
            {myGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary rounded-xl px-5 py-2.5 text-sm font-medium text-white">
            Ochish
          </button>
        </form>
      </details>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">Xonalarim</h2>
        {myRooms.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-400">
            Hozircha xona yo&apos;q. Yuqoridagi tugma bilan birinchi dars xonangizni oching — doska, simulyatsiyalar va video
            darhol tayyor bo&apos;ladi.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {myRooms.map((room) => (
              <Link key={room.id} href={`/room/${room.id}`} className="card card-hover block p-5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: subjectColor(room.subject) }} />
                  <span className="text-xs text-slate-400">{subjectLabel(room.subject)}</span>
                </div>
                <div className="mt-2 font-medium text-slate-100">{room.name}</div>
                <div className="mt-3 text-xs text-indigo-400">Xonaga kirish →</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Yaqin darslar</h2>
          <Link href="/schedule" className="text-xs text-indigo-400 hover:underline">
            Jadvalni ochish →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <div className="card p-6 text-sm text-slate-400">
            Rejalashtirilgan darslar yo&apos;q.{" "}
            <Link href="/schedule" className="text-indigo-400 hover:underline">
              Jadvalda dars qo&apos;shing
            </Link>
            .
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {upcoming.map(({ lesson, room }) => (
              <Link
                key={lesson.id}
                href={`/room/${room.id}`}
                className="card card-hover flex items-center justify-between px-5 py-3.5"
              >
                <div>
                  <div className="text-sm font-medium text-slate-100">{lesson.title}</div>
                  <div className="text-xs text-slate-500">{room.name}</div>
                </div>
                <div className="font-mono text-xs text-slate-400">{formatLessonRange(lesson.startsAt, lesson.endsAt)}</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
