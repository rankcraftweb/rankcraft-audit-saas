import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardMobileNav from "@/components/dashboard-mobile-nav";
import DashboardSidebar from "@/components/dashboard-sidebar";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const email = user.email || "Account";
  const userInitial = email.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#f5f2ea] text-slate-950">
      <DashboardSidebar email={email} userInitial={userInitial} />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-[#e6dcc8] bg-white/95 px-3 py-2.5 backdrop-blur sm:px-5 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#d4af37]/40 bg-[#111111] text-[11px] font-bold text-[#d4af37]">
                RC
              </div>

              <div>
                <p className="text-xs font-bold leading-tight text-slate-950">
                  RankCraft Audit
                </p>
                <p className="text-[10px] leading-tight text-[#9a7a19]">
                  SEO SaaS
                </p>
              </div>
            </Link>

            <div className="hidden lg:block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9a7a19]">
                RankCraft Audit
              </p>
              <p className="text-xs text-slate-500">
                SEO audits, keyword visibility, and client reports
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                asChild
                variant="outline"
                className="hidden h-9 rounded-xl border-[#e6dcc8] bg-white px-3 text-xs text-slate-700 hover:bg-[#faf7ef] sm:inline-flex"
              >
                <Link href="/dashboard/projects">Projects</Link>
              </Button>

              <Button
                asChild
                className="h-9 rounded-xl bg-[#111111] px-3 text-xs text-white hover:bg-black"
              >
                <Link href="/dashboard/projects/new">Add Project</Link>
              </Button>
            </div>
          </div>
        </header>

        <DashboardMobileNav />

        <main className="mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}