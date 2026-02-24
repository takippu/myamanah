"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppBottomNav } from "../components/app-bottom-nav";
import { HeroSkeleton, FormSkeleton, ListItemSkeleton } from "../components/skeletons";
import { emptyVaultData, type AssetRecord } from "@/lib/vault-data";
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

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAmount, setShowAmount] = useState(false);
  const [form, setForm] = useState({
    assetType: "",
    institution: "",
    whereToFind: "",
    contactPerson: "",
    contactMethod: "",
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
  const labeledTotal = useMemo(() => `${String(totalRecords).padStart(2, "0")}`, [totalRecords]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      assetType: "",
      institution: "",
      whereToFind: "",
      contactPerson: "",
      contactMethod: "",
      notes: "",
      value: "",
    });
  };

  const onSaveAsset = async () => {
    if (!form.assetType.trim() || !form.institution.trim() || !form.whereToFind.trim()) return;
    const newItem: AssetRecord = {
      id: editingId ?? crypto.randomUUID(),
      assetType: form.assetType.trim(),
      institution: form.institution.trim(),
      whereToFind: form.whereToFind.trim(),
      contactPerson: form.contactPerson.trim() || undefined,
      contactMethod: form.contactMethod.trim() || undefined,
      notes: form.notes.trim() || undefined,
      value: form.value.trim() || undefined,
    };
    const nextAssets = editingId
      ? assets.map((item) => (item.id === editingId ? newItem : item))
      : [newItem, ...assets];
    setAssets(nextAssets);
    setShowForm(false);
    resetForm();

    try {
      const vault = (await loadVaultData()) ?? emptyVaultData();
      await saveVaultData({ ...vault, assets: nextAssets });
      setStatusMessage(editingId ? "Asset updated." : "Asset saved.");
    } catch {
      setStatusMessage("Cloud sync failed. Please retry.");
    }
  };

  const onEditAsset = (item: AssetRecord) => {
    setEditingId(item.id);
    setForm({
      assetType: item.assetType,
      institution: item.institution,
      whereToFind: item.whereToFind,
      contactPerson: item.contactPerson ?? "",
      contactMethod: item.contactMethod ?? "",
      notes: item.notes ?? "",
      value: item.value ?? "",
    });
    setShowForm(true);
  };

  const onDeleteAsset = async (id: string) => {
    const nextAssets = assets.filter((item) => item.id !== id);
    setAssets(nextAssets);
    if (editingId === id) {
      resetForm();
      setShowForm(false);
    }
    try {
      const vault = (await loadVaultData()) ?? emptyVaultData();
      await saveVaultData({ ...vault, assets: nextAssets });
      setStatusMessage("Asset deleted.");
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
                  <div className="flex items-center gap-2">
                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setShowAmount(!showAmount)}
                      className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-md transition-all active:scale-95"
                      aria-label={showAmount ? "Show record count" : "Show total value"}
                    >
                      <span className="material-symbols-outlined text-[14px] text-amber-200">
                        {showAmount ? "receipt" : "payments"}
                      </span>
                      <span className="text-[10px] font-medium text-amber-100">
                        {showAmount ? "Value" : "Records"}
                      </span>
                    </button>
                    <div className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/20 px-3 py-1.5 backdrop-blur-md">
                      <div className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white">Active</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-widest text-amber-200/60">
                    {showAmount ? "Total Asset Value" : "Total Mapped"}
                  </p>
                  <h2 className="text-[41px] font-light leading-[1.02] tracking-[-0.02em] text-white">
                    {showAmount ? (
                      <>
                        <span className="text-2xl font-semibold text-amber-200">RM</span>
                        <span className="font-bold ml-2">{formatCurrency(totalValue)}</span>
                      </>
                    ) : (
                      <>
                        <span className="font-bold">{labeledTotal}</span>{" "}
                        <span className="text-2xl font-semibold text-amber-200">records</span>
                      </>
                    )}
                  </h2>
                  <p className="mt-3 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-amber-200/50">
                    <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
                    {`${assets.length} assets in vault`}
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
            <p className="mt-3 text-lg font-bold uppercase tracking-[0.08em] text-slate-500">Update Asset List</p>
          </button>

          {showForm ? (
            <section className="glass-card rounded-3xl border border-[#e7eaee] bg-emerald-50/70 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">
                  {editingId ? "Edit Asset" : "Add Asset"}
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
                  className="w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  placeholder="Asset type (e.g. Takaful)"
                  value={form.assetType}
                  onChange={(e) => setForm((p) => ({ ...p, assetType: e.target.value }))}
                />
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  placeholder="Institution"
                  value={form.institution}
                  onChange={(e) => setForm((p) => ({ ...p, institution: e.target.value }))}
                />
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  placeholder="Where to find documents"
                  value={form.whereToFind}
                  onChange={(e) => setForm((p) => ({ ...p, whereToFind: e.target.value }))}
                />
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  placeholder="Estimated value (optional)"
                  value={form.value}
                  onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    placeholder="Contact person"
                    value={form.contactPerson}
                    onChange={(e) => setForm((p) => ({ ...p, contactPerson: e.target.value }))}
                  />
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    placeholder="Contact method"
                    value={form.contactMethod}
                    onChange={(e) => setForm((p) => ({ ...p, contactMethod: e.target.value }))}
                  />
                </div>
                <textarea
                  className="h-20 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  placeholder="Notes"
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                />
                <button
                  className="w-full rounded-[1.3rem] bg-emerald-700 py-3 text-sm font-semibold tracking-wide text-white shadow-xl shadow-emerald-900/20 transition-all active:scale-[0.98]"
                  onClick={onSaveAsset}
                  type="button"
                >
                  {editingId ? "Update Asset" : "Save Asset"}
                </button>
              </div>
            </section>
          ) : null}

          {statusMessage ? (
            <div className="glass-card rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3">
              <p className="text-xs font-medium text-emerald-700">{statusMessage}</p>
            </div>
          ) : null}
          
          {isLoading ? (
            <>
              <ListItemSkeleton />
              <ListItemSkeleton />
              <ListItemSkeleton />
            </>
          ) : null}
          
          {!isLoading && !statusMessage && assets.length === 0 ? (
            <div className="glass-card rounded-3xl border border-[#e7eaee] bg-emerald-50/70 p-6 text-center">
              <p className="text-sm font-semibold text-slate-700">No records yet</p>
              <p className="mt-1 text-xs text-slate-500">Use the update card above to add your first asset record.</p>
            </div>
          ) : null}

          {assets.map((item, index) => (
            <article
              key={item.id}
              className="glass-card rounded-3xl border border-[#e7eaee] bg-emerald-50/70 p-6 transition-all duration-300 hover:-translate-y-[2px]"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <span className="material-symbols-outlined">account_balance_wallet</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{item.assetType || "Asset"}</p>
                    <h3 className="text-xl font-bold text-slate-900">{item.institution}</h3>
                  </div>
                </div>
                <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700">
                  {index === 0 ? "Primary" : "Mapped"}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <span>Where To Find</span>
                  <span className="text-emerald-600">{item.contactPerson ? "Contact Set" : "Contact Missing"}</span>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-sm font-medium text-slate-800">{item.whereToFind}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.value ? `Value: ${item.value}` : "Value not set"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.contactPerson || "No contact"}{item.contactMethod ? ` (${item.contactMethod})` : ""}
                  </p>
                  {item.notes ? <p className="mt-1 text-xs text-slate-500">{item.notes}</p> : null}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end gap-3">
                <button className="text-xs font-semibold text-emerald-700" type="button" onClick={() => onEditAsset(item)}>
                  Edit
                </button>
                <button className="text-xs font-semibold text-red-600" type="button" onClick={() => onDeleteAsset(item.id)}>
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
          <AppBottomNav active="assets" mode="default" />
        )}
      </div>
    </div>
  );
}
