"use client";

import { useMemo, useState } from "react";
import {
  useAccount,
  useWriteContract,
  usePublicClient,
  useReadContract,
  useChainId,
} from "wagmi";
import { isAddress, parseUnits, decodeEventLog, type Address } from "viem";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyWalletState } from "@/components/empty-wallet-state";
import {
  CONTRACTS,
  ENTRY_TOKEN_DECIMALS,
  ENTRY_TOKEN_SYMBOL,
  isFactoryConfigured,
} from "@/lib/contracts";
import { getKnownTokens, findKnownToken, type TokenInfo } from "@/lib/tokens";
import { displaySymbol } from "@/lib/format";
import erc20Abi from "@/lib/abi/erc20.json";
import factoryAbi from "@/lib/abi/GiveawayFactory.json";

interface Tier {
  rank: number;
  amount: string;
}

const CUSTOM_OPTION = "__custom__";

export default function CreateDrawPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient();

  const { data: factoryOwner } = useReadContract({
    address: CONTRACTS.giveawayFactory.address,
    abi: CONTRACTS.giveawayFactory.abi,
    functionName: "owner",
    query: { enabled: isFactoryConfigured, staleTime: Infinity },
  });
  const isFactoryOwner =
    !!address &&
    !!factoryOwner &&
    (factoryOwner as Address).toLowerCase() === address.toLowerCase();

  // --- Prize token picker -------------------------------------------------
  const knownTokens = useMemo<TokenInfo[]>(() => {
    // Always include the configured entry token first so the previous behavior
    // (use entry token as the prize token) stays a one-click default.
    const list = getKnownTokens(chainId);
    const hasEntry = list.some(
      (t) =>
        t.address.toLowerCase() ===
        CONTRACTS.entryToken.address.toLowerCase()
    );
    if (hasEntry) return list;
    return [
      {
        address: CONTRACTS.entryToken.address,
        symbol: ENTRY_TOKEN_SYMBOL,
        decimals: ENTRY_TOKEN_DECIMALS,
        name: `${displaySymbol(ENTRY_TOKEN_SYMBOL)} (entry token)`,
      },
      ...list,
    ];
  }, [chainId]);

  const [tokenChoice, setTokenChoice] = useState<string>(
    knownTokens[0]?.address ?? CONTRACTS.entryToken.address
  );
  const [customAddress, setCustomAddress] = useState("");

  // Resolve the actual selected token. If the user picked "Custom", we read
  // decimals + symbol on-the-fly from the chain so amounts parse correctly.
  const customIsValid =
    tokenChoice === CUSTOM_OPTION && isAddress(customAddress);

  const { data: customDecimals } = useReadContract({
    address: customIsValid ? (customAddress as Address) : undefined,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: customIsValid },
  });
  const { data: customSymbol } = useReadContract({
    address: customIsValid ? (customAddress as Address) : undefined,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: customIsValid },
  });

  const selectedToken: TokenInfo | null = useMemo(() => {
    if (tokenChoice === CUSTOM_OPTION) {
      if (!customIsValid || customDecimals === undefined) return null;
      return {
        address: customAddress as Address,
        symbol: (customSymbol as string) ?? "TOKEN",
        decimals: Number(customDecimals),
        name: "Custom token",
      };
    }
    return findKnownToken(chainId, tokenChoice) ?? knownTokens[0] ?? null;
  }, [
    tokenChoice,
    customIsValid,
    customAddress,
    customSymbol,
    customDecimals,
    chainId,
    knownTokens,
  ]);

  // --- Tiers + form state -------------------------------------------------
  const [tiers, setTiers] = useState<Tier[]>([
    { rank: 1, amount: "300" },
    { rank: 2, amount: "200" },
    { rank: 3, amount: "100" },
  ]);
  const [entryFee, setEntryFee] = useState("1");
  const [durationDays, setDurationDays] = useState("3");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"idle" | "creating" | "done">("idle");
  const [createdTx, setCreatedTx] = useState<string | null>(null);
  const [createdAddress, setCreatedAddress] = useState<Address | null>(null);

  const totalPrize = tiers.reduce((s, t) => s + (Number(t.amount) || 0), 0);

  function updateTier(idx: number, amount: string) {
    setTiers((cur) => cur.map((t, i) => (i === idx ? { ...t, amount } : t)));
  }
  function addTier() {
    setTiers((cur) => [...cur, { rank: cur.length + 1, amount: "" }]);
  }
  function removeTier(idx: number) {
    setTiers((cur) =>
      cur.filter((_, i) => i !== idx).map((t, i) => ({ ...t, rank: i + 1 }))
    );
  }

  async function handleCreate() {
    setError(null);
    setCreatedTx(null);
    setCreatedAddress(null);

    if (!isFactoryConfigured) {
      setError(
        "Factory contract not deployed. Run forge script script/Deploy.s.sol --broadcast and set NEXT_PUBLIC_GIVEAWAY_FACTORY_ADDRESS."
      );
      return;
    }
    if (!isFactoryOwner) {
      setError(
        "Only the factory admin can launch a draw. Switch to the wallet that deployed the factory."
      );
      return;
    }
    if (!selectedToken) {
      setError(
        tokenChoice === CUSTOM_OPTION
          ? "Custom token address is invalid or unreadable."
          : "Pick a prize token."
      );
      return;
    }
    if (totalPrize <= 0) {
      setError("Tiers must sum to a positive amount.");
      return;
    }
    if (!publicClient) {
      setError("Wallet not ready — try refreshing the page.");
      return;
    }

    try {
      // Entry fee is always in the factory's entry token (immutable in
      // contract) — parse it with the entry token's decimals.
      const fee = parseUnits(entryFee || "0", ENTRY_TOKEN_DECIMALS);
      // Tier prizes are in the SELECTED prize token — parse with its decimals.
      const tierStructs = tiers.map((t) => ({
        rank: t.rank,
        amount: parseUnits(t.amount || "0", selectedToken.decimals),
      }));
      const endAt = BigInt(
        Math.floor(Date.now() / 1000) +
          Math.max(1, Number(durationDays)) * 86_400
      );

      setStep("creating");

      const hash = await writeContractAsync({
        address: CONTRACTS.giveawayFactory.address,
        abi: CONTRACTS.giveawayFactory.abi,
        functionName: "create",
        args: [selectedToken.address, tierStructs, fee, endAt],
      });

      setCreatedTx(hash);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: factoryAbi,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "GiveawayCreated") {
            const args = decoded.args as unknown as { giveaway: Address };
            setCreatedAddress(args.giveaway);
            break;
          }
        } catch {
          // not our event
        }
      }

      setStep("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.length > 200 ? msg.slice(0, 200) + "…" : msg);
      setStep("idle");
    }
  }

  if (!isConnected || !address) {
    return (
      <main className="container mx-auto px-4 py-16">
        <h1 className="mb-4 text-center text-4xl font-black tracking-tight">
          <span className="text-jackpot">Run your own lottery</span>
        </h1>
        <p className="mx-auto max-w-md text-center text-sm text-muted-foreground">
          One signature. Pick the prize token, set tier amounts and a ticket
          price, share the link.
        </p>
        <div className="mt-8">
          <EmptyWalletState
            title="Connect a wallet to sponsor a draw"
            description={`Players pay you ${displaySymbol(ENTRY_TOKEN_SYMBOL)} per ticket. You decide the prize token and amounts.`}
          />
        </div>
      </main>
    );
  }

  const symbol = displaySymbol(selectedToken?.symbol) || "—";
  const entrySymbol = displaySymbol(ENTRY_TOKEN_SYMBOL);

  return (
    <main className="container mx-auto max-w-2xl px-4 py-12">
      <header className="text-center">
        <span className="text-xs font-medium uppercase tracking-[0.3em] text-accent">
          🎰 Launch a draw
        </span>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
          <span className="text-jackpot">Set the jackpot.</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Three tiers by default — 1st, 2nd, 3rd. Every ticket sold pumps the
          1st-place jackpot.
        </p>
      </header>

      <form
        className="mt-10 space-y-6 rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur"
        onSubmit={(e) => {
          e.preventDefault();
          handleCreate();
        }}
      >
        {/* Prize token picker */}
        <div className="space-y-2">
          <Label htmlFor="prize-token">🏆 Prize token</Label>
          <select
            id="prize-token"
            value={tokenChoice}
            onChange={(e) => setTokenChoice(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {knownTokens.map((t) => (
              <option key={t.address} value={t.address}>
                {displaySymbol(t.symbol)} — {t.name}
              </option>
            ))}
            <option value={CUSTOM_OPTION}>✏️ Custom token address…</option>
          </select>

          {tokenChoice === CUSTOM_OPTION && (
            <div className="space-y-1.5">
              <Input
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                placeholder="0x… any ERC-20 on this chain"
                className="font-mono text-xs"
              />
              {customAddress && !isAddress(customAddress) && (
                <p className="text-xs text-destructive">Invalid address.</p>
              )}
              {customIsValid && customDecimals !== undefined && customSymbol ? (
                <p className="text-xs text-emerald-400">
                  ✓ {displaySymbol(String(customSymbol))} · {Number(customDecimals)} decimals
                </p>
              ) : customIsValid ? (
                <p className="text-xs text-muted-foreground">
                  Reading token metadata…
                </p>
              ) : null}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Winners receive this token. Sponsor sends this token to the
            contract whenever they decide (typically after the draw).
          </p>
        </div>

        {/* Prize tiers */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-bold uppercase tracking-wider">
            Prize tiers ({symbol})
          </legend>
          {tiers.map((t, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-jackpot text-sm font-bold text-white">
                {t.rank}
              </span>
              <Input
                type="number"
                min="0"
                step="any"
                value={t.amount}
                onChange={(e) => updateTier(i, e.target.value)}
                placeholder="100"
                required
              />
              {tiers.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTier(i)}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTier}
            className="border-dashed"
          >
            + Add tier
          </Button>
          <p className="text-xs text-muted-foreground">
            Total prize pool:{" "}
            <strong className="text-foreground">
              {totalPrize} {symbol}
            </strong>
          </p>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="entry-fee">
              🎟 Ticket price ({entrySymbol})
            </Label>
            <Input
              id="entry-fee"
              type="number"
              min="0"
              step="any"
              value={entryFee}
              onChange={(e) => setEntryFee(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Always in {entrySymbol} (set at factory deploy). 0 = free.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">⏰ Duration (days)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              step="1"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              required
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {createdAddress && (
          <div className="rounded-lg bg-emerald-500/10 p-4 text-sm text-emerald-400">
            <p className="font-semibold">🎉 Draw launched!</p>
            <p className="mt-1">
              Address:{" "}
              <Link
                href={`/lotteries/${createdAddress}`}
                className="font-mono underline"
              >
                {createdAddress}
              </Link>
            </p>
          </div>
        )}

        {createdTx && !createdAddress && (
          <p className="text-sm text-muted-foreground">
            Tx submitted: {createdTx.slice(0, 12)}… waiting for confirmation…
          </p>
        )}

        <Button
          type="submit"
          disabled={isPending}
          size="lg"
          className="w-full bg-jackpot text-white glow-pink transition-transform hover:scale-[1.01]"
        >
          {step === "creating" ? "Launching draw…" : "🎰 Launch the draw"}
        </Button>

        {!isFactoryConfigured && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            ⚠ Factory not deployed. Run the Foundry deploy script + set{" "}
            <code className="font-mono text-xs">
              NEXT_PUBLIC_GIVEAWAY_FACTORY_ADDRESS
            </code>{" "}
            in <code className="font-mono text-xs">.env.local</code> first.
          </p>
        )}
      </form>
    </main>
  );
}
