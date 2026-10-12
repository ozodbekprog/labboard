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
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-sm font-bold text-white">
            L
          </div>
          <span className="font-semibold text-slate-900">LabBoard</span>
        </Link>

        <SidebarNav />

        <div className="mt-auto">
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-2.5">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ background: user.avatarColor }}
            >
              {initials(user.name)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm text-slate-800">{user.name}</div>
              <div className="text-[11px] text-slate-400">
                {user.role === "teacher" ? "O'qituvchi" : user.role === "admin" ? "Admin" : "Talaba"}
              </div>
            </div>
            <form action={signOutAction} className="ml-auto">
              <button
                type="submit"
                title="Chiqish"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
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
