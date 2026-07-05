import type { Metadata } from "next";
import "./globals.css";

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
      <body className="bg-black text-white">{children}</body>
    </html>
  );
}
