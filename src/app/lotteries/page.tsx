import Link from "next/link";
import { LotteryCard } from "@/components/lottery-card";
import { SettledLotteryCard } from "@/components/settled-lottery-card";
import {
  fetchActiveGiveaways,
  fetchSettledGiveaways,
  isSupabaseConfigured,
} from "@/lib/supabase";

export const metadata = {
  title: "Live draws · LottoBlast",
  description:
    "Browse every live LottoBlast draw. Buy a ticket in one signature and watch the jackpot grow.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FACTORY = process.env.NEXT_PUBLIC_GIVEAWAY_FACTORY_ADDRESS;
const factoryConfigured =
  !!FACTORY &&
  FACTORY.toLowerCase() !== "0x0000000000000000000000000000000000000000";

function dataSourceLabel(): string {
  if (isSupabaseConfigured) {
    return "Indexed from on-chain events · auto-refreshes every 30s";
  }
  if (factoryConfigured) {
    return "Reading live from the chain · refreshes on every load";
  }
  return "Demo data — set NEXT_PUBLIC_GIVEAWAY_FACTORY_ADDRESS to see real draws";
}

export default async function LotteriesPage() {
  const [live, settled] = await Promise.all([
    fetchActiveGiveaways(),
    fetchSettledGiveaways(12),
  ]);

  return (
    <main className="container mx-auto px-4 py-16">
      <header className="mx-auto max-w-3xl text-center">
        <span className="text-xs font-medium uppercase tracking-[0.3em] text-accent">
          🎰 Live now
        </span>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
          <span className="text-jackpot">Pick a draw. Buy a ticket.</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {dataSourceLabel()}
        </p>
      </header>

      {/* Live draws */}
      <section className="mt-12">
        {live.length === 0 ? (
          <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border/60 p-12 text-center">
            <div className="text-5xl">🎟️</div>
            <p className="mt-4 text-base font-semibold">
              No live draws right now.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Be the first sponsor —{" "}
              <Link
                href="/create-draw"
                className="font-medium text-primary underline"
              >
                run a draw
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((g) => (
              <LotteryCard key={g.address} giveaway={g} />
            ))}
          </div>
        )}
      </section>

      {/* Recently settled */}
      {settled.length > 0 && (
        <section className="mt-24">
          <div className="text-center">
            <span className="text-xs font-medium uppercase tracking-[0.3em] text-accent">
              🏆 Recently settled
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Past <span className="text-jackpot">winners</span>
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Every payout is permanently recorded on-chain. Click any draw to
              see the full receipt.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {settled.map((g) => (
              <SettledLotteryCard key={g.address} giveaway={g} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
