import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted (SIL OFL) — no runtime font CDN. Latin-subset variable fonts.
const inter = localFont({
  src: "./fonts/inter-latin-var.woff2",
  weight: "400 600",
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: "./fonts/jetbrains-mono-latin-var.woff2",
  weight: "400 500",
  variable: "--font-jetbrains-mono",
  display: "swap",
});

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
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-white text-[#333] antialiased h-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
