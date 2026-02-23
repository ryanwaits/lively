import type { Metadata } from "next";
import "highlight.js/styles/github.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Notion-style Editor — Lively Example",
  description: "Block-based editor with drag-and-drop collaboration.",
  openGraph: {
    title: "Notion Editor — Lively",
    description: "Block-based editor with drag-and-drop collaboration.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Notion Editor — Lively",
    description: "Block-based editor with drag-and-drop collaboration.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-[#37352f] antialiased">{children}</body>
    </html>
  );
}
