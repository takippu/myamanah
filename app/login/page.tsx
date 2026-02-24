"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const showMockLogin = process.env.NODE_ENV !== "production";
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldownSec, setCooldownSec] = useState(0);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const timer = setInterval(() => {
      setCooldownSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSec]);

  const sendOtpRequest = async () => {
    const res = await fetch("/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: string; retryAfterSec?: number } | null;
      if (res.status === 429 && err?.retryAfterSec) {
        setCooldownSec(err.retryAfterSec);
        throw new Error(`${err.error ?? "Rate limited"} Retry in ${err.retryAfterSec}s.`);
      }
      throw new Error(err?.error ?? "Failed to request OTP");
    }
    const payload = (await res.json().catch(() => null)) as { cooldownSec?: number } | null;
    if (payload?.cooldownSec) setCooldownSec(payload.cooldownSec);
  };

  const requestOtp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await sendOtpRequest();
      setStep("otp");
      setMessage("OTP sent. Check your email.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? "Invalid OTP");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  const continueAsMockUser = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/mock-login", { method: "POST" });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? "Could not create mock session");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create mock session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light px-4 py-8 text-slate-900">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">Sign In</h1>
        <p className="mt-1 text-sm text-slate-500">Use email OTP powered by Resend.</p>

        {step === "email" ? (
          <form className="mt-4 space-y-3" onSubmit={requestOtp}>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-primary"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-slate-900 disabled:opacity-60"
              type="submit"
              disabled={loading || cooldownSec > 0}
            >
              {loading ? "Sending..." : cooldownSec > 0 ? `Wait ${cooldownSec}s` : "Send OTP"}
            </button>
          </form>
        ) : (
          <form className="mt-4 space-y-3" onSubmit={verifyOtp}>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-primary"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-primary"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit OTP"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
            />
            <button
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-slate-900 disabled:opacity-60"
              type="submit"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
            <button
              className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60"
              type="button"
              disabled={loading || cooldownSec > 0}
              onClick={async () => {
                setLoading(true);
                setMessage(null);
                try {
                  await sendOtpRequest();
                  setMessage("OTP resent. Check your email.");
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : "Could not resend OTP.");
                } finally {
                  setLoading(false);
                }
              }}
            >
              {cooldownSec > 0 ? `Resend in ${cooldownSec}s` : "Resend OTP"}
            </button>
          </form>
        )}

        {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}

        {showMockLogin ? (
          <button
            className="mt-3 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60"
            type="button"
            onClick={continueAsMockUser}
            disabled={loading}
          >
            Continue as Mock User
          </button>
        ) : null}
      </div>
    </div>
  );
}
