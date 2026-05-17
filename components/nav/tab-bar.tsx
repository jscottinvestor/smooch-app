"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/recipes", label: "Recipes" },
  { href: "/inventory", label: "Ingredients" },
  { href: "/receipts", label: "Receipts" },
] as const;

export function TabBar({ rightSlot }: { rightSlot?: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap items-end justify-between gap-y-2 border-b border-border">
      <nav className="flex gap-6">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "py-3 text-sm border-b-2 -mb-px whitespace-nowrap transition-colors",
                active
                  ? "border-foreground text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {rightSlot && (
        <div className="pb-2 sm:pb-0 sm:py-1.5 w-full sm:w-auto">
          {rightSlot}
        </div>
      )}
    </div>
  );
}
