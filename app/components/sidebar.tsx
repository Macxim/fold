'use client';

import Link from "next/link";
import { CurrencySwitcher } from "./currency-switcher";

const navItems = [
  { label: "Overview", href: "/" },
  { label: "Add Entry", href: "/add-entry" },
];

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-border min-h-screen p-8 hidden md:flex flex-col justify-between">
      <div>
        <div className="mb-12">
          <h1 className="text-2xl font-bold tracking-tighter text-foreground uppercase border-b-2 border-accent/50 pb-2 inline-block">
            Fold.
          </h1>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block text-sm py-2 px-3 -mx-3 rounded-none text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all duration-200"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="pt-8 border-t border-border/50">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
          Currency
        </div>
        <CurrencySwitcher />
      </div>
    </aside>
  );
}
