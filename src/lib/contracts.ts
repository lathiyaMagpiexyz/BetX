import type { Abi, Address } from "viem";
import giveawayAbi from "@/lib/abi/Giveaway.json";
import factoryAbi from "@/lib/abi/GiveawayFactory.json";
import erc20Abi from "@/lib/abi/erc20.json";

const PLACEHOLDER_ADDR =
  "0x0000000000000000000000000000000000000000" as const;

function readAddress(envVal: string | undefined): Address {
  return ((envVal && envVal !== "") ? envVal : PLACEHOLDER_ADDR) as Address;
}

function readNumber(envVal: string | undefined, fallback: number): number {
  const n = Number(envVal);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const CONTRACTS = {
  giveawayFactory: {
    address: readAddress(process.env.NEXT_PUBLIC_GIVEAWAY_FACTORY_ADDRESS),
    abi: factoryAbi as Abi,
  },
  entryToken: {
    address: readAddress(process.env.NEXT_PUBLIC_ENTRY_TOKEN_ADDRESS),
    abi: erc20Abi as Abi,
  },
} as const;

export const giveawayInstanceAbi = giveawayAbi as Abi;

export const isFactoryConfigured =
  CONTRACTS.giveawayFactory.address !== PLACEHOLDER_ADDR;

export const ENTRY_TOKEN_DECIMALS = readNumber(
  process.env.NEXT_PUBLIC_ENTRY_TOKEN_DECIMALS,
  6
);
export const ENTRY_TOKEN_SYMBOL =
  process.env.NEXT_PUBLIC_ENTRY_TOKEN_SYMBOL || "USDC";
