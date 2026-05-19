/**
 * Curated list of prize-token options per chain.
 *
 * The Giveaway contract accepts ANY ERC-20 as a prize token — the entry token
 * is fixed at factory deployment, but each giveaway picks its own prize token.
 * This file is just a UX helper: a dropdown of common tokens so the sponsor
 * doesn't have to paste a 42-char address every time.
 *
 * Add more chains by extending TOKENS_BY_CHAIN. To add a new token, look up
 * its address on the canonical block explorer for that chain.
 */

import { bsc, bscTestnet, base, baseSepolia } from "viem/chains";
import type { Address } from "viem";

export interface TokenInfo {
  address: Address;
  symbol: string;
  decimals: number;
  name: string;
  /**
   * Reference price in USD for showing fiat-equivalent values.
   *
   * Testnet mocks have no real market price — we use round numbers that
   * approximate the mainnet equivalents so the UI looks realistic in demos.
   * Replace with live oracle data (Chainlink price feeds or an off-chain API)
   * before mainnet.
   */
  usdPrice?: number;
}

const TOKENS_BY_CHAIN: Record<number, TokenInfo[]> = {
  // BSC Testnet (chain 97) — almost no real tokens exist here, so we only
  // ship the mock token we deployed for this project. Sponsors can paste any
  // custom ERC-20 address using the "Custom token" option in the picker.
  [bscTestnet.id]: [
    {
      address: "0x7de4a92e9746e0Df7C70c880f1c7649b2ECeBE86",
      symbol: "tUSDT",
      decimals: 18,
      name: "Test USDT (project mock)",
      usdPrice: 1.0,
    },
    {
      address: "0x8D86A0F249780A4915620aFBD99028EC29d86acF",
      symbol: "tCAKE",
      decimals: 18,
      name: "Test CAKE (project mock)",
      usdPrice: 2.5,
    },
    {
      address: "0xCBB3B248A6088eAfFF15AEB618B791002f2ab146",
      symbol: "tBUSD",
      decimals: 18,
      name: "Test BUSD (project mock)",
      usdPrice: 1.0,
    },
    {
      address: "0x51E86b87b9cD4ed394259F0A82C5e36707472913",
      symbol: "tWBNB",
      decimals: 18,
      name: "Test WBNB (project mock)",
      usdPrice: 600.0,
    },
  ],

  // BSC Mainnet (chain 56) — featured project tokens that sponsors can pick
  // as the prize for their giveaway. Curated emerging-but-credible BSC
  // projects so the platform feels like a "discover new BSC tokens" surface,
  // not a generic stablecoin distributor. Sponsors with a custom token paste
  // its address via the "Custom token" option in the picker.
  [bsc.id]: [
    // --- Project tokens (featured prize pool tokens) ---
    {
      address: "0xa260E12d2B924cb899AE80BB58123ac3fEE1E2F0",
      symbol: "HOOK",
      decimals: 18,
      name: "Hooked Protocol — Web3 onboarding & gamified learning",
      usdPrice: 0.12,
    },
    {
      address: "0xFceB31A79F71AC9CBDCF853519c1b12D379EdC46",
      symbol: "LISTA",
      decimals: 18,
      name: "Lista DAO — liquid staking & lending on BSC",
      usdPrice: 0.3,
    },
    {
      address: "0x4691937a7508860F876c9c0a2a617E7d9E945D4B",
      symbol: "WOO",
      decimals: 18,
      name: "WOO Network — DeFi/CeFi infrastructure",
      usdPrice: 0.18,
    },
    {
      address: "0xE02dF9e3e622DeBdD69fB838bB799E3F168902c5",
      symbol: "BAKE",
      decimals: 18,
      name: "BakerySwap — DEX & launchpad",
      usdPrice: 0.22,
    },
    {
      address: "0xfb5B838b6cfEEdC2873aB27866079AC55363D37E",
      symbol: "FLOKI",
      decimals: 9,
      name: "Floki — community-driven meme + utility",
      usdPrice: 0.00012,
    },
    {
      address: "0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63",
      symbol: "XVS",
      decimals: 18,
      name: "Venus — lending & borrowing protocol",
      usdPrice: 5.0,
    },
    {
      address: "0x4B0F1812e5Df2A09796481Ff14017e6005508003",
      symbol: "TWT",
      decimals: 18,
      name: "Trust Wallet Token — native to Trust Wallet (millions of users)",
      usdPrice: 1.0,
    },
    {
      address: "0xF4C8E32EaDEC4BFe97E0F595AdD0f4450a863a11",
      symbol: "THE",
      decimals: 18,
      name: "Thena — ve(3,3) DEX & liquidity hub on BSC",
      usdPrice: 0.25,
    },
    {
      address: "0x965F527D9159dCe6288a2219DB51fc6Eef120dD1",
      symbol: "BSW",
      decimals: 18,
      name: "Biswap — 3-token DEX with active community",
      usdPrice: 0.05,
    },
    // --- Blue-chip baselines (keep for variety / entry token fallback) ---
    {
      address: "0x55d398326f99059fF775485246999027B3197955",
      symbol: "USDT",
      decimals: 18,
      name: "Tether USD (entry-token compatible)",
      usdPrice: 1.0,
    },
    {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "WBNB",
      decimals: 18,
      name: "Wrapped BNB",
      usdPrice: 600.0,
    },
    {
      address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
      symbol: "CAKE",
      decimals: 18,
      name: "PancakeSwap Token",
      usdPrice: 2.5,
    },
  ],

  // Base mainnet (for completeness — your project targets BSC right now).
  [base.id]: [
    {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      symbol: "USDC",
      decimals: 6,
      name: "USD Coin",
    },
  ],
  [baseSepolia.id]: [
    {
      address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      symbol: "USDC",
      decimals: 6,
      name: "USD Coin (Sepolia)",
    },
  ],
};

export function getKnownTokens(chainId: number): TokenInfo[] {
  return TOKENS_BY_CHAIN[chainId] ?? [];
}

export function findKnownToken(
  chainId: number,
  address: string
): TokenInfo | undefined {
  const list = TOKENS_BY_CHAIN[chainId] ?? [];
  const lower = address.toLowerCase();
  return list.find((t) => t.address.toLowerCase() === lower);
}
