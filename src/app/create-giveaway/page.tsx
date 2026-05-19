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
import { displaySymbol, getExplorerTxUrl } from "@/lib/format";
import erc20Abi from "@/lib/abi/erc20.json";
import factoryAbi from "@/lib/abi/GiveawayFactory.json";

interface Tier {
  rank: number;
  amount: string;
}

const CUSTOM_OPTION = "__custom__";

export default function CreateGiveawayPage() {
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
        "Only the factory admin can launch a giveaway. Switch to the wallet that deployed the factory."
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
    const entry = displaySymbol(ENTRY_TOKEN_SYMBOL);
    return (
      <main className="container mx-auto max-w-4xl px-4 py-16">
        <header className="text-center">
          <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.3em] text-accent">
            🎰 For sponsors
            <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] tracking-wider text-accent">
              Admin wallet only
            </span>
          </span>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            <span className="text-jackpot">Run your own giveaway</span>
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
            One signature. Pick the prize token, set tier amounts and an entry
            fee, share the link. The sponsor confirms winners on close. Payouts
            settle on-chain.
          </p>
          <p className="mx-auto mt-3 max-w-lg text-xs text-muted-foreground/80">
            Launching a giveaway is gated to the factory admin wallet during the
            pilot. <Link href="/giveaways" className="text-primary underline underline-offset-2">Browse live giveaways</Link> as a player, or reach out on{" "}
            <a href="https://t.me/lottoblast" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Telegram</a>{" "}
            if you want sponsor access.
          </p>
        </header>

        <div className="mt-10">
          <EmptyWalletState
            title="Connect a wallet to sponsor a giveaway"
            description={`Players pay ${entry} per entry. You decide the prize token and amounts.`}
          />
        </div>

        {/* Value reinforcement — three crisp pillars so the page isn't dead-empty
            below the wallet card and the brand stays present. */}
        <ul className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-3">
          {[
            {
              icon: "🔒",
              title: "Escrowed prizes",
              body: "Lock the prize tokens in the Giveaway contract before launch. No manual transfers.",
            },
            {
              icon: "🎲",
              title: "Sponsor-confirmed winners",
              body: "Winners are confirmed on-chain at close. Every entry, every payout — auditable forever.",
            },
            {
              icon: "⚡",
              title: "Auto payout",
              body: `Every ${entry} of entry fees grows the 1st-place prize pool, paid out the moment winners are confirmed.`,
            },
          ].map((card) => (
            <li
              key={card.title}
              className="group rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur transition-colors hover:border-primary/40"
            >
              <span
                aria-hidden
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-jackpot text-base shadow-sm shadow-primary/30"
              >
                {card.icon}
              </span>
              <h3 className="mt-3 text-sm font-bold tracking-tight">
                {card.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {card.body}
              </p>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  const symbol = displaySymbol(selectedToken?.symbol) || "—";
  const entrySymbol = displaySymbol(ENTRY_TOKEN_SYMBOL);

  // If a wallet is connected but is NOT the factory admin, don't dump the
  // user into a form they can't submit. Show a clear "sponsor access" surface
  // with a forward path back to the player flow.
  if (isFactoryConfigured && factoryOwner && !isFactoryOwner) {
    return (
      <main className="container mx-auto max-w-2xl px-4 py-16">
        <header className="text-center">
          <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.3em] text-accent">
            🎰 For sponsors
            <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] tracking-wider text-accent">
              Admin wallet only
            </span>
          </span>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            <span className="text-jackpot">Sponsor access required</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground">
            Launching a giveaway is restricted to the factory admin during the
            pilot. The wallet you connected (
            <span className="font-mono">
              {address.slice(0, 6)}…{address.slice(-4)}
            </span>
            ) isn&apos;t on the admin list.
          </p>
        </header>

        <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border/60 bg-card/60 p-6 text-center backdrop-blur">
          <p className="text-sm text-muted-foreground">
            Want to sponsor your community&apos;s next giveaway? Drop us a line
            and we&apos;ll add your wallet to the allowlist.
          </p>
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="https://t.me/lottoblast"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              💬 Contact us on Telegram
            </a>
            <Link
              href="/giveaways"
              className="inline-flex items-center justify-center rounded-full border border-border/80 px-6 py-2.5 text-sm font-semibold text-foreground/90 transition-colors hover:border-accent/70 hover:text-accent"
            >
              🎟 Browse live giveaways
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-2xl px-4 py-12">
      <header className="text-center">
        <span className="text-xs font-medium uppercase tracking-[0.3em] text-accent">
          🎰 Launch a giveaway
        </span>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
          <span className="text-jackpot">Set the prize pool.</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Three tiers by default — 1st, 2nd, 3rd. Every entry grows the
          1st-place prize pool.
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
          <Label htmlFor="prize-token">
            <span aria-hidden>🏆</span> Prize token
          </Label>
          <div className="relative">
            <select
              id="prize-token"
              value={tokenChoice}
              onChange={(e) => setTokenChoice(e.target.value)}
              className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm transition-colors hover:border-primary/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {knownTokens.map((t) => (
                <option key={t.address} value={t.address}>
                  {displaySymbol(t.symbol)} — {t.name}
                </option>
              ))}
              <option value={CUSTOM_OPTION}>✏️ Custom token address…</option>
            </select>
            {/* Custom chevron — replaces browser-default arrow for a more crafted feel. */}
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              fill="none"
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            >
              <path
                d="m6 8 4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {tokenChoice === CUSTOM_OPTION && (
            <div className="space-y-1.5">
              <Label htmlFor="custom-token-address" className="sr-only">
                Custom ERC-20 contract address
              </Label>
              <Input
                id="custom-token-address"
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                placeholder="0x… any ERC-20 on this chain"
                aria-label="Custom ERC-20 contract address"
                aria-invalid={
                  customAddress.length > 0 && !isAddress(customAddress)
                }
                aria-describedby="custom-token-help"
                className="font-mono text-xs"
              />
              {customAddress && !isAddress(customAddress) && (
                <p id="custom-token-help" className="text-xs text-destructive">
                  Invalid address.
                </p>
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
            contract whenever they decide (typically after entries close).
          </p>
        </div>

        {/* Prize tiers */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-bold uppercase tracking-wider">
            Prize tiers ({symbol})
          </legend>
          {tiers.map((t, i) => {
            const tierId = `tier-${t.rank}-amount`;
            const placeOrdinal =
              t.rank === 1 ? "1st place" : t.rank === 2 ? "2nd place" : t.rank === 3 ? "3rd place" : `${t.rank}th place`;
            return (
              <div key={i} className="flex items-center gap-3">
                <Label htmlFor={tierId} className="sr-only">
                  {placeOrdinal} prize amount in {symbol}
                </Label>
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-jackpot text-sm font-bold text-white shadow-sm shadow-primary/30"
                >
                  {t.rank}
                </span>
                <Input
                  id={tierId}
                  type="number"
                  min="0"
                  step="any"
                  value={t.amount}
                  onChange={(e) => updateTier(i, e.target.value)}
                  placeholder="100"
                  aria-label={`${placeOrdinal} prize amount in ${symbol}`}
                  required
                />
                {tiers.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTier(i)}
                    aria-label={`Remove ${placeOrdinal} tier`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </Button>
                )}
              </div>
            );
          })}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addTier}
              className="border-dashed border-primary/40 text-primary hover:border-primary hover:bg-primary/10 hover:text-primary"
            >
              + Add tier
            </Button>
            <p
              className="text-xs text-muted-foreground"
              aria-live="polite"
            >
              Total prize pool:{" "}
              <strong className="text-jackpot text-sm font-bold">
                {totalPrize} {symbol}
              </strong>
            </p>
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="entry-fee">
              <span aria-hidden>🎟</span> Entry fee ({entrySymbol})
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
            <Label htmlFor="duration">
              <span aria-hidden>⏰</span> Duration (days)
            </Label>
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

        <div role="status" aria-live="polite" className="min-h-0">
          {error && (
            <p className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        {createdAddress && (
          <div className="rounded-lg bg-emerald-500/10 p-4 text-sm text-emerald-400">
            <p className="font-semibold">🎉 Giveaway launched!</p>
            <p className="mt-1">
              Address:{" "}
              <Link
                href={`/giveaways/${createdAddress}`}
                className="font-mono underline"
              >
                {createdAddress}
              </Link>
            </p>
          </div>
        )}

        {createdTx && !createdAddress && (
          <p className="text-sm text-muted-foreground">
            Tx submitted:{" "}
            <a
              href={getExplorerTxUrl(createdTx)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono underline hover:text-primary"
            >
              {createdTx.slice(0, 12)}…
            </a>{" "}
            waiting for confirmation…
          </p>
        )}

        <Button
          type="submit"
          disabled={isPending}
          size="lg"
          className="w-full bg-jackpot text-white glow-pink transition-transform hover:scale-[1.01]"
        >
          {step === "creating" ? "Launching giveaway…" : "🎰 Launch giveaway"}
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
