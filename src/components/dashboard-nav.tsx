"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  activeMatch: string;
};

type DashboardNavProps = {
  items: NavItem[];
  mobile?: boolean;
};

function isActivePath(pathname: string, item: NavItem) {
  if (item.href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === item.href || pathname.startsWith(item.activeMatch);
}

export default function DashboardNav({
  items,
  mobile = false,
}: DashboardNavProps) {
  const pathname = usePathname();

  if (mobile) {
    return (
      <div className="flex gap-2 overflow-x-auto">
        {items.map((item) => {
          const isActive = isActivePath(pathname, item);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive
                  ? "whitespace-nowrap rounded-full border border-[#d4af37]/60 bg-[#fff8df] px-4 py-2 text-xs font-semibold text-[#7a5b00]"
                  : "whitespace-nowrap rounded-full border border-[#e6dcc8] bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-[#d4af37]/50 hover:bg-[#fff8df] hover:text-[#7a5b00]"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <nav className="flex-1 space-y-2 p-4">
      <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b6a46a]">
        Menu
      </p>

      {items.map((item) => {
        const isActive = isActivePath(pathname, item);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActive
                ? "flex items-center rounded-2xl border border-[#d4af37]/40 bg-[#d4af37]/10 px-4 py-3 text-sm font-semibold text-white"
                : "flex items-center rounded-2xl border border-transparent px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-[#d4af37]/30 hover:bg-white/10 hover:text-white"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}