"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { hasLocalVaultPayload } from "@/lib/vault-client";

export default function LoginPage() {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [hasLocalVault, setHasLocalVault] = useState(false);

  // Check if user already has a local vault (for display purposes only)
  useEffect(() => {
    setHasLocalVault(hasLocalVaultPayload());
  }, []);

  const continueWithGoogle = async () => {
    setGoogleLoading(true);
    setMessage(null);
    try {
      // Sign in with Google, then go to settings page
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/settings",
      });
    } catch {
      setMessage("Could not continue with Google. Please try again.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light px-4 py-8 text-slate-900">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">Sign In</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign in with Google to enable encrypted cloud backup or restore from a previous backup.
        </p>

        {hasLocalVault && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600">info</span>
              <div>
                <p className="text-sm font-medium text-amber-900">You have a local vault</p>
                <p className="mt-1 text-xs text-amber-800">
                  You already have a vault on this device. You can unlock it instead, or sign in with Google to enable cloud backup for it.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/access")}
                  className="mt-2 text-xs font-semibold text-amber-700 underline hover:text-amber-900"
                >
                  Unlock my existing vault →
                </button>
              </div>
            </div>
          </div>
        )}

        <button
          className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-slate-900 disabled:opacity-60"
          type="button"
          onClick={continueWithGoogle}
          disabled={googleLoading}
        >
          {googleLoading ? "Redirecting..." : "Continue with Google"}
        </button>

        {!hasLocalVault && (
          <button
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-bold text-slate-800"
            type="button"
            onClick={() => router.push("/access")}
          >
            Create New Vault Instead
          </button>
        )}

        {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
      </div>
    </div>
  );
}
