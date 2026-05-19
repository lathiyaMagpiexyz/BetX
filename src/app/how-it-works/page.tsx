import Link from "next/link";

export const metadata = {
  title: "How LottoBlast works · BSC project giveaways, on-chain",
  description:
    "A 3-step walkthrough: how BSC projects launch a giveaway, how players enter, how winners get paid on-chain. No middleman, no DM-the-winner.",
};

export default function HowItWorksPage() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-16">
      {/* Header */}
      <header className="text-center">
        <span className="text-xs font-medium uppercase tracking-[0.3em] text-accent">
          🎰 How it works
        </span>
        <h1 className="mt-3 text-balance text-4xl font-black tracking-tight sm:text-5xl">
          <span className="text-jackpot">A LottoBlast giveaway</span>,
          end-to-end
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-balance text-base text-muted-foreground">
          Every giveaway is a BSC project locking up tokens for their community.
          Players pay a small USDT entry fee for a shot at the prize pool.
          Smart contracts handle the rest.
        </p>
      </header>

      {/* For players */}
      <section className="mt-16">
        <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-accent">
          For players
        </h2>
        <h3 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Discover. Enter. Win tokens.
        </h3>

        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          <FlowStep
            n="1"
            title="Browse live giveaways"
            body="Every giveaway is sponsored by an emerging BSC project. Pick the project whose tokens you want."
          />
          <FlowStep
            n="2"
            title="Pay USDT to enter"
            body="One signature approves the spend, one submits the entry. The contract records you on-chain. One entry per wallet."
          />
          <FlowStep
            n="3"
            title="Win tokens on close"
            body="When entries close, the sponsor confirms winners on-chain. Project tokens land in your wallet in the same transaction."
          />
        </ol>
      </section>

      {/* For projects */}
      <section className="mt-20">
        <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-accent">
          For BSC projects
        </h2>
        <h3 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Launch a giveaway. Reach real wallets.
        </h3>

        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          <FlowStep
            n="1"
            title="Lock the tokens"
            body="Pick the prize token, set tier amounts, set entry fee in USDT. One signature deploys the giveaway contract."
          />
          <FlowStep
            n="2"
            title="Share the link"
            body="Your community gets a direct on-chain entry point. The USDT entry fee filters out airdrop farms and bot networks."
          />
          <FlowStep
            n="3"
            title="Confirm winners"
            body="When the timer closes, you submit winning addresses on-chain. The contract distributes prize tokens automatically."
          />
        </ol>
      </section>

      {/* Trust */}
      <section className="mt-20 rounded-2xl border border-border/60 bg-card/50 p-8 backdrop-blur sm:p-12">
        <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-accent">
          Why on-chain matters
        </h2>
        <h3 className="mt-2 text-2xl font-bold tracking-tight">
          Every move is public. Every payout is automatic.
        </h3>
        <div className="mt-6 grid gap-6 sm:grid-cols-3 text-sm text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground">
              🔍 Verifiable contracts
            </p>
            <p className="mt-2">
              Every giveaway lives at a public BSC address. Solidity source is
              verified on BscScan — you can audit it before you enter.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">
              ⚡ Atomic payouts
            </p>
            <p className="mt-2">
              Winners receive prize tokens in the same transaction the sponsor
              confirms them. No claim form, no waiting, no &ldquo;DM the
              winner&rdquo; on Twitter.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">
              🛡️ Pay-to-enter Sybil filter
            </p>
            <p className="mt-2">
              The USDT entry fee makes airdrop farming uneconomic. Tokens land
              with crypto-native wallets — not bots running 1,000 throwaways.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-20 text-center">
        <h2 className="text-balance text-3xl font-black tracking-tight sm:text-4xl">
          <span className="text-jackpot">Ready to play?</span>
        </h2>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/giveaways"
            className="glow-pink inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            🎟 Browse live giveaways
          </Link>
          <Link
            href="/create-giveaway"
            className="inline-flex items-center justify-center rounded-full border border-border/80 px-7 py-3 text-sm font-semibold text-foreground/90 transition-colors hover:border-accent/70 hover:text-accent"
          >
            🎰 Run your project&apos;s giveaway
          </Link>
        </div>
      </section>
    </main>
  );
}

function FlowStep({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="ticket-card relative p-6">
      <span
        aria-hidden
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-jackpot text-base font-black text-white shadow-lg glow-pink"
      >
        {n}
      </span>
      <h4 className="mt-4 text-base font-bold">{title}</h4>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </li>
  );
}
