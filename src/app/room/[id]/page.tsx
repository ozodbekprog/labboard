import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, rooms } from "@/db";
import { requireUser } from "@/server/auth";
import RoomClient from "@/components/room/RoomClient";

export const metadata = { title: "Dars xonasi — LabBoard" };

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const room = db.select().from(rooms).where(eq(rooms.id, id)).get();
  if (!room) notFound();

  const syncUrl = process.env.NEXT_PUBLIC_SYNC_URL ?? "ws://localhost:5858";

  return (
    <RoomClient
      room={{ id: room.id, name: room.name, subject: room.subject, boardId: room.boardId }}
      user={{ id: user.id, name: user.name, avatarColor: user.avatarColor }}
      syncUrl={syncUrl}
    />
  );
}
