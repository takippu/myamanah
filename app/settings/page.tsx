"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { AppBottomNav } from "../components/app-bottom-nav";
import { PWAInstallSection } from "../components/pwa-install-section";
import { VaultSessionGuard } from "../components/vault-session-guard";
import { authClient } from "@/lib/auth-client";
import { clearVaultSecrets } from "@/lib/vault-session";
import {
  disableCloudBackup,
  enableCloudBackup,
  getCloudBackupStatus,
  getLocalProfileName,
  getVaultStatus,
  hasLocalVaultPayload,
} from "@/lib/vault-client";
import { getEmailRetryQueueStatus } from "@/lib/email-retry";

function SettingsPageContent() {
  const [email, setEmail] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backupEnabled, setBackupEnabled] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showSyncWarning, setShowSyncWarning] = useState(false);
  const [localProfileName, setLocalProfileName] = useState<string>("");
  const [emailQueueStatus, setEmailQueueStatus] = useState<{pending: number; failed: number; sent: number; total: number} | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Immediate check on mount - don't wait for full refresh
  useEffect(() => {
    const immediateRestoreCheck = async () => {
      try {
        // Quick auth check
        const authRes = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        if (!authRes.ok) return;
        
        // Check local vault
        const hasLocalVault = hasLocalVaultPayload();
        
        // If has local vault, no need to restore
        if (hasLocalVault) return;
        
        // Check server for cloud backup
        const backupStatus = await getCloudBackupStatus();
        
        if (backupStatus.backupEnabled) {
          // Redirect immediately to restore flow
          window.location.replace("/access?restore=1");
        }
      } catch {
        // Silent fail - let user proceed normally
      }
    };
    
    void immediateRestoreCheck();
  }, []);

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
      const backupStatus = await getCloudBackupStatus();
      setBackupEnabled(backupStatus.backupEnabled);
      // Use the actual cloud backup timestamp, not local vault update time
      setLastSynced(backupStatus.lastSyncedAt ?? status?.updatedAt ?? null);
      
      // Load email queue status if user has backup enabled
      if (backupStatus.backupEnabled) {
        try {
          const queueStatus = await getEmailRetryQueueStatus();
          setEmailQueueStatus(queueStatus);
        } catch {
          // Silent fail - queue status is non-critical
        }
      }
    } catch {
      // Silent fail
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

  const handleLogout = async () => {
    try {
      if (isAuthenticated) {
        await authClient.signOut();
      }
    } catch {
      // Fall through and clear only the local unlock session.
    }

    clearVaultSecrets();
    window.location.href = "/access";
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleSyncClick = () => {
    // Show warning dialog first
    setShowSyncWarning(true);
  };

  const proceedWithSync = async () => {
    setShowSyncWarning(false);
    setBackupMessage(null);
    
    // Sign in with Google (no special scopes needed for SQLite backup)
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/settings",
      });
    } catch {
      setBackupMessage("Google sign-in failed. Please try again.");
    }
  };

  const handleEnableBackup = async () => {
    setBackupBusy(true);
    setBackupMessage(null);
    try {
      await enableCloudBackup();
      setBackupEnabled(true);
      const status = await getVaultStatus();
      setLastSynced(status?.updatedAt ?? null);
      setBackupMessage("✓ Encrypted backup enabled. Your data is now safely backed up.");
    } catch {
      setBackupMessage("Could not enable backup. Please try again.");
    } finally {
      setBackupBusy(false);
    }
  };

  const handleRefreshBackup = async () => {
    setBackupBusy(true);
    setBackupMessage(null);
    try {
      // Re-upload the current vault data
      const vault = await getVaultStatus();
      if (vault) {
        await enableCloudBackup();
        const status = await getVaultStatus();
        setLastSynced(status?.updatedAt ?? null);
        setBackupMessage("✓ Backup refreshed successfully!");
      }
    } catch {
      setBackupMessage("Could not refresh backup. Please try again.");
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
      setBackupMessage("Backup disabled. Your encrypted backup has been removed from our database.");
    } catch {
      setBackupMessage("Could not disable backup. Please try again.");
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

          {/* Backup Consent */}
          <section className="space-y-3">
            <p className="ml-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Backup &amp; Privacy</p>

            <div className="glass-card rounded-[1.8rem] border border-[#e4e6eb] bg-white p-5 shadow-[0_8px_20px_-14px_rgba(0,0,0,0.25)]">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400">encrypted</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Encrypted Database Backup</p>
                      <p className="text-[10px] text-slate-400">
                        {backupEnabled
                          ? "Enabled — your vault is encrypted and stored in our database"
                          : isAuthenticated
                            ? "Disabled — sign in to enable encrypted backup"
                            : "Local-only — sign in to enable encrypted backup"}
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

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400">cloud_upload</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Last Cloud Backup</p>
                      <p className="text-[10px] text-slate-400">When vault was last backed up</p>
                    </div>
                  </div>
                  <span className="text-sm text-slate-600">{formatDate(lastSynced)}</span>
                </div>

                <div className="border-t border-slate-100" />

                <div className="flex gap-2">
                  {backupEnabled ? (
                    <>
                      <button
                        type="button"
                        onClick={handleRefreshBackup}
                        disabled={backupBusy}
                        className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-xs font-semibold text-emerald-700 disabled:opacity-60"
                      >
                        {backupBusy ? "Syncing..." : (
                          <span className="flex items-center justify-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">sync</span>
                            Refresh Backup
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleDisableBackup}
                        disabled={backupBusy}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 disabled:opacity-60"
                      >
                        Disable
                      </button>
                    </>
                  ) : !isAuthenticated ? (
                    <button
                      type="button"
                      onClick={handleSyncClick}
                      disabled={backupBusy}
                      className="w-full rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-xs font-semibold text-emerald-700 disabled:opacity-60"
                    >
                      {backupBusy ? "Connecting..." : "Sync with Cloud (Google)"}
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
                    Sync your encrypted vault to the cloud for backup. Your vault data is encrypted on your device before being stored — we never have access to your decryption keys.
                  </p>
                ) : null}

                <p className="text-[11px] text-slate-500">
                  <strong>Zero-knowledge encryption:</strong> Your vault is encrypted with AES-256-GCM using keys derived from your passphrase and recovery key. We never store or have access to your decryption keys. Only the encrypted ciphertext is stored in our database.
                </p>
              </div>
            </div>
          </section>

          {/* Debug Panel - Deadman Status */}
          {isAuthenticated && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="ml-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Deadman Switch Status</p>
                <button
                  type="button"
                  onClick={() => setShowDebugPanel(!showDebugPanel)}
                  className="text-[10px] text-slate-400 hover:text-slate-600"
                >
                  {showDebugPanel ? "Hide" : "Show"}
                </button>
              </div>
              
              {showDebugPanel && (
                <div className="glass-card rounded-[1.8rem] border border-[#e4e6eb] bg-white p-5 shadow-[0_8px_20px_-14px_rgba(0,0,0,0.25)]">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-slate-400">schedule</span>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Check-in Window</p>
                          <p className="text-[10px] text-slate-400">30 days between required check-ins</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t border-slate-100" />
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-slate-400">mail</span>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Email Retry Queue</p>
                          <p className="text-[10px] text-slate-400">Failed email retry status</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {emailQueueStatus ? (
                          <>
                            {emailQueueStatus.pending > 0 && (
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">
                                {emailQueueStatus.pending} pending
                              </span>
                            )}
                            {emailQueueStatus.failed > 0 && (
                              <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-700">
                                {emailQueueStatus.failed} failed
                              </span>
                            )}
                            {emailQueueStatus.total === 0 && (
                              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">
                                All clear
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-400">Loading...</span>
                        )}
                      </div>
                    </div>
                    
                    {emailQueueStatus && emailQueueStatus.total > 0 && (
                      <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-lg font-bold text-slate-900">{emailQueueStatus.pending}</p>
                            <p className="text-[10px]">Pending</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-emerald-600">{emailQueueStatus.sent}</p>
                            <p className="text-[10px]">Sent</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-rose-600">{emailQueueStatus.failed}</p>
                            <p className="text-[10px]">Failed</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <p className="text-[11px] text-slate-500">
                      The deadman switch automatically processes every 24 hours. If emails fail, they are retried with exponential backoff (5min, 15min, 1hour).
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* App Installation */}
          <section className="space-y-3">
            <p className="ml-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">App Installation</p>
            <PWAInstallSection />
          </section>

          {/* About */}
          <section className="space-y-3">
            <p className="ml-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">About</p>
            
            <div className="glass-card rounded-[1.8rem] border border-[#e4e6eb] bg-white p-5 shadow-[0_8px_20px_-14px_rgba(0,0,0,0.25)]">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-900">MyAmanah MVP</p>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Local-first digital legacy vault with zero-knowledge encryption. Your data is encrypted on your device and optionally backed up to our secure database.
                </p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  AES-256-GCM + Argon2id
                </p>
              </div>
            </div>
          </section>

          {/* Session */}
          <section className="space-y-3">
            <p className="ml-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Session</p>
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

        {showSyncWarning ? (
          <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45 px-4 pb-6 pt-12 sm:items-center sm:justify-center">
            <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.45)]">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <span className="material-symbols-outlined">cloud_sync</span>
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-slate-900">Before you sync...</h2>
                  <p className="text-sm leading-relaxed text-slate-600">
                    Cloud sync requires you to sign in with Google. After signing in, your session will refresh and you&apos;ll need to unlock your vault again.
                  </p>
                  <p className="text-sm leading-relaxed text-slate-600">
                    Make sure you have both your <span className="font-semibold text-slate-900">passphrase</span> and
                    <span className="font-semibold text-slate-900"> recovery key</span> backed up safely before continuing.
                  </p>
                  <p className="text-xs leading-relaxed text-rose-700">
                    Without both keys, you cannot access your vault after the session refreshes.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSyncWarning(false)}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void proceedWithSync();
                  }}
                  className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                  I have my keys — Proceed
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SettingsPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans text-slate-800 antialiased">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-x-hidden bg-[#F2F2F7]">
        <header className="sticky top-0 z-30 flex items-center justify-between bg-[#F2F2F7]/70 px-6 py-5 backdrop-blur-lg">
          <div className="glass-card flex h-12 w-12 items-center justify-center rounded-2xl">
            <span className="material-symbols-outlined text-slate-600">arrow_back</span>
          </div>
          <h1 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-600">Settings</h1>
          <div className="h-12 w-12 rounded-2xl bg-slate-200" />
        </header>
        <main className="flex-1 space-y-6 px-6 pb-36 pt-4">
          <div className="glass-card rounded-[2rem] border border-[#e4e6eb] bg-white p-6 shadow-[0_12px_28px_-18px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-slate-200" />
              <div className="space-y-2">
                <div className="h-3 w-20 rounded bg-slate-200" />
                <div className="h-4 w-32 rounded bg-slate-200" />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsPageSkeleton />}>
      <SettingsPageContent />
    </Suspense>
  );
}
