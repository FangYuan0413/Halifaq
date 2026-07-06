import type { Metadata } from "next";
import { Dancing_Script } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import ThemeApplier from "@/components/ThemeApplier";

// A connected script font used for the HalifaQ wordmark (see
// components/Logo.tsx), set at its bold weight. Exposed as the --font-logo
// CSS variable so any component can opt in with
// font-[family-name:var(--font-logo)].
const logoFont = Dancing_Script({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-logo",
});

export const metadata: Metadata = {
  title: "HalifaQ",
  description: "Ask anything about life in Halifax.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Applies the cached theme before first paint, so there's no
            flash of the default dark theme while React hydrates. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try {
              var t = localStorage.getItem("halifaq_theme");
              if (t === "light" || t === "miku") {
                document.documentElement.setAttribute("data-theme", t);
              }
            } catch (e) {}`,
          }}
        />
      </head>
      <body className={`${logoFont.variable} bg-black text-white`}>
        <ThemeApplier />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
