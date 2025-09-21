import "./globals.css";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  title: "Writer Analytics",
  description: "Turn your stories into insights.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics /> {/* ✅ Tracks visits & pageviews */}
      </body>
    </html>
  );
}
