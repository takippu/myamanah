"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppBottomNav } from "../components/app-bottom-nav";
import { HeroSkeleton, CardSkeleton, QuickActionSkeleton } from "../components/skeletons";
import { VaultSessionGuard } from "../components/vault-session-guard";
import type { VaultData } from "@/lib/vault-data";
import { checkInDeadmanSwitch, getLocalProfileName, getVaultStatus, loadVaultData } from "@/lib/vault-client";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export default function DashboardPage() {
  const [vault, setVault] = useState<VaultData | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [localProfileName, setLocalProfileName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const refreshData = async () => {
    try {
      setLocalProfileName(getLocalProfileName() ?? "");

      const authRes = await fetch("/api/auth/me", { credentials: "include" });
      if (authRes.ok) {
        const payload = (await authRes.json()) as { user?: { email?: string } };
        setUserEmail(payload.user?.email ?? "");
      }
      
      const data = await loadVaultData();
      setVault(data);
      await getVaultStatus();
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

  const assetCount = vault?.assets?.length ?? 0;
  const debtCount = vault?.debts?.length ?? 0;
  const digitalLegacyCount = vault?.digitalLegacy?.length ?? 0;

  const wishFields = [
    vault?.wishes.religiousWishes?.trim(),
    vault?.wishes.familyInstructions?.trim(),
    vault?.wishes.executorNotes?.trim(),
    vault?.wishes.distributionNotes?.trim(),
  ];
  const wishCompleted = wishFields.filter(Boolean).length;
  const wishTotal = 4;
  const wishesDone = wishCompleted === wishTotal;

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

  const displayName = useMemo(() => {
    if (localProfileName) return localProfileName;
    if (!userEmail) return "Guest";
    const name = userEmail.split("@")[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, [localProfileName, userEmail]);

  const nextSteps = useMemo(() => {
    const items: Array<{
      href: string;
      icon: string;
      title: string;
      detail: string;
      iconClassName: string;
    }> = [];

    if (assetCount === 0) {
      items.push({
        href: "/asset-records",
        icon: "payments",
        title: "Add your first asset",
        detail: "Start mapping what your family needs to find.",
        iconClassName: "bg-[#D4AF37]/12 text-[#D4AF37]",
      });
    }

    if (debtCount === 0) {
      items.push({
        href: "/debt-records",
        icon: "receipt_long",
        title: "Add outstanding debts",
        detail: "Track loans, bills, and personal obligations.",
        iconClassName: "bg-rose-100 text-rose-600",
      });
    }

    if (digitalLegacyCount === 0) {
      items.push({
        href: "/digital-legacy",
        icon: "fingerprint",
        title: "Add digital records",
        detail: "Save account access, platforms, and recovery notes.",
        iconClassName: "bg-sky-50 text-sky-600",
      });
    }

    if (!wishesDone) {
      items.push({
        href: "/wishes",
        icon: "auto_stories",
        title: "Continue wishes & instructions",
        detail: `${wishCompleted}/${wishTotal} sections completed`,
        iconClassName: "bg-emerald-50 text-emerald-600",
      });
    }

    return items;
  }, [assetCount, debtCount, digitalLegacyCount, wishCompleted, wishTotal, wishesDone]);

  const allCoreRecordsReady =
    assetCount > 0 && debtCount > 0 && digitalLegacyCount > 0 && wishesDone;

  const deadmanLastCheckInAt = vault?.meta?.deadmanLastCheckInAt ?? null;

  const deadmanStatus = useMemo(() => {
    if (!deadmanLastCheckInAt) {
      return {
        label: "Not armed",
        detail: "No check-in recorded yet",
        overdue: true,
        daysElapsed: 30,
        daysRemaining: 0,
      };
    }

    const lastCheck = new Date(deadmanLastCheckInAt).getTime();
    const daysSince = Math.floor((Date.now() - lastCheck) / (1000 * 60 * 60 * 24));
    const daysRemaining = 30 - daysSince;

    if (daysRemaining <= 0) {
      return {
        label: "Check-in overdue",
        detail: `${Math.abs(daysRemaining)} day(s) past the 30-day window`,
        overdue: true,
        daysElapsed: clamp(daysSince, 30, 60),
        daysRemaining: 0,
      };
    }

    return {
      label: "Protected",
      detail: `${daysRemaining} day(s) until next required check-in`,
      overdue: false,
      daysElapsed: clamp(daysSince, 0, 30),
      daysRemaining,
    };
  }, [deadmanLastCheckInAt]);

  const deadmanProgress = useMemo(() => {
    const progress = clamp(deadmanStatus.daysElapsed / 30, 0, 1);
    return {
      progress,
      elapsedDots: clamp(Math.round(progress * 24), 0, 24),
    };
  }, [deadmanStatus.daysElapsed]);

  const deadmanActionLabel = useMemo(() => {
    if (isCheckingIn) {
      return "Checking in...";
    }

    if (deadmanStatus.overdue || deadmanStatus.label === "Not armed") {
      return "Tap to Check In";
    }

    return null;
  }, [deadmanStatus.label, deadmanStatus.overdue, isCheckingIn]);

  const onCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      const updatedVault = await checkInDeadmanSwitch();
      setVault(updatedVault);
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans text-slate-800 antialiased">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-x-hidden bg-[#F2F2F7]">
        <VaultSessionGuard />
        <header className="sticky top-0 z-30 flex items-center justify-between bg-[#F2F2F7]/70 px-6 py-5 backdrop-blur-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-900">MyAmanah</p>
          <div className="h-12 w-12" aria-hidden="true" />
        </header>

        <main className="flex-1 space-y-4 px-5 pb-36">
          <div className="pt-1">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">{hijriDate}</p>
            <h1 className="text-[39px] font-light leading-[1.02] tracking-[-0.02em] text-slate-900">
              Salaam, <span className="font-semibold">{displayName}</span>
            </h1>
          </div>

          {isLoading ? (
            <HeroSkeleton />
          ) : (
            <div className="dashboard-islamic-pattern group relative overflow-hidden rounded-[2.2rem] border border-white/10 shadow-[0_18px_36px_-20px_rgba(0,0,0,0.45)] transition-all duration-500 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/18 via-transparent to-white/5" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_38%)]" />
              <div className="relative flex items-center justify-between gap-4 px-6 py-5">
                <div className="max-w-[13rem]">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-200/58">Deadman Switch</p>
                  <h3 className="mt-2 text-[1.2rem] font-semibold text-white">{deadmanStatus.label}</h3>
                  <p className="mt-1 text-sm leading-5 text-emerald-50/78">{deadmanStatus.detail}</p>
                </div>
                <div className="flex flex-col items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => void onCheckIn()}
                    disabled={isCheckingIn}
                    aria-label={isCheckingIn ? "Checking in deadman switch" : "Check in to deadman switch"}
                    className={`group/indicator relative flex h-[84px] w-[84px] items-center justify-center rounded-full transition-transform active:scale-[0.98] ${
                      isCheckingIn ? "opacity-80" : ""
                    }`}
                  >
                    <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
                      {Array.from({ length: 24 }).map((_, index) => {
                        const angle = ((index / 24) * Math.PI * 2) - Math.PI / 2;
                        const x = 42 + Math.cos(angle) * 32;
                        const y = 42 + Math.sin(angle) * 32;
                        const isActive = index < deadmanProgress.elapsedDots;
                        return (
                          <circle
                            key={index}
                            cx={x}
                            cy={y}
                            r={isActive ? 2.6 : 2}
                            fill={
                              isActive
                                ? deadmanStatus.overdue
                                  ? "#fda4af"
                                  : "#d4af37"
                                : "rgba(255,255,255,0.16)"
                            }
                          />
                        );
                      })}
                    </svg>
                    <span
                      className={`absolute inset-[14px] flex items-center justify-center rounded-full border shadow-[0_8px_18px_-14px_rgba(0,0,0,0.45)] transition-colors ${
                        deadmanStatus.overdue
                          ? "border-rose-200/20 bg-gradient-to-br from-rose-500/95 to-rose-700/95"
                          : "border-white/12 bg-gradient-to-br from-emerald-500/95 to-emerald-700/95"
                      }`}
                    >
                      <span className="absolute inset-[6px] rounded-full border border-white/10" />
                      <span className="material-symbols-outlined relative text-[21px] text-white">
                        {isCheckingIn ? "sync" : deadmanStatus.overdue ? "favorite" : "shield_with_heart"}
                      </span>
                    </span>
                  </button>
                  {deadmanActionLabel ? (
                    <span className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-100/76">
                      {deadmanActionLabel}
                    </span>
                  ) : null}
                </div>
              </div>
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
            <section className="space-y-4">
              <div className="rounded-[1.8rem] border border-[#e4e6eb] bg-white/82 p-5 shadow-[0_12px_28px_-20px_rgba(0,0,0,0.3)] backdrop-blur-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Next Steps</p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900">What to do now</h2>
                  </div>
                  <Link
                    href="/vault"
                    className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700"
                  >
                    Open Vault
                  </Link>
                </div>
                <div className="space-y-3">
                  {nextSteps.length > 0 ? (
                    nextSteps.map((item) => (
                      <DashboardActionCard
                        key={item.href}
                        href={item.href}
                        icon={item.icon}
                        title={item.title}
                        detail={item.detail}
                        iconClassName={item.iconClassName}
                      />
                    ))
                  ) : (
                    <div className="rounded-[1.4rem] border border-emerald-100 bg-emerald-50 px-4 py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                          <span className="material-symbols-outlined text-[20px]">check_circle</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-emerald-950">
                            {allCoreRecordsReady ? "Everything looks in place" : "You are all caught up"}
                          </p>
                          <p className="mt-1 text-xs text-emerald-800/80">
                            {allCoreRecordsReady
                              ? "Your key records and wishes are already set."
                              : "There is nothing urgent to finish right now."}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <DashboardStatCard label="Assets" value={String(assetCount)} />
                <DashboardStatCard label="Debts" value={String(debtCount)} />
                <DashboardStatCard label="Wishes" value={`${wishCompleted}/${wishTotal}`} />
              </div>
            </section>
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

function DashboardActionCard({
  href,
  icon,
  title,
  detail,
  iconClassName,
}: {
  href: string;
  icon: string;
  title: string;
  detail: string;
  iconClassName: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-[1.4rem] border border-[#eef0f3] bg-[#f8f9fb] px-4 py-4 transition-all duration-300 hover:-translate-y-[1px]"
    >
      <div className="flex items-center gap-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClassName}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
      </div>
      <span className="material-symbols-outlined text-slate-300 transition-transform duration-300 group-hover:translate-x-1">
        arrow_forward_ios
      </span>
    </Link>
  );
}

function DashboardStatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-[#e4e6eb] bg-white/82 px-4 py-3 shadow-[0_10px_20px_-18px_rgba(0,0,0,0.28)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
