"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppBottomNav } from "../components/app-bottom-nav";
import { ConfirmActionModal } from "../components/confirm-action-modal";
import { FloatingField } from "../components/floating-field";
import { HeroSkeleton,  ListItemSkeleton } from "../components/skeletons";
import { RecordListDrawer } from "../components/record-list-drawer";
import { VaultSessionGuard } from "../components/vault-session-guard";
import { emptyVaultData, type DebtRecord, type VaultContact } from "@/lib/vault-data";
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
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showFormDrawer, setShowFormDrawer] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    debtType: "",
    creditor: "",
    amount: "",
    dueDate: "",
    whereDocs: "",
    contacts: [] as VaultContact[],
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
  const labeledTotal = useMemo(() => String(totalRecords), [totalRecords]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
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
    if (!form.debtType.trim() || !form.creditor.trim() || !form.whereDocs.trim()) {
      setStatusTone("error");
      setStatusMessage("Debt type, creditor, and where related documents are kept are required.");
      return;
    }

    setIsSaving(true);
    const wasEditing = Boolean(editingId);
    const newItem: DebtRecord = {
      id: editingId ?? crypto.randomUUID(),
      debtType: form.debtType.trim(),
      creditor: form.creditor.trim(),
      amount: form.amount.trim() || undefined,
      dueDate: form.dueDate.trim() || undefined,
      whereDocs: form.whereDocs.trim(),
      contacts: form.contacts
        .map((contact) => ({
          name: contact.name.trim(),
          method: contact.method.trim(),
        }))
        .filter((contact) => contact.name || contact.method)
        .slice(0, 3),
      notes: form.notes.trim() || undefined,
    };
    const nextDebts = editingId
      ? debts.map((item) => (item.id === editingId ? newItem : item))
      : [newItem, ...debts];
    setDebts(nextDebts);
    setShowFormDrawer(false);
    resetForm();

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
    setEditingId(item.id);
    setForm({
      debtType: item.debtType,
      creditor: item.creditor,
      amount: item.amount ?? "",
      dueDate: item.dueDate ?? "",
      whereDocs: item.whereDocs,
      contacts: normalizeContacts(item),
      notes: item.notes ?? "",
    });
    setShowFormDrawer(true);
  };

  const updateContact = (index: number, field: keyof VaultContact, value: string) => {
    setForm((current) => ({
      ...current,
      contacts: current.contacts.map((contact, contactIndex) =>
        contactIndex === index ? { ...contact, [field]: value } : contact,
      ),
    }));
  };

  const addContact = () => {
    setForm((current) => {
      if (current.contacts.length >= 3) {
        return current;
      }

      return {
        ...current,
        contacts: [...current.contacts, { name: "", method: "" }],
      };
    });
  };

  const removeContact = (index: number) => {
    setForm((current) => {
      const nextContacts = current.contacts.filter((_, contactIndex) => contactIndex !== index);
      return {
        ...current,
        contacts: nextContacts,
      };
    });
  };

  const onDeleteDebt = async (id: string) => {
    const nextDebts = debts.filter((item) => item.id !== id);
    setDebts(nextDebts);
    if (editingId === id) {
      resetForm();
      setShowFormDrawer(false);
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
                  <div className="text-right">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-rose-200/60">Amount Owed</p>
                    <p className="mt-1 text-lg font-semibold text-white">{`RM ${formatCurrency(totalAmount)}`}</p>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-widest text-rose-200/60">Total Liabilities</p>
                  <h2 className="text-[41px] font-light leading-[1.02] tracking-[-0.02em] text-white">
                    <span className="font-bold">{labeledTotal}</span>{" "}
                    <span className="text-2xl font-semibold text-rose-200">records</span>
                  </h2>
                </div>
              </div>
            </div>
          )}
        </div>

        <main className="flex-1 space-y-4 px-6 pb-36 pt-4">
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowFormDrawer(true);
            }}
            className="w-full rounded-3xl border-2 border-dashed border-slate-300 bg-[#f0f2f5] px-6 py-8 text-center transition-all active:scale-[0.99]"
          >
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-slate-300 text-white">
              <span className="material-symbols-outlined text-[20px]">add</span>
            </div>
            <p className="mt-3 text-lg font-bold uppercase tracking-[0.08em] text-slate-500">Update Debt List</p>
          </button>

          {statusMessage ? (
            <div
              className={`glass-card rounded-2xl border px-4 py-3 ${
                statusTone === "success"
                  ? "border-emerald-100 bg-emerald-50/80"
                  : "border-rose-100 bg-rose-50/80"
              }`}
            >
              <p className={`text-xs font-medium ${statusTone === "success" ? "text-emerald-700" : "text-rose-700"}`}>
                {statusMessage}
              </p>
            </div>
          ) : null}
          {isLoading ? (
            <>
              <ListItemSkeleton />
              <ListItemSkeleton />
              <ListItemSkeleton />
            </>
          ) : null}

          {!isLoading && debts.length === 0 ? (
            <div className="relative z-30">
              <div className="glass-card rounded-3xl border border-[#ece0e0] bg-rose-50/70 p-6 text-center shadow-[0_14px_32px_-18px_rgba(0,0,0,0.35)]">
                <p className="text-sm font-semibold text-slate-700">No records yet</p>
                <p className="mt-1 text-xs text-slate-500">Use the update card above to add your first debt or obligation.</p>
              </div>
            </div>
          ) : null}

          {debts.map((item) => (
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
              className="glass-card rounded-3xl border border-[#ece0e0] bg-white/85 p-5 transition-all duration-300 hover:-translate-y-[2px]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                    <span className="material-symbols-outlined">receipt_long</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{item.debtType || "Debt"}</p>
                    <h3 className="text-lg font-bold text-slate-900">{item.creditor}</h3>
                    <p className="mt-1 text-sm text-slate-500">{item.whereDocs}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Amount Owed</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{item.amount || "Not set"}</p>
                  <p className="mt-2 text-xs text-slate-500">{item.dueDate || "No due date"}</p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 transition-colors hover:bg-slate-50"
                  type="button"
                  aria-label={`View ${item.creditor}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    router.push(`/debt-records/${item.id}`);
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">visibility</span>
                </button>
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 transition-colors hover:bg-rose-200"
                  type="button"
                  aria-label={`Edit ${item.creditor}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onEditDebt(item);
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 transition-colors hover:bg-rose-200"
                  type="button"
                  aria-label={`Delete ${item.creditor}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setPendingDeleteId(item.id);
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </article>
          ))}
        </main>

        <RecordListDrawer
          open={showFormDrawer}
          title={editingId ? "Edit Debt Record" : "Add Debt Record"}
          onClose={() => {
            setShowFormDrawer(false);
            resetForm();
          }}
          footer={
            <button
              className="w-full rounded-[1.3rem] bg-rose-900 py-3 text-sm font-semibold tracking-wide text-white shadow-xl shadow-rose-900/20 transition-all active:scale-[0.98]"
              onClick={onSaveDebt}
              type="button"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : editingId ? "Update Debt Record" : "Save Debt Record"}
            </button>
          }
        >
          <div className="space-y-4 pt-2">
            <div className="px-1">
              <p className="text-xs leading-5 text-slate-500">
                Save the debt, where its paperwork is, and who should be contacted if follow-up is needed.
              </p>
            </div>

            <section className="rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.28)]">
              <div className="space-y-3">
                <FloatingField label="Debt Type" labelClassName="text-rose-700">
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-rose-500"
                    placeholder="Debt type (e.g. car loan, personal loan)"
                    value={form.debtType}
                    onChange={(e) => setForm((p) => ({ ...p, debtType: e.target.value }))}
                  />
                </FloatingField>
                <FloatingField label="Creditor" labelClassName="text-rose-700">
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-rose-500"
                    placeholder="Creditor or institution"
                    value={form.creditor}
                    onChange={(e) => setForm((p) => ({ ...p, creditor: e.target.value }))}
                  />
                </FloatingField>
                <div className="grid grid-cols-2 gap-2">
                  <FloatingField label="Amount Owed" labelClassName="text-rose-700">
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-rose-500"
                      placeholder="Amount owed"
                      value={form.amount}
                      onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                    />
                  </FloatingField>
                  <FloatingField label="Due Date" labelClassName="text-rose-700">
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-rose-500"
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                    />
                  </FloatingField>
                </div>
                <FloatingField label="Debt Docs Where" labelClassName="text-rose-700">
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-rose-500"
                    placeholder="Where are statements, agreements, or bills kept?"
                    value={form.whereDocs}
                    onChange={(e) => setForm((p) => ({ ...p, whereDocs: e.target.value }))}
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
                {form.contacts.length < 3 ? (
                  <button type="button" onClick={addContact} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-700">
                    Add
                  </button>
                ) : null}
              </div>
              <div className="space-y-2.5">
                {form.contacts.length > 0
                  ? form.contacts.map((contact, contactIndex) => (
                      <div key={`debt-form-contact-${contactIndex}`} className="rounded-[1.25rem] border border-slate-200 bg-white p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Contact {contactIndex + 1}</p>
                          <button
                            type="button"
                            onClick={() => removeContact(contactIndex)}
                            className="text-[11px] font-semibold text-rose-700"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="space-y-2">
                          <input
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition-colors focus:border-rose-500"
                            placeholder="Who to contact?"
                            value={contact.name}
                            onChange={(e) => updateContact(contactIndex, "name", e.target.value)}
                          />
                          <input
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition-colors focus:border-rose-500"
                            placeholder="How to contact them?"
                            value={contact.method}
                            onChange={(e) => updateContact(contactIndex, "method", e.target.value)}
                          />
                        </div>
                      </div>
                    ))
                  : null}
              </div>
            </section>

            <FloatingField label="Notes" labelClassName="text-rose-700">
              <textarea
                className="h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-rose-500"
                placeholder="Notes, payoff plan, or special instructions"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </FloatingField>
          </div>
        </RecordListDrawer>

        <ConfirmActionModal
          open={pendingDeleteId !== null}
          title="Delete this debt record?"
          description="This debt record will be removed from the vault on this device."
          confirmLabel="Delete Debt Record"
          onCancel={() => setPendingDeleteId(null)}
          onConfirm={() => {
            if (!pendingDeleteId) {
              return;
            }
            const id = pendingDeleteId;
            setPendingDeleteId(null);
            void onDeleteDebt(id);
          }}
        />

        {isLoading ? (
          <div className="glass fixed bottom-0 left-0 right-0 border-t border-white/50 bg-white/80 pb-6 pt-3">
            <div className="mx-auto flex max-w-md justify-around px-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-6 w-12 animate-pulse rounded bg-slate-200" />
              ))}
            </div>
          </div>
        ) : (
          <AppBottomNav active="assets" mode="dashboard" />
        )}
      </div>
    </div>
  );
}
