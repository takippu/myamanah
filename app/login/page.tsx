"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const continueWithGoogle = async () => {
    setGoogleLoading(true);
    setMessage(null);
    try {
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
        <h1 className="text-2xl font-bold">Enable Cloud Sync</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your vault works offline without an account. Use your Google account only if you want encrypted cloud backup.
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
          Back to Local Vault
        </button>

        {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
      </div>
    </div>
  );
}
