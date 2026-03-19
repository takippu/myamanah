"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppBottomNav } from "../../components/app-bottom-nav";
import { BalanceAdjustModal } from "../../components/balance-adjust-modal";
import { HeroSkeleton } from "../../components/skeletons";
import { TransactionList } from "../../components/transaction-list";
import { VaultSessionGuard } from "../../components/vault-session-guard";
import { emptyVaultData, type DebtRecord, type DebtTransaction } from "@/lib/vault-data";
import { loadVaultData, saveVaultData } from "@/lib/vault-client";

export default function DebtRecordDetailPage() {
  const params = useParams<{ id: string }>();
  const [record, setRecord] = useState<DebtRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  const refreshData = async () => {
    try {
      const vault = await loadVaultData();
      const nextRecord = vault?.debts.find((item) => item.id === params.id) ?? null;
      setRecord(nextRecord);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshData();
  }, [params.id]);

  const handleAdjustBalance = async (amount: number, notes?: string, date?: string) => {
    if (!record) return;

    const currentBalance = record.remainingAmount || record.amountNumber || 0;
    const newBalance = currentBalance + amount;

    const transaction: DebtTransaction = {
      id: crypto.randomUUID(),
      date: date || new Date().toISOString().split("T")[0],
      amount,
      type: amount > 0 ? "increase" : "payment",
      notes,
      balanceAfter: newBalance,
      createdAt: new Date().toISOString(),
    };

    const updatedRecord: DebtRecord = {
      ...record,
      remainingAmount: newBalance,
      transactions: [...(record.transactions || []), transaction],
      updatedAt: new Date().toISOString(),
    };

    // Update local state
    setRecord(updatedRecord);

    // Save to vault
    try {
      const vault = await loadVaultData();
      const updatedDebts = vault?.debts.map((d) => (d.id === record.id ? updatedRecord : d)) || [];
      await saveVaultData({ ...(vault || emptyVaultData()), debts: updatedDebts });
    } catch (error) {
      console.error("Failed to save transaction:", error);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!record || !record.transactions) return;

    const updatedTransactions = record.transactions.filter((t) => t.id !== transactionId);
    
    // Recalculate remaining amount from original
    const originalAmount = record.amountNumber || 0;
    const newRemainingAmount = updatedTransactions.reduce(
      (balance, t) => balance + t.amount,
      originalAmount
    );

    const updatedRecord: DebtRecord = {
      ...record,
      remainingAmount: newRemainingAmount,
      transactions: updatedTransactions,
      updatedAt: new Date().toISOString(),
    };

    setRecord(updatedRecord);

    try {
      const vault = await loadVaultData();
      const updatedDebts = vault?.debts.map((d) => (d.id === record.id ? updatedRecord : d)) || [];
      await saveVaultData({ ...(vault || emptyVaultData()), debts: updatedDebts });
    } catch (error) {
      console.error("Failed to delete transaction:", error);
    }
  };

  const remainingAmount = record?.remainingAmount || record?.amountNumber || 0;
  const originalAmount = record?.amountNumber || 0;
  const progress = originalAmount > 0 ? ((originalAmount - remainingAmount) / originalAmount) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans text-slate-800 antialiased">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-x-hidden bg-[#F2F2F7]">
        <VaultSessionGuard />
        <header className="sticky top-0 z-30 flex items-center justify-between bg-[#F2F2F7]/80 px-6 py-5 backdrop-blur-lg">
          <Link
            href="/debt-records"
            aria-label="Back to debt records"
            className="glass-card flex h-12 w-12 items-center justify-center rounded-2xl transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-slate-600">arrow_back</span>
          </Link>
          <h1 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-600">Debt Detail</h1>
          <div className="h-12 w-12" />
        </header>

        <main className="flex-1 space-y-4 px-6 pb-36 pt-4">
          {isLoading ? <HeroSkeleton /> : null}

          {!isLoading && !record ? (
            <div className="glass-card rounded-3xl border border-[#e7eaee] bg-white/85 p-6 text-center">
              <p className="text-sm font-semibold text-slate-700">Debt not found</p>
              <p className="mt-1 text-xs text-slate-500">This record is no longer available on this device.</p>
            </div>
          ) : null}

          {record ? (
            <>
              {/* Main Info Card */}
              <section className="glass-card rounded-[2rem] border border-[#e7eaee] bg-white/90 p-6 shadow-[0_16px_30px_-18px_rgba(15,23,42,0.25)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{record.debtType}</p>
                    <h2 className="mt-1 text-xl font-bold text-slate-900 break-words">{record.creditor}</h2>
                  </div>
                  <div className="rounded-2xl bg-rose-50 px-3 py-2 text-right text-rose-700 shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest">Balance</p>
                    <p className="mt-1 text-sm font-semibold">RM {remainingAmount.toLocaleString()}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                {originalAmount > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500">Progress</span>
                      <span className="font-medium text-emerald-600">{progress.toFixed(0)}% paid</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Original: RM {originalAmount.toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Action Button */}
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(true)}
                  className="mt-4 w-full rounded-2xl bg-rose-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700 active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined mr-1 align-text-bottom text-[18px]">payments</span>
                  Record Payment / Adjustment
                </button>

                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Debt Docs Where</p>
                    <p className="mt-2 text-sm text-slate-800">{record.whereDocs}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Due Date</p>
                      <p className="mt-2 text-sm text-slate-800">{record.dueDate || "Not set"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Contacts</p>
                      <p className="mt-2 text-sm text-slate-800">{record.contacts?.length ? `${record.contacts.length} saved` : "None"}</p>
                    </div>
                  </div>

                  {record.contacts && record.contacts.length > 0 ? (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Contact Details</p>
                      <div className="mt-3 space-y-3">
                        {record.contacts.map((contact, index) => (
                          <div key={`${contact.name}-${index}`} className="flex flex-col sm:grid sm:grid-cols-2 gap-1 text-sm text-slate-800">
                            <p className="font-medium">{contact.name || "Not set"}</p>
                            <p className="text-slate-600">{contact.method || "Not set"}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

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
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Payment History</h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {record.transactions?.length || 0} records
                  </span>
                </div>
                <TransactionList
                  transactions={record.transactions || []}
                  onDelete={handleDeleteTransaction}
                  type="debt"
                />
              </section>
            </>
          ) : null}
        </main>

        <BalanceAdjustModal
          isOpen={showAdjustModal}
          onClose={() => setShowAdjustModal(false)}
          currentBalance={remainingAmount}
          onSave={handleAdjustBalance}
          type="debt"
        />

        <AppBottomNav active="assets" mode="dashboard" />
      </div>
    </div>
  );
}
