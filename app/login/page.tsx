"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { hasLocalVaultPayload } from "@/lib/vault-client";

export default function LoginPage() {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // Check if user already has a local vault
  useEffect(() => {
    const checkLocalVault = () => {
      const hasLocal = hasLocalVaultPayload();
      if (hasLocal) {
        // User has local vault, they should unlock it instead of signing in
        router.replace("/access");
      }
      setIsChecking(false);
    };
    checkLocalVault();
  }, [router]);

  const continueWithGoogle = async () => {
    setGoogleLoading(true);
    setMessage(null);
    try {
      // Sign in with Google, then go to access page which will check 
      // if they have a cloud backup to restore or need to create new vault
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/access",
      });
    } catch {
      setMessage("Could not continue with Google. Please try again.");
      setGoogleLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background-light px-4 py-8 text-slate-900">
        <div className="mx-auto flex h-64 w-full max-w-md items-center justify-center">
          <div className="flex items-center gap-3 text-slate-500">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            <span>Checking your vault...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light px-4 py-8 text-slate-900">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">Sign In to Restore Backup</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign in with the Google account you used to enable cloud backup. After signing in, you can restore your encrypted vault.
        </p>

        <button
          className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-slate-900 disabled:opacity-60"
          type="button"
          onClick={continueWithGoogle}
          disabled={googleLoading}
        >
          {googleLoading ? "Redirecting..." : "Continue with Google"}
        </button>

        <button
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-bold text-slate-800"
          type="button"
          onClick={() => router.push("/access")}
        >
          Create New Vault Instead
        </button>

        {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
      </div>
    </div>
  );
}
