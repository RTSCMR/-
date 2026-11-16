"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; exact?: boolean; badge?: number };

export function NavLinks({ items, variant }: { items: NavItem[]; variant: "top" | "bottom" }) {
  const path = usePathname();
  const active = (it: NavItem) => (it.exact ? path === it.href : path === it.href || path.startsWith(it.href + "/"));
  if (variant === "top") {
    return (
      <nav className="hidden items-center gap-1 md:flex" aria-label="التنقل">
        {items.map((it) => (
          <Link key={it.href} href={it.href} aria-current={active(it) ? "page" : undefined}
            className={`rounded-[3px] px-3 py-2 font-semibold ${active(it) ? "bg-ink text-paper" : "hover:bg-ink/5"}`}>
            {it.label}
            {!!it.badge && <span className="num ms-2 rounded-[3px] bg-flame px-1.5 py-0.5 text-sm text-white">{it.badge}</span>}
          </Link>
        ))}
      </nav>
    );
  }
  return (
    <nav aria-label="التنقل" className="fixed inset-x-0 bottom-0 z-20 grid border-t-[1.5px] border-ink bg-paper pb-[env(safe-area-inset-bottom)] md:hidden"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((it) => (
        <Link key={it.href} href={it.href} aria-current={active(it) ? "page" : undefined}
          className={`relative flex min-h-14 items-center justify-center px-1 text-center text-[0.9rem] font-semibold leading-tight ${active(it) ? "bg-ink text-paper" : ""}`}>
          {it.label}
          {!!it.badge && <span className="num absolute start-2 top-1.5 rounded-[3px] bg-flame px-1 py-0.5 text-xs text-white">{it.badge}</span>}
        </Link>
      ))}
    </nav>
  );
}
