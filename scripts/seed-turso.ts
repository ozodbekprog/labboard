import { createClient } from "@libsql/client";
import crypto from "node:crypto";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "DATABASE_URL yo'q — Turso uchun: DATABASE_URL=... DATABASE_AUTH_TOKEN=... npx tsx scripts/seed-turso.ts",
    );
    process.exit(1);
  }
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  const db = createClient({ url, authToken });

  function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `scrypt:${salt}:${hash}`;
  }

  const newId = (p: string) => p + "_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  const PASSWORD = "labboard123";

  const existing = await db.execute({
    sql: "select id from users where email = ?",
    args: ["teacher@lab.uz"],
  });
  if (existing.rows.length > 0) {
    console.log("Seed allaqachon bajarilgan");
    await db.close();
    process.exit(0);
  }

  const now = Date.now();
  const teacherId = newId("user");
  const student1Id = newId("user");
  const student2Id = newId("user");

  const groupId = newId("group");
  const room1Id = newId("room");
  const room2Id = newId("room");

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(11, 0, 0, 0);

  await db.batch(
    [
      {
        sql: "insert into users (id, name, email, password_hash, role, avatar_color, created_at) values (?, ?, ?, ?, ?, ?, ?)",
        args: [teacherId, "Ozodbek Hoshimov", "teacher@lab.uz", hashPassword(PASSWORD), "teacher", "#6366f1", now],
      },
      {
        sql: "insert into users (id, name, email, password_hash, role, avatar_color, created_at) values (?, ?, ?, ?, ?, ?, ?)",
        args: [student1Id, "Aziz Karimov", "student@lab.uz", hashPassword(PASSWORD), "student", "#06b6d4", now],
      },
      {
        sql: "insert into users (id, name, email, password_hash, role, avatar_color, created_at) values (?, ?, ?, ?, ?, ?, ?)",
        args: [student2Id, "Malika Yusupova", "malika@lab.uz", hashPassword(PASSWORD), "student", "#ec4899", now],
      },
      {
        sql: "insert into groups (id, name, description, teacher_id, created_at) values (?, ?, ?, ?, ?)",
        args: [groupId, "MAT-101", "Matematika — 1-kurs, 101-guruh", teacherId, now],
      },
      {
        sql: "insert into group_members (id, group_id, user_id, created_at) values (?, ?, ?, ?)",
        args: [newId("gm"), groupId, student1Id, now],
      },
      {
        sql: "insert into group_members (id, group_id, user_id, created_at) values (?, ?, ?, ?)",
        args: [newId("gm"), groupId, student2Id, now],
      },
      {
        sql: "insert into rooms (id, name, subject, owner_id, group_id, board_id, created_at) values (?, ?, ?, ?, ?, ?, ?)",
        args: [room1Id, "Fizika lab: Snaryad harakati", "physics", teacherId, groupId, newId("board"), now],
      },
      {
        sql: "insert into rooms (id, name, subject, owner_id, group_id, board_id, created_at) values (?, ?, ?, ?, ?, ?, ?)",
        args: [room2Id, "Matematika: Funksiya grafiklari", "math", teacherId, groupId, newId("board"), now],
      },
      {
        sql: "insert into lessons (id, room_id, created_by, title, starts_at, ends_at, notes, created_at) values (?, ?, ?, ?, ?, ?, ?, ?)",
        args: [
          newId("lesson"), room1Id, teacherId, "Snaryad harakati — amaliyot",
          tomorrow.getTime(), tomorrow.getTime() + 60 * 60 * 1000, "", now,
        ],
      },
      {
        sql: "insert into lessons (id, room_id, created_by, title, starts_at, ends_at, notes, created_at) values (?, ?, ?, ?, ?, ?, ?, ?)",
        args: [
          newId("lesson"), room2Id, teacherId, "Grafik plotter bilan ishlash",
          dayAfter.getTime(), dayAfter.getTime() + 90 * 60 * 1000, "", now,
        ],
      },
      {
        sql: "insert into messages (id, room_id, user_id, body, created_at) values (?, ?, ?, ?, ?)",
        args: [newId("msg"), room1Id, teacherId, "Bugungi darsga xush kelibsiz!", now - 120000],
      },
      {
        sql: "insert into messages (id, room_id, user_id, body, created_at) values (?, ?, ?, ?, ?)",
        args: [newId("msg"), room1Id, student1Id, "Assalomu alaykum, tayyormiz", now - 60000],
      },
      {
        sql: "insert into messages (id, room_id, user_id, body, created_at) values (?, ?, ?, ?, ?)",
        args: [newId("msg"), room1Id, student2Id, "Juftlik: burchakni o'zgartirib ko'ring", now - 10000],
      },
    ],
    "write",
  );

  console.log("✅ Turso seed tayyor!");
  console.log("O'qituvchi: teacher@lab.uz / labboard123");
  console.log("Talaba: student@lab.uz / labboard123");
  console.log("Talaba: malika@lab.uz / labboard123");
  console.log("2 xona, 2 dars, 1 guruh yaratildi");

  await db.close();
}

main();
