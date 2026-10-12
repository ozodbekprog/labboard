import Link from "next/link";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { requireUser } from "@/server/auth";
import { signOutAction } from "@/server/actions/auth";
import { SidebarNav } from "@/components/platform/SidebarNav";
import { initials } from "@/lib/format";

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-white/10 bg-black/20 p-4 md:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 text-sm font-bold text-white">
            L
          </div>
          <span className="font-semibold text-slate-100">LabBoard</span>
        </Link>

        <SidebarNav />

        <div className="mt-auto">
          <div className="flex items-center gap-2.5 rounded-xl border border-white/10 p-2.5">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ background: user.avatarColor }}
            >
              {initials(user.name)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm text-slate-200">{user.name}</div>
              <div className="text-[11px] text-slate-500">
                {user.role === "teacher" ? "O'qituvchi" : user.role === "admin" ? "Admin" : "Talaba"}
              </div>
            </div>
            <form action={signOutAction} className="ml-auto">
              <button
                type="submit"
                title="Chiqish"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-white/10 hover:text-rose-400"
              >
                <LogOut size={15} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
