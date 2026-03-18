"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppBottomNav } from "../components/app-bottom-nav";
import { ConfirmActionModal } from "../components/confirm-action-modal";
import { FloatingField } from "../components/floating-field";
import { HeroSkeleton,  ListItemSkeleton } from "../components/skeletons";
import { RecordListDrawer } from "../components/record-list-drawer";
import { UnlockVaultDrawer } from "../components/unlock-vault-drawer";
import { VaultSessionGuard } from "../components/vault-session-guard";
import { emptyVaultData, type DebtRecord, type Debtor, type VaultContact } from "@/lib/vault-data";
import { loadVaultData, saveVaultData } from "@/lib/vault-client";

function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;
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

function normalizeContacts(record: Pick<DebtRecord, "contacts">): VaultContact[] {
  if (record.contacts && record.contacts.length > 0) {
    return record.contacts.slice(0, 3).map((contact) => ({
      name: contact.name ?? "",
      method: contact.method ?? "",
    }));
  }
  return [];
}

export default function DebtsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"debts" | "debtors">("debts");
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const [showUnlockDrawer, setShowUnlockDrawer] = useState(false);
  
  // Debt form state
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [pendingDeleteDebtId, setPendingDeleteDebtId] = useState<string | null>(null);
  const [showDebtFormDrawer, setShowDebtFormDrawer] = useState(false);
  const [debtForm, setDebtForm] = useState({
    debtType: "",
    creditor: "",
    amount: "",
    dueDate: "",
    whereDocs: "",
    contacts: [] as VaultContact[],
    notes: "",
  });

  // Debtor form state
  const [editingDebtorId, setEditingDebtorId] = useState<string | null>(null);
  const [pendingDeleteDebtorId, setPendingDeleteDebtorId] = useState<string | null>(null);
  const [showDebtorFormDrawer, setShowDebtorFormDrawer] = useState(false);
  const [debtorForm, setDebtorForm] = useState({
    name: "",
    originalAmount: "",
    dateLent: "",
    dueDate: "",
    contact: "",
    notes: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const refreshData = async () => {
    try {
      const vault = await loadVaultData();
      setDebts(vault?.debts ?? []);
      setDebtors(vault?.debtors ?? []);
      setShowUnlockDrawer(false);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "";
      if (errorMsg.includes("not configured") || errorMsg.includes("Vault access")) {
        setStatusMessage("Vault is locked. Please unlock to view your debts.");
        setShowUnlockDrawer(true);
      } else {
        setStatusMessage("Could not load debts.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshData();
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshData();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Calculate totals for hero card
  const totalYouOwe = useMemo(() => {
    return debts.reduce((sum, debt) => sum + parseAmount(debt.amount ?? ""), 0);
  }, [debts]);

  const totalOwedToYou = useMemo(() => {
    return debtors.reduce((sum, debtor) => sum + (debtor.remainingAmount || 0), 0);
  }, [debtors]);

  const netPosition = totalOwedToYou - totalYouOwe;

  const totalDebtRecords = debts.length;
  const totalDebtorRecords = debtors.length;

  // Debt form handlers
  const resetDebtForm = () => {
    setEditingDebtId(null);
    setFormErrors([]);
    setDebtForm({
      debtType: "",
      creditor: "",
      amount: "",
      dueDate: "",
      whereDocs: "",
      contacts: [],
      notes: "",
    });
  };

  const onSaveDebt = async () => {
    const errors: string[] = [];
    if (!debtForm.debtType.trim()) errors.push("Debt type is required");
    if (!debtForm.creditor.trim()) errors.push("Creditor is required");
    if (!debtForm.whereDocs.trim()) errors.push("Where documents are kept is required");
    
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setFormErrors([]);
    setIsSaving(true);
    const wasEditing = Boolean(editingDebtId);
    
    const amountNum = parseAmount(debtForm.amount);
    const newItem: DebtRecord = {
      id: editingDebtId ?? crypto.randomUUID(),
      debtType: debtForm.debtType.trim(),
      creditor: debtForm.creditor.trim(),
      amount: debtForm.amount.trim() || undefined,
      amountNumber: amountNum || undefined,
      remainingAmount: amountNum || undefined,
      dueDate: debtForm.dueDate.trim() || undefined,
      whereDocs: debtForm.whereDocs.trim(),
      contacts: debtForm.contacts
        .map((contact) => ({
          name: contact.name.trim(),
          method: contact.method.trim(),
        }))
        .filter((contact) => contact.name || contact.method)
        .slice(0, 3),
      notes: debtForm.notes.trim() || undefined,
      transactions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const nextDebts = editingDebtId
      ? debts.map((item) => (item.id === editingDebtId ? newItem : item))
      : [newItem, ...debts];
    
    setDebts(nextDebts);
    setShowDebtFormDrawer(false);
    resetDebtForm();

    try {
      const vault = (await loadVaultData()) ?? emptyVaultData();
      await saveVaultData({ ...vault, debts: nextDebts });
      setStatusTone("success");
      setStatusMessage(wasEditing ? "Debt record updated." : "Debt record saved.");
    } catch {
      setStatusTone("error");
      setStatusMessage("Saved locally. Cloud backup could not be updated right now.");
    } finally {
      setIsSaving(false);
    }
  };

  const onEditDebt = (item: DebtRecord) => {
    setEditingDebtId(item.id);
    setDebtForm({
      debtType: item.debtType,
      creditor: item.creditor,
      amount: item.amount ?? "",
      dueDate: item.dueDate ?? "",
      whereDocs: item.whereDocs,
      contacts: normalizeContacts(item),
      notes: item.notes ?? "",
    });
    setShowDebtFormDrawer(true);
  };

  const onDeleteDebt = async (id: string) => {
    const nextDebts = debts.filter((item) => item.id !== id);
    setDebts(nextDebts);
    if (editingDebtId === id) {
      resetDebtForm();
      setShowDebtFormDrawer(false);
    }
    try {
      const vault = (await loadVaultData()) ?? emptyVaultData();
      await saveVaultData({ ...vault, debts: nextDebts });
      setStatusTone("success");
      setStatusMessage("Debt record deleted.");
    } catch {
      setStatusTone("error");
      setStatusMessage("Delete sync failed.");
    }
  };

  // Debtor form handlers
  const resetDebtorForm = () => {
    setEditingDebtorId(null);
    setFormErrors([]);
    setDebtorForm({
      name: "",
      originalAmount: "",
      dateLent: "",
      dueDate: "",
      contact: "",
      notes: "",
    });
  };

  const onSaveDebtor = async () => {
    const errors: string[] = [];
    if (!debtorForm.name.trim()) errors.push("Name is required");
    if (!debtorForm.originalAmount.trim()) errors.push("Amount is required");
    if (!debtorForm.dateLent.trim()) errors.push("Date lent is required");
    
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setFormErrors([]);
    setIsSaving(true);
    const wasEditing = Boolean(editingDebtorId);
    
    const originalAmount = parseAmount(debtorForm.originalAmount);
    const newItem: Debtor = {
      id: editingDebtorId ?? crypto.randomUUID(),
      name: debtorForm.name.trim(),
      originalAmount,
      remainingAmount: originalAmount,
      dateLent: debtorForm.dateLent,
      dueDate: debtorForm.dueDate.trim() || undefined,
      contact: debtorForm.contact.trim() || undefined,
      notes: debtorForm.notes.trim() || undefined,
      status: "pending",
      transactions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const nextDebtors = editingDebtorId
      ? debtors.map((item) => (item.id === editingDebtorId ? newItem : item))
      : [newItem, ...debtors];
    
    setDebtors(nextDebtors);
    setShowDebtorFormDrawer(false);
    resetDebtorForm();

    try {
      const vault = (await loadVaultData()) ?? emptyVaultData();
      await saveVaultData({ ...vault, debtors: nextDebtors });
      setStatusTone("success");
      setStatusMessage(wasEditing ? "Debtor updated." : "Debtor saved.");
    } catch {
      setStatusTone("error");
      setStatusMessage("Saved locally. Cloud backup could not be updated right now.");
    } finally {
      setIsSaving(false);
    }
  };

  const onEditDebtor = (item: Debtor) => {
    setEditingDebtorId(item.id);
    setDebtorForm({
      name: item.name,
      originalAmount: item.originalAmount.toString(),
      dateLent: item.dateLent,
      dueDate: item.dueDate ?? "",
      contact: item.contact ?? "",
      notes: item.notes ?? "",
    });
    setShowDebtorFormDrawer(true);
  };

  const onDeleteDebtor = async (id: string) => {
    const nextDebtors = debtors.filter((item) => item.id !== id);
    setDebtors(nextDebtors);
    if (editingDebtorId === id) {
      resetDebtorForm();
      setShowDebtorFormDrawer(false);
    }
    try {
      const vault = (await loadVaultData()) ?? emptyVaultData();
      await saveVaultData({ ...vault, debtors: nextDebtors });
      setStatusTone("success");
      setStatusMessage("Debtor deleted.");
    } catch {
      setStatusTone("error");
      setStatusMessage("Delete sync failed.");
    }
  };

  // Contact handlers for debt form
  const updateDebtContact = (index: number, field: keyof VaultContact, value: string) => {
    setDebtForm((current) => ({
      ...current,
      contacts: current.contacts.map((contact, contactIndex) =>
        contactIndex === index ? { ...contact, [field]: value } : contact,
      ),
    }));
  };

  const addDebtContact = () => {
    setDebtForm((current) => {
      if (current.contacts.length >= 3) return current;
      return { ...current, contacts: [...current.contacts, { name: "", method: "" }] };
    });
  };

  const removeDebtContact = (index: number) => {
    setDebtForm((current) => ({
      ...current,
      contacts: current.contacts.filter((_, contactIndex) => contactIndex !== index),
    }));
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans text-slate-800 antialiased">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-x-hidden bg-[#F2F2F7]">
        <VaultSessionGuard />
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
          <button type="button" className="glass-card flex h-12 w-12 items-center justify-center rounded-2xl transition-transform active:scale-95">
            <span className="material-symbols-outlined text-slate-600">more_vert</span>
          </button>
        </header>

        {/* Hero Card with Net Position */}
        <div className="px-5 pb-4">
          {isLoading ? (
            <HeroSkeleton />
          ) : (
            <div className="group relative overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-slate-800 to-slate-700 shadow-[0_16px_30px_-16px_rgba(0,0,0,0.5)] transition-all duration-500 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 to-transparent" />
              <div 
                className="absolute inset-0 opacity-5"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
              />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md">
                    <span className="material-symbols-outlined text-[20px] text-slate-200">account_balance</span>
                  </div>
                </div>
                
                {/* Three column summary */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-rose-300/70">You Owe</p>
                    <p className="mt-1 text-sm font-bold text-rose-400">RM {formatCurrency(totalYouOwe)}</p>
                  </div>
                  <div className="text-center border-x border-white/10">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300/70">Owed to You</p>
                    <p className="mt-1 text-sm font-bold text-emerald-400">RM {formatCurrency(totalOwedToYou)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-300/70">Net</p>
                    <p className={`mt-1 text-sm font-bold ${netPosition >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      RM {formatCurrency(Math.abs(netPosition))}
                      {netPosition !== 0 && <span className="text-xs ml-0.5">{netPosition >= 0 ? '▲' : '▼'}</span>}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-widest text-slate-300/60">Total Records</p>
                  <h2 className="text-[32px] font-light leading-[1.02] tracking-[-0.02em] text-white">
                    <span className="font-bold">{totalDebtRecords + totalDebtorRecords}</span>{" "}
                    <span className="text-xl font-semibold text-slate-300">records</span>
                  </h2>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="px-5 pb-3">
          <div className="flex gap-1 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("debts")}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === "debts"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              My Debts
              {!isLoading && totalDebtRecords > 0 && (
                <span className="ml-1.5 text-xs opacity-80">({totalDebtRecords})</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("debtors")}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === "debtors"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Debtors
              {!isLoading && totalDebtorRecords > 0 && (
                <span className="ml-1.5 text-xs opacity-80">({totalDebtorRecords})</span>
              )}
            </button>
          </div>
        </div>

        <main className="flex-1 space-y-4 px-6 pb-36 pt-2">
          {statusMessage ? (
            <div className={`glass-card rounded-2xl border px-4 py-3 ${statusTone === "success" ? "border-emerald-100 bg-emerald-50/80" : "border-rose-100 bg-rose-50/80"}`}>
              <p className={`text-xs font-medium ${statusTone === "success" ? "text-emerald-700" : "text-rose-700"}`}>
                {statusMessage}
              </p>
            </div>
          ) : null}

          {/* Add Button based on active tab */}
          <button
            type="button"
            onClick={() => {
              if (activeTab === "debts") {
                resetDebtForm();
                setShowDebtFormDrawer(true);
              } else {
                resetDebtorForm();
                setShowDebtorFormDrawer(true);
              }
            }}
            className="w-full rounded-3xl border-2 border-dashed border-slate-300 bg-[#f0f2f5] px-6 py-8 text-center transition-all active:scale-[0.99]"
          >
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-slate-300 text-white">
              <span className="material-symbols-outlined text-[20px]">add</span>
            </div>
            <p className="mt-3 text-lg font-bold uppercase tracking-[0.08em] text-slate-500">
              {activeTab === "debts" ? "Add Debt Record" : "Add Debtor"}
            </p>
          </button>

          {isLoading ? (
            <>
              <ListItemSkeleton />
              <ListItemSkeleton />
              <ListItemSkeleton />
            </>
          ) : null}

          {/* My Debts Tab Content */}
          {!isLoading && activeTab === "debts" && (
            <>
              {debts.length === 0 ? (
                <div className="relative z-30">
                  <div className="glass-card rounded-3xl border border-[#ece0e0] bg-rose-50/70 p-6 text-center shadow-[0_14px_32px_-18px_rgba(0,0,0,0.35)]">
                    <p className="text-sm font-semibold text-slate-700">No debt records yet</p>
                    <p className="mt-1 text-xs text-slate-500">Use the button above to add your first debt.</p>
                  </div>
                </div>
              ) : (
                debts.map((item) => (
                  <article
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/debt-records/${item.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`/debt-records/${item.id}`);
                      }
                    }}
                    className="rounded-[2rem] bg-slate-50 p-5 transition-all duration-200 hover:bg-slate-100 active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{item.debtType || "Debt"}</p>
                        <h3 className="truncate text-lg font-bold text-slate-900">{item.creditor}</h3>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); onEditDebt(item); }}
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 transition-colors hover:bg-rose-200"
                          aria-label={`Edit ${item.creditor}`}
                        >
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); setPendingDeleteDebtId(item.id); }}
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-rose-100/50 text-rose-600 transition-colors hover:bg-rose-100"
                          aria-label={`Delete ${item.creditor}`}
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Amount Owed</p>
                        <p className="text-xl font-bold text-rose-600">{item.amount || "—"}</p>
                      </div>
                      <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                    </div>
                  </article>
                ))
              )}
            </>
          )}

          {/* Debtors Tab Content */}
          {!isLoading && activeTab === "debtors" && (
            <>
              {debtors.length === 0 ? (
                <div className="relative z-30">
                  <div className="glass-card rounded-3xl border border-[#e0ece3] bg-emerald-50/70 p-6 text-center shadow-[0_14px_32px_-18px_rgba(0,0,0,0.35)]">
                    <p className="text-sm font-semibold text-slate-700">No debtors yet</p>
                    <p className="mt-1 text-xs text-slate-500">Add people who owe you money.</p>
                  </div>
                </div>
              ) : (
                debtors.map((item) => (
                  <article
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/debtors/${item.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`/debtors/${item.id}`);
                      }
                    }}
                    className="rounded-[2rem] bg-slate-50 p-5 transition-all duration-200 hover:bg-slate-100 active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{item.status === "paid" ? "Paid Off" : "Pending"}</p>
                        <h3 className="truncate text-lg font-bold text-slate-900">{item.name}</h3>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); onEditDebtor(item); }}
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 transition-colors hover:bg-emerald-200"
                          aria-label={`Edit ${item.name}`}
                        >
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); setPendingDeleteDebtorId(item.id); }}
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100/50 text-emerald-600 transition-colors hover:bg-emerald-100"
                          aria-label={`Delete ${item.name}`}
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Amount Owed to You</p>
                        <p className="text-xl font-bold text-emerald-600">RM {formatCurrency(item.remainingAmount)}</p>
                      </div>
                      <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                    </div>
                  </article>
                ))
              )}
            </>
          )}
        </main>

        {/* Debt Form Drawer */}
        <RecordListDrawer
          open={showDebtFormDrawer}
          title={editingDebtId ? "Edit Debt Record" : "Add Debt Record"}
          onClose={() => { setShowDebtFormDrawer(false); resetDebtForm(); }}
          footer={
            <button
              className="w-full rounded-[1.3rem] bg-rose-900 py-3 text-sm font-semibold tracking-wide text-white shadow-xl shadow-rose-900/20 transition-all active:scale-[0.98]"
              onClick={onSaveDebt}
              type="button"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : editingDebtId ? "Update Debt Record" : "Save Debt Record"}
            </button>
          }
        >
          <div className="space-y-4 pt-2">
            {formErrors.length > 0 ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3">
                <p className="text-xs font-semibold text-rose-700">Please fix the following:</p>
                <ul className="mt-1 list-disc pl-4 text-xs text-rose-600">
                  {formErrors.map((err, i) => (<li key={i}>{err}</li>))}
                </ul>
              </div>
            ) : null}

            <section className="rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.28)]">
              <div className="space-y-3">
                <FloatingField label="Debt Type *" labelClassName="text-rose-700">
                  <input
                    className={`w-full rounded-2xl border bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-rose-500 ${
                      formErrors.some(e => e.includes("Debt type")) && !debtForm.debtType.trim() ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                    }`}
                    placeholder="e.g. car loan, personal loan"
                    value={debtForm.debtType}
                    onChange={(e) => setDebtForm((p) => ({ ...p, debtType: e.target.value }))}
                  />
                </FloatingField>
                <FloatingField label="Creditor *" labelClassName="text-rose-700">
                  <input
                    className={`w-full rounded-2xl border bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-rose-500 ${
                      formErrors.some(e => e.includes("Creditor")) && !debtForm.creditor.trim() ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                    }`}
                    placeholder="Creditor or institution"
                    value={debtForm.creditor}
                    onChange={(e) => setDebtForm((p) => ({ ...p, creditor: e.target.value }))}
                  />
                </FloatingField>
                <div className="grid grid-cols-2 gap-2">
                  <FloatingField label="Amount Owed" labelClassName="text-rose-700">
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-rose-500"
                      placeholder="Amount"
                      value={debtForm.amount}
                      onChange={(e) => setDebtForm((p) => ({ ...p, amount: e.target.value }))}
                    />
                  </FloatingField>
                  <FloatingField label="Due Date" labelClassName="text-rose-700">
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-rose-500"
                      type="date"
                      value={debtForm.dueDate}
                      onChange={(e) => setDebtForm((p) => ({ ...p, dueDate: e.target.value }))}
                    />
                  </FloatingField>
                </div>
                <FloatingField label="Debt Docs Where *" labelClassName="text-rose-700">
                  <input
                    className={`w-full rounded-2xl border bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-rose-500 ${
                      formErrors.some(e => e.includes("documents")) && !debtForm.whereDocs.trim() ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                    }`}
                    placeholder="Where are statements kept?"
                    value={debtForm.whereDocs}
                    onChange={(e) => setDebtForm((p) => ({ ...p, whereDocs: e.target.value }))}
                  />
                </FloatingField>
              </div>
            </section>

            <section className="rounded-[1.7rem] border border-slate-200 bg-[#fcfbfb] p-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.24)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Contacts</p>
                  <p className="mt-1 text-xs text-slate-500">Optional</p>
                </div>
                {debtForm.contacts.length < 3 ? (
                  <button type="button" onClick={addDebtContact} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-700">
                    Add
                  </button>
                ) : null}
              </div>
              <div className="space-y-2.5">
                {debtForm.contacts.map((contact, contactIndex) => (
                  <div key={`debt-contact-${contactIndex}`} className="rounded-[1.25rem] border border-slate-200 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Contact {contactIndex + 1}</p>
                      <button type="button" onClick={() => removeDebtContact(contactIndex)} className="text-[11px] font-semibold text-rose-700">Remove</button>
                    </div>
                    <div className="space-y-2">
                      <input
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition-colors focus:border-rose-500"
                        placeholder="Who to contact?"
                        value={contact.name}
                        onChange={(e) => updateDebtContact(contactIndex, "name", e.target.value)}
                      />
                      <input
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition-colors focus:border-rose-500"
                        placeholder="How to contact them?"
                        value={contact.method}
                        onChange={(e) => updateDebtContact(contactIndex, "method", e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <FloatingField label="Notes" labelClassName="text-rose-700">
              <textarea
                className="h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-rose-500"
                placeholder="Notes, payoff plan, or special instructions"
                value={debtForm.notes}
                onChange={(e) => setDebtForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </FloatingField>
          </div>
        </RecordListDrawer>

        {/* Debtor Form Drawer */}
        <RecordListDrawer
          open={showDebtorFormDrawer}
          title={editingDebtorId ? "Edit Debtor" : "Add Debtor"}
          onClose={() => { setShowDebtorFormDrawer(false); resetDebtorForm(); }}
          footer={
            <button
              className="w-full rounded-[1.3rem] bg-emerald-700 py-3 text-sm font-semibold tracking-wide text-white shadow-xl shadow-emerald-900/20 transition-all active:scale-[0.98]"
              onClick={onSaveDebtor}
              type="button"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : editingDebtorId ? "Update Debtor" : "Save Debtor"}
            </button>
          }
        >
          <div className="space-y-4 pt-2">
            {formErrors.length > 0 ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3">
                <p className="text-xs font-semibold text-rose-700">Please fix the following:</p>
                <ul className="mt-1 list-disc pl-4 text-xs text-rose-600">
                  {formErrors.map((err, i) => (<li key={i}>{err}</li>))}
                </ul>
              </div>
            ) : null}

            <section className="rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.28)]">
              <div className="space-y-3">
                <FloatingField label="Name *" labelClassName="text-emerald-700">
                  <input
                    className={`w-full rounded-2xl border bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-emerald-500 ${
                      formErrors.some(e => e.includes("Name")) && !debtorForm.name.trim() ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                    }`}
                    placeholder="e.g. Ahmad bin Abdullah"
                    value={debtorForm.name}
                    onChange={(e) => setDebtorForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </FloatingField>
                <div className="grid grid-cols-2 gap-2">
                  <FloatingField label="Amount *" labelClassName="text-emerald-700">
                    <input
                      className={`w-full rounded-2xl border bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-emerald-500 ${
                        formErrors.some(e => e.includes("Amount")) && !debtorForm.originalAmount.trim() ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                      }`}
                      placeholder="Amount lent"
                      value={debtorForm.originalAmount}
                      onChange={(e) => setDebtorForm((p) => ({ ...p, originalAmount: e.target.value }))}
                    />
                  </FloatingField>
                  <FloatingField label="Date Lent *" labelClassName="text-emerald-700">
                    <input
                      className={`w-full rounded-2xl border bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-emerald-500 ${
                        formErrors.some(e => e.includes("Date")) && !debtorForm.dateLent.trim() ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                      }`}
                      type="date"
                      value={debtorForm.dateLent}
                      onChange={(e) => setDebtorForm((p) => ({ ...p, dateLent: e.target.value }))}
                    />
                  </FloatingField>
                </div>
                <FloatingField label="Due Date" labelClassName="text-emerald-700">
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-emerald-500"
                    type="date"
                    value={debtorForm.dueDate}
                    onChange={(e) => setDebtorForm((p) => ({ ...p, dueDate: e.target.value }))}
                  />
                </FloatingField>
                <FloatingField label="Contact Method" labelClassName="text-emerald-700">
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-emerald-500"
                    placeholder="e.g. Call after 6pm, WhatsApp"
                    value={debtorForm.contact}
                    onChange={(e) => setDebtorForm((p) => ({ ...p, contact: e.target.value }))}
                  />
                </FloatingField>
                <FloatingField label="Notes" labelClassName="text-emerald-700">
                  <textarea
                    className="h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-emerald-500"
                    placeholder="Reason for loan, repayment terms, etc."
                    value={debtorForm.notes}
                    onChange={(e) => setDebtorForm((p) => ({ ...p, notes: e.target.value }))}
                  />
                </FloatingField>
              </div>
            </section>
          </div>
        </RecordListDrawer>

        <UnlockVaultDrawer open={showUnlockDrawer} onClose={() => setShowUnlockDrawer(false)} onUnlock={() => { setStatusMessage("Vault unlocked!"); setStatusTone("success"); void refreshData(); }} />

        <ConfirmActionModal
          open={pendingDeleteDebtId !== null}
          title="Delete this debt record?"
          description="This debt record will be removed from the vault on this device."
          confirmLabel="Delete Debt Record"
          onCancel={() => setPendingDeleteDebtId(null)}
          onConfirm={() => { if (pendingDeleteDebtId) { const id = pendingDeleteDebtId; setPendingDeleteDebtId(null); void onDeleteDebt(id); } }}
        />

        <ConfirmActionModal
          open={pendingDeleteDebtorId !== null}
          title="Delete this debtor?"
          description="This debtor will be removed from the vault on this device."
          confirmLabel="Delete Debtor"
          onCancel={() => setPendingDeleteDebtorId(null)}
          onConfirm={() => { if (pendingDeleteDebtorId) { const id = pendingDeleteDebtorId; setPendingDeleteDebtorId(null); void onDeleteDebtor(id); } }}
        />

        {isLoading ? (
          <div className="glass fixed bottom-0 left-0 right-0 border-t border-white/50 bg-white/80 pb-6 pt-3">
            <div className="mx-auto flex max-w-md justify-around px-4">
              {[...Array(5)].map((_, i) => (<div key={i} className="h-6 w-12 animate-pulse rounded bg-slate-200" />))}
            </div>
          </div>
        ) : (
          <AppBottomNav active="assets" mode="dashboard" />
        )}
      </div>
    </div>
  );
}
