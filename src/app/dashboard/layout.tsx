import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  if (!email) {
    return "U";
  }

  return email.slice(0, 1).toUpperCase();
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const navItems = [
    {
      label: "Overview",
      href: "/dashboard",
      description: "Workspace summary",
      shortcut: "O",
    },
    {
      label: "Projects",
      href: "/dashboard/projects",
      description: "Client audit projects",
      shortcut: "P",
    },
    {
      label: "Billing",
      href: "/pricing",
      description: "Plan and pricing",
      shortcut: "B",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f3ea] text-slate-950">
      <div className="flex min-h-screen">
        <aside
          data-sidebar
          className="hidden w-72 shrink-0 border-r border-[#2a2417] bg-[#111111] text-white lg:flex lg:flex-col"
        >
          <div className="border-b border-white/10 p-5">
            <Link href="/dashboard" className="group block">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d4af37]/40 bg-[#d4af37]/10 text-sm font-bold text-[#f5d56a]">
                  RC
                </div>

                <div>
                  <p className="text-sm font-bold tracking-tight text-white">
                    RankCraft Audit
                  </p>
                  <p className="text-xs text-slate-400">
                    SEO SaaS Dashboard
                  </p>
                </div>
              </div>
            </Link>
          </div>

          <nav className="flex-1 space-y-2 p-4">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b6a46a]">
              Main
            </p>

            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 transition hover:border-[#d4af37]/30 hover:bg-white/10"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-[#f5d56a] group-hover:border-[#d4af37]/40 group-hover:bg-[#d4af37]/10">
                  {item.shortcut}
                </span>

                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white">
                    {item.label}
                  </span>
                  <span className="block truncate text-xs text-slate-400">
                    {item.description}
                  </span>
                </span>
              </Link>
            ))}
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#d4af37]/40 bg-[#d4af37]/10 text-sm font-bold text-[#f5d56a]">
                  {getInitial(user.email)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {user.email}
                  </p>
                  <p className="text-xs text-slate-400">Signed in</p>
                </div>
              </div>

              <form action={signOut} className="mt-4">
                <button
                  type="submit"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-[#d4af37]/40 hover:bg-[#d4af37]/10 hover:text-white"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header
            data-header
            className="sticky top-0 z-40 border-b border-[#e6dcc8] bg-[#f7f3ea]/90 backdrop-blur"
          >
            <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 md:px-6">
              <div className="flex items-center gap-3 lg:hidden">
                <Link
                  href="/dashboard"
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#d4af37]/40 bg-[#111111] text-xs font-bold text-[#f5d56a]"
                >
                  RC
                </Link>

                <div>
                  <p className="text-sm font-bold text-slate-950">
                    RankCraft Audit
                  </p>
                  <p className="text-xs text-slate-500">Dashboard</p>
                </div>
              </div>

              <div className="hidden lg:block">
                <p className="text-sm font-semibold text-slate-950">
                  Dashboard
                </p>
                <p className="text-xs text-slate-500">
                  Audit, keywords, reports, and recommendations
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/projects/new"
                  className="hidden rounded-2xl border border-[#d4af37]/50 bg-[#111111] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1b1b1b] sm:inline-flex"
                >
                  Add Project
                </Link>

                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#e6dcc8] bg-white text-sm font-bold text-[#7a5b00]">
                  {getInitial(user.email)}
                </div>
              </div>
            </div>

            <div className="border-t border-[#e6dcc8] bg-white/70 px-4 py-2 lg:hidden">
              <div className="flex gap-2 overflow-x-auto">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="whitespace-nowrap rounded-full border border-[#e6dcc8] bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-[#d4af37]/50 hover:bg-[#fff8df] hover:text-[#7a5b00]"
                  >
                    {item.label}
                  </Link>
                ))}

                <Link
                  href="/dashboard/projects/new"
                  className="whitespace-nowrap rounded-full border border-[#d4af37]/50 bg-[#fff8df] px-4 py-2 text-xs font-semibold text-[#7a5b00]"
                >
                  Add Project
                </Link>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-x-hidden px-4 py-5 md:px-6 md:py-6">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}