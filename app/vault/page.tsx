"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TrustedContactReleaseChannel } from "@prisma/client";
import { AppBottomNav } from "../components/app-bottom-nav";
import { FloatingField } from "../components/floating-field";
import { CategoryCardSkeleton } from "../components/skeletons";
import { RecordListDrawer } from "../components/record-list-drawer";
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
  const [email, setEmail] = useState<string>("");
  const [testEmailStatus, setTestEmailStatus] = useState<string | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);
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
  // Notify dialog state
  const [notifyDialog, setNotifyDialog] = useState<{
    isOpen: boolean;
    contactId: string | null;
    contactName: string;
    contactEmail: string;
    isSending: boolean;
    status: string | null;
  }>({
    isOpen: false,
    contactId: null,
    contactName: "",
    contactEmail: "",
    isSending: false,
    status: null,
  });

  const refreshData = async () => {
    try {
      const authRes = await fetch("/api/auth/me", { credentials: "include" });
      setCanManageReleaseChannels(authRes.ok);
      if (authRes.ok) {
        const authData = await authRes.json() as { user?: { email?: string } };
        setEmail(authData.user?.email ?? "");
      } else {
        setEmail("");
      }
      const vault = await loadVaultData();
      setVault(vault ?? emptyVaultData());
      if (authRes.ok) {
        const channels = await getTrustedContactReleaseChannels();
        console.log("[Vault] Loaded release channels:", channels);
        const channelsMap = Object.fromEntries(channels.map((channel) => [channel.trustedContactId, channel]));
        console.log("[Vault] Release channels map:", channelsMap);
        setReleaseChannels(channelsMap);
      } else {
        console.log("[Vault] Not authenticated, clearing release channels");
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
    
    // Only try to save release channels if user is authenticated
    if (canManageReleaseChannels) {
      if (trustedForm.releaseEmail.trim()) {
        await saveTrustedContactReleaseChannel({
          trustedContactId,
          releaseEmail: trustedForm.releaseEmail.trim(),
          phoneNumber: trustedForm.phoneNumber.trim() || null,
        });
      } else if (editingTrustedId && releaseChannels[editingTrustedId]) {
        await deleteTrustedContactReleaseChannel(editingTrustedId).catch(() => undefined);
      }
      setTrustedStatus(editingTrustedId ? "Trusted contact updated." : "Trusted contact added.");
    } else {
      // In local mode, show appropriate message if user tried to set release email
      if (trustedForm.releaseEmail.trim()) {
        setTrustedStatus("Trusted contact saved locally. Sign in and enable encrypted backup to store release email and phone for emergency delivery.");
      } else {
        setTrustedStatus(editingTrustedId ? "Trusted contact updated." : "Trusted contact added.");
      }
    }
    
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

  const sendTestEmail = async () => {
    setIsSendingTest(true);
    setTestEmailStatus(null);
    try {
      const response = await fetch("/api/trusted-contacts/test-email", {
        method: "POST",
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send test email");
      }
      
      const result = await response.json();
      setTestEmailStatus(`✓ ${result.message}`);
    } catch (error) {
      setTestEmailStatus(error instanceof Error ? error.message : "Failed to send test email");
    } finally {
      setIsSendingTest(false);
    }
  };

  // Check if current user is thaqifdevv@gmail.com for test button
  const canSendTestEmail = email.toLowerCase() === "thaqifdevv@gmail.com";

  const openNotifyDialog = (contactId: string, name: string, email: string) => {
    setNotifyDialog({
      isOpen: true,
      contactId,
      contactName: name,
      contactEmail: email,
      isSending: false,
      status: null,
    });
  };

  const closeNotifyDialog = () => {
    setNotifyDialog((prev) => ({ ...prev, isOpen: false, status: null }));
  };

  const sendNotification = async () => {
    if (!notifyDialog.contactId || !notifyDialog.contactEmail) return;
    
    setNotifyDialog((prev) => ({ ...prev, isSending: true, status: null }));
    
    try {
      const response = await fetch("/api/trusted-contacts/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          contactId: notifyDialog.contactId,
          email: notifyDialog.contactEmail,
          name: notifyDialog.contactName,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        
        // Handle rate limit (429) response
        if (response.status === 429 && error.rateLimit) {
          const { minutesRemaining } = error.rateLimit;
          const timeText = minutesRemaining >= 60 
            ? `${Math.ceil(minutesRemaining / 60)} hours` 
            : `${minutesRemaining} minutes`;
          throw new Error(`Rate limited: Please wait ${timeText} before sending another notification.`);
        }
        
        throw new Error(error.error || "Failed to send notification");
      }
      
      setNotifyDialog((prev) => ({
        ...prev,
        isSending: false,
        status: `✓ Notification sent to ${notifyDialog.contactEmail}`,
      }));
      
      // Close dialog after a delay
      setTimeout(() => {
        closeNotifyDialog();
      }, 2000);
    } catch (error) {
      setNotifyDialog((prev) => ({
        ...prev,
        isSending: false,
        status: error instanceof Error ? error.message : "Failed to send notification",
      }));
    }
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
            {/* Trusted Contacts Section */}
            <div className="rounded-[1.75rem] border border-[#e4e6eb] bg-white p-5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.06)]">
              {/* Header row with title and buttons */}
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Trusted Contacts</p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900 leading-tight">Deadman switch recipients</h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canSendTestEmail && (
                    <button
                      type="button"
                      onClick={() => void sendTestEmail()}
                      disabled={isSendingTest}
                      className="flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-amber-50 px-3 text-amber-700 disabled:opacity-40"
                    >
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      <span className="text-xs font-semibold">Test</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openTrustedForm()}
                    disabled={showTrustedForm || (vault?.trustedContacts.length ?? 0) >= 3}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined">add</span>
                  </button>
                </div>
              </div>
              {/* Description - full width */}
              <p className="text-xs text-slate-500">Add up to 3 people who would matter if the deadman switch is missed.</p>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Release email and optional phone are stored separately from the encrypted vault for emergency delivery.
                Trusted contacts still need your recovery key from you directly. MyAmanah never sends that key.
              </p>
              {testEmailStatus ? <p className="mb-2 text-xs font-medium text-amber-700">{testEmailStatus}</p> : null}
              {trustedStatus ? <p className="mb-3 text-xs font-medium text-emerald-700">{trustedStatus}</p> : null}
              <div className="space-y-3">
                {(vault?.trustedContacts.length ?? 0) > 0 ? (
                  vault?.trustedContacts.map((contact) => {
                    const channel = releaseChannels[contact.id];
                    console.log("[Vault] Rendering contact:", contact.name, { channel, releaseChannelsKeys: Object.keys(releaseChannels) });
                    return (
                      <TrustedContactCard
                        key={contact.id}
                        contact={contact}
                        releaseChannel={channel}
                        onEdit={() => openTrustedForm(contact)}
                        onDelete={() => void deleteTrustedContact(contact.id)}
                        onNotify={channel?.releaseEmail ? () => {
                          openNotifyDialog(contact.id, contact.name, channel.releaseEmail);
                        } : undefined}
                      />
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                      <span className="material-symbols-outlined text-slate-400">group</span>
                    </div>
                    <p className="text-sm text-slate-500">No trusted contacts added yet</p>
                    <p className="mt-1 text-xs text-slate-400">Add someone who should receive your vault if the deadman switch triggers</p>
                  </div>
                )}
                {/* Trusted Contact Form Drawer */}
                <RecordListDrawer
                  open={showTrustedForm}
                  title={editingTrustedId ? "Edit Trusted Contact" : "Add Trusted Contact"}
                  onClose={() => { setShowTrustedForm(false); resetTrustedForm(); }}
                  footer={
                    <button
                      type="button"
                      className="w-full rounded-[1.3rem] bg-emerald-700 py-3 text-sm font-semibold tracking-wide text-white shadow-xl shadow-emerald-900/20 transition-all active:scale-[0.98]"
                      onClick={() => void saveTrustedContact()}
                      disabled={!trustedForm.name.trim() || !trustedForm.contact.trim()}
                    >
                      {editingTrustedId ? "Update Contact" : "Save Contact"}
                    </button>
                  }
                >
                  <div className="space-y-4 pt-2">
                    <section className="rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.28)]">
                      <div className="space-y-3">
                        <FloatingField label="Name *" labelClassName="text-emerald-700">
                          <input
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none focus:border-emerald-500"
                            placeholder="e.g. Ahmad bin Abdullah"
                            value={trustedForm.name}
                            onChange={(event) => setTrustedForm((current) => ({ ...current, name: event.target.value }))}
                          />
                        </FloatingField>
                        <FloatingField label="Relation" labelClassName="text-emerald-700">
                          <input
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none focus:border-emerald-500"
                            placeholder="e.g. Brother, Wife, Son"
                            value={trustedForm.relation}
                            onChange={(event) => setTrustedForm((current) => ({ ...current, relation: event.target.value }))}
                          />
                        </FloatingField>
                        <FloatingField 
                          label="Preferred Contact Method *" 
                          labelClassName="text-emerald-700"
                          hint="How you'd normally reach them (for your reference only)"
                        >
                          <input
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none focus:border-emerald-500"
                            placeholder="e.g. Call after 6pm, Telegram, office line"
                            value={trustedForm.contact}
                            onChange={(event) => setTrustedForm((current) => ({ ...current, contact: event.target.value }))}
                          />
                        </FloatingField>
                      </div>
                    </section>

                    <section className="rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.28)]">
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-[11px] leading-relaxed text-amber-900">
                          <span className="font-semibold">Emergency delivery:</span> The release email below is used to send secure retrieval links if the deadman switch triggers. Phone is optional and only for manual follow-up.
                        </div>
                        <FloatingField label="Release Email" labelClassName="text-emerald-700">
                          <input
                            type="email"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none focus:border-emerald-500"
                            placeholder="e.g. ahmad@email.com"
                            value={trustedForm.releaseEmail}
                            onChange={(event) => setTrustedForm((current) => ({ ...current, releaseEmail: event.target.value }))}
                          />
                        </FloatingField>
                        <FloatingField label="Phone Number (Optional)" labelClassName="text-emerald-700">
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
                      </div>
                    </section>
                  </div>
                </RecordListDrawer>
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
                  color="rose"
                />
                <CategoryCard
                  href="/asset-records"
                  icon="account_balance_wallet"
                  title="Asset Records"
                  subtitle="Ownership, where-to-find, and key contacts"
                  badge={counts.assets}
                  color="emerald"
                />
                <CategoryCard
                  href="/digital-legacy"
                  icon="fingerprint"
                  title="Digital Legacy"
                  subtitle="Social media, email, cloud accounts access"
                  badge={counts.digitalLegacy}
                  color="violet"
                />
                <CategoryCard
                  href="/wishes"
                  icon="auto_stories"
                  title="Wishes & Instructions"
                  subtitle="Religious wishes, family instructions, executor notes"
                  badge={wishesComplete ? "✓" : counts.wishes > 0 ? `${counts.wishes}/4` : undefined}
                  badgeVariant={wishesComplete ? "success" : counts.wishes > 0 ? "partial" : undefined}
                  color="amber"
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

        {/* Notify Contact Confirmation Dialog */}
        {notifyDialog.isOpen && (
          <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45 px-4 pb-6 pt-12 sm:items-center sm:justify-center">
            <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.45)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                  <span className="material-symbols-outlined text-[24px]">notifications_active</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Notify Trusted Contact</h2>
                  <p className="text-xs text-slate-500">Send a courtesy notification email</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Recipient</p>
                  <p className="text-sm font-medium text-slate-900">{notifyDialog.contactName}</p>
                  <p className="text-xs text-slate-600">{notifyDialog.contactEmail}</p>
                </div>

                <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-amber-600 text-[20px]">info</span>
                    <div>
                      <p className="text-sm font-medium text-amber-900">What will happen?</p>
                      <p className="mt-1 text-xs text-amber-800/80 leading-relaxed">
                        An email will be sent to <strong>{notifyDialog.contactEmail}</strong> notifying them that they have been added as a trusted contact on <strong>amanah.trlabs.my</strong> (MyAmanah).
                      </p>
                      <p className="mt-2 text-xs text-amber-800/80 leading-relaxed">
                        The email explains what MyAmanah is, what being a trusted contact means, and that they will only receive emails if you miss your deadman switch check-in.
                      </p>
                    </div>
                  </div>
                </div>

                {notifyDialog.status && (
                  <div className={`rounded-2xl px-4 py-3 text-sm ${notifyDialog.status.startsWith("✓") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    {notifyDialog.status}
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void sendNotification()}
                  disabled={notifyDialog.isSending || !!notifyDialog.status?.startsWith("✓")}
                  className="flex-1 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {notifyDialog.isSending ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      Sending...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      Send Notification
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeNotifyDialog}
                  disabled={notifyDialog.isSending}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TrustedContactCard({
  contact,
  releaseChannel,
  onEdit,
  onDelete,
  onNotify,
}: {
  contact: { id: string; name: string; relation?: string; contact?: string };
  releaseChannel?: TrustedContactReleaseChannel;
  onEdit: () => void;
  onDelete: () => void;
  onNotify?: () => void;
}) {
  const hasReleaseEmail = !!releaseChannel?.releaseEmail;
  console.log("[TrustedContactCard]", contact.name, { hasReleaseEmail, onNotify: !!onNotify, releaseEmail: releaseChannel?.releaseEmail });
  
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
      {/* Top accent bar */}
      <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400" />
      
      <div className="p-4">
        {/* Header Row: Name + Actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-900 leading-tight">
              {contact.name}
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {contact.relation || "Trusted contact"}
            </p>
          </div>
          
          {/* Action Icons - Compact */}
          <div className="flex items-center gap-1 shrink-0">
            {hasReleaseEmail && onNotify && (
              <button 
                type="button" 
                onClick={onNotify}
                className="p-2 rounded-lg text-sky-600 hover:bg-sky-50 transition-colors"
                title="Notify"
              >
                <span className="material-symbols-outlined text-xl">notifications_active</span>
              </button>
            )}
            <button 
              type="button" 
              onClick={onEdit}
              className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              title="Edit"
            >
              <span className="material-symbols-outlined text-xl">edit</span>
            </button>
            <button 
              type="button" 
              onClick={onDelete}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Delete"
            >
              <span className="material-symbols-outlined text-xl">delete</span>
            </button>
          </div>
        </div>
        
        {/* Contact Method */}
        {contact.contact && (
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            <span className="material-symbols-outlined text-base text-slate-400">chat</span>
            <span>{contact.contact}</span>
          </div>
        )}

        {/* Divider */}
        <div className="my-3 border-t border-slate-100" />

        {/* Emergency Delivery Info */}
        {releaseChannel ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-lg">mark_email_read</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Emergency delivery ready
              </span>
            </div>
            <div className="space-y-1.5 pl-7">
              <div className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-sm text-slate-400">email</span>
                <span className="text-slate-700">{releaseChannel.releaseEmail}</span>
              </div>
              {releaseChannel.phoneNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-sm text-slate-400">phone</span>
                  <span className="text-slate-600">{releaseChannel.phoneNumber}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-amber-500 text-lg mt-0.5">info</span>
            <div>
              <p className="text-sm font-medium text-amber-800">Emergency delivery not set up</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Add a release email to enable deadman switch delivery
              </p>
            </div>
          </div>
        )}
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
  color = "emerald",
}: {
  href: string;
  icon: string;
  title: string;
  subtitle: string;
  badge?: number | string;
  badgeVariant?: "success" | "partial";
  color?: "emerald" | "rose" | "violet" | "amber";
}) {
  const colorStyles = {
    emerald: {
      iconBg: "bg-emerald-50",
      iconText: "text-emerald-700",
      badge: "bg-emerald-600",
    },
    rose: {
      iconBg: "bg-rose-50",
      iconText: "text-rose-700",
      badge: "bg-rose-600",
    },
    violet: {
      iconBg: "bg-violet-50",
      iconText: "text-violet-700",
      badge: "bg-violet-600",
    },
    amber: {
      iconBg: "bg-amber-50",
      iconText: "text-amber-700",
      badge: "bg-amber-600",
    },
  };

  const getBadgeClasses = () => {
    if (badgeVariant === "success") {
      return "bg-emerald-600 text-white";
    }
    if (badgeVariant === "partial") {
      return "bg-amber-500 text-white";
    }
    return `${colorStyles[color].badge} text-white`;
  };

  const showBadge = badge !== undefined && (typeof badge === "string" || badge > 0);
  const styles = colorStyles[color];

  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-[1.75rem] border border-[#e4e6eb] bg-white p-5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.06)] transition-all active:scale-[0.98]"
    >
      <div className="flex items-center gap-5">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${styles.iconBg} ${styles.iconText}`}>
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
