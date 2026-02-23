import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Collaborative Todo List — Lively Example",
  description: "Shared task lists with real-time checkbox sync.",
  openGraph: {
    title: "Todo — Lively",
    description: "Shared task lists with real-time checkbox sync.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Todo — Lively",
    description: "Shared task lists with real-time checkbox sync.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
