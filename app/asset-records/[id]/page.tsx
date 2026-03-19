"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppBottomNav } from "../../components/app-bottom-nav";
import { BalanceAdjustModal } from "../../components/balance-adjust-modal";
import { HeroSkeleton } from "../../components/skeletons";
import { TransactionList } from "../../components/transaction-list";
import { VaultSessionGuard } from "../../components/vault-session-guard";
import { emptyVaultData, type AssetRecord, type AssetTransaction, type VaultContact } from "@/lib/vault-data";
import { loadVaultData, saveVaultData } from "@/lib/vault-client";

function normalizeContacts(record: Pick<AssetRecord, "contacts" | "contactPerson" | "contactMethod">): VaultContact[] {
  if (record.contacts && record.contacts.length > 0) {
    return record.contacts.slice(0, 3).map((contact) => ({
      name: contact.name ?? "",
      method: contact.method ?? "",
    }));
  }

  if (record.contactPerson || record.contactMethod) {
    return [{ name: record.contactPerson ?? "", method: record.contactMethod ?? "" }];
  }

  return [];
}

function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;
  const cleaned = amountStr.replace(/[^\d.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export default function AssetRecordDetailPage() {
  const params = useParams<{ id: string }>();
  const [record, setRecord] = useState<AssetRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  const refreshData = async () => {
    try {
      const vault = await loadVaultData();
      const nextRecord = vault?.assets.find((item) => item.id === params.id) ?? null;
      setRecord(nextRecord);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshData();
  }, [params.id]);

  const handleAdjustValue = async (amount: number, notes?: string, date?: string) => {
    if (!record) return;
    setIsSaving(true);

    const currentValue = record.valueNumber || parseAmount(record.value || "0");
    const newValue = currentValue + amount;

    const transaction: AssetTransaction = {
      id: crypto.randomUUID(),
      date: date || new Date().toISOString().split("T")[0],
      amount,
      type: amount > 0 ? "appreciation" : "depreciation",
      notes,
      valueAfter: newValue,
      createdAt: new Date().toISOString(),
    };

    const updatedRecord: AssetRecord = {
      ...record,
      valueNumber: newValue,
      value: `RM ${newValue.toLocaleString()}`,
      transactions: [...(record.transactions || []), transaction],
      updatedAt: new Date().toISOString(),
    };

    setRecord(updatedRecord);

    try {
      const vault = await loadVaultData();
      const updatedAssets = vault?.assets.map((a) => (a.id === record.id ? updatedRecord : a)) || [];
      await saveVaultData({ ...(vault || emptyVaultData()), assets: updatedAssets });
    } catch (error) {
      console.error("Failed to save transaction:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!record || !record.transactions) return;
    setIsSaving(true);

    const updatedTransactions = record.transactions.filter((t) => t.id !== transactionId);
    
    // Recalculate value from original
    const baseValue = parseAmount(record.value || "0");
    const newValue = updatedTransactions.reduce((val, t) => val + t.amount, baseValue);

    const updatedRecord: AssetRecord = {
      ...record,
      valueNumber: newValue,
      value: newValue > 0 ? `RM ${newValue.toLocaleString()}` : record.value,
      transactions: updatedTransactions,
      updatedAt: new Date().toISOString(),
    };

    setRecord(updatedRecord);

    try {
      const vault = await loadVaultData();
      const updatedAssets = vault?.assets.map((a) => (a.id === record.id ? updatedRecord : a)) || [];
      await saveVaultData({ ...(vault || emptyVaultData()), assets: updatedAssets });
    } catch (error) {
      console.error("Failed to delete transaction:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const contacts = record ? normalizeContacts(record) : [];
  const currentValue = record?.valueNumber || parseAmount(record?.value || "0");
  const originalValue = parseAmount(record?.value || "0");
  const valueChange = currentValue - originalValue;
  const valueChangePercent = originalValue > 0 ? ((valueChange) / originalValue) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans text-slate-800 antialiased">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-x-hidden bg-[#F2F2F7]">
        <VaultSessionGuard />
        
        {/* Saving Overlay */}
        {isSaving && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-6 shadow-xl">
              <span className="material-symbols-outlined animate-spin text-3xl text-emerald-600">progress_activity</span>
              <p className="text-sm font-medium text-slate-700">Securing your data...</p>
            </div>
          </div>
        )}
        
        <header className="sticky top-0 z-30 flex items-center justify-between bg-[#F2F2F7]/80 px-6 py-5 backdrop-blur-lg">
          <Link
            href="/asset-records"
            aria-label="Back to asset records"
            className="glass-card flex h-12 w-12 items-center justify-center rounded-2xl transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-slate-600">arrow_back</span>
          </Link>
          <h1 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-600">Asset Detail</h1>
          <div className="h-12 w-12" />
        </header>

        <main className="flex-1 space-y-4 px-6 pb-36 pt-4">
          {isLoading ? (
            <HeroSkeleton />
          ) : null}

          {!isLoading && !record ? (
            <div className="glass-card rounded-3xl border border-[#e7eaee] bg-white/85 p-6 text-center">
              <p className="text-sm font-semibold text-slate-700">Asset not found</p>
              <p className="mt-1 text-xs text-slate-500">This record is no longer available on this device.</p>
            </div>
          ) : null}

          {record ? (
            <>
              {/* Main Info Card */}
              <section className="glass-card rounded-[2rem] border border-[#e7eaee] bg-white/90 p-6 shadow-[0_16px_30px_-18px_rgba(15,23,42,0.25)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{record.assetType}</p>
                    <h2 className="mt-1 text-xl font-bold text-slate-900 break-words">{record.institution}</h2>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-right text-emerald-700 shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest">Value</p>
                    <p className="mt-1 text-sm font-semibold">RM {currentValue.toLocaleString()}</p>
                  </div>
                </div>

                {/* Value Change */}
                {originalValue > 0 && valueChange !== 0 && (
                  <div className="mt-4 flex items-center gap-2">
                    <span className={`text-sm font-semibold ${valueChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {valueChange >= 0 ? '+' : ''}{valueChangePercent.toFixed(1)}%
                    </span>
                    <span className="text-xs text-slate-400">from original value</span>
                  </div>
                )}

                {/* Action Button */}
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(true)}
                  className="mt-4 w-full rounded-2xl bg-violet-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700 active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined mr-1 align-text-bottom text-[18px]">trending_up</span>
                  Adjust Value
                </button>

                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Documents Where</p>
                    <p className="mt-2 text-sm text-slate-800">{record.whereToFind}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Contacts</p>
                    {contacts.length > 0 ? (
                      <div className="mt-3 space-y-3">
                        {contacts.map((contact, index) => (
                          <div key={`${contact.name}-${index}`} className="flex flex-col sm:grid sm:grid-cols-2 gap-1 text-sm text-slate-800">
                            <p className="font-medium">{contact.name || "Not set"}</p>
                            <p className="text-slate-600">{contact.method || "Not set"}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">No contact details saved.</p>
                    )}
                  </div>

                  {record.notes ? (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Notes</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{record.notes}</p>
                    </div>
                  ) : null}
                </div>
              </section>

              {/* Transaction History */}
              <section className="glass-card rounded-[2rem] border border-[#e7eaee] bg-white/90 p-6 shadow-[0_16px_30px_-18px_rgba(15,23,42,0.25)]">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Value History</h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {record.transactions?.length || 0} records
                  </span>
                </div>
                <TransactionList
                  transactions={record.transactions || []}
                  onDelete={handleDeleteTransaction}
                  type="asset"
                />
              </section>
            </>
          ) : null}
        </main>

        <BalanceAdjustModal
          isOpen={showAdjustModal}
          onClose={() => setShowAdjustModal(false)}
          currentBalance={currentValue}
          onSave={handleAdjustValue}
          type="asset"
        />

        <AppBottomNav active="assets" mode="dashboard" />
      </div>
    </div>
  );
}
