import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Same facts. Different framing. | LedeLens",
  description:
    "Compare two versions of the same fictional article and see how framing changes what the evidence can support.",
  openGraph: {
    title: "Same facts. Different framing.",
    description: "Compare two versions of the same fictional article with LedeLens.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Same facts. Different framing.",
    description: "Compare two versions of the same fictional article with LedeLens.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable}`}>
        {children}
      </body>
    </html>
  );
}
