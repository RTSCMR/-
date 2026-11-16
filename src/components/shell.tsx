import { logoutAction } from "@/lib/actions";
import { Logo } from "./ui";
import { NavLinks, type NavItem } from "./nav";

/** هيكل لوحات التحكم: شريط علوي، وتنقل سفلي ثابت على الجوال. */
export function Shell({ home, name, roleLabel, items, children }: { home: string; name: string; roleLabel: string; items: NavItem[]; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <header className="sticky top-0 z-20 border-b-[1.5px] border-ink bg-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Logo href={home} />
            <NavLinks items={items} variant="top" />
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <span className="min-w-0 text-end leading-tight">
              <span className="block truncate text-[0.95rem] font-semibold">{name}</span>
              <span className="block text-xs text-mute">{roleLabel}</span>
            </span>
            <form action={logoutAction}>
              <button className="btn btn-line btn-sm">خروج</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
      <NavLinks items={items} variant="bottom" />
    </div>
  );
}
