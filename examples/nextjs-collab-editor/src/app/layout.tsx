import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Collaborative Text Editor — Lively Example",
  description: "Real-time text editing with presence indicators.",
  openGraph: {
    title: "Collab Editor — Lively",
    description: "Real-time text editing with presence indicators.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Collab Editor — Lively",
    description: "Real-time text editing with presence indicators.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-[#111] antialiased">{children}</body>
    </html>
  );
}
