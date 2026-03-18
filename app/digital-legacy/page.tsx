"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppBottomNav } from "../components/app-bottom-nav";
import { ConfirmActionModal } from "../components/confirm-action-modal";
import { CustomSelect } from "../components/custom-select";
import { FloatingField } from "../components/floating-field";
import { HeroSkeleton,  ListItemSkeleton } from "../components/skeletons";
import { RecordListDrawer } from "../components/record-list-drawer";
import { UnlockVaultDrawer } from "../components/unlock-vault-drawer";
import { VaultSessionGuard } from "../components/vault-session-guard";
import { emptyVaultData, type DigitalLegacyRecord, type VaultContact } from "@/lib/vault-data";
import { loadVaultData, saveVaultData } from "@/lib/vault-client";

const CATEGORY_OPTIONS = ["Social Media", "Email", "Cloud", "Banking App", "Other"];

function normalizeContacts(record: Pick<DigitalLegacyRecord, "contacts" | "recoveryContact">): VaultContact[] {
  if (record.contacts && record.contacts.length > 0) {
    return record.contacts.slice(0, 3).map((contact) => ({
      name: contact.name ?? "",
      method: contact.method ?? "",
    }));
  }

  if (record.recoveryContact) {
    return [{ name: record.recoveryContact, method: "" }];
  }

  return [];
}

