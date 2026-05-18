/**
 * Live token prices used for the demo USD displays on the landing page.
 *
 * Pulls from Binance's free public ticker (no auth, no rate-limit headaches
 * for low volume). Cached server-side for 60s via Next.js fetch cache, so the
 * landing page does not hit the API on every request.
 *
 * Stable-pegged tokens (USDT / USDC / BUSD) are returned as a flat 1.0 —
 * Binance lists them all against USDT itself, so there is nothing to fetch.
 * Replace this with a Chainlink price feed read before mainnet.
 */

const FALLBACK_PRICES: Record<string, number> = {
  USDT: 1,
  USDC: 1,
  BUSD: 1,
  WBNB: 600,
  CAKE: 2.5,
};

const BINANCE_SYMBOLS: Array<{ pair: string; token: keyof typeof FALLBACK_PRICES }> = [
  { pair: "BNBUSDT", token: "WBNB" },
  { pair: "CAKEUSDT", token: "CAKE" },
];

export async function fetchTokenPrices(): Promise<Record<string, number>> {
  const url =
    'https://api.binance.com/api/v3/ticker/price?symbols=' +
    encodeURIComponent(JSON.stringify(BINANCE_SYMBOLS.map((s) => s.pair)));
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return FALLBACK_PRICES;
    const data = (await res.json()) as Array<{ symbol: string; price: string }>;
    const prices: Record<string, number> = { ...FALLBACK_PRICES };
    for (const row of data) {
      const entry = BINANCE_SYMBOLS.find((s) => s.pair === row.symbol);
      if (!entry) continue;
      const value = parseFloat(row.price);
      if (Number.isFinite(value) && value > 0) prices[entry.token] = value;
    }
    return prices;
  } catch {
    return FALLBACK_PRICES;
  }
}
