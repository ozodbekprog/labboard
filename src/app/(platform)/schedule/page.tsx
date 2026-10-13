import Link from "next/link";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { db, lessons, rooms } from "@/db";
import { requireUser } from "@/server/auth";
import { createLessonAction } from "@/server/actions/platform";
import { formatTime, subjectColor } from "@/lib/utils";

export const metadata = { title: "Jadval — LabBoard" };

export default async function SchedulePage() {
  const user = await requireUser();

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const weekLessons = await db
    .select({
      id: lessons.id,
      title: lessons.title,
      startsAt: lessons.startsAt,
      endsAt: lessons.endsAt,
      roomName: rooms.name,
      roomId: rooms.id,
      roomSubject: rooms.subject,
    })
    .from(lessons)
    .innerJoin(rooms, eq(lessons.roomId, rooms.id))
    .where(
      and(
        eq(rooms.ownerId, user.id),
        gte(lessons.startsAt, weekStart.getTime()),
        lt(lessons.startsAt, weekEnd.getTime()),
      ),
    )
    .orderBy(asc(lessons.startsAt))
    .all();

  const myRooms = await db
    .select({ id: rooms.id, name: rooms.name })
    .from(rooms)
    .where(eq(rooms.ownerId, user.id))
    .all();

  const today = new Date();
  const dateInput = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate(),
  ).padStart(2, "0")}`;

  const days: { date: Date; items: typeof weekLessons }[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    days.push({
      date,
      items: weekLessons.filter((l) => {
        const d = new Date(l.startsAt);
        return (
          d.getFullYear() === date.getFullYear() &&
          d.getMonth() === date.getMonth() &&
          d.getDate() === date.getDate()
        );
      }),
    });
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Dars jadvali</h1>
      <p className="mt-1 text-sm text-slate-500">Haftalik mashg&apos;ulotlar jadvali</p>

      {myRooms.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-sm text-slate-500">
          Avval xona oching —{" "}
          <Link href="/dashboard" className="text-emerald-600 hover:underline">
            Dashboardga o&apos;tish
          </Link>
        </div>
      ) : (
        <form
          action={createLessonAction}
          className="card mt-6 grid gap-3 p-4 md:grid-cols-[200px_1fr_150px_110px_110px_auto]"
        >
          <select name="roomId" className="input px-3 py-2.5 text-slate-800" required>
            <option value="">Xona tanlang</option>
            {myRooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
          <input name="title" placeholder="Dars mavzusi" className="input px-3 py-2.5" required />
          <input name="date" type="date" defaultValue={dateInput} className="input px-3 py-2.5" />
          <input name="time" type="time" defaultValue="09:00" className="input px-3 py-2.5" />
          <select name="duration" className="input px-3 py-2.5 text-slate-800" defaultValue="60">
            <option value="30">30 daq</option>
            <option value="45">45 daq</option>
            <option value="60">60 daq</option>
            <option value="90">90 daq</option>
            <option value="120">120 daq</option>
          </select>
          <button
            type="submit"
            className="btn-primary rounded-xl px-4 py-2.5 text-sm font-medium text-white"
          >
            Qo&apos;shish
          </button>
        </form>
      )}

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {days.map(({ date, items }, i) => {
          const isToday =
            date.getFullYear() === now.getFullYear() &&
            date.getMonth() === now.getMonth() &&
            date.getDate() === now.getDate();
          return (
            <div
              key={i}
              className={`card min-h-40 p-3${isToday ? " border-emerald-400" : ""}`}
            >
              <div className="text-xs text-slate-400">
                {date.toLocaleDateString("uz-UZ", { weekday: "short", day: "numeric", month: "short" })}
              </div>
              {items.length === 0 ? (
                <div className="mt-2 text-slate-300">—</div>
              ) : (
                items.map((l) => (
                  <Link
                    key={l.id}
                    href={`/room/${l.roomId}`}
                    className="block rounded-lg border border-slate-200 bg-white p-2 mt-2 hover:bg-slate-50"
                  >
                    <div className="text-xs font-medium text-slate-900">{l.title}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: subjectColor(l.roomSubject) }}
                      />
                      {l.roomName}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-emerald-600">
                      {formatTime(l.startsAt)}–{formatTime(l.endsAt)}
                    </div>
                  </Link>
                ))
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
