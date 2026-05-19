import Link from "next/link";

export const metadata = {
  title: "Page not found · LottoBlast",
  description: "The page you were looking for doesn't exist on LottoBlast.",
};

export default function NotFound() {
  return (
    <main className="container mx-auto max-w-2xl px-4 py-24 text-center">
      <span className="text-xs font-medium uppercase tracking-[0.3em] text-accent">
        404 · Nothing here
      </span>
      <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
        <span className="text-jackpot">This giveaway doesn&apos;t exist.</span>
      </h1>
      <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
        The page or giveaway address you opened isn&apos;t on LottoBlast. It
        may have been removed, mistyped, or never existed in the first place.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/giveaways"
          className="glow-pink inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
        >
          Browse live giveaways
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border border-border/80 px-6 py-2.5 text-sm font-semibold text-foreground/90 transition-colors hover:border-accent/70 hover:text-accent"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
