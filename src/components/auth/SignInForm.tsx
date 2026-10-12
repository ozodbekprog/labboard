"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction, type AuthState } from "@/server/actions/auth";

export function SignInForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signInAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Xush kelibsiz!</h1>
        <p className="mt-1 text-sm text-slate-400">Akkauntingizga kiring</p>
      </div>

      {state?.error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {state.error}
        </div>
      )}

      <label className="flex flex-col gap-1.5 text-sm text-slate-300">
        Email
        <input name="email" type="email" required placeholder="siz@email.uz" className="input px-3 py-2.5" />
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-slate-300">
        Parol
        <input name="password" type="password" required placeholder="••••••••" className="input px-3 py-2.5" />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary mt-1 rounded-xl px-4 py-2.5 font-medium text-white disabled:opacity-60"
      >
        {pending ? "Kirilmoqda…" : "Kirish"}
      </button>

      <p className="text-center text-sm text-slate-400">
        Akkauntingiz yo&apos;qmi?{" "}
        <Link href="/sign-up" className="text-indigo-400 hover:underline">
          Ro&apos;yxatdan o&apos;tish
        </Link>
      </p>
    </form>
  );
}
