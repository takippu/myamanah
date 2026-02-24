"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppBottomNav } from "../components/app-bottom-nav";
import { HeroSkeleton, FormSkeleton } from "../components/skeletons";
import { emptyVaultData } from "@/lib/vault-data";
import { loadVaultData, saveVaultData } from "@/lib/vault-client";

export default function WishesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [form, setForm] = useState({
    religiousWishes: "",
    familyInstructions: "",
    distributionNotes: "",
    executorNotes: "",
  });

  const refreshData = async () => {
    try {
      const vault = await loadVaultData();
      if (vault?.wishes) {
        setForm({
          religiousWishes: vault.wishes.religiousWishes ?? "",
          familyInstructions: vault.wishes.familyInstructions ?? "",
          distributionNotes: vault.wishes.distributionNotes ?? "",
          executorNotes: vault.wishes.executorNotes ?? "",
        });
      }
    } catch {
      setStatusMessage("Could not load wishes.");
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

  const completedCount = [
    form.religiousWishes.trim(),
    form.familyInstructions.trim(),
    form.distributionNotes.trim(),
    form.executorNotes.trim(),
  ].filter(Boolean).length;

  const isComplete = completedCount === 4;

  const onSave = async () => {
    setIsSaving(true);
    try {
      const vault = (await loadVaultData()) ?? emptyVaultData();
      await saveVaultData({
        ...vault,
        wishes: {
          religiousWishes: form.religiousWishes.trim(),
          familyInstructions: form.familyInstructions.trim(),
          distributionNotes: form.distributionNotes.trim(),
          executorNotes: form.executorNotes.trim(),
        },
      });
      setStatusMessage("Wishes saved successfully.");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      setStatusMessage("Failed to save wishes. Please try again.");
    } finally {
      setIsSaving(false);
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
          <h1 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-600">Wishes</h1>
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
            <div className="group relative overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-emerald-800 to-emerald-900 shadow-[0_16px_30px_-16px_rgba(0,0,0,0.5)] transition-all duration-500 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-800/40 to-transparent" />
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
                    <span className="material-symbols-outlined text-[20px] text-emerald-200">auto_stories</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 py-1.5 backdrop-blur-md">
                    <div className={`h-2 w-2 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)] ${isComplete ? "bg-emerald-400" : "bg-amber-400"}`} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white">
                      {isComplete ? "Complete" : "In Progress"}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-widest text-emerald-200/60">Completion</p>
                  <h2 className="text-[41px] font-light leading-[1.02] tracking-[-0.02em] text-white">
                    <span className="font-bold">{completedCount}</span>
                    <span className="text-2xl font-semibold text-emerald-200">/4</span>
                  </h2>
                  <p className="mt-3 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-emerald-200/50">
                    <span className="material-symbols-outlined text-[14px]">edit_note</span>
                    {`${4 - completedCount} sections remaining`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <main className="flex-1 space-y-4 px-6 pb-40 pt-4">
          {statusMessage ? (
            <div className={`glass-card rounded-2xl border px-4 py-3 ${statusMessage.includes("success") ? "border-emerald-100 bg-emerald-50/80" : "border-rose-100 bg-rose-50/80"}`}>
              <p className={`text-xs font-medium ${statusMessage.includes("success") ? "text-emerald-700" : "text-rose-700"}`}>{statusMessage}</p>
            </div>
          ) : null}

          {isLoading ? (
            <>
              <FormSkeleton />
              <FormSkeleton />
              <FormSkeleton />
              <FormSkeleton />
            </>
          ) : (
            <section className="space-y-4">
              {/* Religious Wishes */}
              <div className="glass-card rounded-3xl border border-[#e7eaee] bg-emerald-50/70 p-6">
                <div className="mb-3 flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${form.religiousWishes.trim() ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-600"}`}>
                    <span className="material-symbols-outlined">mosque</span>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-600">Religious Wishes</h2>
                    <p className="text-[10px] text-slate-400">Funeral, burial, and Islamic obligations</p>
                  </div>
                </div>
                <textarea
                  className="h-28 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm outline-none focus:border-emerald-500 resize-none"
                  placeholder="e.g., I wish to be buried according to Islamic tradition..."
                  value={form.religiousWishes}
                  onChange={(e) => setForm((p) => ({ ...p, religiousWishes: e.target.value }))}
                />
              </div>

              {/* Family Instructions */}
              <div className="glass-card rounded-3xl border border-[#e7eaee] bg-emerald-50/70 p-6">
                <div className="mb-3 flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${form.familyInstructions.trim() ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-600"}`}>
                    <span className="material-symbols-outlined">family_restroom</span>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-600">Family Instructions</h2>
                    <p className="text-[10px] text-slate-400">Messages and guidance for family members</p>
                  </div>
                </div>
                <textarea
                  className="h-28 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm outline-none focus:border-emerald-500 resize-none"
                  placeholder="e.g., To my children, I leave these instructions..."
                  value={form.familyInstructions}
                  onChange={(e) => setForm((p) => ({ ...p, familyInstructions: e.target.value }))}
                />
              </div>

              {/* Distribution Notes */}
              <div className="glass-card rounded-3xl border border-[#e7eaee] bg-emerald-50/70 p-6">
                <div className="mb-3 flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${form.distributionNotes.trim() ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-600"}`}>
                    <span className="material-symbols-outlined">account_balance_wallet</span>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-600">Distribution Notes</h2>
                    <p className="text-[10px] text-slate-400">How assets should be distributed</p>
                  </div>
                </div>
                <textarea
                  className="h-28 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm outline-none focus:border-emerald-500 resize-none"
                  placeholder="e.g., My assets should be distributed according to Islamic inheritance laws..."
                  value={form.distributionNotes}
                  onChange={(e) => setForm((p) => ({ ...p, distributionNotes: e.target.value }))}
                />
              </div>

              {/* Executor Notes */}
              <div className="glass-card rounded-3xl border border-[#e7eaee] bg-emerald-50/70 p-6">
                <div className="mb-3 flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${form.executorNotes.trim() ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-600"}`}>
                    <span className="material-symbols-outlined">gavel</span>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-600">Executor Notes</h2>
                    <p className="text-[10px] text-slate-400">Instructions for the estate executor</p>
                  </div>
                </div>
                <textarea
                  className="h-28 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm outline-none focus:border-emerald-500 resize-none"
                  placeholder="e.g., Contact my lawyer first. All documents are in..."
                  value={form.executorNotes}
                  onChange={(e) => setForm((p) => ({ ...p, executorNotes: e.target.value }))}
                />
              </div>

              {/* Save Button */}
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="flex w-full items-center justify-center gap-3 rounded-[2rem] bg-emerald-800 py-5 text-sm font-semibold tracking-wide text-white shadow-xl shadow-emerald-900/20 transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">save</span>
                    Save Wishes
                  </>
                )}
              </button>
            </section>
          )}
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
