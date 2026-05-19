/**
 * On-chain readers used when the Ponder indexer isn't running.
 *
 * Listing uses the factory's on-chain registry (`getAllGiveaways()`) instead
 * of `eth_getLogs`. That sidesteps all the public-RPC limits we hit during
 * setup: block-range caps (publicnode 50k, Alchemy free tier 10), aggressive
 * rate-limiting on `eth_getLogs`, and pruned history older than a few days.
 *
 * The trade-off: an on-chain array is paid for in gas on every `create()`,
 * but BSC gas is negligible and reads are a single RPC call regardless of
 * how old the campaigns are.
 */

import { createPublicClient, http, parseAbi, type Address } from "viem";
import { bsc, bscTestnet, base, baseSepolia } from "viem/chains";
import type {
  IndexedGiveaway,
  IndexedEntry,
  IndexedWinner,
} from "@/lib/supabase";
import { findKnownToken } from "@/lib/tokens";
import erc20Abi from "@/lib/abi/erc20.json";

const FALLBACK_RPC: Record<number, string> = {
  [bscTestnet.id]: "https://bsc-testnet.publicnode.com",
  [bsc.id]: "https://bsc.publicnode.com",
  [base.id]: "https://mainnet.base.org",
  [baseSepolia.id]: "https://sepolia.base.org",
};

const PLACEHOLDER_ADDR =
  "0x0000000000000000000000000000000000000000" as const;

const FACTORY_ABI = parseAbi([
  "function getAllGiveaways() view returns (address[])",
]);

const GIVEAWAY_ABI = parseAbi([
  "function getState() view returns (uint8 status, uint256 entryFee, uint256 bonusPool, uint256 numEntrants, uint256 numWinners, uint64 endAt)",
  "function prizePool() view returns (uint256)",
  "function sponsor() view returns (address)",
  "function prizeToken() view returns (address)",
  "function entryFee() view returns (uint256)",
  "function hasEntered(address) view returns (bool)",
  "function winners(uint256) view returns (address)",
  "function tierAmounts(uint256) view returns (uint256)",
  "function unclaimedPrize(address) view returns (uint256)",
  "function unclaimedBonus(address) view returns (uint256)",
]);

const STATUS_LABELS: IndexedGiveaway["status"][] = [
  "Open",
  "Drawing",
  "Resolved",
];

function getChain(chainId: number) {
  switch (chainId) {
    case bsc.id:
      return bsc;
    case bscTestnet.id:
      return bscTestnet;
    case base.id:
      return base;
    case baseSepolia.id:
      return baseSepolia;
    default:
      return bscTestnet;
  }
}

function getFactoryAddress(): Address | null {
  const raw = process.env.NEXT_PUBLIC_GIVEAWAY_FACTORY_ADDRESS;
  if (!raw || raw.toLowerCase() === PLACEHOLDER_ADDR.toLowerCase()) return null;
  return raw as Address;
}

// Two viem versions ship in node_modules. TS treats their PublicClient types
// as unrelated even though the runtime objects are identical. Type-erase
// to avoid bogus "Type X not assignable to Type X" errors.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPublicClient(): any {
  if (_client) return _client;
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "97");
  const chain = getChain(chainId);
  const url =
    process.env.NEXT_PUBLIC_RPC_URL ||
    FALLBACK_RPC[chain.id] ||
    chain.rpcUrls.default.http[0];
  _client = createPublicClient({
    chain,
    transport: http(url, { timeout: 15_000, retryCount: 0 }),
  });
  return _client;
}

/**
 * Read every giveaway address from the factory's on-chain registry, then
 * fetch live state for each via direct contract reads.
 *
 * Returns `null` when factory isn't configured (caller falls back to demo
 * fixtures). Returns `[]` when the factory exists but has no campaigns yet.
 */
export async function fetchOnchainGiveaways(): Promise<
  IndexedGiveaway[] | null
