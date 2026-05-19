"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { EmptyWalletState } from "@/components/empty-wallet-state";
import {
  fetchEntriesForWallet,
  fetchWinsForWallet,
  type IndexedEntry,
  type IndexedWinner,
} from "@/lib/supabase";
import {
  displaySymbol,
  formatAddress,
  formatEntry,
  getExplorerTxUrl,
} from "@/lib/format";
import { ENTRY_TOKEN_SYMBOL } from "@/lib/contracts";

const ENTRY_SYMBOL = displaySymbol(ENTRY_TOKEN_SYMBOL);

export default function MyTicketsPage() {
  const { address, isConnected } = useAccount();
  const [entries, setEntries] = useState<IndexedEntry[]>([]);
  const [wins, setWins] = useState<IndexedWinner[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    Promise.all([
      fetchEntriesForWallet(address),
      fetchWinsForWallet(address),
    ])
      .then(([e, w]) => {
        setEntries(e);
        setWins(w);
      })
      .finally(() => setLoading(false));
  }, [address]);

  if (!isConnected || !address) {
    return (
      <main className="container mx-auto px-4 py-16">
        <h1 className="mb-4 text-center text-4xl font-black tracking-tight">
          <span className="text-jackpot">My tickets</span>
        </h1>
        <div className="mt-8">
          <EmptyWalletState />
        </div>
      </main>
    );
  }

  const unclaimedWins = wins.filter((w) => !w.claimed);

  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <header className="mb-10 text-center">
        <span className="text-xs font-medium uppercase tracking-[0.3em] text-accent">
          🎟️ Your activity
        </span>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
          <span className="text-jackpot">My tickets</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {formatAddress(address)} · {entries.length} tickets · {wins.length}{" "}
          wins
        </p>
      </header>

      {unclaimedWins.length > 0 && (
        <section className="mb-8 rounded-2xl border border-accent/40 bg-accent/10 p-6 backdrop-blur">
          <h2 className="flex items-center gap-2 text-lg font-bold text-accent">
            🎉 You won! {unclaimedWins.length} unclaimed prize
            {unclaimedWins.length > 1 ? "s" : ""}
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {unclaimedWins.map((w) => (
              <li
                key={`${w.giveaway}-${w.rank}`}
                className="flex items-center justify-between rounded-lg bg-background/40 p-3"
              >
                <span>
                  Rank #{w.rank} ·{" "}
                  <Link
                    href={`/lotteries/${w.giveaway}`}
                    className="font-mono text-accent underline"
                  >
                    {formatAddress(w.giveaway)}
                  </Link>
                </span>
                <span className="font-bold text-jackpot">
                  {formatEntry(BigInt(w.amount))} {ENTRY_SYMBOL}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Prizes auto-pay when winners are confirmed. The claim button is only
            needed if the auto-pay reverted — open the draw to claim manually.
          </p>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-bold uppercase tracking-wider text-muted-foreground">
          Tickets you've bought
        </h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center">
            <div className="text-5xl">🎟️</div>
            <p className="mt-4 font-semibold">No tickets yet.</p>
            <Button
              asChild
              size="sm"
              className="mt-4 bg-jackpot text-white glow-pink"
            >
              <Link href="/lotteries">Browse live draws</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-card/50 backdrop-blur">
            {entries.map((e) => (
              <li
                key={e.tx_hash}
                className="flex items-center justify-between p-4 text-sm"
              >
                <div>
                  <p className="font-medium">
                    <Link
                      href={`/lotteries/${e.giveaway}`}
                      className="hover:text-primary"
                    >
                      {formatAddress(e.giveaway)}
                    </Link>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    🎟 Ticket: {formatEntry(BigInt(e.fee_paid))}{" "}
                    {ENTRY_SYMBOL} · Block {e.block_number}
                  </p>
                </div>
                <a
                  href={getExplorerTxUrl(e.tx_hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-muted-foreground hover:text-primary"
                >
                  {formatAddress(e.tx_hash)}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
