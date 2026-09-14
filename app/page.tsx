"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LandingBackground from "@/components/LandingBackground";
import Logo from "@/components/Logo";
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
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

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
      <LandingBackground />

      <div className="relative z-10 flex max-w-xl flex-col items-center text-center">
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

        <div className="relative">
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-40 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(8,127,149,0.12)_0%,rgba(8,127,149,0.04)_42%,transparent_72%)] blur-2xl"
            aria-hidden="true"
          />
          <Logo size="text-5xl sm:text-6xl" />
        </div>

        <p className="mt-5 max-w-md text-base leading-7 text-gray-400">
          Ask anything about life in Halifax. Answered by people who actually
          live it.
        </p>

        <div className="mt-9 flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-full border border-white/20 px-6 py-2.5 text-sm font-medium text-white transition hover:border-[#087F95]/45 hover:bg-[#087F95]/5"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-[#087F95] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(8,127,149,0.14)] transition hover:bg-[#076f82]"
          >
            Sign up
          </Link>
        </div>

        <p className="mt-5 text-xs tracking-wide text-gray-600">
          Local questions. Local answers. Halifax community.
        </p>
      </div>
    </main>
  );
}
