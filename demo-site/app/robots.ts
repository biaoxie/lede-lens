import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://ledelens.app/sitemap.xml",
    host: "https://ledelens.app",
  };
}
