import Link from "next/link";
import type { ReactNode } from "react";

interface LandingProps {
  variant: "trust" | "speed";
  liveCount: number;
  prices: Record<string, number>;
}

function computeUsd(
  amount: string,
  token: string,
  prices: Record<string, number>
): string {
  const num = parseFloat(amount.replace(/,/g, ""));
  const price = prices[token] ?? 0;
  if (!Number.isFinite(num) || price === 0) return "";
  const value = num * price;
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

const COPY = {
  trust: {
    badge: "On BSC · Verified contracts · Pay USDT to enter",
    headline: "The Lottery That Pays Out On-Chain",
    sub: "Buy a ticket for a chance at the fixed prize pool. When the draw ends, winners are paid on-chain in the same transaction. No middleman. No 'DM the winner.'",
    primary: { label: "🎟️ Browse live draws", href: "/lotteries" },
    secondary: { label: "Run your own draw", href: "/create-draw" },
    proof:
      "Every draw lives at a public address you can audit. Full Solidity source verified on BscScan.",
    why: [
      {
        emoji: "💰",
        title: "Sponsor-set prize pool",
        body: "The jackpot is locked in at draw creation. You know exactly what you're playing for before you buy.",
      },
      {
        emoji: "⚡",
        title: "Prizes paid automatically",
        body: "The moment the sponsor confirms the randomly picked winners, prize tokens land in the wallet. No claim form, no waiting.",
      },
      {
        emoji: "🔍",
        title: "Every move is on-chain",
        body: "Tickets bought, winners chosen, prizes paid — all permanently recorded and visible on the explorer.",
      },
    ],
  },
  speed: {
    badge: "Launch a lottery in 60 seconds",
    headline: "Run Your Own Lottery. Skip the Spreadsheet.",
    sub: "Set the tiers, set the ticket price, share the link. The smart contract handles ticket sales, the draw, and the payouts.",
    primary: { label: "✨ Create your first draw", href: "/create-draw" },
    secondary: { label: "See it running", href: "/lotteries" },
    proof:
      "Built on BSC — under $0.01 in gas per ticket. Your community plays without thinking about fees.",
    why: [
      {
        emoji: "🎰",
        title: "Sponsor sets the prize tiers",
        body: "Three winners by default — 1st, 2nd, 3rd. Add more, change the split, set the ticket price.",
      },
      {
        emoji: "🧾",
        title: "Each ticket is an on-chain entry",
        body: "Players hit one button, sign once. The contract records the ticket. Ticket revenue goes to you, the sponsor.",
      },
      {
        emoji: "🏆",
        title: "You pick the winners",
        body: "After entries close, you confirm winners on-chain. The contract pays out in the same transaction.",
      },
    ],
  },
} as const;

// ---------------------------------------------------------------------------
// Demo data — sample winners + activity. NOT real wallets. Used purely for
// social-proof visuals while the platform is in pre-launch. Replace with live
// indexer reads (or curated highlights) before launch.
// ---------------------------------------------------------------------------

const FEATURED_WINNERS: {
  rank: 1 | 2 | 3;
  addr: string;
  amount: string;
  token: string;
  lottery: string;
  ago: string;
}[] = [
  { rank: 1, addr: "0x4A1F…7B92", amount: "12,500", token: "USDT", lottery: "Mega Friday",  ago: "2h ago" },
  { rank: 1, addr: "0xB3E2…4D81", amount: "50",     token: "WBNB", lottery: "BNB Frenzy",   ago: "1d ago" },
  { rank: 2, addr: "0x9C4F…3A12", amount: "5,000",  token: "CAKE", lottery: "PancakeRain",  ago: "3d ago" },
  { rank: 1, addr: "0xDA88…5E10", amount: "8,500",  token: "BUSD", lottery: "Stable Bag",   ago: "5d ago" },
  { rank: 1, addr: "0xFE21…8C40", amount: "25,000", token: "USDT", lottery: "Genesis Draw", ago: "1w ago" },
  { rank: 3, addr: "0x7755…12CD", amount: "1,500",  token: "CAKE", lottery: "PancakeRain",  ago: "2w ago" },
];

type Activity =
  | { kind: "ticket"; addr: string; lottery?: string; ago: string }
  | { kind: "win"; addr: string; amount: string; token: string; ago: string }
  | { kind: "launch"; addr: string; ago: string }
  | { kind: "close"; lottery: string; in: string; ago: string };

const LIVE_ACTIVITY: Activity[] = [
  { kind: "ticket", addr: "0x4A1F…7B92", lottery: "Mega Friday", ago: "1m ago" },
  { kind: "win",    addr: "0xB3E2…4D81", amount: "50",    token: "WBNB", ago: "5m ago" },
  { kind: "launch", addr: "0x39DD…CC10", ago: "12m ago" },
  { kind: "ticket", addr: "0xC4A2…78EF", ago: "18m ago" },
  { kind: "win",    addr: "0xDA88…5E10", amount: "8,500", token: "BUSD", ago: "31m ago" },
  { kind: "ticket", addr: "0x77F1…22BA", ago: "46m ago" },
  { kind: "close",  lottery: "Genesis Draw", in: "2h", ago: "1h ago" },
  { kind: "win",    addr: "0x9C4F…3A12", amount: "5,000", token: "CAKE", ago: "3h ago" },
];

const ACTIVITY_DOT: Record<Activity["kind"], string> = {
  win: "bg-jackpot-gold shadow-[0_0_8px_hsl(var(--jackpot-gold)/0.7)]",
  ticket: "bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]",
  launch:
    "bg-jackpot-purple shadow-[0_0_8px_hsl(var(--jackpot-purple)/0.7)]",
  close: "bg-accent shadow-[0_0_8px_hsl(var(--accent)/0.6)]",
};

function renderActivity(
  item: Activity,
  prices: Record<string, number>
): ReactNode {
  switch (item.kind) {
    case "ticket":
      return (
        <>
          <span aria-hidden>🎟</span>
          <span className="font-mono text-foreground/90">{item.addr}</span>
          <span>bought a ticket</span>
          {item.lottery && (
            <>
              <span>in</span>
              <span className="text-accent">{item.lottery}</span>
            </>
          )}
          <span className="text-muted-foreground/60">·</span>
          <span>{item.ago}</span>
        </>
      );
    case "win": {
      const usd = computeUsd(item.amount, item.token, prices);
      return (
        <>
          <span aria-hidden>🏆</span>
          <span className="font-mono text-foreground/90">{item.addr}</span>
          <span>won</span>
          <span className="font-bold text-jackpot">
            {item.amount} {item.token}
          </span>
          {usd && <span className="text-muted-foreground/70">(~{usd})</span>}
          <span className="text-muted-foreground/60">·</span>
          <span>{item.ago}</span>
        </>
      );
    }
    case "launch":
      return (
        <>
          <span aria-hidden>🎰</span>
          <span>New draw launched by</span>
          <span className="font-mono text-foreground/90">{item.addr}</span>
          <span className="text-muted-foreground/60">·</span>
          <span>{item.ago}</span>
        </>
      );
    case "close":
      return (
        <>
          <span aria-hidden>🎰</span>
          <span className="text-accent">{item.lottery}</span>
          <span>closes in</span>
          <span className="font-bold text-foreground">{item.in}</span>
          <span className="text-muted-foreground/60">·</span>
          <span>{item.ago}</span>
        </>
      );
  }
}

const RANK_BADGE = {
  1: { emoji: "🏆", label: "1st place", color: "from-amber-300 to-amber-500" },
  2: { emoji: "🥈", label: "2nd place", color: "from-slate-200 to-slate-400" },
  3: { emoji: "🥉", label: "3rd place", color: "from-orange-400 to-orange-600" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LandingHero({ variant, liveCount, prices }: LandingProps) {
  const copy = COPY[variant];
  return (
    <main className="relative overflow-hidden">
      <HeroSection copy={copy} liveCount={liveCount} />
      <LiveTicker prices={prices} />
      <WhySection items={[...copy.why]} />
      <WinnersSection prices={prices} />
      <HowItWorks />
      <FinalCta />
    </main>
  );
}

// --- Hero ------------------------------------------------------------------

function HeroSection({
  copy,
  liveCount,
}: {
  copy: (typeof COPY)["trust" | "speed"];
  liveCount: number;
}) {
  return (
    <section className="relative px-4 pt-20 pb-16 sm:pt-28">
      {/* Decorative floating lottery balls */}
      <LotteryBall className="float-slow absolute left-[6%] top-24 h-16 w-16 text-jackpot-pink opacity-70" label="7" />
      <LotteryBall className="float-mid absolute right-[8%] top-40 h-12 w-12 text-jackpot-gold opacity-70" label="42" />
      <LotteryBall className="float-slow absolute left-[18%] bottom-20 h-10 w-10 text-jackpot-purple opacity-60" label="13" />
      <LotteryBall className="float-mid absolute right-[14%] bottom-32 h-14 w-14 text-jackpot-pink opacity-60" label="99" />

      <div className="relative mx-auto max-w-4xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-primary shadow-lg shadow-primary/10">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          {copy.badge}
        </span>

        <h1 className="mt-6 text-balance text-5xl font-black tracking-tight sm:text-7xl">
          <span className="text-jackpot">{copy.headline}</span>
        </h1>

        <p className="mt-6 mx-auto max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl">
          {copy.sub}
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href={copy.primary.href}
            className="group inline-flex items-center gap-2 rounded-xl bg-jackpot px-7 py-3.5 text-base font-semibold text-white shadow-lg glow-pink transition-transform hover:scale-[1.03]"
          >
            {copy.primary.label}
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
          <Link
            href={copy.secondary.href}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/50 px-7 py-3.5 text-base font-medium text-foreground backdrop-blur transition-colors hover:bg-accent/10"
          >
            {copy.secondary.label}
          </Link>
        </div>

        <p className="mt-8 max-w-xl mx-auto text-sm text-muted-foreground">{copy.proof}</p>

        {/* Headline stats — playful, large, glowing */}
        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          <HeroStat label="Paid out" value="$600K" sub="across 108 draws" accent />
          <HeroStat label="Players" value="4,210" sub="unique wallets" />
          {liveCount === 0 ? (
            <HeroStat
              label="Up next"
              value="Soon"
              sub="be the first in line"
            />
          ) : (
            <HeroStat
              label="Live now"
              value={String(liveCount)}
              sub={liveCount === 1 ? "draw open" : "draws open"}
              jackpot
            />
          )}
        </div>
      </div>
    </section>
  );
}

function HeroStat({
  label,
  value,
  sub,
  accent,
  jackpot,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  jackpot?: boolean;
}) {
  const useJackpotText = accent || jackpot;
  return (
    <div
      className={`rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur shine-on-hover ${
        accent ? "glow-gold" : ""
      }`}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 text-3xl font-black ${
          useJackpotText ? "text-jackpot" : ""
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

// --- Live activity ticker --------------------------------------------------

function LiveTicker({ prices }: { prices: Record<string, number> }) {
  // Render the activity list twice for a seamless marquee loop.
  const items = [...LIVE_ACTIVITY, ...LIVE_ACTIVITY];
  return (
    <section className="relative border-y border-border/60 bg-background/60 py-3 backdrop-blur">
      <div className="relative overflow-hidden">
        <div className="marquee flex gap-12 whitespace-nowrap text-sm text-muted-foreground">
          {items.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2">
              <span
                aria-hidden
                className={`h-2 w-2 rounded-full ${ACTIVITY_DOT[item.kind]}`}
              />
              {renderActivity(item, prices)}
            </span>
          ))}
        </div>
        {/* Edge fade overlays — marquee dissolves into the page edges */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background via-background/80 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background via-background/80 to-transparent"
        />
      </div>
    </section>
  );
}

// --- Why cards -------------------------------------------------------------

function WhySection({
  items,
}: {
  items: ReadonlyArray<{ emoji: string; title: string; body: string }>;
}) {
  return (
    <section className="px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <span className="text-xs font-medium uppercase tracking-[0.3em] text-accent">
            Why LottoBlast
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Built for <span className="text-jackpot">payouts you can trust</span>
          </h2>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {items.map((card, i) => (
            <div
              key={i}
              className="ticket-card shine-on-hover p-6 transition-all hover:border-primary/40 hover:-translate-y-1"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-jackpot text-2xl glow-pink">
                <span aria-hidden>{card.emoji}</span>
              </div>
              <h3 className="mt-4 text-lg font-bold">{card.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Recent winners grid ---------------------------------------------------

function WinnersSection({ prices }: { prices: Record<string, number> }) {
  return (
    <section className="px-4 pb-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <span className="text-xs font-medium uppercase tracking-[0.3em] text-accent">
            🏆 Hall of fame
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Recent <span className="text-jackpot">winners</span>
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Every payout is recorded on-chain. Click any address to view it on BscScan.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED_WINNERS.map((w, i) => {
            const badge = RANK_BADGE[w.rank];
            return (
              <div
                key={i}
                className="ticket-card shine-on-hover relative p-5 transition-all hover:border-accent/50 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${badge.color} px-2.5 py-0.5 font-bold uppercase tracking-wider text-black/80`}
                  >
                    <span aria-hidden>{badge.emoji}</span>
                    {badge.label}
                  </span>
                  <span className="text-muted-foreground">{w.ago}</span>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    Won
                  </p>
                  <p className="mt-1 text-3xl font-black text-jackpot">
                    {w.amount}{" "}
                    <span className="text-base font-bold text-muted-foreground">
                      {w.token}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    ≈ {computeUsd(w.amount, w.token, prices)}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                  <span className="font-mono text-muted-foreground">{w.addr}</span>
                  <span className="text-muted-foreground/80">{w.lottery}</span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
          Demo highlights · replace with live indexer data pre-launch
        </p>
      </div>
    </section>
  );
}

// --- How it works ----------------------------------------------------------

function HowItWorks() {
  return (
    <section className="px-4 pb-28">
      <div className="mx-auto max-w-5xl rounded-2xl border border-border/60 bg-card/50 p-8 backdrop-blur sm:p-12 shine-on-hover">
        <div className="text-center">
          <span className="text-xs font-medium uppercase tracking-[0.3em] text-accent">
            How a LottoBlast draw works
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Three steps. <span className="text-jackpot">Zero spreadsheets.</span>
          </h2>
        </div>
        <ol className="mt-12 grid gap-8 sm:grid-cols-3">
          <Step n="1" title="Sponsor launches a draw" body="One signature. Set the tier prizes, ticket price, and end time. Your draw is on-chain instantly." />
          <Step n="2" title="Players buy tickets" body="One signature per player. One ticket per wallet. Tickets sell while the timer ticks down." />
          <Step n="3" title="Winners get paid" body="When the timer runs out, the sponsor confirms the randomly picked winners. The contract pays out in the same transaction. Done" />
        </ol>
      </div>
    </section>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="relative">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-jackpot text-lg font-black text-white shadow-lg glow-pink">
        {n}
      </div>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </li>
  );
}

// --- Final CTA -------------------------------------------------------------

function FinalCta() {
  return (
    <section className="px-4 pb-32">
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl border border-primary/40 bg-jackpot p-12 text-center shadow-2xl glow-pink sm:p-16">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-background/30 via-transparent to-background/40"
        />
        {/* Decorative lottery ball nestled in the corner */}
        <LotteryBall
          className="float-slow absolute -right-6 -top-6 h-24 w-24 text-jackpot-gold opacity-40 sm:h-28 sm:w-28"
          label="∞"
        />
        <div className="relative">
          <span className="text-xs font-medium uppercase tracking-[0.3em] text-white/80">
            Ready to play?
          </span>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)] sm:text-5xl">
            Your jackpot is one signature away.
          </h2>
          <p className="mt-3 text-sm text-white/80">
            Buy your first ticket. Watch the contract pay out. No accounts. No emails.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/lotteries"
              className="inline-flex items-center gap-2 rounded-xl bg-background px-7 py-3.5 text-base font-semibold text-foreground shadow-lg transition-transform hover:scale-[1.03]"
            >
              🎟 Browse live draws
            </Link>
            <Link
              href="/create-draw"
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-7 py-3.5 text-base font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              ✨ Launch your own
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- Decorative SVG --------------------------------------------------------

function LotteryBall({
  className,
  label,
}: {
  className?: string;
  label: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <radialGradient id={`ball-${label}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="hsl(0 0% 100% / 0.6)" />
          <stop offset="40%" stopColor="currentColor" />
          <stop offset="100%" stopColor="hsl(0 0% 0% / 0.4)" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill={`url(#ball-${label})`} />
      <circle cx="50" cy="50" r="28" fill="hsl(0 0% 100% / 0.85)" />
      <text
        x="50"
        y="58"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="800"
        fontSize="26"
        fill="hsl(260 50% 15%)"
      >
        {label}
      </text>
    </svg>
  );
}
