import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

// A distinctive display font used for the HalifaQ wordmark (see
// components/Logo.tsx). Exposed as the --font-logo CSS variable so any
// component can opt in with font-[family-name:var(--font-logo)].
const spaceGrotesk = Space_Grotesk({
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
      <body className={`${spaceGrotesk.variable} bg-black text-white`}>
        {children}
      </body>
    </html>
  );
}
