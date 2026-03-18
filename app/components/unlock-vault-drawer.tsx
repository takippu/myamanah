"use client";

import { useState } from "react";
import { setVaultSecrets } from "@/lib/vault-session";
import { verifyLocalVaultCredentials } from "@/lib/vault-client";

type UnlockVaultDrawerProps = {
  open: boolean;
  onClose: () => void;
  onUnlock: () => void;
};

export function UnlockVaultDrawer({ open, onClose, onUnlock }: UnlockVaultDrawerProps) {
  const [passphrase, setPassphrase] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = async () => {
    if (!passphrase.trim() || !recoveryKey.trim()) {
      setError("Please enter both your passphrase and recovery key.");
      return;
    }

    setIsUnlocking(true);
    setError(null);

    try {
      await verifyLocalVaultCredentials(passphrase.trim(), recoveryKey.trim());
      setVaultSecrets({
        passphrase: passphrase.trim(),
        recoveryKey: recoveryKey.trim(),
      });
      onUnlock();
      // Reset form
      setPassphrase("");
      setRecoveryKey("");
    } catch {
      setError("Incorrect passphrase or recovery key. Please try again.");
    } finally {
      setIsUnlocking(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <style jsx>{`
        @keyframes drawer-backdrop-in {
          from { background-color: rgba(2, 6, 23, 0); }
          to { background-color: rgba(2, 6, 23, 0.45); }
        }
        @keyframes drawer-sheet-in {
          from { opacity: 0; transform: translateY(2rem); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        className="fixed inset-0 z-[60] bg-slate-950/45"
        style={{ animation: "drawer-backdrop-in 240ms ease-out" }}
      >
        <div
          className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-[2.5rem] border border-slate-200 bg-white shadow-[0_-18px_48px_-24px_rgba(15,23,42,0.55)]"
          style={{ animation: "drawer-sheet-in 300ms ease-out" }}
        >
          {/* Handle */}
          <div className="flex items-center justify-center px-5 pb-2 pt-4">
            <div className="h-1.5 w-12 rounded-full bg-slate-200" />
          </div>

          <div className="px-6 pb-6">
            {/* Header */}
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <span className="material-symbols-outlined text-[32px]">lock</span>
              </div>
              <h2 className="text-xl font-semibold text-slate-900">Unlock Your Vault</h2>
              <p className="mt-2 text-sm text-slate-500">
                Your vault is locked for security. Enter your keys to continue.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                <p className="text-xs font-medium text-rose-700">{error}</p>
              </div>
            )}

            {/* Info */}
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-amber-600 text-[18px]">info</span>
                <p className="text-xs text-amber-800">
                  <span className="font-semibold">Tip:</span> Your vault locks automatically when you close the browser. 
                  Your passphrase and recovery key are never stored on our servers.
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Passphrase <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassphrase ? "text" : "password"}
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter your passphrase"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base outline-none transition-all focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassphrase((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    <span className="material-symbols-outlined">
                      {showPassphrase ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Recovery Key <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showRecovery ? "text" : "password"}
                    value={recoveryKey}
                    onChange={(e) => setRecoveryKey(e.target.value)}
                    placeholder="Enter your recovery key"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base outline-none transition-all focus:border-emerald-500"
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

            {/* Actions */}
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={handleUnlock}
                disabled={isUnlocking || !passphrase.trim() || !recoveryKey.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 py-4 text-sm font-semibold tracking-wide text-white shadow-lg shadow-emerald-900/20 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <span className="material-symbols-outlined">lock_open</span>
                {isUnlocking ? "Unlocking..." : "Unlock Vault"}
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={isUnlocking}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>

            {/* Help */}
            <p className="mt-4 text-center text-[10px] text-slate-400">
              Lost your keys? Unfortunately, we cannot recover your vault data. 
              This is the nature of zero-knowledge encryption.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
