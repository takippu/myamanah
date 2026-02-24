"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppBottomNav } from "../components/app-bottom-nav";
import { CircularProgress } from "../components/circular-progress";
import { HeroSkeleton, CardSkeleton, QuickActionSkeleton } from "../components/skeletons";
import type { VaultData } from "@/lib/vault-data";
import { getVaultStatus, loadVaultData } from "@/lib/vault-client";

function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;
  const cleaned = amountStr.replace(/[^\d.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toFixed(0);
}

export default function DashboardPage() {
  const [vault, setVault] = useState<VaultData | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [vaultUpdatedAt, setVaultUpdatedAt] = useState<string | null>(null);

  const refreshData = async () => {
    try {
      const authRes = await fetch("/api/auth/me", { credentials: "include" });
      if (authRes.ok) {
        const user = await authRes.json();
        setUserEmail(user.email ?? "");
      }
      
      const data = await loadVaultData();
      setVault(data);
      const status = await getVaultStatus();
      setVaultUpdatedAt(status?.updatedAt ?? null);
    } catch {
      // Vault not accessible
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

  const totalAssetValue = useMemo(() => {
    return vault?.assets?.reduce((sum, asset) => sum + parseAmount(asset.value ?? ""), 0) ?? 0;
  }, [vault]);

  const totalDebtAmount = useMemo(() => {
    return vault?.debts?.reduce((sum, debt) => sum + parseAmount(debt.amount ?? ""), 0) ?? 0;
  }, [vault]);

  const netWorth = totalAssetValue - totalDebtAmount;

  const assetCount = vault?.assets?.length ?? 0;
  const debtCount = vault?.debts?.length ?? 0;
  const digitalCount = vault?.digitalLegacy?.length ?? 0;
  const totalRecords = assetCount + debtCount + digitalCount;

  const checklist = useMemo(() => {
    const v = vault;
    return [
      { label: "Assets mapped", done: (v?.assets.length ?? 0) > 0 },
      { label: "Debts recorded", done: (v?.debts.length ?? 0) > 0 },
      {
        label: "Wishes completed",
        done:
          Boolean(v?.wishes.religiousWishes?.trim()) &&
          Boolean(v?.wishes.familyInstructions?.trim()) &&
          Boolean(v?.wishes.executorNotes?.trim()),
      },
      { label: "Trusted contact added", done: (v?.trustedContacts.length ?? 0) > 0 },
      { label: "Recovery key saved", done: Boolean(v?.checklist.recoveryKeySaved) },
      { label: "Recovery tested", done: Boolean(v?.checklist.recoveryTested) },
    ];
  }, [vault]);

  const readiness = useMemo(() => {
    const done = checklist.filter((c) => c.done).length;
    return checklist.length === 0 ? 0 : Math.round((done / checklist.length) * 100);
  }, [checklist]);

  const doneCount = checklist.filter((c) => c.done).length;

  const wishFields = [
    vault?.wishes.religiousWishes?.trim(),
    vault?.wishes.familyInstructions?.trim(),
    vault?.wishes.executorNotes?.trim(),
    vault?.wishes.distributionNotes?.trim(),
  ];
  const wishCompleted = wishFields.filter(Boolean).length;
  const wishTotal = 4;

  const hijriDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-TN-u-ca-islamic", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date());
    } catch {
      return new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });
    }
  }, []);

  const lastSyncedLabel = useMemo(() => {
    if (!vaultUpdatedAt) return "not synced yet";
    const diffMs = Date.now() - new Date(vaultUpdatedAt).getTime();
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diffMs < minute) return "just now";
    if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
    if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
    return `${Math.floor(diffMs / day)}d ago`;
  }, [vaultUpdatedAt]);

  const displayName = useMemo(() => {
    if (!userEmail) return "Guest";
    const name = userEmail.split("@")[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, [userEmail]);

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans text-slate-800 antialiased">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-x-hidden bg-[#F2F2F7]">
        <header className="sticky top-0 z-30 flex items-center justify-between bg-[#F2F2F7]/70 px-6 py-5 backdrop-blur-lg">
          <Link
            href="/settings"
            aria-label="Open settings"
            className="glass-card flex h-12 w-12 items-center justify-center rounded-2xl transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-slate-600">settings</span>
          </Link>
          <div className="flex gap-3">
            <Link
              href="/checklist"
              aria-label="Checklist"
              className="glass-card flex h-12 w-12 items-center justify-center rounded-2xl transition-transform active:scale-95"
            >
              <span className="material-symbols-outlined text-slate-600">fact_check</span>
            </Link>
            <Link
              href="/settings"
              className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-emerald-900 text-white shadow-lg"
            >
              <span className="material-symbols-outlined">person</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 space-y-4 px-5 pb-36">
          <div className="pt-1">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">{hijriDate}</p>
            <h1 className="text-[39px] font-light leading-[1.02] tracking-[-0.02em] text-slate-900">
              Salaam, <span className="font-semibold">{displayName}</span>
            </h1>
          </div>

          {/* Readiness Progress Card with Circular Progress */}
          {isLoading ? (
            <HeroSkeleton />
          ) : (
            <div className="dashboard-islamic-pattern group relative overflow-hidden rounded-[2.2rem] shadow-[0_16px_30px_-16px_rgba(0,0,0,0.5)] transition-all duration-500 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 to-transparent" />
              <div className="relative flex items-center gap-5 p-6">
                <CircularProgress value={readiness} size={90} strokeWidth={8} />
                <div className="flex-1">
                  <p className="text-xs font-medium uppercase tracking-widest text-emerald-200/60">Readiness</p>
                  <h2 className="text-2xl font-light tracking-tight text-white">
                    <span className="font-bold">{doneCount}</span>
                    <span className="text-lg text-emerald-200">/{checklist.length}</span>
                  </h2>
                  <p className="text-sm text-emerald-100/80">
                    {doneCount === checklist.length ? "All complete!" : `${checklist.length - doneCount} remaining`}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-emerald-200/50">
                    <span className="material-symbols-outlined text-[14px]">sync</span>
                    {`Last updated ${lastSyncedLabel}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/vault"
                className="glass-card rounded-[1.5rem] border border-[#e4e6eb] bg-white p-5 shadow-[0_10px_24px_-18px_rgba(0,0,0,0.35)] transition-all active:scale-95"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] mb-3">
                  <span className="material-symbols-outlined">inventory_2</span>
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Records</p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900">{totalRecords}</h3>
              </Link>

              <Link
                href="/vault"
                className="glass-card rounded-[1.5rem] border border-[#e4e6eb] bg-white p-5 shadow-[0_10px_24px_-18px_rgba(0,0,0,0.35)] transition-all active:scale-95"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 mb-3">
                  <span className="material-symbols-outlined">account_balance_wallet</span>
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Net Worth</p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900">{`RM${formatCurrency(netWorth)}`}</h3>
              </Link>
            </div>
          )}

          {/* Main Action Cards */}
          {isLoading ? (
            <div className="space-y-4">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              <Link
                href="/asset-records"
                className="glass-card group relative rounded-[2rem] border border-[#e4e6eb] p-6 shadow-[0_12px_28px_-18px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-1"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D4AF37]/10 text-[#D4AF37]">
                    <span className="material-symbols-outlined">payments</span>
                  </div>
                  <span className="material-symbols-outlined text-slate-400">arrow_forward_ios</span>
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Assets</p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-900">{`${assetCount} records`}</h3>
                <p className="mt-1 text-sm text-slate-400">{`Value: RM${formatCurrency(totalAssetValue)}`}</p>
              </Link>

              <Link
                href="/debt-records"
                className="glass-card group relative rounded-[2rem] border border-[#e4e6eb] p-6 shadow-[0_12px_28px_-18px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-1"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                    <span className="material-symbols-outlined">receipt_long</span>
                  </div>
                  <span className="material-symbols-outlined text-slate-400">arrow_forward_ios</span>
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Debts</p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-900">{`${debtCount} records`}</h3>
                <p className="mt-1 text-sm text-slate-400">{`Total: RM${formatCurrency(totalDebtAmount)}`}</p>
              </Link>

              <Link
                href="/wishes"
                className="glass-card rounded-[2rem] border border-[#e4e6eb] p-6 shadow-[0_12px_28px_-18px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-1"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <span className="material-symbols-outlined">auto_stories</span>
                  </div>
                  <span className="material-symbols-outlined text-slate-300">arrow_forward_ios</span>
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Wishes & Instructions</p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-900">{`${wishCompleted}/${wishTotal} completed`}</h3>
                <div className="mt-3 flex items-center gap-3">
                  <span className={`rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                    wishCompleted === wishTotal 
                      ? "bg-emerald-100 text-emerald-700" 
                      : "bg-amber-100/50 text-amber-700"
                  }`}>
                    {wishCompleted === wishTotal ? "Completed" : "In Progress"}
                  </span>
                </div>
              </Link>
            </div>
          )}

          {/* Quick Actions */}
          {isLoading ? (
            <QuickActionSkeleton />
          ) : (
            <div className="pt-4">
              <p className="mb-3 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Quick Actions</p>
              <div className="no-scrollbar flex gap-4 overflow-x-auto pb-6 px-1">
                <Link
                  href="/asset-records"
                  className="glass-card flex flex-shrink-0 items-center gap-3 rounded-2xl border border-[#e4e6eb] px-6 py-4 shadow-[0_10px_24px_-18px_rgba(0,0,0,0.35)] transition-all active:scale-95"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white">
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </div>
                  <span className="whitespace-nowrap text-sm font-semibold">Add Asset</span>
                </Link>
                <Link
                  href="/debt-records"
                  className="glass-card flex flex-shrink-0 items-center gap-3 rounded-2xl border border-[#e4e6eb] px-6 py-4 shadow-[0_10px_24px_-18px_rgba(0,0,0,0.35)] transition-all active:scale-95"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500 text-white">
                    <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  </div>
                  <span className="whitespace-nowrap text-sm font-semibold">Add Debt</span>
                </Link>
                <Link
                  href="/digital-legacy"
                  className="glass-card flex flex-shrink-0 items-center gap-3 rounded-2xl border border-[#e4e6eb] px-6 py-4 shadow-[0_10px_24px_-18px_rgba(0,0,0,0.35)] transition-all active:scale-95"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500 text-white">
                    <span className="material-symbols-outlined text-[18px]">fingerprint</span>
                  </div>
                  <span className="whitespace-nowrap text-sm font-semibold">Digital</span>
                </Link>
              </div>
            </div>
          )}
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
          <AppBottomNav active="home" mode="dashboard" />
        )}
      </div>
    </div>
  );
}
