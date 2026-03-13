"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { generateRecoveryKey } from "@/lib/vault-crypto";
import { clearVaultSecrets, getVaultSecrets, setVaultSecrets } from "@/lib/vault-session";
import {
  hasLocalVaultPayload,
  initializeVaultIfMissing,
  verifyLocalVaultCredentials,
  clearLocalEncryptedPayload,
  getLocalProfileName,
  setLocalProfileName,
} from "@/lib/vault-client";

export default function AccessSetupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"checking" | "unlock" | "create">("checking");
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

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      const storedName = getLocalProfileName();
      if (!cancelled) {
        setFullName(storedName ?? "");
      }

      const localVaultExists = hasLocalVaultPayload();
      const existingSecrets = getVaultSecrets();

      if (!localVaultExists) {
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
  }, [router]);

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
      setVaultSecrets({
        passphrase,
        recoveryKey,
      });
      setLocalProfileName(fullName || null);
      
      // Initialize the vault
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
      await verifyLocalVaultCredentials(unlockPassphrase, unlockRecoveryKey);
      setVaultSecrets({
        passphrase: unlockPassphrase,
        recoveryKey: unlockRecoveryKey,
      });
      router.push("/dashboard");
    } catch {
      setError("Those access keys did not unlock the local vault.");
      setIsLoading(false);
    }
  };

  const handleCreateNewVault = () => {
    clearLocalEncryptedPayload();
    clearVaultSecrets();
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
        Existing Account
      </p>
      <p className="mt-1 text-sm text-slate-500">
        Already enabled encrypted Google backup before? Sign in to continue with that account.
      </p>
      <button
        type="button"
        onClick={() => router.push("/login")}
        className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-500 hover:text-slate-950"
      >
        Sign in to Existing Account
      </button>
    </div>
  );

  return (
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

          {mode === "checking" && (
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
              <div>
                <h1 className="text-3xl font-light tracking-tight text-slate-900">
                  Unlock your <span className="font-semibold">vault</span>
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  This device already has an encrypted local vault. Enter your passphrase and recovery key to continue.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Passphrase
                  </label>
                  <input
                    type={showPassphrase ? "text" : "password"}
                    value={unlockPassphrase}
                    onChange={(e) => setUnlockPassphrase(e.target.value)}
                    placeholder="Your passphrase"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Recovery Key
                  </label>
                  <div className="relative">
                    <input
                      type={showRecovery ? "text" : "password"}
                      value={unlockRecoveryKey}
                      onChange={(e) => setUnlockRecoveryKey(e.target.value)}
                      placeholder="Your saved recovery key"
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
                </div>
              </div>

              <button
                type="button"
                onClick={handleUnlock}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-3 rounded-[2rem] bg-emerald-800 py-5 text-sm font-semibold tracking-wide text-white shadow-xl shadow-emerald-900/20 transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Unlocking..." : "Unlock Vault"}
              </button>

              <p className="text-center text-xs text-slate-400">
                New device or no local vault here? Create a new offline vault on a different browser profile or device.
              </p>
              <button
                type="button"
                onClick={handleCreateNewVault}
                className="mt-3 w-full rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition-colors hover:border-slate-500 hover:text-slate-900"
              >
                Start a new vault on this device
              </button>

              {existingAccountPrompt}
            </div>
          )}

          {/* Step 1: Passphrase */}
          {mode === "create" && step === "passphrase" && (
            <div className="space-y-6">
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
  );
}
