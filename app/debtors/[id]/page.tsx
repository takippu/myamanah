"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppBottomNav } from "../../components/app-bottom-nav";
import { BalanceAdjustModal } from "../../components/balance-adjust-modal";
import { HeroSkeleton } from "../../components/skeletons";
import { TransactionList } from "../../components/transaction-list";
import { VaultSessionGuard } from "../../components/vault-session-guard";
import { emptyVaultData, type Debtor, type DebtorTransaction } from "@/lib/vault-data";
import { loadVaultData, saveVaultData } from "@/lib/vault-client";

export default function DebtorDetailPage() {
  const params = useParams<{ id: string }>();
  const [debtor, setDebtor] = useState<Debtor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  const refreshData = async () => {
    try {
      const vault = await loadVaultData();
      const nextDebtor = vault?.debtors?.find((item) => item.id === params.id) ?? null;
      setDebtor(nextDebtor);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshData();
  }, [params.id]);

  const handleAdjustBalance = async (amount: number, notes?: string, date?: string) => {
    if (!debtor) return;
    setIsSaving(true);

    const currentBalance = debtor.remainingAmount || 0;
    const newBalance = currentBalance - amount;

    const transaction: DebtorTransaction = {
      id: crypto.randomUUID(),
      date: date || new Date().toISOString().split("T")[0],
      amount: amount > 0 ? amount : -amount,
      type: amount > 0 ? "payment" : "additional_loan",
      notes,
      balanceAfter: newBalance,
      createdAt: new Date().toISOString(),
    };

    const updatedDebtor: Debtor = {
      ...debtor,
      remainingAmount: newBalance,
      status: newBalance <= 0 ? "paid" : "pending",
      transactions: [...(debtor.transactions || []), transaction],
      updatedAt: new Date().toISOString(),
    };

    setDebtor(updatedDebtor);

    try {
      const vault = await loadVaultData();
      const updatedDebtors = vault?.debtors?.map((d) => (d.id === debtor.id ? updatedDebtor : d)) || [];
      await saveVaultData({ ...(vault || emptyVaultData()), debtors: updatedDebtors });
    } catch (error) {
      console.error("Failed to save transaction:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!debtor || !debtor.transactions) return;
    setIsSaving(true);

    const updatedTransactions = debtor.transactions.filter((t) => t.id !== transactionId);
    
    // Recalculate remaining amount from original
    const newRemainingAmount = updatedTransactions.reduce(
      (balance, t) => balance - (t.type === "payment" ? t.amount : -t.amount),
      debtor.originalAmount
    );

    const updatedDebtor: Debtor = {
      ...debtor,
      remainingAmount: newRemainingAmount,
      status: newRemainingAmount <= 0 ? "paid" : "pending",
      transactions: updatedTransactions,
      updatedAt: new Date().toISOString(),
    };

    setDebtor(updatedDebtor);

    try {
      const vault = await loadVaultData();
      const updatedDebtors = vault?.debtors?.map((d) => (d.id === debtor.id ? updatedDebtor : d)) || [];
      await saveVaultData({ ...(vault || emptyVaultData()), debtors: updatedDebtors });
    } catch (error) {
      console.error("Failed to delete transaction:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const remainingAmount = debtor?.remainingAmount || 0;
  const originalAmount = debtor?.originalAmount || 0;
  const progress = originalAmount > 0 ? ((originalAmount - remainingAmount) / originalAmount) * 100 : 0;

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
            href="/debt-records"
            aria-label="Back to debt records"
            className="glass-card flex h-12 w-12 items-center justify-center rounded-2xl transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-slate-600">arrow_back</span>
          </Link>
          <h1 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-600">Debtor Detail</h1>
          <div className="h-12 w-12" />
        </header>

        <main className="flex-1 space-y-4 px-6 pb-36 pt-4">
          {isLoading ? <HeroSkeleton /> : null}

          {!isLoading && !debtor ? (
            <div className="glass-card rounded-3xl border border-[#e7eaee] bg-white/85 p-6 text-center">
              <p className="text-sm font-semibold text-slate-700">Debtor not found</p>
              <p className="mt-1 text-xs text-slate-500">This record is no longer available on this device.</p>
            </div>
          ) : null}

          {debtor ? (
            <>
              {/* Main Info Card */}
              <section className="glass-card rounded-[2rem] border border-[#e7eaee] bg-white/90 p-6 shadow-[0_16px_30px_-18px_rgba(15,23,42,0.25)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        debtor.status === "paid" 
                          ? "bg-emerald-100 text-emerald-700" 
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {debtor.status}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 break-words">{debtor.name}</h2>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-right text-emerald-700 shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest">Remaining</p>
                    <p className="mt-1 text-sm font-semibold">RM {remainingAmount.toLocaleString()}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                {originalAmount > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500">Repaid</span>
                      <span className="font-medium text-emerald-600">{progress.toFixed(0)}%</span>
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
                  className="mt-4 w-full rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined mr-1 align-text-bottom text-[18px]">payments</span>
                  Record Payment / Adjustment
                </button>

                <div className="mt-6 space-y-4">
                  {debtor.contact && (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Contact</p>
                      <p className="mt-2 text-sm text-slate-800">{debtor.contact}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date Lent</p>
                      <p className="mt-2 text-sm text-slate-800">
                        {new Date(debtor.dateLent).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Due Date</p>
                      <p className="mt-2 text-sm text-slate-800">
                        {debtor.dueDate 
                          ? new Date(debtor.dueDate).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })
                          : "Not set"}
                      </p>
                    </div>
                  </div>

                  {debtor.notes && (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Notes</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{debtor.notes}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Transaction History */}
              <section className="glass-card rounded-[2rem] border border-[#e7eaee] bg-white/90 p-6 shadow-[0_16px_30px_-18px_rgba(15,23,42,0.25)]">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Payment History</h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {debtor.transactions?.length || 0} records
                  </span>
                </div>
                <TransactionList
                  transactions={debtor.transactions || []}
                  onDelete={handleDeleteTransaction}
                  type="debtor"
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
          type="debtor"
        />

        <AppBottomNav active="assets" mode="dashboard" />
      </div>
    </div>
  );
}
