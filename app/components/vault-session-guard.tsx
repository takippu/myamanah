"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasLocalVaultPayload } from "@/lib/vault-client";
import { getVaultSecrets } from "@/lib/vault-session";

export function VaultSessionGuard() {
  const router = useRouter();
  usePathname();
  const hasSecrets = Boolean(getVaultSecrets());
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    const previousBodyPaddingTop = document.body.style.paddingTop;
    const hasLocalVault = hasLocalVaultPayload();

    if (!hasSecrets && hasLocalVault) {
      router.replace("/access");
      return;
    }

    if (!hasSecrets) {
      return;
    }

    document.body.style.paddingTop = "2.5rem";

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue =
        "Refreshing or closing now will lock this vault. You will need your passphrase and recovery key to unlock it again.";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.body.style.paddingTop = previousBodyPaddingTop;
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasSecrets, router]);

  if (!hasSecrets) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[70] mx-auto flex min-h-10 w-full max-w-md items-center justify-center border-b border-amber-200 bg-amber-50 px-4 py-2 text-center">
        <p className="text-[11px] font-medium leading-snug text-amber-900">
          Refreshing will lock this vault. Keep your passphrase and recovery key ready.
          {" "}
          <button
            type="button"
            aria-label="Why this warning appears"
            onClick={() => setShowInfo(true)}
            className="text-[11px] font-semibold leading-none text-amber-900 underline underline-offset-2"
          >
            Why?
          </button>
        </p>
      </div>

      {showInfo ? (
        <div className="fixed inset-0 z-[80] flex items-end bg-slate-950/45 px-4 pb-6 pt-12 sm:items-center sm:justify-center">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.45)]">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <span className="material-symbols-outlined">info</span>
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-slate-900">Why this warning appears</h2>
                <p className="text-sm leading-relaxed text-slate-600">
                  For security, your passphrase and recovery key are kept in memory only while this tab stays open.
                </p>
                <p className="text-sm leading-relaxed text-slate-600">
                  If you refresh, close the tab, or close the browser, that temporary unlock session is cleared.
                </p>
                <p className="text-sm leading-relaxed text-slate-600">
                  Your encrypted vault data remains on this device, but you will need your
                  <span className="font-semibold text-slate-900"> passphrase</span> and
                  <span className="font-semibold text-slate-900"> recovery key</span> to unlock it again.
                </p>
                <p className="text-sm leading-relaxed text-slate-600">
                  You can reduce the risk of losing the only copy by signing in and enabling
                  <span className="font-semibold text-slate-900"> encrypted Google sync</span> from Settings.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
