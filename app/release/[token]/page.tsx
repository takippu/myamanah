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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download the encrypted backup.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] px-4 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-xl rounded-[2rem] border border-[#e4e6eb] bg-white p-6 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)]">
        <div className="mb-6 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">Secure Retrieval</p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-900">Encrypted backup release</h1>
          <p className="text-sm leading-relaxed text-slate-600">
            This link gives you access to an <strong>encrypted</strong> MyAmanah backup package only.
            You cannot open it without the owner&apos;s recovery key shared separately in advance.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {!status && !error ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            Loading secure retrieval details...
          </div>
        ) : null}

        {status ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm leading-relaxed text-amber-950">
              <p className="font-semibold">Important</p>
              <p className="mt-1">
                Accept the instructions, then download the encrypted backup. The owner must provide the recovery key separately.
                MyAmanah will never send that key automatically.
              </p>
            </div>

            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">Expires:</span> {new Date(status.expiresAt).toLocaleString()}</p>
              <p><span className="font-semibold text-slate-900">Viewed:</span> {status.firstViewedAt ? new Date(status.firstViewedAt).toLocaleString() : "Recorded now"}</p>
              <p><span className="font-semibold text-slate-900">Accepted:</span> {status.acceptedAt ? new Date(status.acceptedAt).toLocaleString() : "Not yet"}</p>
              <p><span className="font-semibold text-slate-900">Downloaded:</span> {status.downloadedAt ? new Date(status.downloadedAt).toLocaleString() : "Not yet"}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void onAccept()}
                disabled={busy !== null}
                className="flex-1 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy === "accept" ? "Accepting..." : status.acceptedAt ? "Accepted" : "Accept Instructions"}
              </button>
              <button
                type="button"
                onClick={() => void onDownload()}
                disabled={busy !== null}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 disabled:opacity-60"
              >
                {busy === "download" ? "Downloading..." : "Download Encrypted Backup"}
              </button>
            </div>

            <p className="text-xs leading-relaxed text-slate-500">
              This download is a JSON file containing encrypted vault data. It is expected to be unreadable until decrypted with the owner&apos;s recovery key and passphrase.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
