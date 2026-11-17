import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return ["/", "/register?role=merchant", "/register?role=creator", "/login"].map((p) => ({ url: base + p }));
}
