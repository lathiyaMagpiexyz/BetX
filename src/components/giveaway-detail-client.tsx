"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { isAddress } from "viem";
import type { Address } from "viem";
import { Button } from "@/components/ui/button";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { useGiveaway } from "@/hooks/use-giveaway";
import {
  displaySymbol,
  formatEntry,
  formatTimeRemaining,
  formatTokenAmount,
  formatUsd,
  getExplorerTxUrl,
  statusLabel,
} from "@/lib/format";
import {
  isFactoryConfigured,
  ENTRY_TOKEN_SYMBOL,
  ENTRY_TOKEN_DECIMALS,
} from "@/lib/contracts";
import type { IndexedGiveaway } from "@/lib/supabase";

interface Props {
  initial: IndexedGiveaway;
}

export function GiveawayDetailClient({ initial }: Props) {
  const giveaway = initial;
  const address = giveaway.address as Address;
  const { address: userAddress, isConnected } = useAccount();
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [winnerInputs, setWinnerInputs] = useState<string[]>([]);
  const [selectionSuccess, setSelectionSuccess] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const onChain = useGiveaway(address);
  const liveEntryFee = onChain.entryFee ?? BigInt(giveaway.entry_fee);
  // Prize pool is fixed at the sponsor-set tier amounts. Entry fees do NOT
  // add to it — they stay in the contract as sponsor revenue.
  const totalPool = BigInt(giveaway.prize_pool);
  // Prize-token metadata. Falls back to entry token if not enriched.
  const prizeSymbol = displaySymbol(
    giveaway.prize_token_symbol ?? ENTRY_TOKEN_SYMBOL
  );
  const entrySymbol = displaySymbol(ENTRY_TOKEN_SYMBOL);
  const prizeDecimals = giveaway.prize_token_decimals ?? ENTRY_TOKEN_DECIMALS;
  const prizeUsd = formatUsd(
    totalPool,
    prizeDecimals,
    giveaway.prize_token_usd_price
  );
  const liveStatus = (onChain.state as readonly bigint[] | undefined)?.[0];
  const numWinners = Number(
    (onChain.state as readonly bigint[] | undefined)?.[4] ?? 0n
  );
  const numEntrants = Number(
    (onChain.state as readonly bigint[] | undefined)?.[3] ??
      BigInt(giveaway.num_entrants)
  );
  const status = liveStatus !== undefined ? Number(liveStatus) : 0;
  const sponsor = onChain.sponsor as Address | undefined;
  const isOwner =
    isConnected && userAddress !== undefined && sponsor === userAddress;

  const endedAt = Number(giveaway.end_at);
  const ended = endedAt <= Math.floor(Date.now() / 1000) || status >= 1;

  useEffect(() => {
    if (numWinners > 0 && winnerInputs.length !== numWinners) {
      setWinnerInputs(Array(numWinners).fill(""));
    }
  }, [numWinners, winnerInputs.length]);

  async function handleEnter() {
    setError(null);
    setTxHash(null);
    try {
      const hash = await onChain.enterPaid();
      setTxHash(hash);
      onChain.refetchState();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const short = msg.includes("User rejected")
        ? "Transaction rejected in wallet."
        : msg.includes("insufficient")
        ? `Not enough ${entrySymbol}. Top up your wallet and retry.`
        : msg.length > 200
        ? msg.slice(0, 200) + "…"
        : msg;
      setError(short);
    }
  }

  async function handleSelectWinners() {
    setError(null);
    setTxHash(null);
    setSelectionSuccess(null);

    const addresses = winnerInputs.map((v) => v.trim());
    if (addresses.some((a) => a === "")) {
      setError("Please enter all winner addresses.");
      return;
    }
    if (addresses.some((a) => !isAddress(a))) {
      setError("One or more winner addresses are invalid.");
      return;
    }

    try {
      setIsSelecting(true);
      const hash = await onChain.selectWinners(addresses as Address[]);
      setSelectionSuccess(hash);
      onChain.refetchState();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const short = msg.includes("User rejected")
        ? "Transaction rejected in wallet."
        : msg.length > 200
        ? msg.slice(0, 200) + "…"
        : msg;
      setError(short);
    } finally {
      setIsSelecting(false);
    }
  }

  const buttonState: { label: string; disabled: boolean; helper?: string } =
    (() => {
      if (ended)
        return {
          label: "🔒 Entries closed",
          disabled: true,
          helper: "Watch this page — the sponsor will pick winners soon.",
        };
      if (!isConnected)
        return {
          label: "Connect wallet to enter",
          disabled: true,
          helper: "Your wallet is your entry record.",
        };
      if (onChain.hasEntered)
        return {
          label: "🎟️ You're in the giveaway",
          disabled: true,
          helper: "Open /my-entries after the giveaway settles to claim your prize.",
        };
      if (!isFactoryConfigured)
        return {
          label: "Contract not deployed",
          disabled: true,
          helper:
            "Run forge script script/Deploy.s.sol --broadcast and set NEXT_PUBLIC_GIVEAWAY_FACTORY_ADDRESS.",
        };
      if (onChain.isEntering || onChain.enterStep !== "idle") {
        const stepLabel =
          onChain.enterStep === "approving"
            ? `Approving ${entrySymbol}… (1 of 2)`
            : onChain.enterStep === "entering"
            ? "Submitting entry… (2 of 2)"
            : "Confirming…";
        return { label: stepLabel, disabled: true };
      }
      return {
        label: `🎟 Enter (${formatEntry(liveEntryFee)} ${entrySymbol})`,
        disabled: false,
      };
    })();

  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      {/* Status banner */}
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <span className="rounded-full bg-primary/15 px-2.5 py-1 font-bold text-primary">
          {status === 0 ? (
            <>
              <span aria-hidden>🎟</span> Live giveaway
            </>
          ) : (
            statusLabel(status)
          )}
        </span>
        <span>·</span>
        <span>
          {ended ? "Closed" : `Ends in ${formatTimeRemaining(giveaway.end_at)}`}
        </span>
      </div>

      {/* Hero prize-pool number — elevated ticket-card with perforated edges */}
      <div className="ticket-card relative p-8 text-center sm:p-12">
        {/* Perforated rails on the left and right edges */}
        <div
          aria-hidden
          className="perforation pointer-events-none absolute inset-y-0 left-0 w-2"
        />
        <div
          aria-hidden
          className="perforation pointer-events-none absolute inset-y-0 right-0 w-2"
        />
        <div className="text-xs font-medium uppercase tracking-[0.3em] text-accent">
          Total prize pool
        </div>
        {totalPool === 0n ? (
          <div className="prize-pulse mt-3 text-3xl font-bold tracking-tight text-muted-foreground sm:text-4xl">
            Awaiting prize confirmation
          </div>
        ) : (
          <div className="prize-pulse mt-3 text-6xl font-black tracking-tight text-jackpot sm:text-7xl">
            {formatTokenAmount(totalPool, prizeDecimals, 0)}
          </div>
        )}
        <div className="mt-2 text-sm font-medium text-muted-foreground">
          {prizeSymbol}
        </div>
        {prizeUsd && (
          <div className="mt-1 text-sm text-muted-foreground/80">
            ≈ {prizeUsd}
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Sponsored by {giveaway.sponsor.slice(0, 8)}…{giveaway.sponsor.slice(-6)}{" "}
          · {numEntrants} entries
        </p>
      </div>

      {/* Stats row */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Prize pool"
          value={`${formatTokenAmount(BigInt(giveaway.prize_pool), prizeDecimals, 0)} ${prizeSymbol}`}
          accent
        />
        <Stat
          label="Entry fee"
          value={`${formatEntry(liveEntryFee)} ${entrySymbol}`}
        />
        <Stat
          label="Entries"
          value={String(numEntrants)}
        />
      </div>

      {/* Sponsor winner selection (only visible to sponsor, only after end) */}
      {isOwner && ended && status !== 2 ? (
        <section className="mt-10 rounded-2xl border border-accent/30 bg-accent/5 p-6 backdrop-blur">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-accent">
            🏆 Sponsor controls
          </div>
          <h2 className="mt-2 text-2xl font-bold">Pick the winners</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Submit winning wallet addresses on-chain. Each winner receives their
            tier amount from the prize pool.
          </p>
          <div className="mt-5 space-y-3">
            {winnerInputs.map((input, i) => (
              <label key={i} className="block text-sm">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Winner #{i + 1}{" "}
                  {i === 0 && (
                    <span className="text-accent">(grand prize + bonus)</span>
                  )}
                </span>
                <input
                  value={input}
                  onChange={(e) => {
                    const next = [...winnerInputs];
                    next[i] = e.target.value;
                    setWinnerInputs(next);
                  }}
                  className="mt-1 w-full rounded-lg border border-border bg-background/70 px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="0x…"
                />
              </label>
            ))}
          </div>
          {selectionSuccess && (
            <p className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400">
              ✅ Winners confirmed on-chain.{" "}
              <a
                href={getExplorerTxUrl(selectionSuccess)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono underline hover:text-emerald-300"
              >
                {selectionSuccess.slice(0, 12)}…
              </a>
            </p>
          )}
          <Button
            onClick={handleSelectWinners}
            disabled={isSelecting}
            size="lg"
            className="mt-5 w-full bg-jackpot text-white glow-pink"
          >
            {isSelecting ? "Confirming…" : "🎰 Confirm winners on-chain"}
          </Button>
        </section>
      ) : null}

      {/* How a FairDrop giveaway works */}
      <section className="mt-10 rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur">
        <h2 className="text-base font-bold uppercase tracking-wider text-muted-foreground">
          How this giveaway works
        </h2>
        <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">🎟 Step 1.</strong> Pay the
            entry fee of {formatEntry(liveEntryFee)} {entrySymbol}. First
            signature approves the spend, second submits your entry.
          </li>
          <li>
            <strong className="text-foreground">📈 Step 2.</strong> Every entry
            is recorded on-chain. One per wallet. The prize pool is fixed — your
            entry fee goes to the sponsor.
          </li>
          <li>
            <strong className="text-foreground">🏆 Step 3.</strong> When the
            timer runs out, the sponsor confirms winners. The contract pays
            prizes automatically in the same transaction.
          </li>
        </ol>
      </section>

      {/* Enter CTA */}
      <section className="mt-8 rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div className="flex-1">
          <h2 className="text-base font-bold">
            {ended ? "🔒 Entries closed" : "🎟 Ready to play?"}
          </h2>
          {buttonState.helper && (
            <p className="mt-1 text-sm text-muted-foreground">
              {buttonState.helper}
            </p>
          )}
          <div role="status" aria-live="polite" className="min-h-0">
            {error && (
              <p className="mt-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          {txHash && (
            <p className="mt-2 text-sm text-emerald-400">
              ✅ Entry confirmed:{" "}
              <a
                href={getExplorerTxUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono underline hover:text-emerald-300"
              >
                {txHash.slice(0, 12)}…
              </a>
            </p>
          )}
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:mt-0 sm:items-end">
          {!isConnected ? (
            <ConnectWalletButton />
          ) : (
            <Button
              onClick={handleEnter}
              disabled={buttonState.disabled}
              size="lg"
              className={
                buttonState.disabled
                  ? ""
                  : "bg-jackpot text-white glow-pink transition-transform hover:scale-[1.02]"
              }
            >
              {buttonState.label}
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            One entry per wallet. Entry fee is sponsor revenue.
          </p>
        </div>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/30 p-4 backdrop-blur">
      <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 text-xl font-bold ${
          accent ? "text-accent" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
