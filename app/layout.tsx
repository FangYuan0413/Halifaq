import type { Metadata } from "next";
import { Dancing_Script } from "next/font/google";
import "./globals.css";

// A light, connected script font used for the HalifaQ wordmark (see
// components/Logo.tsx). Exposed as the --font-logo CSS variable so any
// component can opt in with font-[family-name:var(--font-logo)].
const logoFont = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "500"],
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
      <body className={`${logoFont.variable} bg-black text-white`}>
        {children}
      </body>
    </html>
  );
}
