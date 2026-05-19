import Link from "next/link";
import {
  displaySymbol,
  formatAddress,
  formatEntry,
  formatTimeRemaining,
  formatTokenAmount,
  formatUsd,
} from "@/lib/format";
import { ENTRY_TOKEN_SYMBOL, ENTRY_TOKEN_DECIMALS } from "@/lib/contracts";
import type { IndexedGiveaway } from "@/lib/supabase";

interface LotteryCardProps {
  giveaway: IndexedGiveaway;
}

export function LotteryCard({ giveaway }: LotteryCardProps) {
  // Jackpot is fixed at sponsor-set tier amounts. Ticket fees are NOT added
  // to the pool — they stay in the contract as sponsor revenue.
  const totalPool = BigInt(giveaway.prize_pool);
  const timeLeft = formatTimeRemaining(giveaway.end_at);
  const closingSoon =
    Number(giveaway.end_at) - Math.floor(Date.now() / 1000) < 3600;

  // Prize-token metadata (looked up in onchain.ts). Fall back to entry-token
  // defaults only if the resolver couldn't read the token.
  const prizeSymbol = giveaway.prize_token_symbol ?? ENTRY_TOKEN_SYMBOL;
  const prizeDecimals = giveaway.prize_token_decimals ?? ENTRY_TOKEN_DECIMALS;
  const prizeUsd = formatUsd(
    totalPool,
    prizeDecimals,
    giveaway.prize_token_usd_price
  );

  return (
    <Link
      href={`/lotteries/${giveaway.address}`}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="ticket-card relative h-full p-6 transition-all group-hover:border-primary/50 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-primary/20">
        {/* Top row: status + timer */}
        <div className="flex items-center justify-between text-xs">
          <span className="rounded-full bg-primary/15 px-3 py-1 font-bold uppercase tracking-wider text-primary">
            {giveaway.status === "Open" ? (
              <>
                <span aria-hidden>🎟</span> Live
              </>
            ) : (
              giveaway.status
            )}
          </span>
          <span
            className={`font-medium ${
              closingSoon ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {closingSoon && <span aria-hidden>⏰ </span>}
            {timeLeft}
          </span>
        </div>

        {/* Headline prize pool */}
        <div className="mt-6 text-center">
          <div className="text-xs font-medium uppercase tracking-[0.25em] text-accent">
            Jackpot pool
          </div>
          <div className="mt-2 text-5xl font-black tracking-tight text-jackpot">
            {formatTokenAmount(totalPool, prizeDecimals, 0)}
          </div>
          <div className="mt-1 text-sm font-medium text-muted-foreground">
            {displaySymbol(prizeSymbol)}
          </div>
          {prizeUsd && (
            <div className="mt-0.5 text-xs text-muted-foreground/70">
              ≈ {prizeUsd}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="mt-6 grid grid-cols-2 gap-2 border-t border-border/60 pt-4 text-center text-sm">
          <Stat
            label="Ticket price"
            value={`${formatEntry(BigInt(giveaway.entry_fee))}`}
            sub={displaySymbol(ENTRY_TOKEN_SYMBOL)}
          />
          <Stat
            label="Tickets sold"
            value={String(giveaway.num_entrants)}
          />
        </div>

        {/* Sponsor */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          By {formatAddress(giveaway.sponsor)}
        </p>

        {/* CTA hint */}
        <div className="mt-5 text-center text-sm font-semibold text-primary transition-transform group-hover:translate-x-0.5">
          Buy a ticket →
        </div>
      </div>
    </Link>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-bold text-foreground">{value}</p>
      {sub && (
        <p className="text-[10px] text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}
