"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { BarChart3 } from "lucide-react";
import { navItems } from "@/components/layout/nav-items";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col justify-between bg-primary p-4">
      <div>
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-lime text-primary">
            <BarChart3 size={18} />
          </div>
          <span className="font-[family-name:var(--font-ui)] font-semibold text-paper">InvestView</span>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors duration-200",
                  active ? "bg-lime text-primary" : "text-paper/70 hover:bg-paper/10 hover:text-paper"
                )}
              >
                <Icon size={18} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <p className="px-2 text-xs text-paper/50">Course demo build</p>
    </aside>
  );
}
