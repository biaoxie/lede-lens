import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { headers } from "next/headers";
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

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og.png`;

  return {
    title: "City library extends weekend hours | The Meridian Ledger",
    description:
      "A fictional, politically neutral article created to demonstrate LedeLens.",
    openGraph: {
      title: "City library extends weekend hours",
      description: "A fictional article created to demonstrate LedeLens.",
      type: "article",
      images: [{ url: imageUrl, width: 1536, height: 1024, alt: "A fictional library article from The Meridian Ledger" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "City library extends weekend hours",
      description: "A fictional article created to demonstrate LedeLens.",
      images: [imageUrl],
    },
  };
}

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
