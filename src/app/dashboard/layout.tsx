import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

const navItems = [
  {
    label: "Overview",
    href: "/dashboard",
    description: "Main dashboard",
  },
  {
    label: "Projects",
    href: "/dashboard/projects",
    description: "Websites & audits",
  },
  {
    label: "Billing",
    href: "/pricing",
    description: "Plans & limits",
  },
];

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
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 border-r border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur lg:block">
        <div className="flex h-full flex-col">
          <Link href="/dashboard" className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
              RC
            </div>

            <div>
              <p className="text-lg font-bold tracking-tight">
                RankCraft Audit
              </p>
              <p className="text-xs text-slate-500">
                SEO Intelligence SaaS
              </p>
            </div>
          </Link>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group block rounded-2xl border border-transparent px-4 py-3 transition hover:border-slate-200 hover:bg-slate-50"
              >
                <p className="text-sm font-medium text-slate-900">
                  {item.label}
                </p>
                <p className="text-xs text-slate-500">
                  {item.description}
                </p>
              </Link>
            ))}
          </nav>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Current Focus
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-950">
              Technical SEO Monitoring
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Track audits, issues, keyword visibility, and client-ready
              reports from one dashboard.
            </p>
          </div>

          <div className="mt-auto space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                  {userInitial}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-950">
                    {email}
                  </p>
                  <p className="text-xs text-slate-500">Signed in</p>
                </div>
              </div>
            </div>

            <form action="/auth/logout" method="post">
              <Button className="w-full rounded-xl" variant="outline" type="submit">
                Log out
              </Button>
            </form>
          </div>
        </div>
      </aside>

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
              <Button asChild variant="outline" className="hidden rounded-xl sm:inline-flex">
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