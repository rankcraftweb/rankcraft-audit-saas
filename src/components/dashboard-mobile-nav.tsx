"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const mainNavItems = [
  {
    label: "Overview",
    href: "/dashboard",
    exact: true,
  },
  {
    label: "Projects",
    href: "/dashboard/projects",
    exact: false,
  },
  {
    label: "Billing",
    href: "/pricing",
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

export default function DashboardMobileNav() {
  const pathname = usePathname();
  const projectId = getProjectIdFromPathname(pathname);

  const projectTools = projectId
    ? [
        {
          label: "Overview",
          href: `/dashboard/projects/${projectId}`,
          exact: true,
        },
        {
          label: "Audit",
          href: `/dashboard/projects/${projectId}/audit`,
          exact: false,
        },
        {
          label: "Keywords",
          href: `/dashboard/projects/${projectId}/keywords`,
          exact: false,
        },
        {
          label: "Reports",
          href: `/dashboard/projects/${projectId}/reports`,
          exact: false,
        },
        {
          label: "Recs",
          href: `/dashboard/projects/${projectId}/recommendations`,
          exact: false,
        },
        {
          label: "History",
          href: `/dashboard/projects/${projectId}/history`,
          exact: false,
        },
      ]
    : [];

  return (
    <div className="border-b border-[#2b2413] bg-[#080808] lg:hidden">
      <div className="space-y-1.5 px-3 py-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {mainNavItems.map((item) => {
            const isActive = isActivePath(pathname, item.href, item.exact);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                  isActive
                    ? "border-[#d4af37] bg-[#d4af37] text-black"
                    : "border-[#2b2413] bg-[#111111] text-slate-300"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {projectTools.length > 0 ? (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {projectTools.map((item) => {
              const isActive = isActivePath(pathname, item.href, item.exact);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                    isActive
                      ? "border-[#d4af37] bg-[#d4af37] text-black"
                      : "border-[#2b2413] bg-[#111111] text-slate-300"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}