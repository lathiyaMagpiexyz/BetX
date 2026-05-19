import Link from "next/link";
import {
  displaySymbol,
  formatAddress,
  formatTokenAmount,
  formatUsd,
} from "@/lib/format";
import { ENTRY_TOKEN_SYMBOL, ENTRY_TOKEN_DECIMALS } from "@/lib/contracts";
import type { IndexedGiveaway } from "@/lib/supabase";

interface Props {
  giveaway: IndexedGiveaway;
}

function settledAgo(endAt: string): string {
  const end = Number(endAt);
  const nowSec = Math.floor(Date.now() / 1000);
  const diff = nowSec - end;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3_600)}h ago`;
  if (diff < 86_400 * 30) return `${Math.floor(diff / 86_400)}d ago`;
  return `${Math.floor(diff / 86_400 / 30)}mo ago`;
}

export function SettledGiveawayCard({ giveaway }: Props) {
  const prizePool = BigInt(giveaway.prize_pool);
  const prizeSymbol = giveaway.prize_token_symbol ?? ENTRY_TOKEN_SYMBOL;
  const prizeDecimals = giveaway.prize_token_decimals ?? ENTRY_TOKEN_DECIMALS;
  const prizeUsd = formatUsd(prizePool, prizeDecimals, giveaway.prize_token_usd_price);
  const winners = giveaway.winners ?? [];
  const firstPlace = winners[0];

  return (
    <Link
      href={`/giveaways/${giveaway.address}`}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="ticket-card shine-on-hover relative h-full p-5 transition-all group-hover:border-accent/50 group-hover:-translate-y-0.5">
        {/* Top row: settled badge + age */}
        <div className="flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-2.5 py-0.5 font-bold uppercase tracking-wider text-black/80">
            🏆 Settled
          </span>
          <span className="text-muted-foreground">{settledAgo(giveaway.end_at)}</span>
        </div>

        {/* Prize amount */}
        <div className="mt-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Total paid out
          </p>
          <p className="mt-1 text-3xl font-black text-jackpot">
            {formatTokenAmount(prizePool, prizeDecimals, 0)}{" "}
            <span className="text-base font-bold text-muted-foreground">
              {displaySymbol(prizeSymbol)}
            </span>
          </p>
          {prizeUsd && (
            <p className="text-xs text-muted-foreground/70">≈ {prizeUsd}</p>
          )}
        </div>

        {/* Winner(s) */}
        <div className="mt-4 border-t border-border/60 pt-4">
          {firstPlace ? (
            <>
              <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-accent">
                🏆 Winner
              </p>
              <p className="mt-1 font-mono text-sm text-foreground">
                {formatAddress(firstPlace, 8, 6)}
              </p>
              {winners.length > 1 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  +{winners.length - 1} more winner
                  {winners.length - 1 === 1 ? "" : "s"}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Winner data loading…
            </p>
          )}
        </div>

        {/* Sponsor + CTA */}
        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
          <span className="text-muted-foreground">
            By {formatAddress(giveaway.sponsor)}
          </span>
          <span className="font-semibold text-accent transition-transform group-hover:translate-x-0.5">
            View on-chain →
          </span>
        </div>
      </div>
    </Link>
  );
}
