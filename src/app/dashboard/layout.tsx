import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 px-5 py-4 backdrop-blur lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                RankCraft Audit
              </p>
              <p className="text-sm text-slate-600">
                SEO audits, GSC visibility, and client reports
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                asChild
                variant="outline"
                className="hidden rounded-xl sm:inline-flex"
              >
                <Link href="/dashboard/projects">View Projects</Link>
              </Button>

              <Button asChild className="rounded-xl">
                <Link href="/dashboard/projects/new">Add Project</Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}