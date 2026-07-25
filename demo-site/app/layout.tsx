import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const siteUrl = "https://ledelens.app";

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
  metadataBase: new URL(siteUrl),
  title: {
    default: "LedeLens — News Article Evidence & Reasoning Analyzer",
    template: "%s | LedeLens",
  },
  description:
    "LedeLens is an open-source Chrome extension that analyzes evidence, sourcing, causality, context, and framing in news articles—without fact-checking or bias scores.",
  alternates: {
    canonical: "/",
  },
  authors: [{ name: "LedeLens contributors", url: "https://github.com/biaoxie/lede-lens" }],
  creator: "LedeLens contributors",
  publisher: "LedeLens",
  category: "Education",
  verification: {
    google: "waYEp3PQsJmQy5xnEGpo-WfuQPom7fXAYXrZW17WxBU",
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "LedeLens — See how an article supports its conclusions",
    description:
      "Analyze evidence, sourcing, cause and effect, context, and framing with the open-source LedeLens Chrome extension.",
    url: siteUrl,
    siteName: "LedeLens",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-ledelens.png",
        width: 1731,
        height: 909,
        alt: "LedeLens article structure analysis showing evidence, sourcing, cause and effect, context, and framing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LedeLens — See how an article supports its conclusions",
    description:
      "An open-source Chrome extension for analyzing evidence, sourcing, causality, context, and framing.",
    images: ["/og-ledelens.png"],
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "LedeLens",
      description:
        "Interactive demo and official website for the LedeLens news article evidence and reasoning analyzer.",
      inLanguage: "en",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl}/#software`,
      name: "LedeLens",
      alternateName: "LedeLens – Article Analysis",
      url: siteUrl,
      downloadUrl:
        "https://github.com/biaoxie/lede-lens/releases/latest",
      sameAs: ["https://github.com/biaoxie/lede-lens"],
      applicationCategory: "EducationalApplication",
      applicationSubCategory: "Media literacy and critical reading",
      operatingSystem: "Google Chrome",
      browserRequirements: "Requires Google Chrome 116 or newer",
      description:
        "LedeLens analyzes whether a news article's conclusions follow from the evidence, sourcing, causal reasoning, context, and framing presented in the article. It does not fact-check claims or rate political bias.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      isAccessibleForFree: true,
      license: "https://www.apache.org/licenses/LICENSE-2.0",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={`${sans.variable} ${display.variable}`}>
        {children}
      </body>
    </html>
  );
}
