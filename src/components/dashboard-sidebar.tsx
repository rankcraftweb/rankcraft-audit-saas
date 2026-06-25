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
    description: "Dashboard",
    exact: true,
  },
  {
    label: "Projects",
    href: "/dashboard/projects",
    description: "Websites",
    exact: false,
  },
  {
    label: "Billing",
    href: "/pricing",
    description: "Plans",
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
          description: "Summary",
          exact: true,
        },
        {
          label: "Run Audit",
          href: `/dashboard/projects/${projectId}/audit`,
          description: "Scan",
          exact: false,
        },
        {
          label: "Keywords",
          href: `/dashboard/projects/${projectId}/keywords`,
          description: "GSC data",
          exact: false,
        },
        {
          label: "Reports",
          href: `/dashboard/projects/${projectId}/reports`,
          description: "Export",
          exact: false,
        },
        {
          label: "Recommendations",
          href: `/dashboard/projects/${projectId}/recommendations`,
          description: "Actions",
          exact: false,
        },
        {
          label: "History",
          href: `/dashboard/projects/${projectId}/history`,
          description: "Past runs",
          exact: false,
        },
      ]
    : [];

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 border-r border-[#2b2413] bg-[#080808] p-4 text-white shadow-sm lg:block">
      <div className="flex h-full flex-col">
        <Link href="/dashboard" className="mb-6 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d4af37]/40 bg-[#111111] text-xs font-bold text-[#d4af37]">
            RC
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-white">
              RankCraft Audit
            </p>
            <p className="text-[11px] text-[#d4af37]">SEO Intelligence</p>
          </div>
        </Link>

        <div className="space-y-5 overflow-y-auto pr-1">
          <nav>
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#b6a46a]">
              Main
            </p>

            <div className="space-y-1">
              {mainNavItems.map((item) => {
                const isActive = isActivePath(pathname, item.href, item.exact);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center justify-between rounded-xl border px-3 py-2.5 transition ${
                      isActive
                        ? "border-[#d4af37]/50 bg-[#d4af37] text-black shadow-sm"
                        : "border-transparent text-slate-300 hover:border-[#d4af37]/30 hover:bg-[#141414] hover:text-white"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold">
                        {item.label}
                      </p>
                      <p
                        className={`truncate text-[11px] ${
                          isActive ? "text-black/70" : "text-slate-500"
                        }`}
                      >
                        {item.description}
                      </p>
                    </div>

                    {isActive ? (
                      <span className="h-2 w-2 rounded-full bg-black" />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </nav>

          {projectId ? (
            <nav>
              <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#b6a46a]">
                Project Tools
              </p>

              <div className="space-y-1">
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
                      className={`group flex items-center justify-between rounded-xl border px-3 py-2.5 transition ${
                        isActive
                          ? "border-[#d4af37]/50 bg-[#d4af37] text-black shadow-sm"
                          : "border-transparent text-slate-300 hover:border-[#d4af37]/30 hover:bg-[#141414] hover:text-white"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold">
                          {item.label}
                        </p>
                        <p
                          className={`truncate text-[11px] ${
                            isActive ? "text-black/70" : "text-slate-500"
                          }`}
                        >
                          {item.description}
                        </p>
                      </div>

                      {isActive ? (
                        <span className="h-2 w-2 rounded-full bg-black" />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </nav>
          ) : null}

          <div className="rounded-xl border border-[#2b2413] bg-[#111111] p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#b6a46a]">
              Focus
            </p>
            <p className="mt-1 text-[13px] font-semibold text-white">
              SEO Monitoring
            </p>
            <p className="mt-1 text-[11px] leading-5 text-slate-400">
              Track audits, keywords, issues, and reports in one workspace.
            </p>
          </div>
        </div>

        <div className="mt-auto space-y-3 pt-4">
          <div className="rounded-xl border border-[#2b2413] bg-[#111111] p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d4af37]/40 bg-[#d4af37] text-xs font-bold text-black">
                {userInitial}
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">
                  {email}
                </p>
                <p className="text-[11px] text-slate-500">Signed in</p>
              </div>
            </div>
          </div>

          <form action="/auth/logout" method="post">
            <Button
              className="h-9 w-full rounded-xl border-[#2b2413] bg-[#111111] text-xs text-slate-200 hover:border-[#d4af37]/40 hover:bg-[#171717] hover:text-white"
              variant="outline"
              type="submit"
            >
              Log out
            </Button>
          </form>
        </div>
      </div>
    </aside>
  );
}