> {
  const factory = getFactoryAddress();
  if (!factory) return null;

  const client = getPublicClient();
  const t0 = Date.now();

  let addresses: Address[];
  try {
    addresses = (await client.readContract({
      address: factory,
      abi: FACTORY_ABI,
      functionName: "getAllGiveaways",
    })) as Address[];
    console.log(
      `[onchain] getAllGiveaways returned ${addresses.length} addresses (${Date.now() - t0}ms)`
    );
  } catch (err) {
    console.error(`[onchain] getAllGiveaways failed (${Date.now() - t0}ms):`, err);
    return [];
  }

  if (addresses.length === 0) return [];

  const giveaways = await Promise.all(addresses.map(readGiveaway));
  // Most recent first (registry is append-only, so reverse insertion order).
  giveaways.reverse();
  return giveaways;
}

export async function fetchOnchainGiveaway(
  address: string
): Promise<IndexedGiveaway | null> {
  if (!getFactoryAddress()) return null;
  try {
    return await readGiveaway(address as Address);
  } catch (err) {
    console.error(`[onchain] fetchOnchainGiveaway(${address}) failed`, err);
    return null;
  }
}

/**
 * Read live state for a single giveaway contract.
 * Five view calls in parallel: getState + prizePool + sponsor + prizeToken + entryFee (from getState).
 */
async function readGiveaway(addr: Address): Promise<IndexedGiveaway> {
  const client = getPublicClient();
  const [state, prizePool, sponsor, prizeToken] = await Promise.all([
    client.readContract({
      address: addr,
      abi: GIVEAWAY_ABI,
      functionName: "getState",
    }),
    client.readContract({
      address: addr,
      abi: GIVEAWAY_ABI,
      functionName: "prizePool",
    }),
    client.readContract({
      address: addr,
      abi: GIVEAWAY_ABI,
      functionName: "sponsor",
    }),
    client.readContract({
      address: addr,
      abi: GIVEAWAY_ABI,
      functionName: "prizeToken",
    }),
  ]);
  const s = state as readonly [number, bigint, bigint, bigint, bigint, bigint];

  // Resolve prize-token metadata. Known tokens come from the curated list
  // (with USD price). Unknown / custom tokens fall back to on-chain reads.
  const tokenMeta = await resolvePrizeTokenMeta(prizeToken as Address);

  // If the lottery is Resolved (status == 2), fetch its winners array.
  // numWinners comes from getState() element [4]. The contract stores winners
  // in a plain array, so we read each index until we hit the count.
  let winners: string[] | undefined = undefined;
  const status = Number(s[0]);
  const numWinners = Number(s[4]);
  if (status === 2 && numWinners > 0) {
    try {
      const reads = await Promise.all(
        Array.from({ length: numWinners }, (_, i) =>
          client.readContract({
            address: addr,
            abi: GIVEAWAY_ABI,
            functionName: "winners",
            args: [BigInt(i)],
          })
        )
      );
      winners = reads.map((w) => w as string);
    } catch (err) {
      console.warn(`[onchain] failed to read winners for ${addr}`, err);
    }
  }

  return {
    address: addr,
    sponsor: sponsor as Address,
    prize_token: prizeToken as Address,
    entry_fee: s[1].toString(),
    end_at: s[5].toString(),
    status: STATUS_LABELS[status] ?? "Open",
    prize_pool: (prizePool as bigint).toString(),
    bonus_pool: s[2].toString(),
    num_entrants: Number(s[3]),
    // We don't have a creation timestamp without a log query; use endAt as a
    // rough ordering hint (later endAt ≈ more recent campaign). Replace with
    // a real created_at once an indexer is wired.
    created_at: s[5].toString(),
    prize_token_symbol: tokenMeta.symbol,
    prize_token_decimals: tokenMeta.decimals,
    prize_token_usd_price: tokenMeta.usdPrice,
    winners,
  } satisfies IndexedGiveaway;
}

interface PrizeTokenMeta {
  symbol?: string;
  decimals?: number;
  usdPrice?: number;
}

async function resolvePrizeTokenMeta(addr: Address): Promise<PrizeTokenMeta> {
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "97");
  const known = findKnownToken(chainId, addr);
  if (known) {
    return {
      symbol: known.symbol,
      decimals: known.decimals,
      usdPrice: known.usdPrice,
    };
  }
  // Unknown token — read symbol + decimals from chain. No USD price available.
  const client = getPublicClient();
  try {
    const [symbol, decimals] = await Promise.all([
      client.readContract({ address: addr, abi: erc20Abi, functionName: "symbol" }),
      client.readContract({ address: addr, abi: erc20Abi, functionName: "decimals" }),
    ]);
    return {
      symbol: symbol as string,
      decimals: Number(decimals),
    };
  } catch {
    return {}; // bad/empty contract — callers fall back to ENTRY_TOKEN defaults
  }
}

