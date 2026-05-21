/**
 * Live token prices used for the USD displays across the platform.
 *
 * Source: **CoinGecko public API** (free, no auth for ~10-50 calls/min).
 * We previously used Binance, but `api.binance.com` is geo-blocked from
 * US IP ranges — Vercel's serverless runtime lives in `iad1` (us-east-1)
 * by default, so every server-side fetch failed and quietly fell back to
 * stale constants. CoinGecko serves globally and is the standard crypto
 * price oracle for non-trading dApps.
 *
 * Cached server-side for 60s via Next.js fetch cache so the page doesn't
 * hit CoinGecko on every request. Stable-pegged tokens (USDT/USDC/BUSD)
 * are returned as a flat 1.0 — no fetch needed.
 *
 * Replace with a Chainlink price feed read before scaling to high TVL.
 */

const FALLBACK_PRICES: Record<string, number> = {
  // Stables (no fetch needed)
  USDT: 1,
  USDC: 1,
  BUSD: 1,
  // Blue-chip BSC — fallbacks reflect rough current market
  WBNB: 600,
  CAKE: 2.5,
  // Emerging BSC project tokens featured on the landing as giveaway prizes
  HOOK: 0.008,
  LISTA: 0.18,
  WOO: 0.06,
  BAKE: 0.1,
  FLOKI: 0.00007,
  XVS: 5,
  TWT: 0.5,
  THE: 0.15,
  BSW: 0.02,
};

// CoinGecko coin IDs for each token symbol. Discover IDs via
// https://api.coingecko.com/api/v3/coins/list or the project's CoinGecko
// page URL (e.g., coingecko.com/en/coins/hooked-protocol).
const COINGECKO_IDS: Record<keyof typeof FALLBACK_PRICES, string | null> = {
  USDT: null,
  USDC: null,
  BUSD: null,
  WBNB: "binancecoin", // BNB price; wrapped BNB tracks 1:1
  CAKE: "pancakeswap-token",
  HOOK: "hooked-protocol",
  LISTA: "lista-dao",
  WOO: "woo-network",
  BAKE: "bakerytoken",
  FLOKI: "floki",
  XVS: "venus",
  TWT: "trust-wallet-token",
  THE: "thena",
  BSW: "biswap",
};

export async function fetchTokenPrices(): Promise<Record<string, number>> {
  const idToSymbol = new Map<string, string>();
  for (const [symbol, id] of Object.entries(COINGECKO_IDS)) {
    if (id) idToSymbol.set(id, symbol);
  }
  if (idToSymbol.size === 0) return FALLBACK_PRICES;

  const ids = Array.from(idToSymbol.keys()).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return FALLBACK_PRICES;
    const data = (await res.json()) as Record<string, { usd?: number }>;
    const prices: Record<string, number> = { ...FALLBACK_PRICES };
    for (const [id, payload] of Object.entries(data)) {
      const symbol = idToSymbol.get(id);
      if (!symbol) continue;
      const usd = payload?.usd;
      if (typeof usd === "number" && Number.isFinite(usd) && usd > 0) {
        prices[symbol] = usd;
      }
    }
    return prices;
  } catch {
    return FALLBACK_PRICES;
  }
}
