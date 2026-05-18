"use client";

import { useReadContract, useWriteContract, useAccount } from "wagmi";
import type { Address } from "viem";
import { CONTRACTS, giveawayInstanceAbi } from "@/lib/contracts";

/**
 * Read + write hooks for a single Giveaway contract instance.
 *
 * Read fields are cached for 15s. `entryFee` is cached forever (immutable
 * on the contract). The `enterPaid()` function sequences USDC.approve +
 * Giveaway.enter() into a single awaitable: the page renders one button,
 * the user signs twice (once if allowance is already sufficient).
 */
export function useGiveaway(address: Address) {
  const { address: user } = useAccount();

  const { data: state, refetch: refetchState } = useReadContract({
    address,
    abi: giveawayInstanceAbi,
    functionName: "getState",
    query: { staleTime: 15_000 },
  });

  const { data: hasEntered } = useReadContract({
    address,
    abi: giveawayInstanceAbi,
    functionName: "hasEntered",
    args: user ? [user] : undefined,
    query: { enabled: !!user, staleTime: 15_000 },
  });

  const { data: entryFee } = useReadContract({
    address,
    abi: giveawayInstanceAbi,
    functionName: "entryFee",
    query: { staleTime: Infinity },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.entryToken.address,
    abi: CONTRACTS.entryToken.abi,
    functionName: "allowance",
    args: user ? [user, address] : undefined,
    query: { enabled: !!user, staleTime: 15_000 },
  });

  const { data: sponsor } = useReadContract({
    address,
    abi: giveawayInstanceAbi,
    functionName: "sponsor",
    query: { staleTime: Infinity },
  });

  const { data: entrants } = useReadContract({
    address,
    abi: giveawayInstanceAbi,
    functionName: "entrants",
    query: { staleTime: 15_000 },
  });

  const { writeContractAsync, isPending: isEntering } = useWriteContract();

  async function enterPaid() {
    if (entryFee === undefined) {
      throw new Error("Entry fee not loaded yet — wait for state to settle");
    }
    const fee = entryFee as bigint;

    if (((allowance as bigint | undefined) ?? 0n) < fee) {
      await writeContractAsync({
        address: CONTRACTS.entryToken.address,
        abi: CONTRACTS.entryToken.abi,
        functionName: "approve",
        args: [address, fee],
      });
      await refetchAllowance();
    }

    return writeContractAsync({
      address,
      abi: giveawayInstanceAbi,
      functionName: "enter",
      args: [],
    });
  }

  async function selectWinners(selectedWinners: Address[]) {
    return writeContractAsync({
      address,
      abi: giveawayInstanceAbi,
      functionName: "selectWinners",
      args: [selectedWinners],
    });
  }

  async function claim() {
    return writeContractAsync({
      address,
      abi: giveawayInstanceAbi,
      functionName: "claim",
      args: [],
    });
  }

  return {
    state,
    entryFee: entryFee as bigint | undefined,
    allowance: allowance as bigint | undefined,
    hasEntered: hasEntered as boolean | undefined,
    sponsor: sponsor as Address | undefined,
    entrants: entrants as Address[] | undefined,
    enterPaid,
    selectWinners,
    claim,
    isEntering,
    refetchState,
    refetchAllowance,
  };
}
