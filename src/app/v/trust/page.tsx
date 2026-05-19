import { LandingHero } from "@/components/landing-hero";
import { fetchActiveGiveaways } from "@/lib/supabase";
import { fetchTokenPrices } from "@/lib/prices";

export const metadata = {
  title: "LottoBlast — Discover New BSC Projects. Win Their Tokens.",
  description:
    "Emerging BSC projects launch on-chain giveaways. Pay USDT to enter, win their tokens when entries close. No middleman, no DM-the-winner runaround.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TrustVariantPage() {
  const [live, prices] = await Promise.all([
    fetchActiveGiveaways(),
    fetchTokenPrices(),
  ]);
  return (
    <LandingHero variant="trust" liveCount={live.length} prices={prices} />
  );
}
