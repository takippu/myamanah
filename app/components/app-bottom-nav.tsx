"use client";

import Link from "next/link";

type NavKey = "home" | "assets" | "debts" | "wishes" | "checklist" | "settings";

type NavItem = {
  key: NavKey;
  label: string;
  href: string;
  icon: string;
};

const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "Home", href: "/dashboard", icon: "home" },
  { key: "assets", label: "Vault", href: "/vault", icon: "lock" },
  { key: "debts", label: "Debts", href: "/debt-records", icon: "receipt_long" },
  { key: "wishes", label: "Digital", href: "/digital-legacy", icon: "menu_book" },
  { key: "checklist", label: "Checklist", href: "/checklist", icon: "check_circle" },
];

const DASHBOARD_NAV_ITEMS: NavItem[] = [
  { key: "home", label: "Home", href: "/dashboard", icon: "home" },
  { key: "assets", label: "Vault", href: "/vault", icon: "lock" },
  { key: "checklist", label: "Checklist", href: "/checklist", icon: "fact_check" },
  { key: "settings", label: "Settings", href: "/settings", icon: "settings" },
];

export function AppBottomNav({ active, mode = "default" }: { active: NavKey; mode?: "default" | "dashboard" }) {
  const items = mode === "dashboard" ? DASHBOARD_NAV_ITEMS : NAV_ITEMS;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 w-[88%] max-w-[360px] -translate-x-1/2 pb-safe">
      <nav className="flex items-center justify-around rounded-[2rem] border border-white/70 bg-[#eef0f4] p-2.5 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.28)]">
        {items.map((item) => {
          const isActive = item.key === active;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-label={item.label}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                isActive
                  ? "bg-emerald-500 text-white shadow-[0_10px_16px_-8px_rgba(16,185,129,0.65)]"
                  : "text-slate-400 hover:text-emerald-600"
              }`}
            >
              <span className={`material-symbols-outlined text-[22px] ${isActive ? "filled" : ""}`}>
                {item.icon}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
