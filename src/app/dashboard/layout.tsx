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
    <div className="min-h-screen bg-[#f8fafc] text-slate-950">
      <DashboardSidebar email={email} userInitial={userInitial} />

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-3 py-3 backdrop-blur sm:px-5 lg:px-8 lg:py-4">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-xs font-bold text-white">
                RC
              </div>

              <div>
                <p className="text-sm font-bold leading-tight">
                  RankCraft Audit
                </p>
                <p className="text-[11px] leading-tight text-slate-500">
                  SEO SaaS
                </p>
              </div>
            </Link>

            <div className="hidden lg:block">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                RankCraft Audit
              </p>
              <p className="text-sm text-slate-600">
                SEO audits, GSC visibility, and client reports
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <Button
                asChild
                variant="outline"
                className="hidden rounded-xl sm:inline-flex"
              >
                <Link href="/dashboard/projects">View Projects</Link>
              </Button>

              <Button asChild className="h-9 rounded-xl px-3 text-xs sm:h-10 sm:px-4 sm:text-sm">
                <Link href="/dashboard/projects/new">Add Project</Link>
              </Button>
            </div>
          </div>
        </header>

        <DashboardMobileNav />

        <main className="mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}