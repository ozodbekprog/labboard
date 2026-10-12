"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signUpAction, type AuthState } from "@/server/actions/auth";

export function SignUpForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signUpAction, undefined);
  const [role, setRole] = useState<"teacher" | "student">("teacher");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Ro&apos;yxatdan o&apos;tish</h1>
        <p className="mt-1 text-sm text-slate-400">Bir daqiqada boshlang</p>
      </div>

      {state?.error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {state.error}
        </div>
      )}

      <fieldset className="flex gap-2">
        {(
          [
            { id: "teacher", label: "O'qituvchi", icon: "🎓" },
            { id: "student", label: "Talaba", icon: "📚" },
          ] as const
        ).map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRole(r.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
              role === r.id
                ? "border-indigo-400 bg-indigo-500/20 text-white"
                : "border-slate-600/40 text-slate-400 hover:bg-white/5"
            }`}
          >
            <span>{r.icon}</span> {r.label}
          </button>
        ))}
        <input type="hidden" name="role" value={role} />
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm text-slate-300">
        Ism familiya
        <input name="name" required placeholder="Aziz Karimov" className="input px-3 py-2.5" />
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-slate-300">
        Email
        <input name="email" type="email" required placeholder="siz@email.uz" className="input px-3 py-2.5" />
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-slate-300">
        Parol
        <input name="password" type="password" required placeholder="Kamida 8 belgi, harf va raqam" className="input px-3 py-2.5" />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary mt-1 rounded-xl px-4 py-2.5 font-medium text-white disabled:opacity-60"
      >
        {pending ? "Yaratilmoqda…" : "Akkaunt yaratish"}
      </button>

      <p className="text-center text-sm text-slate-400">
        Akkauntingiz bormi?{" "}
        <Link href="/sign-in" className="text-indigo-400 hover:underline">
          Kirish
        </Link>
      </p>
    </form>
  );
}
