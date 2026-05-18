import { LandingHero } from "@/components/landing-hero";
import { fetchActiveGiveaways } from "@/lib/supabase";
import { fetchTokenPrices } from "@/lib/prices";

export const metadata = {
  title: "LottoBlast — Run a Lottery in 60 Seconds",
  description:
    "Launch a crypto lottery in one transaction. Set tier prizes, ticket price, end time. The contract handles entries, the draw, and the payouts.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SpeedVariantPage() {
  const [live, prices] = await Promise.all([
    fetchActiveGiveaways(),
    fetchTokenPrices(),
  ]);
  return (
    <LandingHero variant="speed" liveCount={live.length} prices={prices} />
  );
}
