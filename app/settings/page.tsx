"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppBottomNav } from "../components/app-bottom-nav";
import { VaultSessionGuard } from "../components/vault-session-guard";
import { authClient } from "@/lib/auth-client";
import { clearVaultSecrets } from "@/lib/vault-session";
import {
  disableCloudBackup,
  enableCloudBackup,
  getCloudBackupStatus,
  getLocalProfileName,
  getVaultStatus,
  loadVaultData,
} from "@/lib/vault-client";

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [recoveryVerifiedAt, setRecoveryVerifiedAt] = useState<string | null>(null);
  const [recordCounts, setRecordCounts] = useState({
    assets: 0,
    debts: 0,
    digitalLegacy: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [backupEnabled, setBackupEnabled] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [localProfileName, setLocalProfileName] = useState<string>("");

  const refreshData = async () => {
    try {
      setLocalProfileName(getLocalProfileName() ?? "");

      const authRes = await fetch("/api/auth/me", { credentials: "include" });
      if (authRes.ok) {
        const payload = (await authRes.json()) as { user?: { email?: string } };
        setEmail(payload.user?.email ?? "");
        setIsAuthenticated(true);
      } else {
        setEmail("");
        setIsAuthenticated(false);
      }

      const status = await getVaultStatus();
      setLastSynced(status?.updatedAt ?? null);
      setRecoveryVerifiedAt(status?.recoveryVerifiedAt ?? null);
      const backupStatus = await getCloudBackupStatus();
      setBackupEnabled(backupStatus.backupEnabled);

      const vault = await loadVaultData();
      const assets = vault?.assets?.length ?? 0;
      const debts = vault?.debts?.length ?? 0;
      const digitalLegacy = vault?.digitalLegacy?.length ?? 0;
      setRecordCounts({
        assets,
        debts,
        digitalLegacy,
        total: assets + debts + digitalLegacy,
      });
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshData();
  }, []);

  useEffect(() => {
    const shouldEnableBackup = searchParams.get("enableBackup") === "1";
    if (!shouldEnableBackup || !isAuthenticated || backupEnabled || backupBusy) {
      return;
    }

    setBackupBusy(true);
    setBackupMessage(null);
    void enableCloudBackup()
      .then(() => {
        setBackupEnabled(true);
        setBackupMessage("Encrypted cloud backup enabled.");
        router.replace("/settings");
      })
      .catch(() => {
        setBackupMessage("Could not enable cloud backup.");
        router.replace("/settings");
      })
      .finally(() => {
        setBackupBusy(false);
      });
  }, [backupBusy, backupEnabled, isAuthenticated, router, searchParams]);

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

  const handleLogout = async () => {
    try {
      if (isAuthenticated) {
        await authClient.signOut();
      }
    } catch {
      // Fall through and clear only the local unlock session.
    }

    clearVaultSecrets();
    router.push("/access");
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleEnableBackup = async () => {
    if (!isAuthenticated) {
      setBackupMessage(null);
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/settings?enableBackup=1",
      });
      return;
    }

    setBackupBusy(true);
    setBackupMessage(null);
    try {
      await enableCloudBackup();
      setBackupEnabled(true);
      setBackupMessage("Encrypted cloud backup enabled.");
    } catch {
      setBackupMessage("Could not enable cloud backup.");
    } finally {
      setBackupBusy(false);
    }
  };

  const handleDisableBackup = async () => {
    setBackupBusy(true);
    setBackupMessage(null);
    try {
      await disableCloudBackup();
      setBackupEnabled(false);
      setBackupMessage("Cloud backup disabled and remote copy removed.");
    } catch {
      setBackupMessage("Could not disable cloud backup.");
    } finally {
      setBackupBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans text-slate-800 antialiased">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-x-hidden bg-[#F2F2F7]">
        <VaultSessionGuard />
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between bg-[#F2F2F7]/70 px-6 py-5 backdrop-blur-lg">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="glass-card flex h-12 w-12 items-center justify-center rounded-2xl transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-slate-600">arrow_back</span>
          </Link>
          <h1 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-600">Settings</h1>
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-emerald-900 text-white shadow-lg">
            <span className="material-symbols-outlined">settings</span>
          </div>
        </header>

        <main className="flex-1 space-y-6 px-6 pb-36 pt-4">
          {/* Profile Card */}
          <div className="glass-card rounded-[2rem] border border-[#e4e6eb] bg-white p-6 shadow-[0_12px_28px_-18px_rgba(0,0,0,0.35)]">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <span className="material-symbols-outlined text-[32px]">person</span>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    {localProfileName ? "Vault name" : isAuthenticated ? "Signed in as" : "Mode"}
                  </p>
                  <p className="text-base font-semibold text-slate-900">
                    {localProfileName || (isAuthenticated ? email || "Loading..." : "Local-only vault")}
                  </p>
                  {localProfileName && isAuthenticated ? (
                    <p className="text-[10px] text-slate-400">{email || "Signed in"}</p>
                  ) : null}
                </div>
              </div>
            </div>

          {/* Vault Stats */}
          <section className="space-y-3">
            <p className="ml-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Vault Statistics</p>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card rounded-2xl border border-[#e4e6eb] bg-white p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{isLoading ? "-" : recordCounts.assets}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Assets</p>
              </div>
              <div className="glass-card rounded-2xl border border-[#e4e6eb] bg-white p-4 text-center">
                <p className="text-2xl font-bold text-rose-600">{isLoading ? "-" : recordCounts.debts}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Debts</p>
              </div>
              <div className="glass-card rounded-2xl border border-[#e4e6eb] bg-white p-4 text-center">
                <p className="text-2xl font-bold text-sky-600">{isLoading ? "-" : recordCounts.digitalLegacy}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Digital</p>
              </div>
              <div className="glass-card rounded-2xl border border-[#e4e6eb] bg-white p-4 text-center">
                <p className="text-2xl font-bold text-slate-800">{isLoading ? "-" : recordCounts.total}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</p>
              </div>
            </div>
          </section>

          {/* Account Info */}
          <section className="space-y-3">
            <p className="ml-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Account</p>
            
            <div className="glass-card rounded-[1.8rem] border border-[#e4e6eb] bg-white p-5 shadow-[0_8px_20px_-14px_rgba(0,0,0,0.25)]">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400">sync</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Last Synced</p>
                      <p className="text-[10px] text-slate-400">Cloud backup</p>
                    </div>
                  </div>
                  <span className="text-sm text-slate-600">{formatDate(lastSynced)}</span>
                </div>

                <div className="border-t border-slate-100" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400">verified</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Recovery Tested</p>
                      <p className="text-[10px] text-slate-400">Last verified</p>
                    </div>
                  </div>
                  <span className="text-sm text-slate-600">{formatDate(recoveryVerifiedAt)}</span>
                </div>

                <div className="border-t border-slate-100" />

                <Link 
                  href="/checklist"
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-emerald-600">fact_check</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Readiness Checklist</p>
                      <p className="text-[10px] text-slate-400">View completion status</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                </Link>
              </div>
            </div>
          </section>

          {/* Security */}
          <section className="space-y-3">
            <p className="ml-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Security</p>
            
            <div className="glass-card rounded-[1.8rem] border border-[#e4e6eb] bg-white p-5 shadow-[0_8px_20px_-14px_rgba(0,0,0,0.25)]">
              <div className="space-y-4">
                <Link 
                  href="/vault"
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-emerald-600">verified_user</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">View Vault</p>
                      <p className="text-[10px] text-slate-400">Assets, debts, wishes</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                </Link>

                <div className="border-t border-slate-100" />

                <Link 
                  href="/access"
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-amber-600">key</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Unlock Vault</p>
                      <p className="text-[10px] text-slate-400">Re-enter your local access keys</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                </Link>
              </div>
            </div>
          </section>

          {/* Backup Consent */}
          <section className="space-y-3">
            <p className="ml-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
              Backup Consent
            </p>

            <div className="glass-card rounded-[1.8rem] border border-[#e4e6eb] bg-white p-5 shadow-[0_8px_20px_-14px_rgba(0,0,0,0.25)]">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400">cloud_sync</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Encrypted Cloud Backup</p>
                      <p className="text-[10px] text-slate-400">
                        {backupEnabled
                          ? "Enabled by consent"
                          : isAuthenticated
                            ? "Disabled until you opt in"
                            : "Local-only until you sign in and opt in"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                      backupEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {backupEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>

                <div className="border-t border-slate-100" />

                <div className="flex gap-2">
                  {backupEnabled ? (
                    <button
                      type="button"
                      onClick={handleDisableBackup}
                      disabled={backupBusy}
                      className="w-full rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-xs font-semibold text-rose-700 disabled:opacity-60"
                    >
                      {backupBusy ? "Updating..." : "Disable Backup"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleEnableBackup}
                      disabled={backupBusy}
                      className="w-full rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-xs font-semibold text-emerald-700 disabled:opacity-60"
                    >
                      {backupBusy ? "Updating..." : "Enable Backup"}
                    </button>
                  )}
                </div>

                {backupMessage ? (
                  <p className="text-[11px] text-slate-500">{backupMessage}</p>
                ) : null}

                {!isAuthenticated ? (
                  <p className="text-[11px] text-slate-500">
                    Google sign-in is only required when you choose encrypted cloud sync.
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          {/* About */}
          <section className="space-y-3">
            <p className="ml-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">About</p>
            
            <div className="glass-card rounded-[1.8rem] border border-[#e4e6eb] bg-white p-5 shadow-[0_8px_20px_-14px_rgba(0,0,0,0.25)]">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400">info</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Version</p>
                    <p className="text-[10px] text-slate-400">1.0.0 (MVP)</p>
                  </div>
                </div>

                <div className="border-t border-slate-100" />

                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400">shield</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Encryption</p>
                    <p className="text-[10px] text-slate-400">AES-256-GCM + Argon2id</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Logout */}
            <div className="pt-4">
              <button
                type="button"
                onClick={() => setShowLockConfirm(true)}
                className="flex w-full items-center justify-center gap-3 rounded-[2rem] border-2 border-rose-200 bg-rose-50 py-5 text-sm font-semibold tracking-wide text-rose-700 transition-all active:scale-[0.97]"
              >
                <span className="material-symbols-outlined">logout</span>
                {isAuthenticated ? "Sign Out and Lock Vault" : "Lock Vault on This Device"}
              </button>
              <p className="mt-2 text-center text-[11px] text-slate-500">
                This removes current access only. Your local vault stays on this device.
              </p>
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
          <AppBottomNav active="settings" mode="dashboard" />
        )}

        {showLockConfirm ? (
          <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45 px-4 pb-6 pt-12 sm:items-center sm:justify-center">
            <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.45)]">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <span className="material-symbols-outlined">warning</span>
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-slate-900">Lock this vault?</h2>
                  <p className="text-sm leading-relaxed text-slate-600">
                    This will remove access on this device until you unlock it again.
                  </p>
                  <p className="text-sm leading-relaxed text-slate-600">
                    You will need both your <span className="font-semibold text-slate-900">passphrase</span> and
                    <span className="font-semibold text-slate-900"> recovery key</span> to get back in.
                  </p>
                  <p className="text-xs leading-relaxed text-rose-700">
                    Do not continue unless you have both available.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowLockConfirm(false)}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowLockConfirm(false);
                    await handleLogout();
                  }}
                  className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
                >
                  Lock Vault
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
