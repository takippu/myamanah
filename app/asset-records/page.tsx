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
import { emptyVaultData, type AssetRecord, type VaultContact } from "@/lib/vault-data";
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

function normalizeContacts(record: Pick<AssetRecord, "contacts" | "contactPerson" | "contactMethod">): VaultContact[] {
  if (record.contacts && record.contacts.length > 0) {
    return record.contacts.slice(0, 3).map((contact) => ({
      name: contact.name ?? "",
      method: contact.method ?? "",
    }));
  }

  if (record.contactPerson || record.contactMethod) {
    return [
      {
        name: record.contactPerson ?? "",
        method: record.contactMethod ?? "",
      },
    ];
  }

  return [];
}

export default function AssetsPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showFormDrawer, setShowFormDrawer] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    assetType: "",
    institution: "",
    whereToFind: "",
    contacts: [] as VaultContact[],
    notes: "",
    value: "",
  });

  const refreshData = async () => {
    try {
      const vault = await loadVaultData();
      setAssets(vault?.assets ?? []);
    } catch {
      setStatusMessage("Could not load assets.");
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

  const totalRecords = assets.length;
  const totalValue = useMemo(() => {
    return assets.reduce((sum, asset) => sum + parseAmount(asset.value || ""), 0);
  }, [assets]);
  const labeledTotal = useMemo(() => String(totalRecords), [totalRecords]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      assetType: "",
      institution: "",
      whereToFind: "",
      contacts: [],
      notes: "",
      value: "",
    });
  };

  const onSaveAsset = async () => {
    if (!form.assetType.trim() || !form.institution.trim() || !form.whereToFind.trim()) {
      setStatusTone("error");
      setStatusMessage("Asset type, institution, and where to find documents are required.");
      return;
    }

    setIsSaving(true);
    const wasEditing = Boolean(editingId);
    const newItem: AssetRecord = {
      id: editingId ?? crypto.randomUUID(),
      assetType: form.assetType.trim(),
      institution: form.institution.trim(),
      whereToFind: form.whereToFind.trim(),
      contacts: form.contacts
        .map((contact) => ({
          name: contact.name.trim(),
          method: contact.method.trim(),
        }))
        .filter((contact) => contact.name || contact.method)
        .slice(0, 3),
      notes: form.notes.trim() || undefined,
      value: form.value.trim() || undefined,
    };
    const nextAssets = editingId
      ? assets.map((item) => (item.id === editingId ? newItem : item))
      : [newItem, ...assets];
    setAssets(nextAssets);
    setShowFormDrawer(false);
    resetForm();

    try {
      const vault = (await loadVaultData()) ?? emptyVaultData();
      await saveVaultData({ ...vault, assets: nextAssets });
      setStatusTone("success");
      setStatusMessage(wasEditing ? "Asset updated." : "Asset saved.");
    } catch {
      setStatusTone("error");
      setStatusMessage("Saved locally. Cloud backup could not be updated right now.");
    } finally {
      setIsSaving(false);
    }
  };

  const onEditAsset = (item: AssetRecord) => {
    setEditingId(item.id);
    setForm({
      assetType: item.assetType,
      institution: item.institution,
      whereToFind: item.whereToFind,
      contacts: normalizeContacts(item),
      notes: item.notes ?? "",
      value: item.value ?? "",
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

  const onDeleteAsset = async (id: string) => {
    const nextAssets = assets.filter((item) => item.id !== id);
    setAssets(nextAssets);
    if (editingId === id) {
      resetForm();
      setShowFormDrawer(false);
    }
    try {
      const vault = (await loadVaultData()) ?? emptyVaultData();
      await saveVaultData({ ...vault, assets: nextAssets });
      setStatusTone("success");
      setStatusMessage("Asset deleted.");
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
          <h1 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-600">Asset Records</h1>
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
            <div className="dashboard-islamic-pattern group relative overflow-hidden rounded-[2.2rem] shadow-[0_16px_30px_-16px_rgba(0,0,0,0.5)] transition-all duration-500 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/20 to-transparent" />
              <div className="relative flex flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md">
                    <span className="material-symbols-outlined text-[20px] text-amber-200">inventory_2</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-200/60">Total Value</p>
                    <p className="mt-1 text-lg font-semibold text-white">{`RM ${formatCurrency(totalValue)}`}</p>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-widest text-amber-200/60">Total Mapped</p>
                  <h2 className="text-[41px] font-light leading-[1.02] tracking-[-0.02em] text-white">
                    <span className="font-bold">{labeledTotal}</span>{" "}
                    <span className="text-2xl font-semibold text-amber-200">records</span>
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
            <p className="mt-3 text-lg font-bold uppercase tracking-[0.08em] text-slate-500">Update Asset List</p>
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
          
          {!isLoading && assets.length === 0 ? (
            <div className="glass-card rounded-3xl border border-[#e7eaee] bg-emerald-50/70 p-6 text-center">
              <p className="text-sm font-semibold text-slate-700">No records yet</p>
              <p className="mt-1 text-xs text-slate-500">Use the update card above to add your first asset record.</p>
            </div>
          ) : null}

          {assets.map((item) => (
            <article
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/asset-records/${item.id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(`/asset-records/${item.id}`);
                }
              }}
              className="glass-card rounded-3xl border border-[#e7eaee] bg-white/85 p-5 transition-all duration-300 hover:-translate-y-[2px]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <span className="material-symbols-outlined">account_balance_wallet</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{item.assetType || "Asset"}</p>
                    <h3 className="text-lg font-bold text-slate-900">{item.institution}</h3>
                    <p className="mt-1 text-sm text-slate-500">{item.whereToFind}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Estimated Value</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{item.value || "Not set"}</p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 transition-colors hover:bg-slate-50"
                  type="button"
                  aria-label={`View ${item.institution}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    router.push(`/asset-records/${item.id}`);
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">visibility</span>
                </button>
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 transition-colors hover:bg-emerald-200"
                  type="button"
                  aria-label={`Edit ${item.institution}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onEditAsset(item);
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 transition-colors hover:bg-rose-200"
                  type="button"
                  aria-label={`Delete ${item.institution}`}
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
          title={editingId ? "Edit Asset" : "Add Asset"}
          onClose={() => {
            setShowFormDrawer(false);
            resetForm();
          }}
          footer={
            <button
              className="w-full rounded-[1.3rem] bg-emerald-700 py-3 text-sm font-semibold tracking-wide text-white shadow-xl shadow-emerald-900/20 transition-all active:scale-[0.98]"
              onClick={onSaveAsset}
              type="button"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : editingId ? "Update Asset" : "Save Asset"}
            </button>
          }
        >
          <div className="space-y-4 pt-2">
            <div className="px-1">
              <p className="text-xs leading-5 text-slate-500">
                Keep it simple. Save what the asset is, where its documents are, and who to call if needed.
              </p>
            </div>

            <section className="rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.28)]">
              <div className="space-y-3">
                <FloatingField label="Asset Type" labelClassName="text-emerald-700">
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-emerald-500"
                    placeholder="Asset type (e.g. Takaful)"
                    value={form.assetType}
                    onChange={(e) => setForm((p) => ({ ...p, assetType: e.target.value }))}
                  />
                </FloatingField>
                <FloatingField label="Institution" labelClassName="text-emerald-700">
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-emerald-500"
                    placeholder="Institution or provider"
                    value={form.institution}
                    onChange={(e) => setForm((p) => ({ ...p, institution: e.target.value }))}
                  />
                </FloatingField>
                <FloatingField label="Documents Where" labelClassName="text-emerald-700">
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-emerald-500"
                    placeholder="Where to find documents"
                    value={form.whereToFind}
                    onChange={(e) => setForm((p) => ({ ...p, whereToFind: e.target.value }))}
                  />
                </FloatingField>
                <FloatingField label="Estimated Value" labelClassName="text-emerald-700">
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-emerald-500"
                    placeholder="Estimated value (optional)"
                    value={form.value}
                    onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                  />
                </FloatingField>
              </div>
            </section>

            <section className="rounded-[1.7rem] border border-slate-200 bg-[#fbfcfb] p-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.24)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Contacts</p>
                  <p className="mt-1 text-xs text-slate-500">Optional</p>
                </div>
                {form.contacts.length < 3 ? (
                  <button
                    type="button"
                    onClick={addContact}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-emerald-700"
                  >
                    Add
                  </button>
                ) : null}
              </div>
              <div className="space-y-2.5">
                {form.contacts.length > 0 ? (
                  form.contacts.map((contact, contactIndex) => (
                    <div
                      key={`asset-form-contact-${contactIndex}`}
                      className="rounded-[1.25rem] border border-slate-200 bg-white p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                          Contact {contactIndex + 1}
                        </p>
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
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition-colors focus:border-emerald-500"
                          placeholder="Who to call?"
                          value={contact.name}
                          onChange={(e) => updateContact(contactIndex, "name", e.target.value)}
                        />
                        <input
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition-colors focus:border-emerald-500"
                          placeholder="How to call?"
                          value={contact.method}
                          onChange={(e) => updateContact(contactIndex, "method", e.target.value)}
                        />
                      </div>
                    </div>
                  ))
                ) : null}
              </div>
            </section>

            <FloatingField label="Notes" labelClassName="text-emerald-700">
              <textarea
                className="h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-emerald-500"
                placeholder="Notes"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </FloatingField>
          </div>
        </RecordListDrawer>

        <ConfirmActionModal
          open={pendingDeleteId !== null}
          title="Delete this asset?"
          description="This asset record will be removed from the vault on this device."
          confirmLabel="Delete Asset"
          onCancel={() => setPendingDeleteId(null)}
          onConfirm={() => {
            if (!pendingDeleteId) {
              return;
            }
            const id = pendingDeleteId;
            setPendingDeleteId(null);
            void onDeleteAsset(id);
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
