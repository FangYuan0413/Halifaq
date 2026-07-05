"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BackgroundShapes from "@/components/BackgroundShapes";
import { createClient } from "@/utils/supabase/client";

export default function LandingPage() {
  const [confirmStatus, setConfirmStatus] = useState<
    "success" | "error" | null
  >(null);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get("error_code");
    const errorDescription = params.get("error_description");

    if (errorCode) {
      setConfirmStatus("error");
      setConfirmMessage(
        errorCode === "otp_expired"
          ? "That confirmation link expired. Sign up again to get a fresh one."
          : (errorDescription?.replace(/\+/g, " ") ??
              "That link is no longer valid.")
      );
      // Clean the error params out of the address bar.
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    // A successful email confirmation redirect includes auth tokens in the
    // URL hash (#access_token=...&type=signup...). The Supabase client
    // parses that automatically on load, so we just check for a session.
    if (window.location.hash.includes("access_token")) {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setConfirmStatus("success");
          window.history.replaceState({}, "", window.location.pathname);
        }
      });
    }
  }, []);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4">
      <BackgroundShapes />

      <div className="relative z-10 flex flex-col items-center text-center">
        {confirmStatus === "success" && (
          <div className="mb-6 max-w-sm rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white">
            Account confirmed — you&apos;re all set. Log in to continue.
          </div>
        )}
        {confirmStatus === "error" && (
          <div className="mb-6 max-w-sm rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {confirmMessage}
          </div>
        )}

        <h1 className="text-5xl font-semibold tracking-tight text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.35)] sm:text-6xl">
          HalifaQ
        </h1>
        <p className="mt-4 max-w-sm text-base text-gray-400">
          Ask anything about life in Halifax. Answered by people who actually
          live it.
        </p>

        <div className="mt-10 flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-full border border-white/20 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black transition hover:opacity-90"
          >
            Sign up
          </Link>
        </div>
      </div>
    </main>
  );
}
