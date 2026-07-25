import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/features", "/how-it-works", "/install", "/privacy"];

  return routes.map((route) => ({
    url: route ? `https://ledelens.app${route}` : "https://ledelens.app/",
    lastModified: new Date("2026-07-24"),
  }));
}
