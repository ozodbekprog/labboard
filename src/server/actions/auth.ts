"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import {
  avatarColorFor,
  createSession,
  destroySession,
  hashPassword,
  newId,
  verifyPassword,
} from "@/server/auth";

export type AuthState = { error?: string; ok?: boolean } | undefined;

const SignUpSchema = z.object({
  name: z.string().min(2, "Ism kamida 2 harf bo'lishi kerak").trim(),
  email: z.email("Email formati noto'g'ri").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "Parol kamida 8 belgi bo'lishi kerak")
    .regex(/[a-zA-Z]/, "Parolda kamida bitta harf bo'lsin")
    .regex(/[0-9]/, "Parolda kamida bitta raqam bo'lsin"),
  role: z.enum(["teacher", "student"]),
});

const SignInSchema = z.object({
  email: z.email("Email formati noto'g'ri").trim().toLowerCase(),
  password: z.string().min(1, "Parolni kiriting"),
});

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = SignUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role") === "teacher" ? "teacher" : "student",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" };
  }
  const { name, email, password, role } = parsed.data;
  const existing = await db.select().from(users).where(eq(users.email, email)).get();
  if (existing) return { error: "Bu email allaqachon ro'yxatdan o'tgan" };

  const user = {
    id: newId("u"),
    name,
    email,
    passwordHash: hashPassword(password),
    role,
    avatarColor: avatarColorFor(name),
    createdAt: Date.now(),
  };
  await db.insert(users).values(user).run();
  await createSession(user.id);
  redirect("/dashboard");
}

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = SignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" };
  }
  const { email, password } = parsed.data;
  const user = await db.select().from(users).where(eq(users.email, email)).get();
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Email yoki parol xato" };
  }
  await createSession(user.id);
  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
