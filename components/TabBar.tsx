"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Card", icon: "▣" },
  { href: "/share", label: "Share", icon: "◎" },
  { href: "/inbox", label: "Inbox", icon: "▤" },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="tabbar" aria-label="Primary">
      {TABS.map((tab) => {
        const current =
          tab.href === "/"
            ? pathname === "/" || pathname.startsWith("/profile")
            : pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="tab"
            prefetch
            aria-current={current ? "page" : undefined}
          >
            <span aria-hidden="true">{tab.icon}</span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
