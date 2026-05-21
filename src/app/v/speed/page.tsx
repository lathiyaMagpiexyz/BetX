import { LandingHero } from "@/components/landing-hero";
import { fetchActiveGiveaways } from "@/lib/supabase";
import { fetchTokenPrices } from "@/lib/prices";

export const metadata = {
  title: "FairDrop — Get Your BSC Token in Real Wallets",
  description:
    "Launch a token giveaway for your BSC project in one transaction. Lock the tokens, set the entry fee, share the link. Reach 10,000+ crypto-native wallets.",
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
