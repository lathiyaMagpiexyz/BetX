import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/web3-provider";
import { NavBar } from "@/components/nav-bar";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "FairDrop — Discover New BSC Projects. Win Their Tokens.",
  description:
    "Emerging BSC projects launch on-chain giveaways. Pay a small USDT entry fee, get a shot at their tokens. Winners paid on-chain — no Twitter giveaways, no 'DM the winner.'",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    title: "FairDrop — Discover New BSC Projects. Win Their Tokens.",
    description:
      "Emerging BSC projects giveaway tokens on-chain. Pay USDT to enter, win their tokens, paid instantly on close.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Web3Provider>
          <NavBar />
          <div className="min-h-[calc(100vh-65px)]">{children}</div>
        </Web3Provider>
      </body>
    </html>
  );
}
