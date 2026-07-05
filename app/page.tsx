import Link from "next/link";
import BackgroundShapes from "@/components/BackgroundShapes";

export default function LandingPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4">
      <BackgroundShapes />

      <div className="relative z-10 flex flex-col items-center text-center">
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
