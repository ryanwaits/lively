import type { Metadata } from "next";
import { Space_Grotesk, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Lively - Real-time Collaboration SDK",
  description:
    "Add real-time collaboration, presence, and state sync to your application in minutes.",
  openGraph: {
    title: "Lively - Real-time Collaboration SDK",
    description:
      "Add real-time collaboration, presence, and state sync to your application in minutes.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${manrope.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-body selection:bg-accent selection:text-accent-fg">
        {children}
      </body>
    </html>
  );
}
