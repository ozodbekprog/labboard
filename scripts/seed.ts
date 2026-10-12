import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const dbPath = process.env.DATABASE_PATH ?? "./data/labboard.db";
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

const newId = (p: string) => p + "_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const PASSWORD = "labboard123";

const existing = db.prepare("select id from users where email = ?").get("teacher@lab.uz");
if (existing) {
  console.log("Seed allaqachon bajarilgan");
  db.close();
  process.exit(0);
}

const now = Date.now();
const teacherId = newId("user");
const student1Id = newId("user");
const student2Id = newId("user");

const insertUser = db.prepare(
  "insert into users (id, name, email, password_hash, role, avatar_color, created_at) values (?, ?, ?, ?, ?, ?, ?)",
);

db.transaction(() => {
  insertUser.run(teacherId, "Ozodbek Hoshimov", "teacher@lab.uz", hashPassword(PASSWORD), "teacher", "#6366f1", now);
  insertUser.run(student1Id, "Aziz Karimov", "student@lab.uz", hashPassword(PASSWORD), "student", "#06b6d4", now);
  insertUser.run(student2Id, "Malika Yusupova", "malika@lab.uz", hashPassword(PASSWORD), "student", "#ec4899", now);

  const groupId = newId("group");
  db.prepare("insert into groups (id, name, description, teacher_id, created_at) values (?, ?, ?, ?, ?)")
    .run(groupId, "MAT-101", "Matematika — 1-kurs, 101-guruh", teacherId, now);

  const insertMember = db.prepare("insert into group_members (id, group_id, user_id, created_at) values (?, ?, ?, ?)");
  insertMember.run(newId("gm"), groupId, student1Id, now);
  insertMember.run(newId("gm"), groupId, student2Id, now);

  const insertRoom = db.prepare(
    "insert into rooms (id, name, subject, owner_id, group_id, board_id, created_at) values (?, ?, ?, ?, ?, ?, ?)",
  );
  const room1Id = newId("room");
  const room2Id = newId("room");
  insertRoom.run(room1Id, "Fizika lab: Snaryad harakati", "physics", teacherId, groupId, newId("board"), now);
  insertRoom.run(room2Id, "Matematika: Funksiya grafiklari", "math", teacherId, groupId, newId("board"), now);

  const insertLesson = db.prepare(
    "insert into lessons (id, room_id, created_by, title, starts_at, ends_at, notes, created_at) values (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(11, 0, 0, 0);
  insertLesson.run(
    newId("lesson"), room1Id, teacherId, "Snaryad harakati — amaliyot",
    tomorrow.getTime(), tomorrow.getTime() + 60 * 60 * 1000, "", now,
  );
  insertLesson.run(
    newId("lesson"), room2Id, teacherId, "Grafik plotter bilan ishlash",
    dayAfter.getTime(), dayAfter.getTime() + 90 * 60 * 1000, "", now,
  );

  const insertMessage = db.prepare("insert into messages (id, room_id, user_id, body, created_at) values (?, ?, ?, ?, ?)");
  insertMessage.run(newId("msg"), room1Id, teacherId, "Bugungi darsga xush kelibsiz!", now - 120000);
  insertMessage.run(newId("msg"), room1Id, student1Id, "Assalomu alaykum, tayyormiz", now - 60000);
  insertMessage.run(newId("msg"), room1Id, student2Id, "Juftlik: burchakni o'zgartirib ko'ring", now - 10000);
})();

console.log("✅ Seed tayyor!");
console.log("O'qituvchi: teacher@lab.uz / labboard123");
console.log("Talaba: student@lab.uz / labboard123");
console.log("Talaba: malika@lab.uz / labboard123");
console.log("2 xona, 2 dars, 1 guruh yaratildi");

db.close();
