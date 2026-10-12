import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, messages, users } from "@/db";
import { getCurrentUser, newId } from "@/server/auth";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("roomId");
  if (!roomId) {
    return Response.json({ error: "missing_roomId" }, { status: 400 });
  }

  const rows = db
    .select({
      id: messages.id,
      body: messages.body,
      createdAt: messages.createdAt,
      user: {
        id: users.id,
        name: users.name,
        avatarColor: users.avatarColor,
      },
    })
    .from(messages)
    .innerJoin(users, eq(users.id, messages.userId))
    .where(eq(messages.roomId, roomId))
    .orderBy(desc(messages.createdAt))
    .limit(100)
    .all()
    .reverse();

  return Response.json({ messages: rows });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = z.object({
    roomId: z.string().min(1),
    body: z.string().min(1).max(2000),
  });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }

  db.insert(messages)
    .values({
      id: newId("m"),
      roomId: parsed.data.roomId,
      userId: user.id,
      body: parsed.data.body,
      createdAt: Date.now(),
    })
    .run();

  return Response.json({ ok: true });
}
