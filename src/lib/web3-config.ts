import { http, createConfig } from "wagmi";
import { bsc, bscTestnet, base, baseSepolia, type Chain } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

const PLACEHOLDER_WC_ID = "placeholder-walletconnect-id";

// Supported chains. Default to BSC testnet (chain 97) for development.
const SUPPORTED: Record<number, Chain> = {
  [bsc.id]: bsc, // 56
  [bscTestnet.id]: bscTestnet, // 97
  [base.id]: base, // 8453
  [baseSepolia.id]: baseSepolia, // 84532
};

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "97");
const targetChain: Chain = SUPPORTED[chainId] ?? bscTestnet;

const wcProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || PLACEHOLDER_WC_ID;

export const isDemoWeb3 =
  wcProjectId === PLACEHOLDER_WC_ID ||
  process.env.NEXT_PUBLIC_DEMO_MODE === "true";

let _placeholderWarned = false;
function warnPlaceholderOnce() {
  if (_placeholderWarned) return;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocal =
      ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].includes(host) ||
      host.endsWith(".local");
    if (isLocal) return;
  }
  _placeholderWarned = true;
  console.error(
    "[web3-config] WalletConnect projectId is the placeholder value. " +
      "Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in your hosting platform " +
      "to enable real wallet connections (free at https://cloud.walletconnect.com/)."
  );
}

if (isDemoWeb3) warnPlaceholderOnce();

// Per-chain RPC fallbacks. Public BSC testnet endpoints rate-limit `eth_getLogs`
// aggressively; publicnode is the most permissive free option as of writing.
const RPC_URLS: Record<number, string[]> = {
  [bscTestnet.id]: [
    "https://bsc-testnet.publicnode.com",
    "https://bsc-testnet.public.blastapi.io",
    "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
  ],
  [bsc.id]: [
    "https://bsc.publicnode.com",
    "https://bsc-dataseed.bnbchain.org",
  ],
  [base.id]: ["https://mainnet.base.org"],
  [baseSepolia.id]: ["https://sepolia.base.org"],
};

function buildTransport(chain: Chain) {
  const url =
    process.env.NEXT_PUBLIC_RPC_URL ||
    RPC_URLS[chain.id]?.[0] ||
    chain.rpcUrls.default.http[0];
  // Plain http with explicit timeout — wagmi's fallback transport hangs under
  // Next.js's server runtime when one of the candidates is slow or blocked.
  return http(url, { timeout: 15_000, retryCount: 0 });
}

export const wagmiConfig = isDemoWeb3
  ? createConfig({
      chains: [targetChain],
      connectors: [injected({ shimDisconnect: true })],
      transports: { [targetChain.id]: buildTransport(targetChain) },
      ssr: true,
    })
  : getDefaultConfig({
      appName: "LottoBlast",
      projectId: wcProjectId,
      chains: [targetChain],
      transports: { [targetChain.id]: buildTransport(targetChain) },
      ssr: true,
    });

export const ACTIVE_CHAIN = targetChain;
