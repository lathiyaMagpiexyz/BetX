/**
 * Curated list of prize-token options per chain.
 *
 * The Giveaway contract accepts ANY ERC-20 as a prize token — the entry token
 * is fixed at factory deployment, but each lottery picks its own prize token.
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

  // BSC Mainnet (chain 56) — canonical addresses from BscScan, manually
  // verified. Keep this short and curated; sponsors will paste custom
  // addresses for anything exotic.
  [bsc.id]: [
    {
      address: "0x55d398326f99059fF775485246999027B3197955",
      symbol: "USDT",
      decimals: 18,
      name: "Tether USD",
      usdPrice: 1.0,
    },
    {
      address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      symbol: "USDC",
      decimals: 18,
      name: "USD Coin",
      usdPrice: 1.0,
    },
    {
      address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
      symbol: "BUSD",
      decimals: 18,
      name: "Binance USD",
      usdPrice: 1.0,
    },
    {
      address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
      symbol: "CAKE",
      decimals: 18,
      name: "PancakeSwap Token",
      usdPrice: 2.5,
    },
    {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "WBNB",
      decimals: 18,
      name: "Wrapped BNB",
      usdPrice: 600.0,
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
