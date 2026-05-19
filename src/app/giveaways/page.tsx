import Link from "next/link";
import { GiveawayCard } from "@/components/giveaway-card";
import { SettledGiveawayCard } from "@/components/settled-giveaway-card";
import {
  fetchActiveGiveaways,
  fetchSettledGiveaways,
  isSupabaseConfigured,
} from "@/lib/supabase";

export const metadata = {
  title: "Live BSC project giveaways · LottoBlast",
  description:
    "Browse every live LottoBlast giveaway — emerging BSC projects locking up tokens for their community. Pay USDT to enter in one signature.",
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
  return "Demo data — set NEXT_PUBLIC_GIVEAWAY_FACTORY_ADDRESS to see real giveaways";
}

export default async function GiveawaysPage() {
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
          <span className="text-jackpot">Discover BSC projects. Win their tokens.</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {dataSourceLabel()}
        </p>
      </header>

      {/* Live giveaways */}
      <section className="mt-12">
        {live.length === 0 ? (
          <div className="relative mx-auto max-w-xl">
            {/* Floating giveaway balls — pure decoration, hidden on mobile */}
            <div
              aria-hidden
              className="float-slow pointer-events-none absolute -left-6 -top-6 hidden h-12 w-12 rounded-full bg-jackpot opacity-50 blur-[2px] sm:block"
            />
            <div
              aria-hidden
              className="float-mid pointer-events-none absolute -right-4 top-12 hidden h-8 w-8 rounded-full opacity-60 sm:block"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, hsl(var(--jackpot-gold)) 0%, hsl(var(--jackpot-pink)) 70%)",
              }}
            />
            <div
              aria-hidden
              className="float-slow pointer-events-none absolute -bottom-4 left-1/3 hidden h-6 w-6 rounded-full bg-jackpot opacity-40 sm:block"
              style={{ animationDelay: "-3s" }}
            />

            <div className="ticket-card relative p-10 text-center sm:p-12">
              {/* Perforated edges echoing real tickets */}
              <div
                aria-hidden
                className="perforation absolute inset-y-0 left-0 w-2"
              />
              <div
                aria-hidden
                className="perforation absolute inset-y-0 right-0 w-2"
              />

              <span className="inline-block rounded-full bg-accent/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-accent">
                Intermission
              </span>

              <h3 className="mt-5 text-2xl font-black tracking-tight sm:text-3xl">
                The drum is{" "}
                <span className="text-jackpot">spinning empty</span>
              </h3>
              <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
                No live BSC project giveaways right now — but settled rounds
                below show the token payouts are real, instant, and on-chain.
              </p>

              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/create-giveaway"
                  className="glow-pink inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
                >
                  Run a giveaway
                </Link>
                {settled.length > 0 ? (
                  <a
                    href="#past-winners"
                    className="inline-flex items-center justify-center rounded-full border border-border/80 px-6 py-2.5 text-sm font-semibold text-foreground/90 transition-colors hover:border-accent/70 hover:text-accent"
                  >
                    See past winners ↓
                  </a>
                ) : (
                  <Link
                    href="/how-it-works"
                    className="inline-flex items-center justify-center rounded-full border border-border/80 px-6 py-2.5 text-sm font-semibold text-foreground/90 transition-colors hover:border-accent/70 hover:text-accent"
                  >
                    How it works
                  </Link>
                )}
              </div>

              <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground/70">
                Sponsor a round · paid in 60 seconds after settle
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((g) => (
              <GiveawayCard key={g.address} giveaway={g} />
            ))}
          </div>
        )}
      </section>

      {/* Recently settled */}
      {settled.length > 0 && (
        <section id="past-winners" className="mt-24 scroll-mt-24">
          <div className="text-center">
            <span className="text-xs font-medium uppercase tracking-[0.3em] text-accent">
              🏆 Recently settled
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Past <span className="text-jackpot">winners</span>
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Every payout is permanently recorded on-chain. Click any giveaway to
              see the full receipt.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {settled.map((g) => (
              <SettledGiveawayCard key={g.address} giveaway={g} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
