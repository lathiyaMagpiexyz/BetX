import { LandingHero } from "@/components/landing-hero";
import { fetchActiveGiveaways } from "@/lib/supabase";
import { fetchTokenPrices } from "@/lib/prices";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const [live, prices] = await Promise.all([
    fetchActiveGiveaways(),
    fetchTokenPrices(),
  ]);
  return (
    <LandingHero variant="trust" liveCount={live.length} prices={prices} />
  );
}
