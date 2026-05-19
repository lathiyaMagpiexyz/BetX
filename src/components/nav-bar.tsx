"use client";

import { useEffect, useState } from "react";
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
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-close the mobile drawer on route change so users don't get stuck
  // staring at a hovering menu after they click a link.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-md"
    >
      <div className="flex items-center justify-between px-6 py-3">
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

        <div className="flex items-center gap-2">
          <ConnectWalletButton />
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/60 bg-background/60 text-foreground transition-colors hover:border-primary/60 hover:text-primary md:hidden"
          >
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              fill="none"
              className="h-5 w-5"
            >
              {mobileOpen ? (
                <path
                  d="M6 6l8 8M14 6l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M3 6h14M3 10h14M3 14h14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          id="mobile-nav-drawer"
          className="border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur-md md:hidden"
        >
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-primary/15 text-primary"
                        : "text-foreground/90 hover:bg-primary/10"
                    }`}
                  >
                    <span aria-hidden className="text-base leading-none">
                      {link.icon}
                    </span>
                    <span className={isActive ? "text-jackpot" : ""}>
                      {link.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </nav>
  );
}
