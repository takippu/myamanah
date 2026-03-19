"use client";

import { useState, useCallback } from "react";
import { decryptVaultData, type EncryptedVaultPayload } from "@/lib/vault-crypto";
import type { VaultData } from "@/lib/vault-data";

type DecryptStatus = 
  | { type: "idle" }
  | { type: "decrypting" }
  | { type: "success"; data: VaultData }
  | { type: "error"; message: string };

export default function DecryptPage() {
  const [encryptedInput, setEncryptedInput] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [showRecoveryKey, setShowRecoveryKey] = useState(false);
  const [status, setStatus] = useState<DecryptStatus>({ type: "idle" });
  const [activeTab, setActiveTab] = useState<"assets" | "debts" | "wishes" | "legacy">("assets");

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        // Try to extract just the encrypted payload from the file
        const parsed = JSON.parse(text);
        if (parsed.encryptedPayload) {
          setEncryptedInput(JSON.stringify(parsed.encryptedPayload, null, 2));
        } else {
          setEncryptedInput(text);
        }
      } catch {
        setEncryptedInput("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDecrypt = async () => {
    if (!encryptedInput.trim() || (!passphrase.trim() && !recoveryKey.trim())) {
      setStatus({ type: "error", message: "Please provide the encrypted data and at least one key (passphrase or recovery key)" });
      return;
    }

    setStatus({ type: "decrypting" });

    try {
      // Parse the encrypted payload
      let payload: EncryptedVaultPayload;
      try {
        payload = JSON.parse(encryptedInput.trim()) as EncryptedVaultPayload;
      } catch {
        setStatus({ type: "error", message: "Invalid encrypted data format. Please paste the complete JSON content." });
        return;
      }

      // Attempt decryption
      const decrypted = await decryptVaultData(
        payload, 
        passphrase.trim() || recoveryKey.trim(), 
        recoveryKey.trim() || passphrase.trim()
      );
      
      const vaultData = JSON.parse(decrypted) as VaultData;
      setStatus({ type: "success", data: vaultData });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Decryption failed";
      if (message.includes("decrypt") || message.includes("key")) {
        setStatus({ type: "error", message: "Incorrect passphrase or recovery key. Please check and try again." });
      } else {
        setStatus({ type: "error", message: `Decryption failed: ${message}` });
      }
    }
  };

  const formatCurrency = (value: string | number | undefined) => {
    if (value === undefined) return "—";
    const num = typeof value === "string" ? parseFloat(value.replace(/[^\d.-]/g, "")) : value;
    if (isNaN(num)) return "—";
    return `RM ${num.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="32" height="32">
              <path d="M24 4L6 12v11.2c0 9.2 7.7 17.8 18 20 10.3-2.2 18-10.8 18-20V12L24 4z" fill="#ffffff"/>
              <path d="M20 32.4l-7.4-7.4 1.9-1.9 5.5 5.5 11.5-11.5 1.9 1.9L20 32.4z" fill="#059669"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">MyAmanah Decrypt Tool</h1>
          <p className="mt-2 text-slate-600">Unlock encrypted vault backups using the recovery key</p>
        </div>

        {status.type !== "success" ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 md:p-8">
            {/* Step 1: Encrypted Data */}
            <div className="mb-6">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <span className="material-symbols-outlined text-sm">1</span>
                </div>
                <h2 className="font-semibold text-slate-900">Encrypted Backup Data</h2>
              </div>
              
              <div className="space-y-3">
                <div className="flex gap-2">
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700">
                    <span className="material-symbols-outlined">upload_file</span>
                    Upload JSON File
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                
                <textarea
                  value={encryptedInput}
                  onChange={(e) => setEncryptedInput(e.target.value)}
                  placeholder="Or paste the encrypted JSON content here..."
                  rows={6}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Step 2: Keys */}
            <div className="mb-6">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <span className="material-symbols-outlined text-sm">2</span>
                </div>
                <h2 className="font-semibold text-slate-900">Decryption Keys</h2>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                {/* Passphrase */}
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Passphrase (if available)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassphrase ? "text" : "password"}
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder="Enter passphrase"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassphrase(!showPassphrase)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <span className="material-symbols-outlined">
                        {showPassphrase ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Recovery Key */}
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Recovery Key <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRecoveryKey ? "text" : "password"}
                      value={recoveryKey}
                      onChange={(e) => setRecoveryKey(e.target.value)}
                      placeholder="Enter recovery key"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 font-mono text-sm outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRecoveryKey(!showRecoveryKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <span className="material-symbols-outlined">
                        {showRecoveryKey ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
              
              <p className="mt-2 text-xs text-slate-500">
                You need either the passphrase OR the recovery key. If you have both, either will work.
              </p>
            </div>

            {/* Error Message */}
            {status.type === "error" && (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-rose-600">error</span>
                  <p className="text-sm text-rose-700">{status.message}</p>
                </div>
              </div>
            )}

            {/* Decrypt Button */}
            <button
              type="button"
              onClick={handleDecrypt}
              disabled={status.type === "decrypting"}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status.type === "decrypting" ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  Decrypting... (this may take a moment)
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">lock_open</span>
                  Decrypt Vault
                </>
              )}
            </button>

            {/* Info Box */}
            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-slate-400">info</span>
                <div className="text-xs leading-relaxed text-slate-600">
                  <p className="font-medium text-slate-800">Privacy Notice</p>
                  <p className="mt-1">
                    All decryption happens in your browser. No data is sent to any server. 
                    This tool works completely offline after the page loads.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Success - Decrypted Data Display */
          <div className="space-y-6">
            {/* Success Banner */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                <div>
                  <p className="font-semibold text-emerald-900">Decryption Successful</p>
                  <p className="text-sm text-emerald-700">The vault has been unlocked. Review the data below.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStatus({ type: "idle" });
                    setEncryptedInput("");
                    setPassphrase("");
                    setRecoveryKey("");
                  }}
                  className="ml-auto rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Decrypt Another
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2">
              {[
                { key: "assets", label: "Assets", count: status.data.assets?.length || 0 },
                { key: "debts", label: "Debts", count: status.data.debts?.length || 0 },
                { key: "wishes", label: "Wishes", count: status.data.wishes ? 1 : 0 },
                { key: "legacy", label: "Digital Legacy", count: status.data.digitalLegacy?.length || 0 },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "bg-emerald-100 text-emerald-800"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                  <span className={`rounded-full px-2 py-0.5 text-xs ${activeTab === tab.key ? "bg-emerald-200 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
              {activeTab === "assets" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Asset Records</h3>
                  {status.data.assets?.length === 0 ? (
                    <p className="text-slate-500">No asset records found.</p>
                  ) : (
                    <div className="grid gap-3">
                      {status.data.assets?.map((asset) => (
                        <div key={asset.id} className="rounded-2xl border border-slate-200 p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-slate-900">{asset.institution}</p>
                              <p className="text-sm text-slate-500">{asset.assetType}</p>
                            </div>
                            <p className="font-semibold text-emerald-600">{formatCurrency(asset.value)}</p>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">Documents: {asset.whereToFind}</p>
                          {asset.contacts && asset.contacts.length > 0 && (
                            <div className="mt-2 text-xs text-slate-600">
                              Contacts: {asset.contacts.map((c: {name?: string}) => c.name).filter(Boolean).join(", ")}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "debts" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Debt Records</h3>
                  {status.data.debts?.length === 0 ? (
                    <p className="text-slate-500">No debt records found.</p>
                  ) : (
                    <div className="grid gap-3">
                      {status.data.debts?.map((debt) => (
                        <div key={debt.id} className="rounded-2xl border border-slate-200 p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-slate-900">{debt.creditor}</p>
                              <p className="text-sm text-slate-500">{debt.debtType}</p>
                            </div>
                            <p className="font-semibold text-rose-600">{formatCurrency(debt.remainingAmount)}</p>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">Documents: {debt.whereDocs}</p>
                          {debt.dueDate && (
                            <p className="text-xs text-slate-500">Due: {debt.dueDate}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "wishes" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Final Wishes</h3>
                  {!status.data.wishes ? (
                    <p className="text-slate-500">No wishes recorded.</p>
                  ) : (
                    <div className="grid gap-4">
                      {status.data.wishes.religiousWishes && (
                        <div className="rounded-2xl border border-slate-200 p-4">
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Religious Wishes</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{status.data.wishes.religiousWishes}</p>
                        </div>
                      )}
                      {status.data.wishes.familyInstructions && (
                        <div className="rounded-2xl border border-slate-200 p-4">
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Family Instructions</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{status.data.wishes.familyInstructions}</p>
                        </div>
                      )}
                      {status.data.wishes.distributionNotes && (
                        <div className="rounded-2xl border border-slate-200 p-4">
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Distribution Notes</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{status.data.wishes.distributionNotes}</p>
                        </div>
                      )}
                      {status.data.wishes.executorNotes && (
                        <div className="rounded-2xl border border-slate-200 p-4">
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Executor Notes</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{status.data.wishes.executorNotes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "legacy" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Digital Legacy</h3>
                  {status.data.digitalLegacy?.length === 0 ? (
                    <p className="text-slate-500">No digital legacy records found.</p>
                  ) : (
                    <div className="grid gap-3">
                      {status.data.digitalLegacy?.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-slate-900">{item.platform}</p>
                              <p className="text-xs text-slate-500">{item.category}</p>
                            </div>
                          </div>
                          {item.accountIdentifier && (
                            <p className="mt-2 text-sm text-slate-600">Identifier: {item.accountIdentifier}</p>
                          )}
                          <p className="text-xs text-slate-500">Where: {item.whereToFind}</p>
                          {item.notes && (
                            <p className="text-xs text-slate-500">Notes: {item.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Raw Data Toggle */}
            <details className="rounded-2xl border border-slate-200 bg-white">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">
                View Raw JSON Data
              </summary>
              <div className="border-t border-slate-200 p-4">
                <pre className="max-h-96 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-300">
                  {JSON.stringify(status.data, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        )}

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-400">
          MyAmanah • Privacy-first legacy organizer • All decryption happens locally in your browser
        </p>
      </div>
    </div>
  );
}
