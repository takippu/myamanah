"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TrustedContactReleaseChannel } from "@prisma/client";
import { AppBottomNav } from "../components/app-bottom-nav";
import { FloatingField } from "../components/floating-field";
import { CategoryCardSkeleton } from "../components/skeletons";
import { VaultSessionGuard } from "../components/vault-session-guard";
import { emptyVaultData, type VaultData } from "@/lib/vault-data";
import {
  deleteTrustedContactReleaseChannel,
  getTrustedContactReleaseChannels,
  loadVaultData,
  saveTrustedContactReleaseChannel,
  saveVaultData,
} from "@/lib/vault-client";

function formatLastUpdated(dateStr: string | null): string {
  if (!dateStr) return "Never updated";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export default function VaultPage() {
  const [vault, setVault] = useState<VaultData | null>(null);
  const [counts, setCounts] = useState({
    debts: 0,
    assets: 0,
    digitalLegacy: 0,
    wishes: 0,
    total: 0,
  });
  const [wishesComplete, setWishesComplete] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTrustedId, setEditingTrustedId] = useState<string | null>(null);
  const [showTrustedForm, setShowTrustedForm] = useState(false);
  const [trustedStatus, setTrustedStatus] = useState<string | null>(null);
  const [showVaultHelp, setShowVaultHelp] = useState(false);
  const [canManageReleaseChannels, setCanManageReleaseChannels] = useState(false);
  const [releaseChannels, setReleaseChannels] = useState<Record<string, TrustedContactReleaseChannel>>({});
  const [trustedForm, setTrustedForm] = useState({
    name: "",
    relation: "",
    contact: "",
    releaseEmail: "",
    phoneNumber: "",
  });

  const refreshData = async () => {
    try {
      const authRes = await fetch("/api/auth/me", { credentials: "include" });
      setCanManageReleaseChannels(authRes.ok);
      const vault = await loadVaultData();
      setVault(vault ?? emptyVaultData());
      if (authRes.ok) {
        const channels = await getTrustedContactReleaseChannels();
        setReleaseChannels(
          Object.fromEntries(channels.map((channel) => [channel.trustedContactId, channel])),
        );
      } else {
        setReleaseChannels({});
      }
      const debts = vault?.debts?.length ?? 0;
      const assets = vault?.assets?.length ?? 0;
      const digitalLegacy = vault?.digitalLegacy?.length ?? 0;
      
      const wishesFilled = [
        vault?.wishes?.religiousWishes?.trim(),
        vault?.wishes?.familyInstructions?.trim(),
        vault?.wishes?.distributionNotes?.trim(),
        vault?.wishes?.executorNotes?.trim(),
      ].filter(Boolean).length;
      
      setCounts({
        debts,
        assets,
        digitalLegacy,
        wishes: wishesFilled,
        total: debts + assets + digitalLegacy,
      });
      setWishesComplete(wishesFilled === 4);
      setLastUpdated(vault?.meta?.updatedAt ?? null);
    } catch {
      // Vault not accessible, keep counts at 0
      setVault(emptyVaultData());
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

  const formattedTotal = String(counts.total);

  const resetTrustedForm = () => {
    setEditingTrustedId(null);
    setShowTrustedForm(false);
    setTrustedForm({ name: "", relation: "", contact: "", releaseEmail: "", phoneNumber: "" });
  };

  const openTrustedForm = (contact?: { id: string; name: string; relation?: string; contact?: string }) => {
    const releaseChannel = contact ? releaseChannels[contact.id] : undefined;
    if (contact) {
      setEditingTrustedId(contact.id);
      setTrustedForm({
        name: contact.name,
        relation: contact.relation ?? "",
        contact: contact.contact ?? "",
        releaseEmail: releaseChannel?.releaseEmail ?? "",
        phoneNumber: releaseChannel?.phoneNumber ?? "",
      });
    } else {
      setEditingTrustedId(null);
      setTrustedForm({ name: "", relation: "", contact: "", releaseEmail: "", phoneNumber: "" });
    }
    setShowTrustedForm(true);
  };

  const saveTrustedContact = async () => {
    if (!trustedForm.name.trim() || !trustedForm.contact.trim()) {
      setTrustedStatus("Name and contact are required.");
      return;
    }

    const vault = (await loadVaultData()) ?? emptyVaultData();
    const currentContacts = vault.trustedContacts ?? [];
    const trustedContactId = editingTrustedId ?? crypto.randomUUID();
    const nextContacts = editingTrustedId
      ? currentContacts.map((contact) =>
          contact.id === editingTrustedId
            ? {
                ...contact,
                name: trustedForm.name.trim(),
                relation: trustedForm.relation.trim() || undefined,
                contact: trustedForm.contact.trim(),
              }
            : contact,
        )
      : [
          ...currentContacts,
          {
            id: trustedContactId,
            name: trustedForm.name.trim(),
            relation: trustedForm.relation.trim() || undefined,
            contact: trustedForm.contact.trim(),
          },
        ].slice(0, 3);

    await saveVaultData({
      ...vault,
      trustedContacts: nextContacts,
    });
    if (trustedForm.releaseEmail.trim()) {
      if (!canManageReleaseChannels) {
        setTrustedStatus("Trusted contact saved locally. Sign in and enable encrypted backup to store release email and phone for emergency delivery.");
      } else {
        await saveTrustedContactReleaseChannel({
          trustedContactId,
          releaseEmail: trustedForm.releaseEmail.trim(),
          phoneNumber: trustedForm.phoneNumber.trim() || null,
        });
      }
    } else if (editingTrustedId && canManageReleaseChannels && releaseChannels[editingTrustedId]) {
      await deleteTrustedContactReleaseChannel(editingTrustedId).catch(() => undefined);
    }
    setTrustedStatus(editingTrustedId ? "Trusted contact updated." : "Trusted contact added.");
    resetTrustedForm();
    await refreshData();
  };

  const deleteTrustedContact = async (id: string) => {
    const vault = (await loadVaultData()) ?? emptyVaultData();
    await saveVaultData({
      ...vault,
      trustedContacts: (vault.trustedContacts ?? []).filter((contact) => contact.id !== id),
    });
    if (canManageReleaseChannels) {
      await deleteTrustedContactReleaseChannel(id).catch(() => undefined);
    }
    setTrustedStatus("Trusted contact removed.");
    if (editingTrustedId === id) {
      resetTrustedForm();
    }
    await refreshData();
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans text-slate-800 antialiased">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-x-hidden bg-[#F2F2F7]">
        <VaultSessionGuard />
        <header className="sticky top-0 z-30 flex items-center justify-between bg-[#F2F2F7]/50 px-6 py-6 backdrop-blur-lg">
          <Link
            href="/dashboard"
            className="glass-card flex h-12 w-12 items-center justify-center rounded-2xl transition-transform active:scale-95"
            aria-label="Back to dashboard"
          >
            <span className="material-symbols-outlined text-slate-600">arrow_back</span>
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Secure Vault</h1>
          <button
            className="glass-card flex h-12 w-12 items-center justify-center rounded-2xl text-emerald-600 transition-transform active:scale-95"
            aria-label="Vault help"
            type="button"
            onClick={() => setShowVaultHelp(true)}
          >
            <span className="material-symbols-outlined">help_outline</span>
          </button>
        </header>

        <main className="flex-1 space-y-8 px-6 pb-36">
          {isLoading ? (
            // Skeleton Hero
            <div className="relative mt-4 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-300 to-slate-400 p-10 animate-pulse">
              <div className="flex flex-col items-center gap-6">
                <div className="h-20 w-20 rounded-[2rem] bg-slate-200" />
                <div className="space-y-3 text-center">
                  <div className="h-3 w-24 mx-auto rounded bg-slate-200" />
                  <div className="h-10 w-32 mx-auto rounded bg-slate-200" />
                  <div className="h-6 w-28 mx-auto rounded-full bg-slate-200" />
                </div>
              </div>
            </div>
          ) : (
            <div className="dashboard-islamic-pattern relative mt-4 overflow-hidden rounded-[2.2rem] border border-white/10 shadow-[0_18px_36px_-20px_rgba(0,0,0,0.45)]">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/18 via-transparent to-white/5" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_38%)]" />
              <div className="relative flex items-center justify-between gap-4 px-6 py-5">
                <div className="max-w-[11rem] text-left">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-200/58">
                    Total Records
                  </p>
                  <p className="mt-2 text-[1.2rem] font-semibold text-white">{formattedTotal}</p>
                  <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                    <span className="material-symbols-outlined text-[14px] text-emerald-300">update</span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100/78">
                      {formatLastUpdated(lastUpdated)}
                    </span>
                  </div>
                </div>
                <div className="flex h-[84px] w-[84px] items-center justify-center rounded-full">
                  <div className="relative flex h-[84px] w-[84px] items-center justify-center">
                    <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
                      {Array.from({ length: 24 }).map((_, index) => {
                        const angle = ((index / 24) * Math.PI * 2) - Math.PI / 2;
                        const x = 42 + Math.cos(angle) * 32;
                        const y = 42 + Math.sin(angle) * 32;
                        const isActive = index < clamp(counts.total, 0, 24);

                        return (
                          <circle
                            key={index}
                            cx={x}
                            cy={y}
                            r={isActive ? 2.6 : 2}
                            fill={isActive ? "#d4af37" : "rgba(255,255,255,0.16)"}
                          />
                        );
                      })}
                    </svg>
                    <span className="absolute inset-[14px] flex items-center justify-center rounded-full border border-white/12 bg-gradient-to-br from-emerald-500/95 to-emerald-700/95 shadow-[0_8px_18px_-14px_rgba(0,0,0,0.45)]">
                      <span className="absolute inset-[6px] rounded-full border border-white/10" />
                      <span className="material-symbols-outlined relative text-[21px] text-white">inventory_2</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <section className="space-y-4">
            <div className="rounded-[1.75rem] border border-[#e4e6eb] bg-white p-5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.06)]">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Trusted Contacts</p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900">Deadman switch recipients</h3>
                  <p className="mt-1 text-xs text-slate-500">Add up to 3 people who would matter if the deadman switch is missed.</p>
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                    Release email and optional phone are stored separately from the encrypted vault for emergency delivery.
                    Trusted contacts still need your recovery key from you directly. MyAmanah never sends that key.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openTrustedForm()}
                  disabled={showTrustedForm || (vault?.trustedContacts.length ?? 0) >= 3}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 disabled:opacity-40"
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
              {trustedStatus ? <p className="mb-3 text-xs font-medium text-emerald-700">{trustedStatus}</p> : null}
              <div className="space-y-3">
                {(vault?.trustedContacts.length ?? 0) > 0 ? (
                  vault?.trustedContacts.map((contact) => (
                    <div key={contact.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{contact.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{contact.relation || "Trusted contact"}</p>
                          <p className="mt-2 text-sm text-slate-700">{contact.contact}</p>
                          {releaseChannels[contact.id] ? (
                            <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900">
                              <p className="font-semibold">Emergency delivery</p>
                              <p className="mt-1">{releaseChannels[contact.id].releaseEmail}</p>
                              <p className="mt-1 text-emerald-800/80">
                                {releaseChannels[contact.id].phoneNumber
                                  ? `Phone fallback: ${releaseChannels[contact.id].phoneNumber}`
                                  : "Phone fallback not set"}
                              </p>
                            </div>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-emerald-700" onClick={() => openTrustedForm(contact)}>
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button type="button" className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-rose-700" onClick={() => void deleteTrustedContact(contact.id)}>
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    No trusted contacts added yet.
                  </div>
                )}
                {showTrustedForm ? (
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <FloatingField label="Name" labelClassName="text-emerald-700" backgroundClassName="bg-slate-50">
                      <input
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none focus:border-emerald-500"
                        placeholder="e.g. Ahmad bin Abdullah"
                        value={trustedForm.name}
                        onChange={(event) => setTrustedForm((current) => ({ ...current, name: event.target.value }))}
                      />
                    </FloatingField>
                    <FloatingField label="Relation" labelClassName="text-emerald-700" backgroundClassName="bg-slate-50">
                      <input
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none focus:border-emerald-500"
                        placeholder="e.g. Brother, Wife, Son"
                        value={trustedForm.relation}
                        onChange={(event) => setTrustedForm((current) => ({ ...current, relation: event.target.value }))}
                      />
                    </FloatingField>
                    <FloatingField label="How To Reach" labelClassName="text-emerald-700" backgroundClassName="bg-slate-50">
                      <input
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none focus:border-emerald-500"
                        placeholder="e.g. WhatsApp +6012-345-6789"
                        value={trustedForm.contact}
                        onChange={(event) => setTrustedForm((current) => ({ ...current, contact: event.target.value }))}
                      />
                    </FloatingField>
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-[11px] leading-relaxed text-amber-900">
                      Release email is used for secure retrieval links through Resend. Phone is optional and only kept for manual follow-up if the email is ignored.
                    </div>
                    <FloatingField label="Release Email" labelClassName="text-emerald-700" backgroundClassName="bg-slate-50">
                      <input
                        type="email"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none focus:border-emerald-500"
                        placeholder="e.g. ahmad@email.com"
                        value={trustedForm.releaseEmail}
                        onChange={(event) => setTrustedForm((current) => ({ ...current, releaseEmail: event.target.value }))}
                      />
                    </FloatingField>
                    <FloatingField label="Phone Number (Optional)" labelClassName="text-emerald-700" backgroundClassName="bg-slate-50">
                      <input
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none focus:border-emerald-500"
                        placeholder="e.g. +6012-345-6789"
                        value={trustedForm.phoneNumber}
                        onChange={(event) => setTrustedForm((current) => ({ ...current, phoneNumber: event.target.value }))}
                      />
                    </FloatingField>
                    {!canManageReleaseChannels ? (
                      <p className="text-[11px] leading-relaxed text-slate-500">
                        Sign in and enable encrypted backup to save release email and phone for deadman delivery.
                      </p>
                    ) : null}
                    <div className="flex items-center gap-3">
                      <button type="button" className="flex-1 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white" onClick={() => void saveTrustedContact()}>
                        {editingTrustedId ? "Update Contact" : "Save Contact"}
                      </button>
                      <button type="button" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600" onClick={resetTrustedForm}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <p className="ml-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
              Vault Categories
            </p>

            {isLoading ? (
              <>
                <CategoryCardSkeleton />
                <CategoryCardSkeleton />
                <CategoryCardSkeleton />
                <CategoryCardSkeleton />
              </>
            ) : (
              <>
                <CategoryCard
                  href="/debt-records"
                  icon="receipt_long"
                  title="Debt Records"
                  subtitle="Outstanding liabilities and due dates"
                  badge={counts.debts}
                />
                <CategoryCard
                  href="/asset-records"
                  icon="account_balance_wallet"
                  title="Asset Records"
                  subtitle="Ownership, where-to-find, and key contacts"
                  badge={counts.assets}
                />
                <CategoryCard
                  href="/digital-legacy"
                  icon="fingerprint"
                  title="Digital Legacy"
                  subtitle="Social media, email, cloud accounts access"
                  badge={counts.digitalLegacy}
                />
                <CategoryCard
                  href="/wishes"
                  icon="auto_stories"
                  title="Wishes & Instructions"
                  subtitle="Religious wishes, family instructions, executor notes"
                  badge={wishesComplete ? "✓" : counts.wishes > 0 ? `${counts.wishes}/4` : undefined}
                  badgeVariant={wishesComplete ? "success" : counts.wishes > 0 ? "partial" : undefined}
                />
              </>
            )}
          </section>
        </main>

        {isLoading ? (
          <div className="glass fixed bottom-0 left-0 right-0 border-t border-white/50 bg-white/80 pb-6 pt-3">
            <div className="mx-auto flex max-w-md justify-around px-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-6 w-12 animate-pulse rounded bg-slate-200" />
              ))}
            </div>
          </div>
        ) : (
          <AppBottomNav active="assets" mode="dashboard" />
        )}

        {showVaultHelp ? (
          <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45 px-4 pb-6 pt-12 sm:items-center sm:justify-center">
            <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.45)]">
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-slate-900">About This Vault</h2>
                <p className="text-sm leading-relaxed text-slate-600">
                  This page is your vault index. It organizes your assets, debts, digital legacy, and wishes so you can review or update each section from one place.
                </p>
                <p className="text-sm leading-relaxed text-slate-600">
                  Trusted contacts are the people who matter if your deadman switch check-in is missed. Add up to three so their names and contact details stay with your vault records.
                </p>
                <p className="text-sm leading-relaxed text-slate-600">
                  Release email and optional phone fields are stored separately from the encrypted vault so MyAmanah can deliver secure claim links if the deadman switch releases. Trusted contacts still need your recovery key from you separately.
                </p>
                <p className="text-sm leading-relaxed text-slate-600">
                  Your sensitive details stay encrypted in the local vault unless you explicitly enable encrypted backup from Settings.
                </p>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowVaultHelp(false)}
                  className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CategoryCard({
  href,
  icon,
  title,
  subtitle,
  badge,
  badgeVariant,
}: {
  href: string;
  icon: string;
  title: string;
  subtitle: string;
  badge?: number | string;
  badgeVariant?: "success" | "partial";
}) {
  const getBadgeClasses = () => {
    if (badgeVariant === "success") {
      return "bg-emerald-600 text-white";
    }
    if (badgeVariant === "partial") {
      return "bg-amber-500 text-white";
    }
    return "bg-emerald-600 text-white";
  };

  const showBadge = badge !== undefined && (typeof badge === "string" || badge > 0);

  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-[1.75rem] border border-[#e4e6eb] bg-white p-5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.06)] transition-all active:scale-[0.98]"
    >
      <div className="flex items-center gap-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <span className="material-symbols-outlined text-[28px]">{icon}</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {showBadge && (
              <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${getBadgeClasses()}`}>
                {badge}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <span className="material-symbols-outlined font-light text-[#D4AF37]">chevron_right</span>
    </Link>
  );
}
