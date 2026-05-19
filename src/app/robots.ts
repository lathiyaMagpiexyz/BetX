import type { MetadataRoute } from "next";

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://lottoblast.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep `/my-entries` out of the index — it's wallet-scoped and only
        // useful to a connected user, never via search.
        // Per-giveaway routes change too fast to index meaningfully.
        disallow: ["/my-entries", "/api/", "/giveaways/0x"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
