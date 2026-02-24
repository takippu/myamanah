"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppBottomNav } from "../components/app-bottom-nav";
import { ChecklistItemSkeleton, QuickActionSkeleton } from "../components/skeletons";
import { emptyVaultData, type VaultData } from "@/lib/vault-data";
import { getVaultStatus, loadVaultData, markRecoveryVerified, saveVaultData } from "@/lib/vault-client";

type ChecklistItem = {
  id: string;
  label: string;
  desc: string;
  done: boolean;
  href?: string;
};

export default function ChecklistPage() {
  const [vault, setVault] = useState<VaultData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [recoveryVerifiedAt, setRecoveryVerifiedAt] = useState<string | null>(null);
  const [vaultUpdatedAt, setVaultUpdatedAt] = useState<string | null>(null);

  const refreshData = async () => {
    try {
      const data = await loadVaultData();
      setVault(data ?? emptyVaultData());
      const status = await getVaultStatus();
      setRecoveryVerifiedAt(status?.recoveryVerifiedAt ?? null);
      setVaultUpdatedAt(status?.updatedAt ?? null);
    } catch {
      setVault(emptyVaultData());
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

  const items = useMemo<ChecklistItem[]>(() => {
    const v = vault ?? emptyVaultData();
    return [
      {
        id: "assets",
        label: "Assets mapped",
        desc: "Store what exists, where to find it, and contact person.",
        done: v.assets.length > 0,
        href: "/asset-records",
      },
      {
        id: "debts",
        label: "Debts recorded",
        desc: "Document liabilities clearly for settlement.",
        done: v.debts.length > 0,
        href: "/debt-records",
      },
      {
        id: "digital",
        label: "Digital legacy added",
        desc: "At least one digital platform entry is available.",
        done: (v.digitalLegacy?.length ?? 0) > 0,
        href: "/digital-legacy",
      },
      {
        id: "wishes",
        label: "Wishes completed",
        desc: "Religious, family, and executor instructions are set.",
        done:
          Boolean(v.wishes.religiousWishes.trim()) &&
          Boolean(v.wishes.familyInstructions.trim()) &&
          Boolean(v.wishes.executorNotes.trim()),
        href: "/wishes",
      },
      {
        id: "contacts",
        label: "Trusted contact added",
        desc: "At least one trusted contact is available.",
        done: v.trustedContacts.length > 0,
      },
      {
        id: "recovery_saved",
        label: "Recovery key saved",
        desc: "Recovery key has been stored securely offline.",
        done: Boolean(v.checklist.recoveryKeySaved),
      },
      {
        id: "recovery_tested",
        label: "Recovery tested",
        desc: "A restore drill has been completed successfully.",
        done: Boolean(v.checklist.recoveryTested) || Boolean(recoveryVerifiedAt),
      },
    ];
  }, [vault, recoveryVerifiedAt]);

  const doneCount = useMemo(() => items.filter((item) => item.done).length, [items]);

  const lastSyncedLabel = useMemo(() => {
    if (!vaultUpdatedAt) return "not synced yet";
    const diffMs = Date.now() - new Date(vaultUpdatedAt).getTime();
    const minute = 60_000;
    const hour = 60 * minute;
    if (diffMs < minute) return "just now";
    if (diffMs < hour) return `${Math.floor(diffMs / minute)} minutes ago`;
    return `${Math.floor(diffMs / hour)} hours ago`;
  }, [vaultUpdatedAt]);

  const updateRecovery = async (key: "recoveryKeySaved" | "recoveryTested", value: boolean) => {
    const base = vault ?? emptyVaultData();
    const next: VaultData = {
      ...base,
      checklist: {
        ...base.checklist,
        [key]: value,
      },
    };
    setVault(next);
    try {
      await saveVaultData(next);
      if (key === "recoveryTested" && value) {
        await markRecoveryVerified();
        const status = await getVaultStatus();
        setRecoveryVerifiedAt(status?.recoveryVerifiedAt ?? null);
      }
      setStatusMessage("Checklist saved.");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      setStatusMessage("Cloud sync failed.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans text-slate-800 antialiased">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-x-hidden bg-[#F2F2F7]">
        {/* Sticky Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between bg-[#F2F2F7]/70 px-6 py-5 backdrop-blur-lg">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="glass-card flex h-12 w-12 items-center justify-center rounded-2xl transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-slate-600">arrow_back</span>
          </Link>
          <h1 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-600">Checklist</h1>
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-emerald-900 text-white shadow-lg">
            <span className="material-symbols-outlined">fact_check</span>
          </div>
        </header>

        <main className="flex-1 space-y-6 px-5 pb-36 pt-4">
          {/* Hero Card */}
          {isLoading ? (
            <div className="relative overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-slate-300 to-slate-400 p-8 animate-pulse">
              <div className="flex flex-col items-center gap-6 text-center">
                <div className="h-16 w-16 rounded-[1.5rem] bg-slate-200" />
                <div className="space-y-3">
                  <div className="h-3 w-32 mx-auto rounded bg-slate-200" />
                  <div className="h-8 w-24 mx-auto rounded bg-slate-200" />
                  <div className="h-4 w-40 mx-auto rounded-full bg-slate-200" />
                </div>
              </div>
            </div>
          ) : (
            <div className="dashboard-islamic-pattern relative overflow-hidden rounded-[2.2rem] shadow-[0_16px_30px_-16px_rgba(0,0,0,0.5)]">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/60 to-emerald-800/20" />
              <div className="relative flex flex-col items-center gap-6 p-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-white/20 bg-white/10 shadow-xl backdrop-blur-md">
                  <span className="material-symbols-outlined text-[32px] text-white">fact_check</span>
                </div>
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-200/60">
                    Readiness Progress
                  </p>
                  <h2 className="text-3xl font-light tracking-tight text-white">
                    <span className="font-bold">{doneCount}</span>
                    <span className="text-xl text-emerald-200"> / {items.length}</span>
                  </h2>
                  <p className="mt-2 text-sm text-emerald-100/80">
                    {doneCount === items.length ? "All tasks complete!" : `${items.length - doneCount} remaining`}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 backdrop-blur-sm">
                    <span className="material-symbols-outlined text-[14px] text-emerald-300">sync</span>
                    <span className="text-[11px] font-medium text-emerald-100">
                      {`Last updated ${lastSyncedLabel}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Status Message */}
          {statusMessage ? (
            <div className="glass-card rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3">
              <p className="text-xs font-medium text-emerald-700">{statusMessage}</p>
            </div>
          ) : null}

          {/* Checklist Items */}
          {isLoading ? (
            <div className="space-y-3">
              <ChecklistItemSkeleton />
              <ChecklistItemSkeleton />
              <ChecklistItemSkeleton />
              <ChecklistItemSkeleton />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Setup Tasks</p>
              
              {items.map((item) => {
                const cardContent = (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${
                          item.done
                            ? "bg-emerald-500 text-white shadow-[0_8px_16px_-8px_rgba(16,185,129,0.6)]"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        <span className="material-symbols-outlined filled">
                          {item.done ? "check_circle" : "radio_button_unchecked"}
                        </span>
                      </div>
                      <div className="pt-1">
                        <h3 className={`text-base font-semibold ${item.done ? "text-emerald-800" : "text-slate-900"}`}>
                          {item.label}
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.desc}</p>
                      </div>
                    </div>
                    <span
                      className={`flex-shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                        item.done
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.done ? "Done" : "Pending"}
                    </span>
                  </div>
                );

                const cardClassName = `glass-card block rounded-[1.8rem] border border-[#e4e6eb] p-5 shadow-[0_8px_20px_-14px_rgba(0,0,0,0.25)] transition-all duration-300 hover:-translate-y-[2px] ${
                  item.done ? "bg-emerald-50/60" : "bg-white/60"
                }`;
                
                return item.href ? (
                  <Link key={item.id} href={item.href} className={cardClassName}>
                    {cardContent}
                  </Link>
                ) : (
                  <div key={item.id} className={cardClassName}>
                    {cardContent}
                  </div>
                );
              })}
            </div>
          )}

          {/* Recovery Actions Section */}
          <div className="pt-4">
            <p className="mb-3 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Recovery Actions</p>
            
            <div className="glass-card rounded-[1.8rem] border border-[#e4e6eb] bg-white/60 p-5 shadow-[0_8px_20px_-14px_rgba(0,0,0,0.25)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <span className="material-symbols-outlined">vpn_key</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Recovery Verification</h3>
                  <p className="text-xs text-slate-500">Ensure you can restore your vault</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <button
                  className={`w-full rounded-[1.1rem] border px-4 py-3 text-sm font-semibold transition-all active:scale-[0.98] ${
                    vault?.checklist.recoveryKeySaved
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-50"
                  }`}
                  type="button"
                  onClick={() => updateRecovery("recoveryKeySaved", !vault?.checklist.recoveryKeySaved)}
                >
                  <span className="flex items-center justify-center gap-2">
                    {vault?.checklist.recoveryKeySaved ? (
                      <>
                        <span className="material-symbols-outlined filled text-emerald-600">check_circle</span>
                        Recovery Key Saved
                      </>
                    ) : (
                      "Mark Recovery Key Saved"
                    )}
                  </span>
                </button>
                
                <button
                  className={`w-full rounded-[1.1rem] border px-4 py-3 text-sm font-semibold transition-all active:scale-[0.98] ${
                    vault?.checklist.recoveryTested || recoveryVerifiedAt
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-50"
                  }`}
                  type="button"
                  onClick={() => updateRecovery("recoveryTested", !(vault?.checklist.recoveryTested || recoveryVerifiedAt))}
                >
                  <span className="flex items-center justify-center gap-2">
                    {vault?.checklist.recoveryTested || recoveryVerifiedAt ? (
                      <>
                        <span className="material-symbols-outlined filled text-emerald-600">check_circle</span>
                        Recovery Tested
                      </>
                    ) : (
                      "Mark Recovery Test Completed"
                    )}
                  </span>
                </button>
                
                <button
                  className="w-full rounded-[1.1rem] bg-emerald-800 py-3 text-center text-sm font-semibold tracking-wide text-white shadow-lg shadow-emerald-900/20 transition-all active:scale-[0.98] hover:bg-emerald-900"
                  type="button"
                  onClick={() => updateRecovery("recoveryTested", true)}
                >
                  <span className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">play_circle</span>
                    Run Recovery Drill
                  </span>
                </button>
                
                {recoveryVerifiedAt ? (
                  <p className="pt-2 text-center text-xs text-slate-500">
                    Last verified: {new Date(recoveryVerifiedAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="pt-4">
            <p className="mb-3 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Quick Links</p>
            <div className="no-scrollbar flex gap-4 overflow-x-auto pb-6 px-1">
              <Link
                href="/asset-records"
                className="glass-card flex flex-shrink-0 items-center gap-3 rounded-2xl border border-[#e4e6eb] px-6 py-4 shadow-[0_10px_24px_-18px_rgba(0,0,0,0.35)] transition-all active:scale-95"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#D4AF37] text-white">
                  <span className="material-symbols-outlined text-[18px]">payments</span>
                </div>
                <span className="whitespace-nowrap text-sm font-semibold">Assets</span>
              </Link>
              <Link
                href="/debt-records"
                className="glass-card flex flex-shrink-0 items-center gap-3 rounded-2xl border border-[#e4e6eb] px-6 py-4 shadow-[0_10px_24px_-18px_rgba(0,0,0,0.35)] transition-all active:scale-95"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500 text-white">
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                </div>
                <span className="whitespace-nowrap text-sm font-semibold">Debts</span>
              </Link>
              <Link
                href="/wishes"
                className="glass-card flex flex-shrink-0 items-center gap-3 rounded-2xl border border-[#e4e6eb] px-6 py-4 shadow-[0_10px_24px_-18px_rgba(0,0,0,0.35)] transition-all active:scale-95"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500 text-white">
                  <span className="material-symbols-outlined text-[18px]">auto_stories</span>
                </div>
                <span className="whitespace-nowrap text-sm font-semibold">Wishes</span>
              </Link>
            </div>
          </div>
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
          <AppBottomNav active="checklist" mode="dashboard" />
        )}
      </div>
    </div>
  );
}
