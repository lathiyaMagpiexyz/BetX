import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/web3-provider";
import { NavBar } from "@/components/nav-bar";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "LottoBlast — On-Chain Crypto Lotteries",
  description:
    "Buy a ticket. Win the jackpot. Lotteries that pay out on-chain in seconds — no Twitter giveaways, no 'DM the winner.'",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    title: "LottoBlast — On-Chain Crypto Lotteries",
    description:
      "Buy a ticket. Win the jackpot. On-chain payout in seconds.",
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
