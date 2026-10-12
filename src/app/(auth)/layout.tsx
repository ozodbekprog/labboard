import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-xl font-bold text-white">
            L
          </div>
          <span className="text-xl font-semibold text-slate-100">LabBoard</span>
        </Link>
        <div className="card p-6">{children}</div>
      </div>
    </main>
  );
}
