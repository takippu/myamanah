"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppBottomNav } from "../components/app-bottom-nav";
import { HeroSkeleton, FormSkeleton, ListItemSkeleton } from "../components/skeletons";
import { emptyVaultData, type DigitalLegacyRecord } from "@/lib/vault-data";
import { loadVaultData, saveVaultData } from "@/lib/vault-client";

const CATEGORY_OPTIONS = ["Social Media", "Email", "Cloud", "Banking App", "Other"];

export default function DigitalLegacyPage() {
  const [items, setItems] = useState<DigitalLegacyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    category: CATEGORY_OPTIONS[0],
    platform: "",
    whereToFind: "",
    recoveryContact: "",
    notes: "",
  });

  const refreshData = async () => {
    try {
      const vault = await loadVaultData();
      setItems(vault?.digitalLegacy ?? []);
    } catch {
      setStatusMessage("Could not load digital legacy.");
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

  const totalRecords = items.length;
  const labeledTotal = useMemo(() => `${String(totalRecords).padStart(2, "0")}`, [totalRecords]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      category: CATEGORY_OPTIONS[0],
      platform: "",
      whereToFind: "",
      recoveryContact: "",
      notes: "",
    });
  };

  const onSave = async () => {
    if (!form.platform.trim() || !form.whereToFind.trim()) return;
    const nextItem: DigitalLegacyRecord = {
      id: editingId ?? crypto.randomUUID(),
      category: form.category,
      platform: form.platform.trim(),
      whereToFind: form.whereToFind.trim(),
      recoveryContact: form.recoveryContact.trim(),
      notes: form.notes.trim(),
    };
    const nextItems = editingId
      ? items.map((item) => (item.id === editingId ? nextItem : item))
      : [nextItem, ...items];
    setItems(nextItems);
    setShowForm(false);
    resetForm();

    try {
      const vault = (await loadVaultData()) ?? emptyVaultData();
      await saveVaultData({ ...vault, digitalLegacy: nextItems });
      setStatusMessage(editingId ? "Digital legacy item updated." : "Digital legacy item saved.");
    } catch {
      setStatusMessage("Cloud sync failed.");
    }
  };

  const onEdit = (item: DigitalLegacyRecord) => {
    setEditingId(item.id);
    setForm({
      category: item.category || CATEGORY_OPTIONS[0],
      platform: item.platform || "",
      whereToFind: item.whereToFind || "",
      recoveryContact: item.recoveryContact || "",
      notes: item.notes || "",
    });
    setShowForm(true);
  };

  const onDelete = async (id: string) => {
    const nextItems = items.filter((item) => item.id !== id);
    setItems(nextItems);
    if (editingId === id) {
      resetForm();
      setShowForm(false);
    }
    try {
      const vault = (await loadVaultData()) ?? emptyVaultData();
      await saveVaultData({ ...vault, digitalLegacy: nextItems });
      setStatusMessage("Digital legacy item deleted.");
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
          <h1 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-600">Digital Legacy</h1>
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
            <div className="group relative overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-slate-800 to-slate-900 shadow-[0_16px_30px_-16px_rgba(0,0,0,0.5)] transition-all duration-500 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 to-transparent" />
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
                    <span className="material-symbols-outlined text-[20px] text-sky-200">fingerprint</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/20 px-3 py-1.5 backdrop-blur-md">
                    <div className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white">Active</span>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-widest text-slate-300/60">Total Entries</p>
                  <h2 className="text-[41px] font-light leading-[1.02] tracking-[-0.02em] text-white">
                    <span className="font-bold">{labeledTotal}</span>{" "}
                    <span className="text-2xl font-semibold text-sky-200">records</span>
                  </h2>
                  <p className="mt-3 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-slate-300/50">
                    <span className="material-symbols-outlined text-[14px]">public</span>
                    {`${items.length} digital items in vault`}
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
            <p className="mt-3 text-lg font-bold uppercase tracking-[0.08em] text-slate-500">Update Legacy List</p>
          </button>

          {showForm ? (
            <section className="glass-card rounded-3xl border border-[#e7eaee] bg-sky-50/70 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">
                  {editingId ? "Edit Entry" : "Add Entry"}
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
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  placeholder="Platform (e.g. Instagram, Gmail)"
                  value={form.platform}
                  onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))}
                />
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  placeholder="Where to find access details"
                  value={form.whereToFind}
                  onChange={(e) => setForm((p) => ({ ...p, whereToFind: e.target.value }))}
                />
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  placeholder="Recovery contact (optional)"
                  value={form.recoveryContact}
                  onChange={(e) => setForm((p) => ({ ...p, recoveryContact: e.target.value }))}
                />
                <textarea
                  className="h-20 w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  placeholder="Notes"
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                />
                <button
                  className="w-full rounded-[1.3rem] bg-slate-900 py-3 text-sm font-semibold tracking-wide text-white shadow-xl shadow-slate-900/20 transition-all active:scale-[0.98]"
                  type="button"
                  onClick={onSave}
                >
                  {editingId ? "Update Entry" : "Save Entry"}
                </button>
              </div>
            </section>
          ) : null}

          {statusMessage ? (
            <div className="glass-card rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-3">
              <p className="text-xs font-medium text-sky-700">{statusMessage}</p>
            </div>
          ) : null}
          {isLoading ? (
            <>
              <ListItemSkeleton />
              <ListItemSkeleton />
              <ListItemSkeleton />
            </>
          ) : null}
          {!isLoading && !statusMessage && items.length === 0 ? (
            <div className="glass-card rounded-3xl border border-[#e7eaee] bg-sky-50/70 p-6 text-center">
              <p className="text-sm font-semibold text-slate-700">No records yet</p>
              <p className="mt-1 text-xs text-slate-500">Use the update card above to add social media or any digital asset.</p>
            </div>
          ) : null}

          {items.map((item) => (
            <article
              key={item.id}
              className="glass-card rounded-3xl border border-[#e7eaee] bg-sky-50/70 p-6 transition-all duration-300 hover:-translate-y-[2px]"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <span className="material-symbols-outlined">public</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{item.category}</p>
                    <h3 className="text-xl font-bold text-slate-900">{item.platform}</h3>
                  </div>
                </div>
                <span className="rounded-md bg-sky-100 px-2 py-1 text-[10px] font-bold uppercase text-sky-700">
                  Active
                </span>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white/80 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Where To Find</p>
                <p className="text-sm font-medium text-slate-800">{item.whereToFind}</p>
                {item.recoveryContact ? (
                  <p className="mt-1 text-xs text-slate-500">Recovery contact: {item.recoveryContact}</p>
                ) : null}
                {item.notes ? <p className="mt-1 text-xs text-slate-500">{item.notes}</p> : null}
              </div>
              <div className="mt-4 flex items-center justify-end gap-3">
                <button className="text-xs font-semibold text-sky-700" type="button" onClick={() => onEdit(item)}>
                  Edit
                </button>
                <button className="text-xs font-semibold text-red-600" type="button" onClick={() => onDelete(item.id)}>
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
          <AppBottomNav active="wishes" mode="default" />
        )}
      </div>
    </div>
  );
}
