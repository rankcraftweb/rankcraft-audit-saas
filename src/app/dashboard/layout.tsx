import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardNav from "@/components/dashboard-nav";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function getInitial(email: string | undefined) {
  if (!email) return "U";
  return email.slice(0, 1).toUpperCase();
}

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    activeMatch: "/dashboard",
  },
  {
    label: "SEO Audit",
    href: "/dashboard/projects",
    activeMatch: "/dashboard/projects",
  },
  {
    label: "Billing",
    href: "/dashboard/billing",
    activeMatch: "/dashboard/billing",
  },
];

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-[#f7f3ea]">
      <div className="flex min-h-screen">

        {/* Sidebar — desktop only */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-[#2a2417] bg-[#111111] lg:flex">

          {/* Logo */}
          <div className="border-b border-white/10 px-4 py-4">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/10 text-[11px] font-bold text-[#f5d56a]">
                RC
              </div>
              <p className="text-sm font-bold tracking-tight text-white">
                RankCraft Audit
              </p>
            </Link>
          </div>

          {/* Nav */}
          <DashboardNav items={navItems} />

          {/* User + sign out */}
          <div className="border-t border-white/10 p-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#d4af37]/20 text-[11px] font-bold text-[#f5d56a]">
                  {getInitial(user.email)}
                </div>
                <p className="min-w-0 flex-1 truncate text-[11px] text-slate-300">
                  {user.email}
                </p>
              </div>
              <form action={signOut} className="mt-2.5">
                <button
                  type="submit"
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* Top header */}
          <header className="sticky top-0 z-40 border-b border-[#e6dcc8] bg-[#f7f3ea]/90 backdrop-blur">
            <div className="flex h-14 items-center justify-between gap-4 px-4 md:px-5">

              {/* Mobile logo */}
              <Link
                href="/dashboard"
                className="flex items-center gap-2 lg:hidden"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#d4af37]/40 bg-[#111111] text-[10px] font-bold text-[#f5d56a]">
                  RC
                </div>
                <p className="text-sm font-bold text-slate-950">
                  RankCraft Audit
                </p>
              </Link>

              {/* Desktop spacer */}
              <div className="hidden lg:block" />

              {/* User avatar */}
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e6dcc8] bg-white text-xs font-bold text-[#7a5b00]">
                {getInitial(user.email)}
              </div>
            </div>

            {/* Mobile nav pills */}
            <div className="border-t border-[#e6dcc8] bg-white/60 px-4 py-2 lg:hidden">
              <DashboardNav items={navItems} mobile />
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-x-hidden px-4 py-5 md:px-5 md:py-6">
            <div className="mx-auto w-full max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}