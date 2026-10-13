"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, groupMembers, groups, lessons, rooms, users } from "@/db";
import { newId, requireUser } from "@/server/auth";
import { SUBJECTS } from "@/lib/utils";

export async function createRoomAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim() || "Yangi xona";
  const subjectRaw = String(formData.get("subject") ?? "general");
  const subject = SUBJECTS.some((s) => s.id === subjectRaw) ? subjectRaw : "general";
  const groupId = String(formData.get("groupId") ?? "") || null;

  const id = newId("r");
  await db.insert(rooms)
    .values({
      id,
      name,
      subject,
      ownerId: user.id,
      groupId,
      boardId: newId("board"),
      createdAt: Date.now(),
    })
    .run();
  redirect(`/room/${id}`);
}

export async function createGroupAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const description = String(formData.get("description") ?? "").trim();
  await db.insert(groups)
    .values({ id: newId("g"), name, description, teacherId: user.id, createdAt: Date.now() })
    .run();
  revalidatePath("/groups");
}

export async function addGroupMemberAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const group = await db.select().from(groups).where(and(eq(groups.id, groupId), eq(groups.teacherId, user.id))).get();
  if (!group) return;
  const member = await db.select().from(users).where(eq(users.email, email)).get();
  if (!member) return;
  const exists = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, member.id)))
    .get();
  if (!exists) {
    await db.insert(groupMembers)
      .values({ id: newId("gm"), groupId, userId: member.id, createdAt: Date.now() })
      .run();
  }
  revalidatePath(`/groups/${groupId}`);
}

export async function createLessonAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const roomId = String(formData.get("roomId") ?? "");
  const title = String(formData.get("title") ?? "").trim() || "Dars";
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "09:00");
  const durationMin = Math.min(240, Math.max(15, Number(formData.get("duration") ?? 60)));

  const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
  if (!room || !date) return;

  const startsAt = new Date(`${date}T${time}:00`).getTime();
  if (isNaN(startsAt)) return;
  await db.insert(lessons)
    .values({
      id: newId("l"),
      roomId,
      createdBy: user.id,
      title,
      startsAt,
      endsAt: startsAt + durationMin * 60_000,
      notes: "",
      createdAt: Date.now(),
    })
    .run();
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
}
