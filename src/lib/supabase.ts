import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

const PLACEHOLDER_URL = "https://placeholder.supabase.co";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured =
  !!url && !!anon && url !== PLACEHOLDER_URL;

// Giveaway contract addresses to hide from the frontend entirely.
// Listing pages skip them and `/giveaways/<address>` returns 404. The contracts
// remain live on-chain — this only affects what FairDrop's UI surfaces.
const HIDDEN_GIVEAWAYS = new Set<string>([
  "0xa148913ac207840a8c6f2dd833c794934316d211",
]);

function isHiddenGiveaway(address: string): boolean {
  return HIDDEN_GIVEAWAYS.has(address.toLowerCase());
}

let _client: SupabaseClient | null = null;

/**
 * Returns the Supabase client, or `null` when env vars are placeholders.
 * Pages should call `getDemoGiveaways()` etc. when this returns null.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!_client) {
    _client = createSupabaseClient(url, anon, {
      auth: { persistSession: false },
    });
  }
  return _client;
}

// =============================================================================
// Indexer types — match the `indexer.*` Postgres schema written by Ponder.
// =============================================================================

export interface IndexedGiveaway {
  address: string;
  sponsor: string;
  prize_token: string;
  entry_fee: string; // bigint serialized as string
  end_at: string;
  status: "Open" | "Drawing" | "Resolved";
  prize_pool: string;
  bonus_pool: string;
  num_entrants: number;
  created_at: string;

  // Enriched metadata about the prize token. Populated by onchain.ts using
  // the curated tokens.ts list, or read on-chain for custom tokens. Optional
  // so callers can fall back to ENTRY_TOKEN_* if missing.
  prize_token_symbol?: string;
  prize_token_decimals?: number;
  prize_token_usd_price?: number;

  // Populated only for Resolved giveaways — list of winning wallet addresses
  // in rank order ([0] = 1st place, [1] = 2nd, ...).
  winners?: string[];
}

export interface IndexedEntry {
  giveaway: string;
  entrant: string;
  fee_paid: string;
  block_number: string;
  tx_hash: string;
}

export interface IndexedWinner {
  giveaway: string;
  rank: number;
  address: string;
  amount: string;
  claimed: boolean;
  tx_hash: string;
}

// =============================================================================
// Demo fixtures — used when Supabase is not configured (local dev, demo mode).
// =============================================================================

const NOW = Math.floor(Date.now() / 1000);
const DAY = 86_400;

// Demo addresses are lowercased on purpose — viem's `isAddress` validates
// EIP-55 checksum on mixed-case strings, and these fake fixtures aren't
// checksummed. Lowercasing makes them pass the route guard so demo links work.
const DEMO_GIVEAWAYS: IndexedGiveaway[] = [
  {
    address: "0xdeade100000000000000000000000000000da7a1",
    sponsor: "0xc0decafe1111111111111111111111111111a111",
    prize_token: "0x036cbd53842c5426634e7929541ec2318f3dcf7e",
    entry_fee: "1000000", // 1 USDC
    end_at: String(NOW + 2 * DAY + 4 * 3600),
    status: "Open",
    prize_pool: "525000000", // 525 USDC base
    bonus_pool: "47000000", // 47 USDC accumulated entries
    num_entrants: 47,
    created_at: String(NOW - 12 * 3600),
  },
  {
    address: "0xdeade100000000000000000000000000000da7a2",
    sponsor: "0xc0decafe2222222222222222222222222222b222",
    prize_token: "0x036cbd53842c5426634e7929541ec2318f3dcf7e",
    entry_fee: "1000000",
    end_at: String(NOW + 6 * 3600),
    status: "Open",
    prize_pool: "150000000",
    bonus_pool: "12000000",
    num_entrants: 12,
    created_at: String(NOW - 18 * 3600),
  },
  {
    address: "0xdeade100000000000000000000000000000da7a3",
    sponsor: "0xc0decafe3333333333333333333333333333c333",
    prize_token: "0x036cbd53842c5426634e7929541ec2318f3dcf7e",
    entry_fee: "1000000",
    end_at: String(NOW + 5 * DAY),
    status: "Open",
    prize_pool: "1000000000", // 1000 USDC
    bonus_pool: "203000000", // 203 USDC
    num_entrants: 203,
    created_at: String(NOW - 6 * 3600),
  },
];

export function getDemoGiveaways(): IndexedGiveaway[] {
  return DEMO_GIVEAWAYS;
}

export function getDemoGiveaway(address: string): IndexedGiveaway | null {
  const lower = address.toLowerCase();
  return DEMO_GIVEAWAYS.find((g) => g.address.toLowerCase() === lower) ?? null;
}

// =============================================================================
// Indexer reads — backed by Supabase when configured, demo data otherwise.
// =============================================================================

export async function fetchActiveGiveaways(): Promise<IndexedGiveaway[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    // No Ponder indexer running — try reading straight from the chain.
    // Falls through to demo fixtures only when the factory address is unset.
    const { fetchOnchainGiveaways } = await import("@/lib/onchain");
    const onchain = await fetchOnchainGiveaways();
    if (onchain === null) return getDemoGiveaways();
    return onchain.filter(
      (g) => g.status !== "Resolved" && !isHiddenGiveaway(g.address)
    );
  }

  const { data, error } = await supabase
    .schema("indexer")
    .from("giveaway")
    .select("*")
    .neq("status", "Resolved")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[supabase] fetchActiveGiveaways error", error);
    return [];
  }
  return ((data ?? []) as IndexedGiveaway[]).filter(
    (g) => !isHiddenGiveaway(g.address)
  );
}

/**
 * Settled (Resolved-status) giveaways — for the "Recently settled" section.
 * Returns most-recent first. Each result carries the populated `winners` array.
 */
