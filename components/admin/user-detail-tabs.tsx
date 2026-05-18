"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function UserDetailTabs({ userId }: { userId: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/admin/users/${userId}/recipes`, label: "Recipes" },
    { href: `/admin/users/${userId}/ingredients`, label: "Ingredients" },
    { href: `/admin/users/${userId}/receipts`, label: "Receipts" },
  ];

  return (
    <nav className="flex gap-4 border-b border-border">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "py-2 text-sm border-b-2 -mb-px whitespace-nowrap transition-colors",
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
  );
}
