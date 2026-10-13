import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { db, groupMembers, groups } from "@/db";
import { requireUser } from "@/server/auth";
import { createGroupAction } from "@/server/actions/platform";

export const metadata = { title: "Guruhlar — LabBoard" };

export default async function GroupsPage() {
  const user = await requireUser();

  const myGroups = await db
    .select({
      group: groups,
      memberCount: count(groupMembers.id),
    })
    .from(groups)
    .leftJoin(groupMembers, eq(groupMembers.groupId, groups.id))
    .where(eq(groups.teacherId, user.id))
    .groupBy(groups.id)
    .all();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Guruhlar</h1>
      <p className="mt-1 text-sm text-slate-500">Talabalarni guruhlarga birlashtiring, keyin xona va darslarni bog&apos;lang.</p>

      <form action={createGroupAction} className="card mt-6 grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto]">
        <input name="name" placeholder="Guruh nomi (masalan: MAT-101)" className="input px-3 py-2.5" required />
        <input name="description" placeholder="Izoh (ixtiyoriy)" className="input px-3 py-2.5" />
        <button type="submit" className="btn-primary rounded-xl px-5 py-2.5 text-sm font-medium text-white">
          Guruh yaratish
        </button>
      </form>

      <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {myGroups.length === 0 && (
          <div className="card col-span-full p-8 text-center text-sm text-slate-500">
            Guruhlar yo&apos;q. Yuqoridagi forma orqali birinchi guruhni yarating.
          </div>
        )}
        {myGroups.map(({ group, memberCount }) => (
          <Link key={group.id} href={`/groups/${group.id}`} className="card card-hover block p-5">
            <div className="font-medium text-slate-900">{group.name}</div>
            <div className="mt-1 line-clamp-2 min-h-5 text-xs text-slate-500">{group.description}</div>
            <div className="mt-3 text-xs text-slate-500">{memberCount} talaba</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
