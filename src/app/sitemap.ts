import type { MetadataRoute } from "next";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const rows = await query<{ id: string; created_at: Date }>(
    "SELECT id, created_at FROM products WHERE hidden = false ORDER BY created_at DESC LIMIT 5000",
  );
  return [
    { url: site, changeFrequency: "daily", priority: 1 },
    ...rows.map((r) => ({ url: `${site}/product/${r.id}`, lastModified: r.created_at })),
  ];
}
