import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed left-0 top-0 h-screen w-64 border-r bg-muted/30 p-6">
        <div className="mb-8">
          <h1 className="text-xl font-bold">RankCraft Audit</h1>
          <p className="text-sm text-muted-foreground">SEO SaaS Dashboard</p>
        </div>

        <nav className="space-y-2 text-sm">
          <Link className="block rounded-lg px-3 py-2 hover:bg-muted" href="/dashboard">
            Overview
          </Link>
          <Link className="block rounded-lg px-3 py-2 hover:bg-muted" href="/dashboard/projects">
            Projects
          </Link>
          <Link className="block rounded-lg px-3 py-2 hover:bg-muted" href="/pricing">
            Billing
          </Link>
        </nav>
      </aside>

      <main className="ml-64 p-8">{children}</main>
    </div>
  );
}