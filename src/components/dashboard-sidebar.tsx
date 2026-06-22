"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

type DashboardSidebarProps = {
  email: string;
  userInitial: string;
};

const mainNavItems = [
  {
    label: "Overview",
    href: "/dashboard",
    description: "Main dashboard",
    exact: true,
  },
  {
    label: "Projects",
    href: "/dashboard/projects",
    description: "Websites & audits",
    exact: false,
  },
  {
    label: "Billing",
    href: "/pricing",
    description: "Plans & limits",
    exact: false,
  },
];

function getProjectIdFromPathname(pathname: string) {
  const match = pathname.match(/^\/dashboard\/projects\/([^/]+)/);

  if (!match?.[1] || match[1] === "new") {
    return null;
  }

  return match[1];
}

function isActivePath(pathname: string, href: string, exact?: boolean) {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardSidebar({
  email,
  userInitial,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const projectId = getProjectIdFromPathname(pathname);

  const projectTools = projectId
    ? [
        {
          label: "Project Overview",
          href: `/dashboard/projects/${projectId}`,
          description: "Project summary",
          exact: true,
        },
        {
          label: "Run Audit",
          href: `/dashboard/projects/${projectId}/audit`,
          description: "SEO and performance scan",
          exact: false,
        },
        {
          label: "Keywords",
          href: `/dashboard/projects/${projectId}/keywords`,
          description: "Search Console data",
          exact: false,
        },
        {
          label: "Reports",
          href: `/dashboard/projects/${projectId}/reports`,
          description: "Client-ready report",
          exact: false,
        },
        {
          label: "Recommendations",
          href: `/dashboard/projects/${projectId}/recommendations`,
          description: "SEO action plan",
          exact: false,
        },
        {
          label: "History",
          href: `/dashboard/projects/${projectId}/history`,
          description: "Previous audit runs",
          exact: false,
        },
      ]
    : [];

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 border-r border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur lg:block">
      <div className="flex h-full flex-col">
        <Link href="/dashboard" className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
            RC
          </div>

          <div>
            <p className="text-lg font-bold tracking-tight">RankCraft Audit</p>
            <p className="text-xs text-slate-500">SEO Intelligence SaaS</p>
          </div>
        </Link>

        <div className="space-y-7 overflow-y-auto pr-1">
          <nav>
            <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Main
            </p>

            <div className="space-y-2">
              {mainNavItems.map((item) => {
                const isActive = isActivePath(pathname, item.href, item.exact);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group block rounded-2xl border px-4 py-3 transition ${
                      isActive
                        ? "border-slate-900 bg-slate-950 text-white shadow-sm"
                        : "border-transparent text-slate-900 hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <p
                      className={`text-sm font-medium ${
                        isActive ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {item.label}
                    </p>
                    <p
                      className={`text-xs ${
                        isActive ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      {item.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </nav>

          {projectId ? (
            <nav>
              <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Project Tools
              </p>

              <div className="space-y-2">
                {projectTools.map((item) => {
                  const isActive = isActivePath(
                    pathname,
                    item.href,
                    item.exact
                  );

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group block rounded-2xl border px-4 py-3 transition ${
                        isActive
                          ? "border-slate-900 bg-slate-950 text-white shadow-sm"
                          : "border-transparent text-slate-900 hover:border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <p
                        className={`text-sm font-medium ${
                          isActive ? "text-white" : "text-slate-900"
                        }`}
                      >
                        {item.label}
                      </p>
                      <p
                        className={`text-xs ${
                          isActive ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        {item.description}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </nav>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Current Focus
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-950">
              Technical SEO Monitoring
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Track audits, issues, keyword visibility, and client-ready reports
              from one dashboard.
            </p>
          </div>
        </div>

        <div className="mt-auto space-y-4 pt-5">
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
  );
}