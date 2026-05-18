"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/users", label: "Users" },
] as const;

export function AdminTabs() {
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
    </div>
  );
}
