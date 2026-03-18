"use client";

import Link from "next/link";
import { useState } from "react";

const features = [
  {
    icon: "shield_lock",
    title: "Privacy-First Vault",
    description: "Zero-knowledge architecture. Your data is encrypted with AES-256-GCM before leaving your device. Only you hold the keys.",
    color: "emerald",
  },
  {
    icon: "account_balance_wallet",
    title: "Asset Mapping",
    description: "Document what you own, where to find it, and who to contact. Banks, investments, properties, and valuables.",
    color: "emerald",
  },
  {
    icon: "receipt_long",
    title: "Debt Records",
    description: "Record your liabilities clearly for settlement. Credit cards, loans, mortgages, and outstanding obligations.",
    color: "orange",
  },
  {
    icon: "fingerprint",
    title: "Digital Legacy",
    description: "Preserve access to your digital life. Social media, emails, cloud storage, and online accounts.",
    color: "sky",
  },
  {
    icon: "auto_stories",
    title: "Final Wishes",
    description: "Record your religious wishes, family instructions, and executor guidance for your loved ones.",
    color: "amber",
  },
  {
    icon: "group",
    title: "Trusted Contacts",
    description: "Designate who receives your legacy. They'll only gain access if something happens to you.",
    color: "violet",
  },
  {
    icon: "timer",
    title: "Deadman Switch",
    description: "30-day check-in system. If you don't respond, your vault automatically releases to trusted contacts after a grace period.",
    color: "rose",
  },
];

export default function LandingPage() {
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans text-slate-800 antialiased">
      <div className="relative mx-auto min-h-screen w-full max-w-md overflow-x-hidden bg-[#F2F2F7]">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between bg-[#F2F2F7]/70 px-6 py-5 backdrop-blur-lg">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
            </div>
            <span className="text-lg font-bold text-slate-800">MyAmanah</span>
          </div>
          <Link
            href="/access"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all active:scale-95"
          >
            Enter Vault
          </Link>
        </header>

        {/* Hero Section */}
        <section className="px-6 pb-8 pt-4">
          <div className="relative overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-emerald-800 to-emerald-900 p-6 shadow-[0_16px_30px_-16px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-800/40 to-transparent" />
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
            <div className="relative">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200/70">Digital Legacy Organizer</p>
              <h1 className="mb-4 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-white">
                Secure what matters for those who matter
              </h1>
              <p className="mb-6 text-sm leading-relaxed text-emerald-100/80">
                MyAmanah helps you organize your assets, digital accounts, and final wishes — encrypted, private, and accessible only to your trusted contacts when the time comes.
              </p>
              <Link
                href="/access"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-emerald-800 transition-all hover:bg-emerald-50 active:scale-95"
              >
                <span>Get Started</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Core Features */}
        <section className="px-6 pb-6">
          <h2 className="mb-4 text-lg font-bold text-slate-800">Core Features</h2>
          <div className="space-y-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-[1.5rem] bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.08)]"
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-${feature.color}-50 text-${feature.color}-600`}>
                    <span className="material-symbols-outlined text-[20px]">{feature.icon}</span>
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-slate-800">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-500">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Privacy Banner */}
        <section className="mx-6 mb-6 rounded-[1.5rem] bg-slate-800 p-5">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-emerald-400">verified_user</span>
            <div>
              <h3 className="mb-1 font-semibold text-white">Your Data Stays Yours</h3>
              <p className="text-sm leading-relaxed text-slate-300">
                End-to-end encryption means we can't read your data. Ever. Only your trusted contacts can access it, and only when you don't check in.
              </p>
              <button
                onClick={() => setShowPrivacyInfo(true)}
                className="mt-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
              >
                Learn more about our security →
              </button>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="px-6 pb-6">
          <h2 className="mb-4 text-lg font-bold text-slate-800">How It Works</h2>
          <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.08)]">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">1</div>
                <div>
                  <h4 className="font-semibold text-slate-800">Create Your Vault</h4>
                  <p className="text-sm text-slate-500">Set up your encrypted vault locally. No account required to start.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">2</div>
                <div>
                  <h4 className="font-semibold text-slate-800">Add Your Legacy</h4>
                  <p className="text-sm text-slate-500">Document assets, digital accounts, debts, and your wishes.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">3</div>
                <div>
                  <h4 className="font-semibold text-slate-800">Set Trusted Contacts</h4>
                  <p className="text-sm text-slate-500">Choose who receives access and configure your deadman switch.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">4</div>
                <div>
                  <h4 className="font-semibold text-slate-800">Peace of Mind</h4>
                  <p className="text-sm text-slate-500">Check in periodically. Your vault releases only if you don't respond.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 pb-24 pt-4">
          <div className="rounded-[1.5rem] bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-center">
            <h2 className="mb-2 text-xl font-bold text-white">Ready to secure your legacy?</h2>
            <p className="mb-4 text-sm text-slate-300">Your data stays on your device unless you enable cloud backup.</p>
            <Link
              href="/access"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-8 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-400 active:scale-95"
            >
              <span>Enter Your Vault</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </section>

        {/* Privacy Info Modal */}
        {showPrivacyInfo && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
            onClick={() => setShowPrivacyInfo(false)}
          >
            <div 
              className="max-w-sm rounded-[2rem] bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <span className="material-symbols-outlined">security</span>
              </div>
              <h3 className="mb-2 text-lg font-bold text-slate-900">Zero-Knowledge Security</h3>
              <div className="space-y-3 text-sm text-slate-600">
                <p>
                  <strong>AES-256-GCM Encryption:</strong> Your data is encrypted on your device before being stored or transmitted.
                </p>
                <p>
                  <strong>Argon2id Key Derivation:</strong> Your vault password is hashed using the industry-standard Argon2id algorithm.
                </p>
                <p>
                  <strong>No Backdoors:</strong> We cannot access your data. If you lose your recovery key and password, your data is unrecoverable — by design.
                </p>
                <p>
                  <strong>Local-First:</strong> Your vault works entirely offline. Cloud backup is optional and encrypted.
                </p>
              </div>
              <button
                onClick={() => setShowPrivacyInfo(false)}
                className="mt-6 w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-bold text-white transition-all active:scale-[0.98]"
              >
                Got it
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-400">verified_user</span>
              <span className="text-sm font-semibold text-slate-600">MyAmanah</span>
            </div>
            <p className="text-xs text-slate-400">Privacy-first digital legacy</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
