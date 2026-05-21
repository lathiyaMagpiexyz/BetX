import { notFound } from "next/navigation";
import { isAddress } from "viem";
import { fetchGiveaway } from "@/lib/supabase";
import { GiveawayDetailClient } from "@/components/giveaway-detail-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  return {
    title: `Draw ${address.slice(0, 6)}…${address.slice(-4)} · FairDrop`,
    description:
      "Buy a ticket for this FairDrop draw. One signature, on-chain payout, sponsor-selected winners.",
  };
}

export default async function GiveawayDetailPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  if (!isAddress(address)) notFound();

  const giveaway = await fetchGiveaway(address);
  if (!giveaway) notFound();

  return <GiveawayDetailClient initial={giveaway} />;
}
