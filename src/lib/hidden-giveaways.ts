/**
 * Giveaway contract addresses to hide from the FairDrop UI.
 *
 * The contracts remain live on-chain — entrants can still call them directly
 * via a block explorer. This list only controls what the FairDrop frontend
 * surfaces (listing cards and detail pages).
 *
 * Addresses MUST be stored lowercase. `isHiddenGiveaway()` lowercases input
 * before comparing, so callers don't need to.
 */
const HIDDEN_GIVEAWAYS = new Set<string>([
  "0xa148913ac207840a8c6f2dd833c794934316d211",
]);

export function isHiddenGiveaway(address: string | undefined | null): boolean {
  if (!address) return false;
  return HIDDEN_GIVEAWAYS.has(address.toLowerCase());
}