export default function DigitalLegacyPage() {
  const router = useRouter();
  const [items, setItems] = useState<DigitalLegacyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const [showUnlockDrawer, setShowUnlockDrawer] = useState(false);
  const [showFormDrawer, setShowFormDrawer] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [showContacts, setShowContacts] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [showCredentialsInfo, setShowCredentialsInfo] = useState(false);
  const [form, setForm] = useState({
    category: CATEGORY_OPTIONS[0],
    platform: "",
    whereToFind: "",
    accountIdentifier: "",
    accountPassword: "",
    contacts: [] as VaultContact[],
    notes: "",
  });

  const refreshData = async () => {
    try {
      const vault = await loadVaultData();
      setItems(vault?.digitalLegacy ?? []);
      setShowUnlockDrawer(false);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "";
      if (errorMsg.includes("not configured") || errorMsg.includes("Vault access")) {
        setStatusMessage("Vault is locked. Please unlock to view your digital legacy.");
        setShowUnlockDrawer(true);
      } else {
        setStatusMessage("Could not load digital legacy.");
      }
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
  const labeledTotal = useMemo(() => String(totalRecords), [totalRecords]);

  const resetForm = () => {
    setEditingId(null);
    setFormErrors([]);
    setShowContacts(false);
    setShowCredentials(false);
    setForm({
      category: CATEGORY_OPTIONS[0],
      platform: "",
      whereToFind: "",
      accountIdentifier: "",
      accountPassword: "",
      contacts: [],
      notes: "",
    });
  };

  const onSave = async () => {
    const errors: string[] = [];
    if (!form.platform.trim()) errors.push("Platform is required");
    if (!form.whereToFind.trim()) errors.push("Where to find access details is required");
    
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setFormErrors([]);

    setIsSaving(true);
    const wasEditing = Boolean(editingId);
    const nextItem: DigitalLegacyRecord = {
      id: editingId ?? crypto.randomUUID(),
      category: form.category,
      platform: form.platform.trim(),
      whereToFind: form.whereToFind.trim(),
      accountIdentifier: form.accountIdentifier.trim() || undefined,
      accountPassword: form.accountPassword.trim() || undefined,
      contacts: form.contacts
        .map((contact) => ({
          name: contact.name.trim(),
          method: contact.method.trim(),
        }))
        .filter((contact) => contact.name || contact.method)
        .slice(0, 3),
      notes: form.notes.trim(),
    };
    const nextItems = editingId
      ? items.map((item) => (item.id === editingId ? nextItem : item))
      : [nextItem, ...items];
    setItems(nextItems);
    setShowFormDrawer(false);
    resetForm();

    try {
      const vault = (await loadVaultData()) ?? emptyVaultData();
      await saveVaultData({ ...vault, digitalLegacy: nextItems });
      setStatusTone("success");
      setStatusMessage(wasEditing ? "Digital record updated." : "Digital record saved.");
    } catch {
      setStatusTone("error");
      setStatusMessage("Saved locally. Cloud backup could not be updated right now.");
    } finally {
      setIsSaving(false);
    }
  };

  const onEdit = (item: DigitalLegacyRecord) => {
    const contacts = normalizeContacts(item);
    setEditingId(item.id);
    setShowContacts(contacts.length > 0);
    setShowCredentials(Boolean(item.accountIdentifier || item.accountPassword));
    setForm({
      category: item.category || CATEGORY_OPTIONS[0],
      platform: item.platform || "",
      whereToFind: item.whereToFind || "",
      accountIdentifier: item.accountIdentifier || "",
      accountPassword: item.accountPassword || "",
      contacts,
      notes: item.notes || "",
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

  const onDelete = async (id: string) => {
    const nextItems = items.filter((item) => item.id !== id);
    setItems(nextItems);
    if (editingId === id) {
      resetForm();
      setShowFormDrawer(false);
    }
    try {
      const vault = (await loadVaultData()) ?? emptyVaultData();
      await saveVaultData({ ...vault, digitalLegacy: nextItems });
      setStatusTone("success");
      setStatusMessage("Digital record deleted.");
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
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-widest text-slate-300/60">Total Entries</p>
                  <h2 className="text-[41px] font-light leading-[1.02] tracking-[-0.02em] text-white">
                    <span className="font-bold">{labeledTotal}</span>{" "}
                    <span className="text-2xl font-semibold text-sky-200">records</span>
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
              <span className="material-symbols-outlined text-[20px]">{items.length > 0 ? "public" : "add"}</span>
            </div>
            <p className="mt-3 text-lg font-bold uppercase tracking-[0.08em] text-slate-500">Update Digital Records</p>
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
          {!isLoading && items.length === 0 ? (
            <div className="glass-card rounded-3xl border border-[#e7eaee] bg-sky-50/70 p-6 text-center">
              <p className="text-sm font-semibold text-slate-700">No records yet</p>
              <p className="mt-1 text-xs text-slate-500">Use the update card above to add an online account, platform, or digital service.</p>
            </div>
          ) : null}

          {items.map((item) => (
            <article
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/digital-legacy/${item.id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(`/digital-legacy/${item.id}`);
                }
              }}
              className="rounded-[2rem] bg-slate-50 p-5 transition-all duration-200 hover:bg-slate-100 active:scale-[0.98]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{item.category}</p>
                  <h3 className="truncate text-lg font-bold text-slate-900">{item.platform}</h3>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit(item);
                  }}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 transition-colors hover:bg-sky-200"
                  aria-label={`Edit ${item.platform}`}
                >
                  <span className="material-symbols-outlined text-[20px]">edit</span>
                </button>
              </div>
              
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Access</p>
                  <p className="text-sm font-bold text-sky-600">
                    {item.accountIdentifier || item.accountPassword ? "Has credentials" : "Reference only"}
                  </p>
                </div>
                <span className="material-symbols-outlined text-slate-300">chevron_right</span>
              </div>
            </article>
          ))}
        </main>

        <RecordListDrawer
          open={showFormDrawer}
          title={editingId ? "Edit Digital Record" : "Add Digital Record"}
          onClose={() => {
            setShowFormDrawer(false);
            resetForm();
          }}
          footer={
            <button
              className="w-full rounded-[1.3rem] bg-slate-900 py-3 text-sm font-semibold tracking-wide text-white shadow-xl shadow-slate-900/20 transition-all active:scale-[0.98]"
              type="button"
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : editingId ? "Update Digital Record" : "Save Digital Record"}
            </button>
          }
        >
          <div className="space-y-4 pt-2">
            {formErrors.length > 0 ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3">
                <p className="text-xs font-semibold text-rose-700">Please fill in all required fields:</p>
                <ul className="mt-1 list-disc pl-4 text-xs text-rose-600">
                  {formErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="px-1">
              <p className="text-xs leading-5 text-slate-500">
                Record the account, where access details live, and add login or contact help only if you need it.
              </p>
            </div>

            <section className="rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.28)]">
              <div className="space-y-3">
                <FloatingField label="Category" labelClassName="text-sky-700">
                  <CustomSelect
                    value={form.category}
                    options={CATEGORY_OPTIONS.map((option) => ({ label: option, value: option }))}
                    onChange={(value) => setForm((p) => ({ ...p, category: value }))}
                    accentClassName="text-sky-700"
                  />
                </FloatingField>
                <FloatingField label="Platform *" labelClassName="text-sky-700">
                  <input
                    className={`w-full rounded-2xl border bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-sky-500 ${
                      formErrors.some(e => e.includes("Platform")) && !form.platform.trim() ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                    }`}
                    placeholder="Platform or service (e.g. Instagram, Gmail)"
                    value={form.platform}
                    onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))}
                  />
                </FloatingField>
                <FloatingField label="Access Where *" labelClassName="text-sky-700">
                  <input
                    className={`w-full rounded-2xl border bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-sky-500 ${
                      formErrors.some(e => e.includes("Where to find")) && !form.whereToFind.trim() ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                    }`}
                    placeholder="Where are login, recovery, or access details kept?"
                    value={form.whereToFind}
                    onChange={(e) => setForm((p) => ({ ...p, whereToFind: e.target.value }))}
                  />
                </FloatingField>
              </div>
            </section>

            <section className="rounded-[1.7rem] border border-slate-200 bg-[#fbfcfd] p-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.24)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Login Help</p>
                  <p className="mt-1 text-xs text-slate-500">Optional</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCredentialsInfo(true)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-colors hover:border-sky-200 hover:text-sky-600"
                    aria-label="About login credentials"
                  >
                    <span className="material-symbols-outlined text-[16px]">info</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCredentials((current) => !current)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-sky-700"
                    aria-label={showCredentials ? "Hide optional login details" : "Show optional login details"}
                  >
                    {showCredentials ? "Hide" : "Add"}
                  </button>
                </div>
              </div>
              {showCredentials ? (
                <div className="space-y-3">
                  <FloatingField label="Login Email / Username" labelClassName="text-sky-700" backgroundClassName="bg-[#fbfcfd]">
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-sky-500"
                      placeholder="Email or username"
                      value={form.accountIdentifier}
                      onChange={(e) => setForm((p) => ({ ...p, accountIdentifier: e.target.value }))}
                    />
                  </FloatingField>
                  <FloatingField label="Account Password" labelClassName="text-sky-700" backgroundClassName="bg-[#fbfcfd]">
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-sky-500"
                      placeholder="Account password"
                      value={form.accountPassword}
                      onChange={(e) => setForm((p) => ({ ...p, accountPassword: e.target.value }))}
                    />
                  </FloatingField>
                </div>
              ) : null}
            </section>

            <section className="rounded-[1.7rem] border border-slate-200 bg-[#fbfcfd] p-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.24)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Contacts</p>
                  <p className="mt-1 text-xs text-slate-500">Optional</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowContacts((current) => !current)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-sky-700"
                    aria-label={showContacts ? "Hide optional contacts" : "Show optional contacts"}
                  >
                    {showContacts ? "Hide" : "Show"}
                  </button>
                  {showContacts && form.contacts.length < 3 ? (
                    <button type="button" onClick={addContact} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-sky-700">
                      Add
                    </button>
                  ) : null}
                </div>
              </div>
              {showContacts ? (
                <div className="space-y-2.5">
                  {form.contacts.length > 0
                    ? form.contacts.map((contact, contactIndex) => (
                        <div key={`digital-form-contact-${contactIndex}`} className="rounded-[1.25rem] border border-slate-200 bg-white p-3">
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
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition-colors focus:border-sky-500"
                              placeholder="Who to contact?"
                              value={contact.name}
                              onChange={(e) => updateContact(contactIndex, "name", e.target.value)}
                            />
                            <input
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition-colors focus:border-sky-500"
                              placeholder="How to contact them?"
                              value={contact.method}
                              onChange={(e) => updateContact(contactIndex, "method", e.target.value)}
                            />
                          </div>
                        </div>
                      ))
                    : null}
                </div>
              ) : null}
            </section>

            <FloatingField label="Notes" labelClassName="text-sky-700">
              <textarea
                className="h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-5 text-sm outline-none transition-colors focus:border-sky-500"
                placeholder="Notes, recovery steps, or account instructions"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </FloatingField>
          </div>
        </RecordListDrawer>

        <UnlockVaultDrawer
          open={showUnlockDrawer}
          onClose={() => setShowUnlockDrawer(false)}
          onUnlock={() => {
            setStatusMessage("Vault unlocked successfully!");
            setStatusTone("success");
            void refreshData();
          }}
        />

        {/* Credentials Info Dialog */}
        {showCredentialsInfo && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm" onClick={() => setShowCredentialsInfo(false)}>
            <div className="max-w-sm rounded-[2rem] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <span className="material-symbols-outlined">info</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">About Login Credentials</h3>
              <p className="mb-4 text-sm leading-relaxed text-slate-600">
                For maximum security, we recommend <strong>not</strong> storing account credentials directly in these fields.
              </p>
              <p className="mb-4 text-sm leading-relaxed text-slate-600">
                Instead, use the <strong>&quot;Where to Find&quot; field</strong> above to tell your trusted contact where you&apos;ve stored your credentials — such as a physical safe, password manager, or secure note.
              </p>
              <p className="mb-6 text-xs leading-relaxed text-slate-500">
                This approach adds an extra layer of security while still ensuring your loved ones can access what matters.
              </p>
              <button
                type="button"
                onClick={() => setShowCredentialsInfo(false)}
                className="w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-semibold text-white transition-all active:scale-[0.98]"
              >
                Got it
              </button>
            </div>
          </div>
        )}

        <ConfirmActionModal
          open={pendingDeleteId !== null}
          title="Delete this digital record?"
          description="This digital legacy record will be removed from the vault on this device."
          confirmLabel="Delete Digital Record"
          onCancel={() => setPendingDeleteId(null)}
          onConfirm={() => {
            if (!pendingDeleteId) {
              return;
            }
            const id = pendingDeleteId;
            setPendingDeleteId(null);
            void onDelete(id);
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
