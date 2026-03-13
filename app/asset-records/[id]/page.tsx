"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppBottomNav } from "../../components/app-bottom-nav";
import { HeroSkeleton } from "../../components/skeletons";
import { VaultSessionGuard } from "../../components/vault-session-guard";
import { type AssetRecord, type VaultContact } from "@/lib/vault-data";
import { loadVaultData } from "@/lib/vault-client";

function normalizeContacts(record: Pick<AssetRecord, "contacts" | "contactPerson" | "contactMethod">): VaultContact[] {
  if (record.contacts && record.contacts.length > 0) {
    return record.contacts.slice(0, 3).map((contact) => ({
      name: contact.name ?? "",
      method: contact.method ?? "",
    }));
  }

  if (record.contactPerson || record.contactMethod) {
    return [{ name: record.contactPerson ?? "", method: record.contactMethod ?? "" }];
  }

  return [];
}

export default function AssetRecordDetailPage() {
  const params = useParams<{ id: string }>();
  const [record, setRecord] = useState<AssetRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRecord = async () => {
      try {
        const vault = await loadVaultData();
        const nextRecord = vault?.assets.find((item) => item.id === params.id) ?? null;
        setRecord(nextRecord);
      } finally {
        setIsLoading(false);
      }
    };

    void loadRecord();
  }, [params.id]);

  const contacts = record ? normalizeContacts(record) : [];

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans text-slate-800 antialiased">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-x-hidden bg-[#F2F2F7]">
        <VaultSessionGuard />
        <header className="sticky top-0 z-30 flex items-center justify-between bg-[#F2F2F7]/80 px-6 py-5 backdrop-blur-lg">
          <Link
            href="/asset-records"
            aria-label="Back to asset records"
            className="glass-card flex h-12 w-12 items-center justify-center rounded-2xl transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-slate-600">arrow_back</span>
          </Link>
          <h1 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-600">Asset Detail</h1>
          <div className="h-12 w-12" />
        </header>

        <main className="flex-1 space-y-4 px-6 pb-36 pt-4">
          {isLoading ? (
            <HeroSkeleton />
          ) : null}

          {!isLoading && !record ? (
            <div className="glass-card rounded-3xl border border-[#e7eaee] bg-white/85 p-6 text-center">
              <p className="text-sm font-semibold text-slate-700">Asset not found</p>
              <p className="mt-1 text-xs text-slate-500">This record is no longer available on this device.</p>
            </div>
          ) : null}

          {record ? (
            <section className="glass-card rounded-[2rem] border border-[#e7eaee] bg-white/90 p-6 shadow-[0_16px_30px_-18px_rgba(15,23,42,0.25)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{record.assetType}</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">{record.institution}</h2>
                </div>
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right text-emerald-700">
                  <p className="text-[10px] font-bold uppercase tracking-widest">Value</p>
                  <p className="mt-1 text-sm font-semibold">{record.value || "Not set"}</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Documents Where</p>
                  <p className="mt-2 text-sm text-slate-800">{record.whereToFind}</p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Contacts</p>
                  {contacts.length > 0 ? (
                    <div className="mt-3 space-y-3">
                      {contacts.map((contact, index) => (
                        <div key={`${contact.name}-${index}`} className="grid grid-cols-2 gap-3 text-sm text-slate-800">
                          <p>{contact.name || "Not set"}</p>
                          <p>{contact.method || "Not set"}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">No contact details saved.</p>
                  )}
                </div>

                {record.notes ? (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Notes</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{record.notes}</p>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </main>

        <AppBottomNav active="assets" mode="dashboard" />
      </div>
    </div>
  );
}
