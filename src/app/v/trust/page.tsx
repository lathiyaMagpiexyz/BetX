import { LandingHero } from "@/components/landing-hero";
import { fetchActiveGiveaways } from "@/lib/supabase";
import { fetchTokenPrices } from "@/lib/prices";

export const metadata = {
  title: "LottoBlast — The Lottery That Pays Out On-Chain",
  description:
    "Buy a ticket, watch the jackpot grow, get paid on-chain when the draw closes. No middleman, no DM-the-winner runaround.",
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
