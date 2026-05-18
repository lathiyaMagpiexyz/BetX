import { formatUnits } from "viem";
import { ENTRY_TOKEN_DECIMALS } from "@/lib/contracts";

/**
 * Format an amount in the factory's ENTRY token (fixed at deploy).
 * Use this for ticket prices and other entry-token denominated values.
 */
export function formatEntry(amount: bigint | undefined, fractionDigits = 2): string {
  return formatTokenAmount(amount, ENTRY_TOKEN_DECIMALS, fractionDigits);
}

/**
 * Format an amount given an explicit decimals value. Use this when displaying
 * a prize amount in an arbitrary ERC-20 (not the entry token).
 */
export function formatTokenAmount(
  amount: bigint | undefined,
  decimals: number,
  fractionDigits = 2
): string {
  if (amount === undefined) return "—";
  const num = Number(formatUnits(amount, decimals));
  return num.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/**
 * Convert a token amount to its USD-equivalent string ("$X.XX").
 * Returns `null` if no price is known — callers can hide the line.
 */
export function formatUsd(
  amount: bigint | undefined,
  decimals: number,
  usdPrice: number | undefined
): string | null {
  if (amount === undefined || usdPrice === undefined) return null;
  const tokens = Number(formatUnits(amount, decimals));
  const usd = tokens * usdPrice;
  if (usd >= 1) {
    return (
      "$" +
      usd.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }
  // Show more precision for sub-dollar values (rare, but happens for small
  // amounts of stable-pegged tokens).
  return (
    "$" +
    usd.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    })
  );
}

export function formatAddress(addr: string | undefined, lead = 6, tail = 4): string {
  if (!addr) return "";
  if (addr.length <= lead + tail) return addr;
  return `${addr.slice(0, lead)}…${addr.slice(-tail)}`;
}

export function formatTimeRemaining(endAt: bigint | number | string | undefined): string {
  if (endAt === undefined) return "—";
  const end = typeof endAt === "bigint" ? Number(endAt) : Number(endAt);
  const nowSec = Math.floor(Date.now() / 1000);
  let diff = end - nowSec;
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86_400);
  diff -= days * 86_400;
  const hours = Math.floor(diff / 3_600);
  diff -= hours * 3_600;
  const minutes = Math.floor(diff / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Strip the conventional "t" prefix from testnet-mock token symbols
 * (tUSDT → USDT, tWBNB → WBNB) so the UI shows familiar mainnet names
 * while the on-chain symbol stays untouched. Only strips when the next
 * character is uppercase, so real symbols like "tBTC" or "token" are
 * left alone if they ever appear.
 */
export function displaySymbol(symbol: string | undefined): string {
  if (!symbol) return "";
  if (
    symbol.length > 1 &&
    symbol[0] === "t" &&
    symbol[1] === symbol[1].toUpperCase() &&
    symbol[1] !== symbol[1].toLowerCase()
  ) {
    return symbol.slice(1);
  }
  return symbol;
}

export function statusLabel(status: number | undefined): string {
  switch (status) {
    case 0:
      return "Open";
    case 1:
      return "Drawing";
    case 2:
      return "Resolved";
    default:
      return "Unknown";
  }
}
