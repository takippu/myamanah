"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppBottomNav } from "../components/app-bottom-nav";
import { CategoryCardSkeleton } from "../components/skeletons";
import { loadVaultData } from "@/lib/vault-client";

function formatLastUpdated(dateStr: string | null): string {
  if (!dateStr) return "Never updated";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function VaultPage() {
  const [counts, setCounts] = useState({
    debts: 0,
    assets: 0,
    digitalLegacy: 0,
    wishes: 0,
    total: 0,
  });
  const [wishesComplete, setWishesComplete] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = async () => {
    try {
      const vault = await loadVaultData();
      const debts = vault?.debts?.length ?? 0;
      const assets = vault?.assets?.length ?? 0;
      const digitalLegacy = vault?.digitalLegacy?.length ?? 0;
      
      const wishesFilled = [
        vault?.wishes?.religiousWishes?.trim(),
        vault?.wishes?.familyInstructions?.trim(),
        vault?.wishes?.distributionNotes?.trim(),
        vault?.wishes?.executorNotes?.trim(),
      ].filter(Boolean).length;
      
      setCounts({
        debts,
        assets,
        digitalLegacy,
        wishes: wishesFilled,
        total: debts + assets + digitalLegacy,
      });
      setWishesComplete(wishesFilled === 4);
      setLastUpdated(vault?.meta?.updatedAt ?? null);
    } catch {
      // Vault not accessible, keep counts at 0
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshData();
  }, []);

  // Refresh when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshData();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const formattedTotal = String(counts.total).padStart(2, "0");

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans text-slate-800 antialiased">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-x-hidden bg-[#F2F2F7]">
        <header className="sticky top-0 z-30 flex items-center justify-between bg-[#F2F2F7]/50 px-6 py-6 backdrop-blur-lg">
          <Link
            href="/dashboard"
            className="glass-card flex h-12 w-12 items-center justify-center rounded-2xl transition-transform active:scale-95"
            aria-label="Back to dashboard"
          >
            <span className="material-symbols-outlined text-slate-600">arrow_back</span>
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Secure Vault</h1>
          <button
            className="glass-card flex h-12 w-12 items-center justify-center rounded-2xl text-emerald-600 transition-transform active:scale-95"
            aria-label="Vault help"
            type="button"
          >
            <span className="material-symbols-outlined">help_outline</span>
          </button>
        </header>

        <main className="flex-1 space-y-8 px-6 pb-32">
          {isLoading ? (
            // Skeleton Hero
            <div className="relative mt-4 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-300 to-slate-400 p-10 animate-pulse">
              <div className="flex flex-col items-center gap-6">
                <div className="h-20 w-20 rounded-[2rem] bg-slate-200" />
                <div className="space-y-3 text-center">
                  <div className="h-3 w-24 mx-auto rounded bg-slate-200" />
                  <div className="h-10 w-32 mx-auto rounded bg-slate-200" />
                  <div className="h-6 w-28 mx-auto rounded-full bg-slate-200" />
                </div>
              </div>
            </div>
          ) : (
            <div className="dashboard-islamic-pattern relative mt-4 overflow-hidden rounded-[2.5rem] shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/60 to-emerald-800/20" />
              <div className="relative flex flex-col items-center gap-6 p-10 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] border border-white/20 bg-white/10 shadow-xl backdrop-blur-md">
                  <span className="material-symbols-outlined text-[40px] font-light text-white">verified_user</span>
                </div>
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-200/60">
                    Total Records
                  </p>
                  <h2 className="text-3xl font-light tracking-tight text-white">
                    <span className="font-bold">{formattedTotal}</span>
                    <span className="ml-2 text-xl text-emerald-200">items</span>
                  </h2>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-5 py-2 backdrop-blur-sm">
                    <span className="material-symbols-outlined text-[16px] text-emerald-300">update</span>
                    <span className="text-[11px] font-medium uppercase tracking-widest text-emerald-100">
                      {formatLastUpdated(lastUpdated)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <section className="space-y-4">
            <p className="ml-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
              Vault Categories
            </p>

            {isLoading ? (
              <>
                <CategoryCardSkeleton />
                <CategoryCardSkeleton />
                <CategoryCardSkeleton />
                <CategoryCardSkeleton />
              </>
            ) : (
              <>
                <CategoryCard
                  href="/debt-records"
                  icon="receipt_long"
                  title="Debt Records"
                  subtitle="Outstanding liabilities and due dates"
                  badge={counts.debts}
                />
                <CategoryCard
                  href="/asset-records"
                  icon="account_balance_wallet"
                  title="Asset Records"
                  subtitle="Ownership, where-to-find, and key contacts"
                  badge={counts.assets}
                />
                <CategoryCard
                  href="/digital-legacy"
                  icon="fingerprint"
                  title="Digital Legacy"
                  subtitle="Social media, email, cloud accounts access"
                  badge={counts.digitalLegacy}
                />
                <CategoryCard
                  href="/wishes"
                  icon="auto_stories"
                  title="Wishes & Instructions"
                  subtitle="Religious wishes, family instructions, executor notes"
                  badge={wishesComplete ? "✓" : counts.wishes > 0 ? `${counts.wishes}/4` : undefined}
                  badgeVariant={wishesComplete ? "success" : counts.wishes > 0 ? "partial" : undefined}
                />
              </>
            )}
          </section>
        </main>

        {isLoading ? (
          <div className="glass fixed bottom-0 left-0 right-0 border-t border-white/50 bg-white/80 pb-6 pt-3">
            <div className="mx-auto flex max-w-md justify-around px-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-6 w-12 animate-pulse rounded bg-slate-200" />
              ))}
            </div>
          </div>
        ) : (
          <AppBottomNav active="assets" mode="dashboard" />
        )}
      </div>
    </div>
  );
}

function CategoryCard({
  href,
  icon,
  title,
  subtitle,
  badge,
  badgeVariant,
}: {
  href: string;
  icon: string;
  title: string;
  subtitle: string;
  badge?: number | string;
  badgeVariant?: "success" | "partial";
}) {
  const getBadgeClasses = () => {
    if (badgeVariant === "success") {
      return "bg-emerald-600 text-white";
    }
    if (badgeVariant === "partial") {
      return "bg-amber-500 text-white";
    }
    return "bg-emerald-600 text-white";
  };

  const showBadge = badge !== undefined && (typeof badge === "string" || badge > 0);

  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-[1.75rem] border border-[#e4e6eb] bg-white p-5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.06)] transition-all active:scale-[0.98]"
    >
      <div className="flex items-center gap-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <span className="material-symbols-outlined text-[28px]">{icon}</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {showBadge && (
              <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${getBadgeClasses()}`}>
                {badge}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <span className="material-symbols-outlined font-light text-[#D4AF37]">chevron_right</span>
    </Link>
  );
}
