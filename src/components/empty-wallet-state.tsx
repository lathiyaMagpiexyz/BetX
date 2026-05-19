"use client";

import { ConnectWalletButton } from "@/components/connect-wallet-button";

interface EmptyWalletStateProps {
  title?: string;
  description?: string;
}

export function EmptyWalletState({
  title = "Connect your wallet to continue",
  description = "LottoBlast uses your wallet as your identity. No email, no password — connect to see your entries, claims, and campaigns.",
}: EmptyWalletStateProps) {
  return (
    <div className="ticket-card mx-auto flex max-w-md flex-col items-center gap-4 p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-jackpot text-white glow-pink">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-7 w-7"
          aria-hidden
        >
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
      <ConnectWalletButton />
    </div>
  );
}
