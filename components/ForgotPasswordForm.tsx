"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import BackgroundShapes from "@/components/BackgroundShapes";
import Logo from "@/components/Logo";
import { useToast } from "@/components/ToastProvider";

// Two-step password recovery: (1) request a 6-digit code by email, (2)
// enter that code plus a new password. Uses Supabase's OTP-style recovery
// flow (`resetPasswordForEmail` + `verifyOtp` with type "recovery") rather
// than the default magic-link flow — this ONLY sends a 6-digit code (and
// not a clickable link) if the "Reset Password" email template in the
// Supabase dashboard has been edited to include `{{ .Token }}`. See the
// README for that one-time dashboard step.
export default function ForgotPasswordForm() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStep("code");
    setInfo(`Sent a 6-digit code to ${email} — check your inbox (and spam).`);
  }

  async function handleResend() {
    if (!email || resending) return;
    setResending(true);
    setError(null);
    setInfo(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    setResending(false);
    if (error) {
      setError(error.message);
    } else {
      setInfo("New code sent — check your inbox (and spam).");
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (code.trim().length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "recovery",
    });

    if (verifyError) {
      setLoading(false);
      setError(verifyError.message);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    showToast("Password updated!");
    router.push("/feed");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black px-4 py-12">
      <BackgroundShapes />

      <div className="relative z-10 mb-6 flex flex-col items-center">
        <Logo iconOnly size="text-6xl sm:text-7xl" />
        <p className="mt-4 max-w-xs text-center text-sm text-gray-400">
          {step === "email"
            ? "Reset your password."
            : "Enter the code and a new password."}
        </p>
      </div>

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900 p-8 shadow-[0_0_40px_rgba(255,255,255,0.05)]">
        <Link
          href="/login"
          className="mb-6 inline-block text-xs font-medium text-gray-500 hover:text-gray-300"
        >
          &larr; Back to log in
        </Link>

        <div className="mb-6 flex justify-center">
          <Logo size="text-2xl" />
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
        {info && (
          <p className="mb-4 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-gray-200">
            {info}
          </p>
        )}

        {step === "email" ? (
          <form onSubmit={sendCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300">
                6-digit code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-center text-lg tracking-[0.5em] text-white placeholder:tracking-normal placeholder:text-gray-600 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                placeholder="000000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">
                New password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">
                Confirm new password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                placeholder="Repeat password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Resetting…" : "Reset password"}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="w-full text-center text-xs font-medium text-gray-500 hover:text-gray-300 disabled:opacity-50"
            >
              {resending ? "Sending…" : "Didn't get it? Resend code"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-gray-600">
          By continuing you agree this is a CAS project demo for Halifax
          newcomers &amp; students.
        </p>
      </div>
    </main>
  );
}
