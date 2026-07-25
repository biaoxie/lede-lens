import type { Metadata } from "next";

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
};

export function createPageMetadata({
  title,
  description,
  path,
}: PageMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} | LedeLens`,
      description,
      url: path,
      siteName: "LedeLens",
      type: "website",
      images: [
        {
          url: "/og-ledelens.png",
          width: 1731,
          height: 909,
          alt: "LedeLens article structure analysis",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | LedeLens`,
      description,
      images: ["/og-ledelens.png"],
    },
  };
}
