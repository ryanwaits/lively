import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Markdown Editor — Lively",
  description: "Collaborative code editing with syntax awareness.",
  openGraph: {
    title: "IDE — Lively",
    description: "Collaborative code editing with syntax awareness.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "IDE — Lively",
    description: "Collaborative code editing with syntax awareness.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-[#333] antialiased h-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
