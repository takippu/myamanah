"use client";

import { useState, useCallback } from "react";
import { decryptVaultData, type EncryptedVaultPayload } from "@/lib/vault-crypto";
import type { VaultData } from "@/lib/vault-data";

type DecryptTab = "overview" | "assets" | "debts" | "debtors" | "wishes" | "legacy" | "contacts";

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
  const [activeTab, setActiveTab] = useState<DecryptTab>("overview");

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
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
      setStatus({ type: "error", message: "Please provide the encrypted data and at least one key" });
      return;
    }

    setStatus({ type: "decrypting" });

    try {
      let payload: EncryptedVaultPayload;
      try {
        payload = JSON.parse(encryptedInput.trim()) as EncryptedVaultPayload;
      } catch {
        setStatus({ type: "error", message: "Invalid encrypted data format" });
        return;
      }

      const decrypted = await decryptVaultData(
        payload, 
        passphrase.trim() || recoveryKey.trim(), 
        recoveryKey.trim() || passphrase.trim()
      );
      
      const vaultData = JSON.parse(decrypted) as VaultData;
      setStatus({ type: "success", data: vaultData });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Decryption failed";
      setStatus({ type: "error", message: message.includes("key") ? "Incorrect passphrase or recovery key" : `Decryption failed: ${message}` });
    }
  };

  const formatCurrency = (value: string | number | undefined) => {
    if (value === undefined) return "—";
    const num = typeof value === "string" ? parseFloat(value.replace(/[^\d.-]/g, "")) : value;
    if (isNaN(num)) return "—";
    return `RM ${num.toLocaleString()}`;
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-MY", { dateStyle: "medium" });
  };

  // Check if wishes has any content
  const hasWishesContent = (wishes: VaultData["wishes"]) => {
    if (!wishes) return false;
    return !!(wishes.religiousWishes?.trim() || wishes.familyInstructions?.trim() || 
              wishes.distributionNotes?.trim() || wishes.executorNotes?.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-6 text-slate-900">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="28" height="28">
              <path d="M24 4L6 12v11.2c0 9.2 7.7 17.8 18 20 10.3-2.2 18-10.8 18-20V12L24 4z" fill="#ffffff"/>
              <path d="M20 32.4l-7.4-7.4 1.9-1.9 5.5 5.5 11.5-11.5 1.9 1.9L20 32.4z" fill="#059669"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">MyAmanah Decrypt</h1>
          <p className="mt-1 text-sm text-slate-600">Unlock encrypted vault backups</p>
        </div>

        {status.type !== "success" ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
            {/* Step 1: Encrypted Data */}
            <div className="mb-5">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold">1</div>
                <h2 className="font-semibold text-slate-900">Encrypted Backup Data</h2>
              </div>
              
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:border-emerald-400 hover:bg-emerald-50">
                  <span className="material-symbols-outlined">upload_file</span>
                  Upload JSON File
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
                
                <textarea
                  value={encryptedInput}
                  onChange={(e) => setEncryptedInput(e.target.value)}
                  placeholder="Or paste the encrypted JSON content here..."
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-700 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Step 2: Keys */}
            <div className="mb-5">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold">2</div>
                <h2 className="font-semibold text-slate-900">Decryption Keys</h2>
              </div>
              
              <div className="space-y-3">
                {/* Passphrase */}
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">Passphrase (if available)</label>
                  <div className="relative">
                    <input
                      type={showPassphrase ? "text" : "password"}
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder="Enter passphrase"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm outline-none focus:border-emerald-500"
                    />
                    <button type="button" onClick={() => setShowPassphrase(!showPassphrase)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <span className="material-symbols-outlined">{showPassphrase ? "visibility_off" : "visibility"}</span>
                    </button>
                  </div>
                </div>

                {/* Recovery Key */}
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">Recovery Key <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showRecoveryKey ? "text" : "password"}
                      value={recoveryKey}
                      onChange={(e) => setRecoveryKey(e.target.value)}
                      placeholder="Enter recovery key"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 font-mono text-sm outline-none focus:border-emerald-500"
                    />
                    <button type="button" onClick={() => setShowRecoveryKey(!showRecoveryKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <span className="material-symbols-outlined">{showRecoveryKey ? "visibility_off" : "visibility"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {status.type === "error" && (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-rose-600">error</span>
                  <p className="text-sm text-rose-700">{status.message}</p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleDecrypt}
              disabled={status.type === "decrypting"}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
            >
              {status.type === "decrypting" ? (
                <><span className="material-symbols-outlined animate-spin">progress_activity</span>Decrypting...</>
              ) : (
                <><span className="material-symbols-outlined">lock_open</span>Decrypt Vault</>
              )}
            </button>
          </div>
        ) : (
          /* Success - Decrypted Data Display */
          <div className="space-y-4">
            {/* Success Banner */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                <div className="flex-1">
                  <p className="font-semibold text-emerald-900">Decryption Successful</p>
                  <p className="text-sm text-emerald-700">{status.data.meta?.profileName || "Unnamed Vault"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setStatus({ type: "idle" }); setEncryptedInput(""); setPassphrase(""); setRecoveryKey(""); }}
                  className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Decrypt Another
                </button>
              </div>
            </div>

            {/* Navigation Tabs - Horizontal Scroll */}
            <div className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5">
              {[
                { key: "overview", label: "Overview" },
                { key: "assets", label: "Assets", count: status.data.assets?.length || 0 },
                { key: "debts", label: "Debts", count: status.data.debts?.length || 0 },
                { key: "debtors", label: "Debtors", count: status.data.debtors?.length || 0 },
                { key: "wishes", label: "Wishes", count: hasWishesContent(status.data.wishes) ? 1 : 0 },
                { key: "legacy", label: "Digital", count: status.data.digitalLegacy?.length || 0 },
                { key: "contacts", label: "Contacts", count: status.data.trustedContacts?.length || 0 },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as DecryptTab)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                    activeTab === tab.key ? "bg-emerald-100 text-emerald-800" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                  {"count" in tab && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === tab.key ? "bg-emerald-200" : "bg-slate-200"}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              
              {/* OVERVIEW TAB */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-slate-900">Vault Overview</h3>
                  
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-emerald-50 p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-700">{status.data.assets?.length || 0}</p>
                      <p className="text-xs text-emerald-600">Assets</p>
                    </div>
                    <div className="rounded-xl bg-rose-50 p-3 text-center">
                      <p className="text-2xl font-bold text-rose-700">{status.data.debts?.length || 0}</p>
                      <p className="text-xs text-rose-600">Debts</p>
                    </div>
                    <div className="rounded-xl bg-blue-50 p-3 text-center">
                      <p className="text-2xl font-bold text-blue-700">{status.data.debtors?.length || 0}</p>
                      <p className="text-xs text-blue-600">Debtors</p>
                    </div>
                    <div className="rounded-xl bg-violet-50 p-3 text-center">
                      <p className="text-2xl font-bold text-violet-700">{status.data.digitalLegacy?.length || 0}</p>
                      <p className="text-xs text-violet-600">Digital Records</p>
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                    <p className="text-slate-500">Last Updated: <span className="text-slate-900">{formatDate(status.data.meta?.updatedAt)}</span></p>
                    {status.data.meta?.deadmanLastCheckInAt && (
                      <p className="mt-1 text-slate-500">Last Check-in: <span className="text-slate-900">{formatDate(status.data.meta.deadmanLastCheckInAt)}</span></p>
                    )}
                  </div>
                </div>
              )}

              {/* ASSETS TAB */}
              {activeTab === "assets" && (
                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-slate-900">Asset Records ({status.data.assets?.length || 0})</h3>
                  {status.data.assets?.length === 0 ? (
                    <p className="text-sm text-slate-500">No asset records found.</p>
                  ) : (
                    <div className="space-y-2">
                      {status.data.assets?.map((asset) => (
                        <div key={asset.id} className="rounded-xl border border-slate-200 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-semibold text-slate-900">{asset.institution}</p>
                              <p className="text-xs text-slate-500">{asset.assetType}</p>
                            </div>
                            <p className="font-semibold text-emerald-600">{formatCurrency(asset.value)}</p>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">📄 {asset.whereToFind}</p>
                          {asset.notes && <p className="mt-1 text-xs text-slate-600">📝 {asset.notes}</p>}
                          {asset.contacts && asset.contacts.length > 0 && (
                            <p className="mt-1 text-xs text-slate-600">👤 {asset.contacts.map((c) => c.name).filter(Boolean).join(", ")}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* DEBTS TAB */}
              {activeTab === "debts" && (
                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-slate-900">Debt Records ({status.data.debts?.length || 0})</h3>
                  {status.data.debts?.length === 0 ? (
                    <p className="text-sm text-slate-500">No debt records found.</p>
                  ) : (
                    <div className="space-y-2">
                      {status.data.debts?.map((debt) => (
                        <div key={debt.id} className="rounded-xl border border-slate-200 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-semibold text-slate-900">{debt.creditor}</p>
                              <p className="text-xs text-slate-500">{debt.debtType}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-rose-600">{formatCurrency(debt.remainingAmount)}</p>
                              {debt.amountNumber && debt.remainingAmount !== debt.amountNumber && (
                                <p className="text-xs text-slate-400 line-through">{formatCurrency(debt.amountNumber)}</p>
                              )}
                            </div>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">📄 {debt.whereDocs}</p>
                          {debt.dueDate && <p className="text-xs text-slate-500">📅 Due: {debt.dueDate}</p>}
                          {debt.notes && <p className="mt-1 text-xs text-slate-600">📝 {debt.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* DEBTORS TAB */}
              {activeTab === "debtors" && (
                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-slate-900">People Who Owe You ({status.data.debtors?.length || 0})</h3>
                  {status.data.debtors?.length === 0 ? (
                    <p className="text-sm text-slate-500">No debtor records found.</p>
                  ) : (
                    <div className="space-y-2">
                      {status.data.debtors?.map((debtor) => (
                        <div key={debtor.id} className="rounded-xl border border-slate-200 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-semibold text-slate-900">{debtor.name}</p>
                              {debtor.contact && <p className="text-xs text-slate-500">{debtor.contact}</p>}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-blue-600">{formatCurrency(debtor.remainingAmount)}</p>
                              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] ${debtor.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                {debtor.status === "paid" ? "Paid" : "Pending"}
                              </span>
                            </div>
                          </div>
                          {debtor.notes && <p className="mt-1 text-xs text-slate-600">📝 {debtor.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* WISHES TAB */}
              {activeTab === "wishes" && (
                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-slate-900">Final Wishes</h3>
                  {!hasWishesContent(status.data.wishes) ? (
                    <p className="text-sm text-slate-500">No wishes recorded.</p>
                  ) : (
                    <div className="space-y-2">
                      {status.data.wishes?.religiousWishes?.trim() && (
                        <div className="rounded-xl border border-slate-200 p-3">
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">🙏 Religious Wishes</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{status.data.wishes.religiousWishes}</p>
                        </div>
                      )}
                      {status.data.wishes?.familyInstructions?.trim() && (
                        <div className="rounded-xl border border-slate-200 p-3">
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">👨‍👩‍👧‍👦 Family Instructions</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{status.data.wishes.familyInstructions}</p>
                        </div>
                      )}
                      {status.data.wishes?.distributionNotes?.trim() && (
                        <div className="rounded-xl border border-slate-200 p-3">
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">📋 Distribution Notes</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{status.data.wishes.distributionNotes}</p>
                        </div>
                      )}
                      {status.data.wishes?.executorNotes?.trim() && (
                        <div className="rounded-xl border border-slate-200 p-3">
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">⚖️ Executor Notes</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{status.data.wishes.executorNotes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* DIGITAL LEGACY TAB */}
              {activeTab === "legacy" && (
                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-slate-900">Digital Legacy ({status.data.digitalLegacy?.length || 0})</h3>
                  {status.data.digitalLegacy?.length === 0 ? (
                    <p className="text-sm text-slate-500">No digital legacy records found.</p>
                  ) : (
                    <div className="space-y-2">
                      {status.data.digitalLegacy?.map((item) => (
                        <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-semibold text-slate-900">{item.platform}</p>
                              <p className="text-xs text-slate-500">{item.category}</p>
                            </div>
                          </div>
                          {item.accountIdentifier && <p className="mt-1 text-sm text-slate-600">👤 {item.accountIdentifier}</p>}
                          <p className="text-xs text-slate-500">📄 {item.whereToFind}</p>
                          {item.recoveryContact && <p className="text-xs text-slate-500">📞 Recovery: {item.recoveryContact}</p>}
                          {item.notes && <p className="mt-1 text-xs text-slate-600">📝 {item.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TRUSTED CONTACTS TAB */}
              {activeTab === "contacts" && (
                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-slate-900">Trusted Contacts ({status.data.trustedContacts?.length || 0})</h3>
                  {status.data.trustedContacts?.length === 0 ? (
                    <p className="text-sm text-slate-500">No trusted contacts recorded.</p>
                  ) : (
                    <div className="space-y-2">
                      {status.data.trustedContacts?.map((contact, idx) => (
                        <div key={contact.id || idx} className="rounded-xl border border-slate-200 p-3">
                          <p className="font-semibold text-slate-900">{contact.name}</p>
                          {contact.relation && <p className="text-xs text-slate-500">{contact.relation}</p>}
                          {contact.contact && <p className="mt-1 text-sm text-slate-600">📞 {contact.contact}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Raw Data Toggle */}
            <details className="rounded-2xl border border-slate-200 bg-white">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">View Raw JSON Data</summary>
              <div className="border-t border-slate-200 p-3">
                <pre className="max-h-64 overflow-auto rounded-xl bg-slate-900 p-3 text-[10px] text-slate-300">{JSON.stringify(status.data, null, 2)}</pre>
              </div>
            </details>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">MyAmanah • All decryption happens locally in your browser</p>
      </div>
    </div>
  );
}