/**
 * Walk every lottery in the factory registry and return the ones this wallet
 * has bought a ticket for. Without an indexer we can't get the original tx
 * hash / block number, so those fields are empty placeholders.
 */
export async function fetchOnchainEntriesForWallet(
  wallet: string
): Promise<IndexedEntry[]> {
  const factory = getFactoryAddress();
  if (!factory) return [];
  const client = getPublicClient();

  let addrs: Address[];
  try {
    addrs = (await client.readContract({
      address: factory,
      abi: FACTORY_ABI,
      functionName: "getAllGiveaways",
    })) as Address[];
  } catch (err) {
    console.error("[onchain] entries: getAllGiveaways failed", err);
    return [];
  }

  const results: IndexedEntry[] = [];
  await Promise.all(
    addrs.map(async (g) => {
      try {
        const [entered, fee] = await Promise.all([
          client.readContract({
            address: g,
            abi: GIVEAWAY_ABI,
            functionName: "hasEntered",
            args: [wallet as Address],
          }),
          client.readContract({
            address: g,
            abi: GIVEAWAY_ABI,
            functionName: "entryFee",
          }),
        ]);
        if (!(entered as boolean)) return;
        results.push({
          giveaway: g as string,
          entrant: wallet,
          fee_paid: (fee as bigint).toString(),
          block_number: "—",
          tx_hash: "—",
        });
      } catch (err) {
        console.warn(`[onchain] entries: read ${g} failed`, err);
      }
    })
  );

  return results;
}

/**
 * Walk every resolved lottery in the registry, check if this wallet is in
 * the winners[] array, and surface unclaimed prize amounts.
 */
export async function fetchOnchainWinsForWallet(
  wallet: string
): Promise<IndexedWinner[]> {
  const factory = getFactoryAddress();
  if (!factory) return [];
  const client = getPublicClient();

  let addrs: Address[];
  try {
    addrs = (await client.readContract({
      address: factory,
      abi: FACTORY_ABI,
      functionName: "getAllGiveaways",
    })) as Address[];
  } catch (err) {
    console.error("[onchain] wins: getAllGiveaways failed", err);
    return [];
  }

  const lower = wallet.toLowerCase();
  const wins: IndexedWinner[] = [];

  for (const g of addrs) {
    try {
      const state = (await client.readContract({
        address: g,
        abi: GIVEAWAY_ABI,
        functionName: "getState",
      })) as readonly [number, bigint, bigint, bigint, bigint, bigint];
      const status = Number(state[0]);
      const numWinners = Number(state[4]);
      // Only Resolved lotteries have winners.
      if (status !== 2 || numWinners === 0) continue;

      for (let rank = 0; rank < numWinners; rank++) {
        let winner: Address;
        try {
          winner = (await client.readContract({
            address: g,
            abi: GIVEAWAY_ABI,
            functionName: "winners",
            args: [BigInt(rank)],
          })) as Address;
        } catch {
          break; // ran past the end of winners[]
        }
        if (winner.toLowerCase() !== lower) continue;

        const [tier, unclaimedPrize, unclaimedBonus] = await Promise.all([
          client.readContract({
            address: g,
            abi: GIVEAWAY_ABI,
            functionName: "tierAmounts",
            args: [BigInt(rank)],
          }),
          client.readContract({
            address: g,
            abi: GIVEAWAY_ABI,
            functionName: "unclaimedPrize",
            args: [wallet as Address],
          }),
          client.readContract({
            address: g,
            abi: GIVEAWAY_ABI,
            functionName: "unclaimedBonus",
            args: [wallet as Address],
          }),
        ]);

        wins.push({
          giveaway: g as string,
          rank: rank + 1, // human-friendly 1-indexed
          address: winner as string,
          amount: (tier as bigint).toString(),
          claimed:
            (unclaimedPrize as bigint) === 0n &&
            (unclaimedBonus as bigint) === 0n,
          tx_hash: "—",
        });
      }
    } catch (err) {
      console.warn(`[onchain] wins: read ${g} failed`, err);
    }
  }

  return wins;
}
