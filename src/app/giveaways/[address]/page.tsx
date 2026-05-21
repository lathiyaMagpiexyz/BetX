import { notFound } from "next/navigation";
import { isAddress } from "viem";
import { fetchGiveaway } from "@/lib/supabase";
import { fetchTokenPrices } from "@/lib/prices";
import { GiveawayDetailClient } from "@/components/giveaway-detail-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  return {
    title: `Giveaway ${address.slice(0, 6)}…${address.slice(-4)} · FairDrop`,
    description:
      "Enter this FairDrop giveaway for a shot at project tokens. One signature, on-chain payout, sponsor-confirmed winners.",
  };
}

export default async function GiveawayDetailPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  if (!isAddress(address)) notFound();

  // Fetch giveaway state and live token prices in parallel. The detail page
  // used to read `prize_token_usd_price` baked into onchain.ts (which uses the
  // static `usdPrice` from tokens.ts — stale the moment markets move). We now
  // override it with the live Binance ticker so 10,000 HOOK is priced at the
  // actual HOOK/USDT pair instead of a fallback constant.
  const [giveaway, prices] = await Promise.all([
    fetchGiveaway(address),
    fetchTokenPrices(),
  ]);
  if (!giveaway) notFound();

  return <GiveawayDetailClient initial={giveaway} prices={prices} />;
}
