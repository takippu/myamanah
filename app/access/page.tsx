"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Head from "next/head";
import { generateRecoveryKey } from "@/lib/vault-crypto";
import { clearVaultSecrets, getVaultSecrets, setVaultSecrets } from "@/lib/vault-session";
import { authClient } from "@/lib/auth-client";
import type { VaultData } from "@/lib/vault-data";
import {
  hasLocalVaultPayload,
  initializeVaultIfMissing,
  verifyLocalVaultCredentials,
  restoreVaultFromCloud,
  clearLocalEncryptedPayload,
  getLocalProfileName,
  setLocalProfileName,
  setCloudBackupEnabled,
} from "@/lib/vault-client";

// Clear all caches to ensure fresh auth state
function clearAllCaches() {
  if (typeof window === "undefined") return;
  
  // Clear browser cache for this page
  if ("caches" in window) {
    void caches.keys().then((names) => {
      names.forEach((name) => {
        void caches.delete(name);
      });
    });
  }
  
  // Clear session storage
  sessionStorage.clear();
  
  console.log("[Access] Caches cleared");
}

// Force reload once if coming from OAuth redirect (to bypass mobile cache)
function forceReloadIfFromOAuth() {
  if (typeof window === "undefined") return false;
  
  const hasReloaded = sessionStorage.getItem("access_page_reloaded");
  const urlParams = new URLSearchParams(window.location.search);
  const isFromRedirect = urlParams.has("restore") || document.referrer.includes("google") || document.referrer.includes("accounts");
  
  if (!hasReloaded && isFromRedirect) {
    console.log("[Access] Forcing reload to bypass mobile cache...");
    sessionStorage.setItem("access_page_reloaded", "true");
    window.location.reload();
    return true;
  }
  
  return false;
}

function AccessSetupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldRestore = searchParams.get("restore") === "1";
  const [mode, setMode] = useState<"checking" | "unlock" | "create" | "google_unlock">("checking");
  const [step, setStep] = useState<"passphrase" | "recovery" | "confirm" | "complete">("passphrase");
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [unlockPassphrase, setUnlockPassphrase] = useState("");
  const [unlockRecoveryKey, setUnlockRecoveryKey] = useState("");
  const [recoveryConfirmed, setRecoveryConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [fullName, setFullName] = useState("");
  const [copyFeedback, setCopyFeedback] = useState<"idle" | "copied">("idle");
  // Google OAuth user info
  const [googleUser, setGoogleUser] = useState<{ email: string; name?: string; image?: string } | null>(null);

  // Force reload once if from OAuth to bypass mobile cache
  const [isReloading, setIsReloading] = useState(false);
  
  useEffect(() => {
    if (forceReloadIfFromOAuth()) {
      setIsReloading(true);
      return;
    }
    clearAllCaches();
  }, []);

  // Check session on mount - force sign out if no local vault exists
  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      const storedName = getLocalProfileName();
      if (!cancelled) {
        setFullName(storedName ?? "");
      }

      const localVaultExists = hasLocalVaultPayload();
      const existingSecrets = getVaultSecrets();

      // Check if user is authenticated via Google (with cache busting)
      let authUser: { email: string; name?: string; image?: string } | null = null;
      try {
        console.log("[Access] Checking auth...", { shouldRestore, localVaultExists });
        // Add cache-busting timestamp to prevent cached responses
        const cacheBuster = `?_cb=${Date.now()}`;
        const authRes = await fetch(`/api/auth/me${cacheBuster}`, { 
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
          },
        });
        console.log("[Access] Auth response:", authRes.status, authRes.ok);
        if (authRes.ok) {
          const authData = await authRes.json() as { user?: { email?: string; name?: string; image?: string } };
          console.log("[Access] Auth data:", authData);
          if (authData.user?.email) {
            authUser = {
              email: authData.user.email,
              name: authData.user.name,
              image: authData.user.image,
            };
          }
        }
      } catch (err) {
        console.error("[Access] Auth check failed:", err);
        // Auth check failed, continue as unauthenticated
      }

      // If coming from login for restore, show unlock form
      if (shouldRestore && !localVaultExists) {
        console.log("[Access] Restore mode, authUser:", authUser?.email || "none");
        if (!cancelled) {
          if (authUser) {
            setGoogleUser(authUser);
            setMode("google_unlock");
            console.log("[Access] Set mode: google_unlock");
          } else {
            setMode("unlock");
            console.log("[Access] Set mode: unlock (no auth user)");
          }
        }
        return;
      }

      // If authenticated via Google but no local vault, show Google unlock mode
      if (authUser && !localVaultExists) {
        if (!cancelled) {
          setGoogleUser(authUser);
          setMode("google_unlock");
        }
        return;
      }

      if (!localVaultExists) {
        // No local vault - this is a fresh start
        // Clear any stale state from previous vaults
        setCloudBackupEnabled(false);
        
        // Force sign out from any previous Google session
        try {
          await authClient.signOut();
        } catch {
          // Ignore errors - already signed out or no session
        }
        
        if (!cancelled) {
          setMode("create");
        }
        return;
      }

      if (!existingSecrets) {
        if (!cancelled) {
          setMode("unlock");
        }
        return;
      }

      try {
        await verifyLocalVaultCredentials(existingSecrets.passphrase, existingSecrets.recoveryKey);
        router.replace("/dashboard");
      } catch {
        if (!cancelled) {
          setMode("unlock");
        }
      }
    };

    void checkAccess();

    return () => {
      cancelled = true;
    };
  }, [router, shouldRestore]);

  const validatePassphrase = () => {
    if (passphrase.length < 12) {
      setError("Passphrase must be at least 12 characters");
      return false;
    }
    if (passphrase !== confirmPassphrase) {
      setError("Passphrases do not match");
      return false;
    }
    setError(null);
    return true;
  };

  const handlePassphraseSubmit = () => {
    if (validatePassphrase()) {
      if (!recoveryKey) {
        setRecoveryKey(generateRecoveryKey());
      }
      setStep("recovery");
    }
  };

  const handleRecoverySubmit = () => {
    if (!recoveryConfirmed) {
      setError("Please confirm you have saved your recovery key");
      return;
    }
    setError(null);
    setStep("confirm");
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Ensure cloud backup is disabled for new vaults
      // (User must explicitly enable it in settings)
      setCloudBackupEnabled(false);
      
      setVaultSecrets({
        passphrase,
        recoveryKey,
      });
      setLocalProfileName(fullName || null);
      
      // Initialize the vault (local only, no cloud sync yet)
      await initializeVaultIfMissing();
      
      setStep("complete");
      
      // Redirect to dashboard after a delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch {
      setError("Failed to initialize vault. Please try again.");
      setIsLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (!unlockPassphrase || !unlockRecoveryKey) {
      setError("Enter both your passphrase and recovery key to unlock this device.");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // First try local vault
      let vaultData: VaultData;
      const hasLocal = hasLocalVaultPayload();
      
      if (hasLocal) {
        // Local vault exists - verify directly
        vaultData = await verifyLocalVaultCredentials(unlockPassphrase, unlockRecoveryKey);
      } else {
        // No local vault - try to restore from cloud
        try {
          vaultData = await restoreVaultFromCloud(unlockPassphrase, unlockRecoveryKey);
        } catch (cloudError) {
          const msg = cloudError instanceof Error ? cloudError.message : "Failed to restore";
          if (msg.includes("signed in")) {
            setError("No local vault found. Sign in with Google first to restore from cloud backup.");
          } else if (msg.includes("No cloud backup")) {
            setError("No vault found on this device and no cloud backup available. Create a new vault instead.");
          } else {
            setError(msg);
          }
          setIsLoading(false);
          return;
        }
      }
      
      // Store secrets and redirect
      setVaultSecrets({
        passphrase: unlockPassphrase,
        recoveryKey: unlockRecoveryKey,
      });
      
      // Restore profile name if available
      if (vaultData.meta?.profileName) {
        setLocalProfileName(vaultData.meta.profileName);
      }
      
      router.push("/dashboard");
    } catch {
      setError("Incorrect passphrase or recovery key. Please check and try again.");
      setIsLoading(false);
    }
  };

  const handleCreateNewVault = async () => {
    // Clear local vault data
    clearLocalEncryptedPayload();
    clearVaultSecrets();
    setCloudBackupEnabled(false);
    
    // Sign out from any previous Google session to avoid confusion
    try {
      await authClient.signOut();
    } catch {
      // Ignore sign out errors
    }
    
    setMode("create");
    setStep("passphrase");
    setError(null);
  };

  const copyRecoveryKey = () => {
    navigator.clipboard.writeText(recoveryKey);
    setCopyFeedback("copied");
    window.setTimeout(() => setCopyFeedback("idle"), 2000);
  };

  const existingAccountPrompt = (
    <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        Restore from Cloud Backup
      </p>
      <p className="mt-1 text-sm text-slate-500">
        Already have a vault with cloud backup? Sign in to restore your encrypted vault to this device.
      </p>
      <button
        type="button"
        onClick={() => router.push("/login")}
        className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-500 hover:text-slate-950"
      >
        Sign In to Restore Backup
      </button>
    </div>
  );

  return (
    <>
      <Head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <div className="min-h-screen bg-[#F2F2F7] font-sans text-slate-800 antialiased">
        <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-x-hidden bg-[#F2F2F7]">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-900 text-white">
            <span className="material-symbols-outlined">verified_user</span>
          </div>
          <div className="flex gap-1">
            {["passphrase", "recovery", "confirm"].map((s, i) => (
              <div
                key={s}
                className={`h-2 w-8 rounded-full transition-colors ${
                  ["passphrase", "recovery", "confirm"].indexOf(step) >= i
                    ? "bg-emerald-600"
                    : "bg-slate-200"
                }`}
              />
            ))}
          </div>
          <div className="w-12" /> {/* Spacer for alignment */}
        </header>

        <main className="flex-1 px-6 pb-12">
          {error && (
            <div className="mb-6 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
              <p className="text-xs font-medium text-rose-700">{error}</p>
            </div>
          )}

          {isReloading && (
            <div className="flex h-[60vh] flex-col items-center justify-center text-center">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-emerald-500 text-white shadow-xl shadow-emerald-500/30">
                <span className="material-symbols-outlined animate-spin text-[48px]">progress_activity</span>
              </div>
              <h1 className="text-3xl font-light tracking-tight text-slate-900">
                Refreshing<span className="font-semibold">...</span>
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Clearing cache for latest updates.
              </p>
            </div>
          )}

          {mode === "checking" && !isReloading && (
            <div className="flex h-[60vh] flex-col items-center justify-center text-center">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-emerald-500 text-white shadow-xl shadow-emerald-500/30">
                <span className="material-symbols-outlined animate-spin text-[48px]">progress_activity</span>
              </div>
              <h1 className="text-3xl font-light tracking-tight text-slate-900">
                Checking your <span className="font-semibold">vault</span>
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Looking for local encrypted data on this device.
              </p>
            </div>
          )}

          {mode === "unlock" && (
            <div className="space-y-6">
              {/* Locked vault indicator */}
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 text-amber-600">
                  <span className="material-symbols-outlined text-[40px]">lock</span>
                </div>
                <h1 className="text-3xl font-light tracking-tight text-slate-900">
                  Vault is <span className="font-semibold">locked</span>
                </h1>
                <p className="mt-2 max-w-sm text-sm text-slate-500">
                  Your vault is encrypted and requires your passphrase and recovery key to unlock.
                  This is a security measure — even we can&apos;t access your data.
                </p>
              </div>

              {/* Info box */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-600">info</span>
                  <div className="text-xs text-amber-800">
                    <p className="font-semibold">Why am I seeing this?</p>
                    <p className="mt-1">
                      Your vault locks automatically when you close the browser or after a period of inactivity. 
                      Sign-in (Google) only proves your identity — your vault decryption keys are never stored on our servers.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Passphrase <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type={showPassphrase ? "text" : "password"}
                    value={unlockPassphrase}
                    onChange={(e) => setUnlockPassphrase(e.target.value)}
                    placeholder="Enter your passphrase"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Recovery Key <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRecovery ? "text" : "password"}
                      value={unlockRecoveryKey}
                      onChange={(e) => setUnlockRecoveryKey(e.target.value)}
                      placeholder="Enter your recovery key"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRecovery(!showRecovery)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      <span className="material-symbols-outlined">
                        {showRecovery ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Your recovery key was shown when you first created your vault.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleUnlock}
                disabled={isLoading || !unlockPassphrase || !unlockRecoveryKey}
                className="flex w-full items-center justify-center gap-3 rounded-[2rem] bg-emerald-800 py-5 text-sm font-semibold tracking-wide text-white shadow-xl shadow-emerald-900/20 transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">lock_open</span>
                {isLoading ? "Unlocking..." : "Unlock My Vault"}
              </button>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-center text-xs font-medium text-slate-500">
                  Don&apos;t have your keys?
                </p>
                <p className="mt-1 text-center text-[10px] text-slate-400">
                  If you&apos;ve lost both your passphrase and recovery key, your vault data cannot be recovered. 
                  This is the nature of zero-knowledge encryption.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-center text-xs text-slate-400">
                  Want to start fresh on this device?
                </p>
                <button
                  type="button"
                  onClick={handleCreateNewVault}
                  className="mt-2 w-full rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition-colors hover:border-slate-500 hover:text-slate-900"
                >
                  Create New Vault
                </button>
              </div>

              {existingAccountPrompt}
            </div>
          )}

          {/* Google OAuth Unlock Mode - Different UI for users coming from Google sign-in */}
          {mode === "google_unlock" && googleUser && (
            <div className="space-y-6">
              {/* Google user indicator */}
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-100 text-blue-600">
                  {googleUser.image ? (
                    <img 
                      src={googleUser.image} 
                      alt="" 
                      className="h-20 w-20 rounded-3xl object-cover"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-[40px]">account_circle</span>
                  )}
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5">
                  <span className="material-symbols-outlined text-[16px] text-blue-600">check_circle</span>
                  <span className="text-xs font-medium text-blue-700">Signed in with Google</span>
                </div>
                <h1 className="mt-4 text-2xl font-light tracking-tight text-slate-900">
                  Welcome back, <span className="font-semibold">{googleUser.name || googleUser.email}</span>
                </h1>
                <p className="mt-2 max-w-sm text-sm text-slate-500">
                  You&apos;re authenticated as <strong>{googleUser.email}</strong>. Now unlock your vault to access your data.
                </p>
              </div>

              {/* Info box */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 px-4 py-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-600">info</span>
                  <div className="text-xs text-blue-800">
                    <p className="font-semibold">Two layers of security</p>
                    <p className="mt-1">
                      Google sign-in proves your identity, but your vault is encrypted with keys only you know. 
                      We never store your passphrase or recovery key on our servers.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Vault Passphrase <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type={showPassphrase ? "text" : "password"}
                    value={unlockPassphrase}
                    onChange={(e) => setUnlockPassphrase(e.target.value)}
                    placeholder="Enter your vault passphrase"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Recovery Key <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRecovery ? "text" : "password"}
                      value={unlockRecoveryKey}
                      onChange={(e) => setUnlockRecoveryKey(e.target.value)}
                      placeholder="Enter your recovery key"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRecovery(!showRecovery)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      <span className="material-symbols-outlined">
                        {showRecovery ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    This was shown when you first created your vault.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleUnlock}
                disabled={isLoading || !unlockPassphrase || !unlockRecoveryKey}
                className="flex w-full items-center justify-center gap-3 rounded-[2rem] bg-gradient-to-r from-blue-600 to-emerald-700 py-5 text-sm font-semibold tracking-wide text-white shadow-xl shadow-blue-900/20 transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">lock_open</span>
                {isLoading ? "Unlocking Vault..." : "Unlock My Vault"}
              </button>

              {/* Cloud restore hint */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-emerald-600">cloud_done</span>
                  <div className="text-xs text-emerald-800">
                    <p className="font-semibold">Cloud backup available</p>
                    <p className="mt-1">
                      If you enabled encrypted cloud backup, your vault will be restored automatically after unlocking.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-center text-xs font-medium text-slate-500">
                  Not {googleUser.email}?
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    await authClient.signOut();
                    setMode("unlock");
                    setGoogleUser(null);
                  }}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-500 hover:text-slate-900"
                >
                  Sign Out and Use Different Account
                </button>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-center text-xs text-slate-400">
                  Lost your keys? Your data cannot be recovered.
                </p>
                <button
                  type="button"
                  onClick={handleCreateNewVault}
                  className="mt-2 w-full rounded-2xl border border-dashed border-rose-300 px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-rose-600 transition-colors hover:border-rose-500 hover:text-rose-700"
                >
                  Create New Vault (Data Will Be Lost)
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Passphrase */}
          {mode === "create" && step === "passphrase" && (
            <div className="space-y-6">
              {/* Sign out option if there's a stale session */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400">info</span>
                  <p className="text-xs text-slate-600">
                    Creating a new vault
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await authClient.signOut();
                    setCloudBackupEnabled(false);
                    window.location.reload();
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Start completely fresh
                </button>
              </div>

              <div>
                <h1 className="text-3xl font-light tracking-tight text-slate-900">
                  Create your <span className="font-semibold">passphrase</span>
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  This is your master key to unlock your vault. Choose something memorable but strong.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="How you'd like this vault labeled"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base outline-none focus:border-emerald-500"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">
                    Saved only on this device unless you later enable encrypted cloud sync.
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Passphrase
                  </label>
                  <div className="relative">
                    <input
                      type={showPassphrase ? "text" : "password"}
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder="Minimum 12 characters"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassphrase(!showPassphrase)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      <span className="material-symbols-outlined">
                        {showPassphrase ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Use a phrase you won&apos;t forget. Spaces allowed.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Confirm Passphrase
                  </label>
                  <input
                    type={showPassphrase ? "text" : "password"}
                    value={confirmPassphrase}
                    onChange={(e) => setConfirmPassphrase(e.target.value)}
                    placeholder="Type it again"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handlePassphraseSubmit}
                disabled={!passphrase || !confirmPassphrase}
                className="flex w-full items-center justify-center gap-3 rounded-[2rem] bg-emerald-800 py-5 text-sm font-semibold tracking-wide text-white shadow-xl shadow-emerald-900/20 transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>

              {existingAccountPrompt}
            </div>
          )}

          {/* Step 2: Recovery Key */}
          {mode === "create" && step === "recovery" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-light tracking-tight text-slate-900">
                  Save your <span className="font-semibold text-amber-600">recovery key</span>
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  If you forget your passphrase, this is the only way to recover your vault. 
                  <span className="font-semibold text-rose-600"> Save it somewhere safe.</span>
                </p>
              </div>

              <div className="rounded-3xl border-2 border-dashed border-amber-300 bg-amber-50 p-6">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-amber-700">
                  Your Recovery Key
                </p>
                <div className="relative">
                  <div className="break-all rounded-2xl border border-amber-200 bg-white px-4 py-4 font-mono text-sm tracking-wider text-slate-800">
                    {showRecovery ? recoveryKey : "•".repeat(recoveryKey.length)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRecovery(!showRecovery)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                  >
                    <span className="material-symbols-outlined">
                      {showRecovery ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={copyRecoveryKey}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white py-3 text-sm font-semibold text-amber-700 transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined">content_copy</span>
                  {copyFeedback === "copied" ? "Copied!" : "Copy to Clipboard"}
                </button>
              </div>

              <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="confirm-recovery"
                    checked={recoveryConfirmed}
                    onChange={(e) => setRecoveryConfirmed(e.target.checked)}
                    className="mt-0.5 h-5 w-5 rounded border-rose-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="confirm-recovery" className="text-sm leading-relaxed text-rose-800">
                    I confirm I have saved this recovery key somewhere safe (password manager, printed copy, etc.)
                  </label>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRecoverySubmit}
                disabled={!recoveryConfirmed}
                className="flex w-full items-center justify-center gap-3 rounded-[2rem] bg-emerald-800 py-5 text-sm font-semibold tracking-wide text-white shadow-xl shadow-emerald-900/20 transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          )}

          {/* Step 3: Final Confirmation */}
          {mode === "create" && step === "confirm" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-light tracking-tight text-slate-900">
                  Ready to <span className="font-semibold">secure</span> your vault?
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Let&apos;s set up your encrypted vault. This will only take a moment.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
                    <span className="material-symbols-outlined">check</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">Passphrase set</p>
                    <p className="text-[10px] text-emerald-600">Your master key is ready</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white">
                    <span className="material-symbols-outlined">key</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Recovery key saved</p>
                    <p className="text-[10px] text-amber-600">Backup access is configured</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs leading-relaxed text-slate-600">
                  <span className="font-semibold">Important:</span> Your vault uses zero-knowledge encryption. 
                  We cannot reset your passphrase or recovery key. If you lose both, your data is permanently inaccessible.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-xs leading-relaxed text-amber-900">
                  <span className="font-semibold">Local-only by default:</span> your vault is saved only in this
                  browser on this device. It can be lost if you clear browser storage, reset this browser, switch
                  browsers, or move to another device before enabling backup.
                </p>
                <p className="mt-2 text-xs leading-relaxed text-amber-900">
                  You can enable encrypted Google sync later from Settings if you want a cloud backup.
                </p>
              </div>

              <button
                type="button"
                onClick={handleComplete}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-3 rounded-[2rem] bg-emerald-800 py-5 text-sm font-semibold tracking-wide text-white shadow-xl shadow-emerald-900/20 transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    Initializing Vault...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">lock</span>
                    Create Secure Vault
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 4: Complete */}
          {mode === "create" && step === "complete" && (
            <div className="flex h-[60vh] flex-col items-center justify-center text-center">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-emerald-500 text-white shadow-xl shadow-emerald-500/30">
                <span className="material-symbols-outlined text-[48px]">check_circle</span>
              </div>
              <h1 className="text-3xl font-light tracking-tight text-slate-900">
                Vault <span className="font-semibold">created</span>
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Your legacy is now secured with end-to-end encryption.
              </p>
              <p className="mt-6 text-xs text-slate-400">
                Redirecting to dashboard...
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
    </>
  );
}

// Loading fallback for Suspense
function AccessSetupSkeleton() {
  return (
    <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center">
      <div className="animate-pulse text-slate-400">Loading...</div>
    </div>
  );
}

// Wrapper with Suspense
export default function AccessSetupPage() {
  return (
    <Suspense fallback={<AccessSetupSkeleton />}>
      <AccessSetupPageContent />
    </Suspense>
  );
}
