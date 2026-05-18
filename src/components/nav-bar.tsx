"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWalletButton } from "@/components/connect-wallet-button";

const NAV_LINKS = [
  { href: "/lotteries", label: "Browse", icon: "🎟" },
  { href: "/create-draw", label: "Run a lottery", icon: "🎰" },
  { href: "/my-tickets", label: "My tickets", icon: "🏆" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/75 px-6 py-3 backdrop-blur-md"
    >
      <Link href="/" className="group flex items-center gap-2.5">
        <span
          aria-hidden
          className="flex h-8 w-8 items-center justify-center rounded-md bg-jackpot text-base font-bold text-white shadow-lg shadow-primary/30 transition-transform group-hover:scale-105"
        >
          L
        </span>
        <span className="text-lg font-bold tracking-tight text-jackpot">
          LottoBlast
        </span>
      </Link>

      <div className="hidden items-center gap-1 md:flex">
        {NAV_LINKS.map((link) => {
          const isActive =
            pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={`group relative inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                isActive
                  ? "bg-primary/15 text-primary shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
              }`}
            >
              <span aria-hidden className="text-base leading-none">
                {link.icon}
              </span>
              <span className={isActive ? "text-jackpot" : ""}>
                {link.label}
              </span>
              {isActive && (
                <span
                  aria-hidden
                  className="absolute -bottom-px left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-jackpot"
                />
              )}
            </Link>
          );
        })}
      </div>

      <ConnectWalletButton />
    </nav>
  );
}
