"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppBottomNav } from "../components/app-bottom-nav";
import { HeroSkeleton, FormSkeleton, ListItemSkeleton } from "../components/skeletons";
import { emptyVaultData, type DebtRecord } from "@/lib/vault-data";
import { loadVaultData, saveVaultData } from "@/lib/vault-client";

function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;
  // Remove currency symbols, commas, spaces
  const cleaned = amountStr.replace(/[^\d.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toFixed(0);
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAmount, setShowAmount] = useState(false);
  const [form, setForm] = useState({
    debtType: "",
    creditor: "",
    amount: "",
    dueDate: "",
    whereDocs: "",
    notes: "",
  });

  const refreshData = async () => {
    try {
      const vault = await loadVaultData();
      setDebts(vault?.debts ?? []);
    } catch {
      setStatusMessage("Could not load debts.");
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

  const totalRecords = debts.length;
  const totalAmount = useMemo(() => {
    return debts.reduce((sum, debt) => sum + parseAmount(debt.amount ?? ""), 0);
  }, [debts]);
  const labeledTotal = useMemo(() => `${String(totalRecords).padStart(2, "0")}`, [totalRecords]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ debtType: "", creditor: "", amount: "", dueDate: "", whereDocs: "", notes: "" });
  };

  const onSaveDebt = async () => {
    if (!form.debtType.trim() || !form.creditor.trim() || !form.whereDocs.trim()) return;
    const newItem: DebtRecord = {
      id: editingId ?? crypto.randomUUID(),
      debtType: form.debtType.trim(),
      creditor: form.creditor.trim(),
      amount: form.amount.trim() || undefined,
      dueDate: form.dueDate.trim() || undefined,
      whereDocs: form.whereDocs.trim(),
      notes: form.notes.trim() || undefined,
    };
    const nextDebts = editingId
      ? debts.map((item) => (item.id === editingId ? newItem : item))
      : [newItem, ...debts];
    setDebts(nextDebts);
    setShowForm(false);
    resetForm();

    try {
      const vault = (await loadVaultData()) ?? emptyVaultData();
      await saveVaultData({ ...vault, debts: nextDebts });
      setStatusMessage(editingId ? "Debt updated." : "Debt saved.");
    } catch {
      setStatusMessage("Cloud sync failed.");
    }
  };

  const onEditDebt = (item: DebtRecord) => {
    setEditingId(item.id);
    setForm({
      debtType: item.debtType,
      creditor: item.creditor,
      amount: item.amount ?? "",
      dueDate: item.dueDate ?? "",
      whereDocs: item.whereDocs,
      notes: item.notes ?? "",
    });
    setShowForm(true);
  };

  const onDeleteDebt = async (id: string) => {
    const nextDebts = debts.filter((item) => item.id !== id);
    setDebts(nextDebts);
    if (editingId === id) {
      resetForm();
      setShowForm(false);
    }
    try {
      const vault = (await loadVaultData()) ?? emptyVaultData();
      await saveVaultData({ ...vault, debts: nextDebts });
      setStatusMessage("Debt deleted.");
    } catch {
      setStatusMessage("Delete sync failed.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans text-slate-800 antialiased">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-x-hidden bg-[#F2F2F7]">
        {/* Sticky Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between bg-[#F2F2F7]/70 px-6 py-5 backdrop-blur-lg">
          <Link
            href="/vault"
            aria-label="Back to vault"
            className="glass-card flex h-12 w-12 items-center justify-center rounded-2xl transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-slate-600">arrow_back</span>
          </Link>
          <h1 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-600">Debt Records</h1>
          <button
            type="button"
            className="glass-card flex h-12 w-12 items-center justify-center rounded-2xl transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-slate-600">more_vert</span>
          </button>
        </header>

        {/* Hero Card */}
        <div className="px-5 pb-4">
          {isLoading ? (
            <HeroSkeleton />
          ) : (
            <div className="group relative overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-rose-900 to-rose-700 shadow-[0_16px_30px_-16px_rgba(0,0,0,0.5)] transition-all duration-500 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-800/40 to-transparent" />
              {/* Pattern overlay */}
              <div 
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
              />
              <div className="relative flex flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md">
                    <span className="material-symbols-outlined text-[20px] text-rose-200">receipt_long</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setShowAmount(!showAmount)}
                      className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-md transition-all active:scale-95"
                      aria-label={showAmount ? "Show record count" : "Show total amount"}
                    >
                      <span className="material-symbols-outlined text-[14px] text-rose-200">
                        {showAmount ? "receipt" : "payments"}
                      </span>
                      <span className="text-[10px] font-medium text-rose-100">
                        {showAmount ? "Amount" : "Records"}
                      </span>
                    </button>
                    <div className="flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/20 px-3 py-1.5 backdrop-blur-md">
                      <div className="h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.8)]" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white">Active</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-widest text-rose-200/60">
                    {showAmount ? "Total Amount Owed" : "Total Liabilities"}
                  </p>
                  <h2 className="text-[41px] font-light leading-[1.02] tracking-[-0.02em] text-white">
                    {showAmount ? (
                      <>
                        <span className="text-2xl font-semibold text-rose-200">RM</span>
                        <span className="font-bold ml-2">{formatCurrency(totalAmount)}</span>
                      </>
                    ) : (
                      <>
                        <span className="font-bold">{labeledTotal}</span>{" "}
                        <span className="text-2xl font-semibold text-rose-200">records</span>
                      </>
                    )}
                  </h2>
                  <p className="mt-3 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-rose-200/50">
                    <span className="material-symbols-outlined text-[14px]">account_balance</span>
                    {`${debts.length} debts in vault`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <main className="flex-1 space-y-4 px-6 pb-40 pt-4">
          <button
            type="button"
            onClick={() => {
              setShowForm((s) => !s);
              if (showForm) resetForm();
            }}
            className="w-full rounded-3xl border-2 border-dashed border-slate-300 bg-[#f0f2f5] px-6 py-8 text-center transition-all active:scale-[0.99]"
          >
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-slate-300 text-white">
              <span className="material-symbols-outlined text-[20px]">add</span>
            </div>
            <p className="mt-3 text-lg font-bold uppercase tracking-[0.08em] text-slate-500">Update Debt List</p>
          </button>

          {showForm ? (
            <section className="glass-card rounded-3xl border border-[#ece0e0] bg-rose-50/70 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">
                  {editingId ? "Edit Debt" : "Add Debt"}
                </h2>
                <button
                  type="button"
                  className="text-xs font-semibold text-slate-500"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
              </div>
              <div className="space-y-3">
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none focus:border-rose-500"
                  placeholder="Debt type (e.g. Car Loan)"
                  value={form.debtType}
                  onChange={(e) => setForm((p) => ({ ...p, debtType: e.target.value }))}
                />
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none focus:border-rose-500"
                  placeholder="Creditor / Institution"
                  value={form.creditor}
                  onChange={(e) => setForm((p) => ({ ...p, creditor: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none focus:border-rose-500"
                    placeholder="Amount (optional)"
                    value={form.amount}
                    onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  />
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none focus:border-rose-500"
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                  />
                </div>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none focus:border-rose-500"
                  placeholder="Where are related docs?"
                  value={form.whereDocs}
                  onChange={(e) => setForm((p) => ({ ...p, whereDocs: e.target.value }))}
                />
                <textarea
                  className="h-20 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none focus:border-rose-500"
                  placeholder="Notes"
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                />
                <button
                  className="w-full rounded-[1.3rem] bg-rose-900 py-3 text-sm font-semibold tracking-wide text-white shadow-xl shadow-rose-900/20 transition-all active:scale-[0.98]"
                  onClick={onSaveDebt}
                  type="button"
                >
                  {editingId ? "Update Debt" : "Save Debt"}
                </button>
              </div>
            </section>
          ) : null}

          {statusMessage ? (
            <div className="glass-card rounded-2xl border border-rose-100 bg-rose-50/80 px-4 py-3">
              <p className="text-xs font-medium text-rose-700">{statusMessage}</p>
            </div>
          ) : null}
          {isLoading ? (
            <>
              <ListItemSkeleton />
              <ListItemSkeleton />
              <ListItemSkeleton />
            </>
          ) : null}

          {!isLoading && !statusMessage && debts.length === 0 ? (
            <div className="relative z-30">
              <div className="glass-card rounded-3xl border border-[#ece0e0] bg-rose-50/70 p-6 text-center shadow-[0_14px_32px_-18px_rgba(0,0,0,0.35)]">
                <p className="text-sm font-semibold text-slate-700">No records yet</p>
                <p className="mt-1 text-xs text-slate-500">Use the update card above to add your first debt record.</p>
              </div>
            </div>
          ) : null}

          {debts.map((item, index) => (
            <article
              key={item.id}
              className="glass-card rounded-3xl border border-[#ece0e0] bg-rose-50/70 p-6 transition-all duration-300 hover:-translate-y-[2px]"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                    <span className="material-symbols-outlined">receipt_long</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{item.debtType || "Debt"}</p>
                    <h3 className="text-xl font-bold text-slate-900">{item.creditor}</h3>
                  </div>
                </div>
                <span className="rounded-md bg-rose-50 px-2 py-1 text-[10px] font-bold uppercase text-rose-700">
                  {index === 0 ? "Priority" : "Tracked"}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <span>Where Docs</span>
                  <span className="text-rose-700">{item.dueDate ? `Due ${item.dueDate}` : "No due date"}</span>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-sm font-medium text-slate-800">{item.whereDocs}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.amount ? `Amount: ${item.amount}` : "Amount not set"}
                  </p>
                  {item.notes ? <p className="mt-1 text-xs text-slate-500">{item.notes}</p> : null}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end gap-3">
                <button className="text-xs font-semibold text-rose-700" type="button" onClick={() => onEditDebt(item)}>
                  Edit
                </button>
                <button className="text-xs font-semibold text-red-600" type="button" onClick={() => onDeleteDebt(item.id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </main>

        {isLoading ? (
          <div className="glass fixed bottom-0 left-0 right-0 border-t border-white/50 bg-white/80 pb-6 pt-3">
            <div className="mx-auto flex max-w-md justify-around px-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-6 w-12 animate-pulse rounded bg-slate-200" />
              ))}
            </div>
          </div>
        ) : (
          <AppBottomNav active="debts" mode="default" />
        )}
      </div>
    </div>
  );
}