export async function fetchSettledGiveaways(
  limit = 12
): Promise<IndexedGiveaway[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    const { fetchOnchainGiveaways } = await import("@/lib/onchain");
    const onchain = await fetchOnchainGiveaways();
    if (onchain === null) return [];
    return onchain
      .filter((g) => g.status === "Resolved" && !isHiddenGiveaway(g.address))
      .slice(0, limit);
  }

  const { data, error } = await supabase
    .schema("indexer")
    .from("giveaway")
    .select("*")
    .eq("status", "Resolved")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[supabase] fetchSettledGiveaways error", error);
    return [];
  }
  return ((data ?? []) as IndexedGiveaway[]).filter(
    (g) => !isHiddenGiveaway(g.address)
  );
}

export async function fetchGiveaway(
  address: string
): Promise<IndexedGiveaway | null> {
  if (isHiddenGiveaway(address)) return null;

  const supabase = getSupabaseClient();
  if (!supabase) {
    // No Ponder indexer running — read directly from the chain. Falls through
    // to demo fixtures only when the factory address is unset.
    const { fetchOnchainGiveaway } = await import("@/lib/onchain");
    const onchain = await fetchOnchainGiveaway(address);
    if (onchain) return onchain;
    return getDemoGiveaway(address);
  }

  const { data, error } = await supabase
    .schema("indexer")
    .from("giveaway")
    .select("*")
    .eq("address", address.toLowerCase())
    .maybeSingle();

  if (error) {
    console.error("[supabase] fetchGiveaway error", error);
    return null;
  }
  return (data as IndexedGiveaway) ?? null;
}

export async function fetchEntriesForWallet(
  wallet: string
): Promise<IndexedEntry[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    const { fetchOnchainEntriesForWallet } = await import("@/lib/onchain");
    return fetchOnchainEntriesForWallet(wallet);
  }

  const { data, error } = await supabase
    .schema("indexer")
    .from("entry")
    .select("*")
    .eq("entrant", wallet.toLowerCase());

  if (error) {
    console.error("[supabase] fetchEntriesForWallet error", error);
    return [];
  }
  return (data ?? []) as IndexedEntry[];
}

export async function fetchWinsForWallet(
  wallet: string
): Promise<IndexedWinner[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    const { fetchOnchainWinsForWallet } = await import("@/lib/onchain");
    return fetchOnchainWinsForWallet(wallet);
  }

  const { data, error } = await supabase
    .schema("indexer")
    .from("winner")
    .select("*")
    .eq("address", wallet.toLowerCase());

  if (error) {
    console.error("[supabase] fetchWinsForWallet error", error);
    return [];
  }
  return (data ?? []) as IndexedWinner[];
}
