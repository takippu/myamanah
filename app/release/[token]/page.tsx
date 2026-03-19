"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  acceptReleasePackage,
  downloadReleasePackage,
  getReleasePackageStatus,
} from "@/lib/vault-client";

function downloadJsonFile(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ReleaseTokenPage() {
  const params = useParams<{ token: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const [status, setStatus] = useState<Awaited<ReturnType<typeof getReleasePackageStatus>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"accept" | "download" | null>(null);
  const [showDecryptInstructions, setShowDecryptInstructions] = useState(false);

  useEffect(() => {
    if (!token) return;
    void getReleasePackageStatus(token)
      .then(setStatus)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to open secure retrieval link."));
  }, [token]);

  const onAccept = async () => {
    setBusy("accept");
    setError(null);
    try {
      await acceptReleasePackage(token);
      const next = await getReleasePackageStatus(token);
      setStatus(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept the release instructions.");
    } finally {
      setBusy(null);
    }
  };

  const onDownload = async () => {
    setBusy("download");
    setError(null);
    try {
      const payload = await downloadReleasePackage(token);
      downloadJsonFile("myamanah-encrypted-backup.json", payload);
      const next = await getReleasePackageStatus(token);
      setStatus(next);
      setShowDecryptInstructions(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download the encrypted backup.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] px-4 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-xl rounded-[2rem] border border-[#e4e6eb] bg-white p-6 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)]">
        {/* Header with Shield Icon */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="32" height="32">
              <path d="M24 4L6 12v11.2c0 9.2 7.7 17.8 18 20 10.3-2.2 18-10.8 18-20V12L24 4z" fill="#ffffff"/>
              <path d="M20 32.4l-7.4-7.4 1.9-1.9 5.5 5.5 11.5-11.5 1.9 1.9L20 32.4z" fill="#059669"/>
            </svg>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">Secure Retrieval</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-900">Encrypted Backup Release</h1>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {!status && !error ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10">
            <span className="material-symbols-outlined animate-spin text-3xl text-emerald-600">progress_activity</span>
            <p className="mt-3 text-sm text-slate-500">Loading secure retrieval details...</p>
          </div>
        ) : null}

        {status ? (
          <div className="space-y-5">
            {/* Important Notice */}
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm leading-relaxed text-amber-950">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-amber-600">info</span>
                <div>
                  <p className="font-semibold">Important</p>
                  <p className="mt-1">
                    This link gives you access to an <strong>encrypted</strong> backup only. 
                    You need the owner&apos;s recovery key to decrypt it. MyAmanah never sends the recovery key automatically.
                  </p>
                </div>
              </div>
            </div>

            {/* Status Grid */}
            <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Expires:</span>
                <span className="font-medium text-slate-900">{new Date(status.expiresAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Viewed:</span>
                <span className="font-medium text-slate-900">{status.firstViewedAt ? new Date(status.firstViewedAt).toLocaleString() : "Recorded now"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Accepted:</span>
                <span className={`font-medium ${status.acceptedAt ? "text-emerald-600" : "text-slate-400"}`}>
                  {status.acceptedAt ? new Date(status.acceptedAt).toLocaleString() : "Not yet"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Downloaded:</span>
                <span className={`font-medium ${status.downloadedAt ? "text-emerald-600" : "text-slate-400"}`}>
                  {status.downloadedAt ? new Date(status.downloadedAt).toLocaleString() : "Not yet"}
                </span>
              </div>
            </div>

            {/* Step 1: Accept Instructions */}
            <div className={`rounded-2xl border p-4 ${status.acceptedAt ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white"}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${status.acceptedAt ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                  <span className="material-symbols-outlined">{status.acceptedAt ? "check_circle" : "1"}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">Accept Instructions</h3>
                  <p className="text-xs text-slate-500">Confirm you understand this is an encrypted backup</p>
                </div>
                {!status.acceptedAt && (
                  <button
                    type="button"
                    onClick={() => void onAccept()}
                    disabled={busy !== null}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {busy === "accept" ? "Accepting..." : "Accept"}
                  </button>
                )}
              </div>
            </div>

            {/* Step 2: Download Backup */}
            <div className={`rounded-2xl border p-4 ${!status.acceptedAt ? "border-slate-100 bg-slate-50/50 opacity-60" : status.downloadedAt ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white"}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${status.downloadedAt ? "bg-emerald-100 text-emerald-600" : !status.acceptedAt ? "bg-slate-100 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
                  <span className="material-symbols-outlined">{status.downloadedAt ? "check_circle" : "2"}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">Download Encrypted Backup</h3>
                  <p className="text-xs text-slate-500">Get the JSON file containing encrypted vault data</p>
                </div>
                <button
                  type="button"
                  onClick={() => void onDownload()}
                  disabled={busy !== null || !status.acceptedAt}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy === "download" ? "Downloading..." : status.downloadedAt ? "Download Again" : "Download"}
                </button>
              </div>
            </div>

            {/* Downloaded - Show Decrypt Instructions */}
            {(status.downloadedAt || showDecryptInstructions) && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-emerald-600">key</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-emerald-900">Next Step: Decrypt Your Data</h3>
                    <p className="mt-1 text-sm text-emerald-800">
                      You now have the encrypted file. To access the contents, you need the owner&apos;s recovery key.
                    </p>
                    
                    <div className="mt-4 space-y-3">
                      <a
                        href="/decrypt"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                      >
                        <span className="material-symbols-outlined">lock_open</span>
                        Open Decrypt Tool
                      </a>
                      
                      <div className="rounded-xl border border-emerald-200 bg-white p-3 text-xs text-slate-600">
                        <p className="font-medium text-slate-800">What you&apos;ll need:</p>
                        <ol className="mt-2 list-decimal pl-4 space-y-1">
                          <li>The encrypted backup file you just downloaded</li>
                          <li>The owner&apos;s recovery key (shared separately)</li>
                          <li>The owner&apos;s passphrase (if they chose to share it)</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* What is this file? */}
            <details className="rounded-2xl border border-slate-200 bg-slate-50">
              <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700">
                <span className="material-symbols-outlined text-slate-400">help</span>
                What is this encrypted file?
              </summary>
              <div className="border-t border-slate-200 px-4 py-3 text-xs leading-relaxed text-slate-600">
                <p>
                  The downloaded file contains encrypted vault data using AES-256-GCM encryption. 
                  It cannot be read without the recovery key that the owner must share with you separately.
                </p>
                <p className="mt-2">
                  This ensures that even if someone intercepts this email, they cannot access 
                  the sensitive information without both the file AND the recovery key.
                </p>
              </div>
            </details>
          </div>
        ) : null}
      </div>
    </div>
  );
}
