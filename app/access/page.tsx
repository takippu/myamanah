"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { initializeVaultIfMissing } from "@/lib/vault-client";

// Generate a secure recovery key
function generateRecoveryKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "ak-"; // Amanah Key prefix
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function AccessSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"passphrase" | "recovery" | "confirm" | "complete">("passphrase");
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [recoveryConfirmed, setRecoveryConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    // Generate recovery key when entering recovery step
    if (step === "recovery" && !recoveryKey) {
      setRecoveryKey(generateRecoveryKey());
    }
  }, [step, recoveryKey]);

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
      // Store secrets in session for encryption
      const { setVaultSecrets } = await import("@/lib/vault-session");
      setVaultSecrets({
        passphrase,
        recoveryKey,
      });
      
      // Initialize the vault
      await initializeVaultIfMissing();
      
      setStep("complete");
      
      // Redirect to dashboard after a delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err) {
      setError("Failed to initialize vault. Please try again.");
      setIsLoading(false);
    }
  };

  const copyRecoveryKey = () => {
    navigator.clipboard.writeText(recoveryKey);
    // Show temporary feedback
    const btn = document.getElementById("copy-btn");
    if (btn) {
      const original = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => (btn.textContent = original), 2000);
    }
  };

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

          {/* Step 1: Passphrase */}
          {step === "passphrase" && (
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
            </div>
          )}

          {/* Step 2: Recovery Key */}
          {step === "recovery" && (
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
                  id="copy-btn"
                  type="button"
                  onClick={copyRecoveryKey}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white py-3 text-sm font-semibold text-amber-700 transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined">content_copy</span>
                  Copy to Clipboard
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
          {step === "confirm" && (
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
          {step === "complete" && (
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
