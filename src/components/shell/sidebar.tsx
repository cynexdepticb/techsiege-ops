"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { NavIcon } from "@/components/shell/nav-icon";
import { Button } from "@/components/ui/button";
import { cn, initials } from "@/lib/utils";
import type { NavItem } from "@/lib/nav";
import { signOutAction } from "@/app/actions";

type Props = {
  sections: { group: string; items: NavItem[] }[];
  actor: { name: string; email: string; roleLabel: string; verticalLabel: string | null };
};

export function Sidebar({ sections, actor }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const navigation = (
    <nav className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 py-5" aria-label="Operations modules">
      {sections.map((section) => (
        <section key={section.group} aria-label={section.group}>
          <p className="px-3 pb-2 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">{section.group}</p>
          <ul className="space-y-1">
            {section.items.map((item) => {
              const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                      active ? "bg-primary text-primary-foreground shadow-[inset_3px_0_0_var(--foreground)]" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <NavIcon name={item.icon} className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" aria-hidden="true" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );

  const identity = (
    <div className="border-t border-border p-3">
      <div className="flex items-center gap-3 rounded-md bg-secondary/55 p-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-primary font-mono text-xs font-black text-primary-foreground">{initials(actor.name)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{actor.name}</p>
          <p className="truncate text-xs text-muted-foreground">{actor.verticalLabel ?? actor.roleLabel}</p>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" size="icon-sm" title="Sign out" aria-label="Sign out"><LogOut /></Button>
        </form>
      </div>
    </div>
  );

  const rail = (
    <aside className="flex h-full w-72 flex-col border-r border-border bg-card/95">
      <div className="ops-grid-mark flex h-20 items-center border-b border-border px-5">
        <Link href="/admin" onClick={() => setOpen(false)} className="min-w-0">
          <p className="ops-brand-mark">TECHSIEGE // 26</p>
          <p className="mt-1 text-sm font-semibold tracking-[-0.025em] text-foreground">Operations control</p>
        </Link>
      </div>
      {navigation}
      {identity}
    </aside>
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-4 lg:hidden">
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu /></Button>
        <Link href="/admin" className="min-w-0 flex-1"><span className="ops-brand-mark">TECHSIEGE // 26</span><span className="ml-2 text-sm font-semibold">Ops</span></Link>
        <span className="text-xs text-muted-foreground">{actor.roleLabel}</span>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Operations navigation">
          <button type="button" className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} aria-label="Close navigation" />
          <div className="relative h-full shadow-2xl">
            <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Close navigation" className="absolute right-3 top-3 z-10"><X /></Button>
            {rail}
          </div>
        </div>
      )}
      <div className="sticky top-0 hidden h-dvh shrink-0 lg:block">{rail}</div>
    </>
  );
}
