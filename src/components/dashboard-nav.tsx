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

function isActive(pathname: string, item: NavItem) {
  if (item.href === "/dashboard") return pathname === "/dashboard";
  return pathname === item.href || pathname.startsWith(item.activeMatch);
}

export default function DashboardNav({
  items,
  mobile = false,
}: DashboardNavProps) {
  const pathname = usePathname();

  if (mobile) {
    return (
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {items.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                active
                  ? "bg-[#d4af37] text-black"
                  : "bg-[#111111]/5 text-slate-600 hover:bg-[#111111]/10"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <nav className="flex-1 space-y-0.5 px-3 py-4">
      <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b6a46a]">
        Menu
      </p>
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center rounded-xl px-3 py-2.5 text-[13px] font-semibold transition ${
              active
                ? "bg-[#d4af37]/10 text-[#d4af37]"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}