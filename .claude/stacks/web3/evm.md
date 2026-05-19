---
assumes: [framework/nextjs]
packages:
  runtime:
    - wagmi
    - viem
    - "@rainbow-me/rainbowkit"
    - "@tanstack/react-query"
    - "@chainlink/contracts"
    - dotenv          # used by indexer/ponder.config.ts (standalone node process, no framework auto-load)
  dev:
    - "@types/node"
files:
  # --- Frontend wallet + chain config (scaffold-libs) ---
  - src/lib/web3-config.ts
  - src/lib/contracts.ts
  - src/lib/abi/Giveaway.json
  - src/lib/abi/GiveawayFactory.json
  - src/lib/abi/Treasury.json
  - src/lib/abi/erc20.json
  - src/components/web3-provider.tsx
  - src/components/connect-wallet-button.tsx
  - src/hooks/use-giveaway.ts
  # --- Smart contracts (Foundry workspace; scaffold-wire) ---
  - contracts/foundry.toml
  - contracts/remappings.txt
  - contracts/.gitignore
  - contracts/src/Giveaway.sol
  - contracts/src/GiveawayFactory.sol
  - contracts/src/Treasury.sol
  - contracts/src/VRFConsumer.sol
  - contracts/script/Deploy.s.sol
  - contracts/test/Giveaway.t.sol
  - contracts/test/GiveawayFactory.t.sol
  # --- On-chain indexer (Ponder writes into supabase Postgres; scaffold-libs) ---
  - indexer/ponder.config.ts
  - indexer/ponder.schema.ts
  - indexer/src/index.ts
  - indexer/abis/Giveaway.ts
  - indexer/abis/GiveawayFactory.ts
  - indexer/package.json
env:
  server:
    - DEPLOYER_PRIVATE_KEY
    - ALCHEMY_API_KEY
    - BASESCAN_API_KEY
    - CHAINLINK_VRF_SUBSCRIPTION_ID
    - PONDER_RPC_URL_BASE
    - PONDER_DATABASE_URL
  client:
    - NEXT_PUBLIC_CHAIN_ID
    - NEXT_PUBLIC_RPC_URL
    - NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
    - NEXT_PUBLIC_GIVEAWAY_FACTORY_ADDRESS
    - NEXT_PUBLIC_TREASURY_ADDRESS
    - NEXT_PUBLIC_USDC_ADDRESS
ci_placeholders:
  NEXT_PUBLIC_CHAIN_ID: "84532"
  NEXT_PUBLIC_RPC_URL: "https://sepolia.base.org"
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: "placeholder-walletconnect-id"
  NEXT_PUBLIC_GIVEAWAY_FACTORY_ADDRESS: "0x0000000000000000000000000000000000000000"
  NEXT_PUBLIC_TREASURY_ADDRESS: "0x0000000000000000000000000000000000000000"
  NEXT_PUBLIC_USDC_ADDRESS: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  ALCHEMY_API_KEY: "placeholder-alchemy-key"
  BASESCAN_API_KEY: "placeholder-basescan-key"
  CHAINLINK_VRF_SUBSCRIPTION_ID: "0"
  DEPLOYER_PRIVATE_KEY: "0x0000000000000000000000000000000000000000000000000000000000000001"
  PONDER_RPC_URL_BASE: "https://sepolia.base.org"
  PONDER_DATABASE_URL: "postgres://placeholder:placeholder@localhost:5432/placeholder"
clean:
  files: []
  dirs:
    - contracts/out
    - contracts/cache
    - contracts/broadcast
    - indexer/.ponder
    - indexer/node_modules
gitignore:
  - contracts/out/
  - contracts/cache/
  - contracts/broadcast/
  - "!contracts/broadcast/*/run-latest.json"
  - indexer/.ponder/
  - indexer/node_modules/
  - .env.contracts
demo_mode:
  # When NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID or NEXT_PUBLIC_GIVEAWAY_FACTORY_ADDRESS
  # is missing or matches the canonical placeholder, the web3 client falls back to a
  # demo mock that returns a fake connected wallet, fake balance, and resolves all
  # tx requests as success without broadcasting. This lets visual review and
  # /verify run without a funded wallet, an RPC quota, or a deployed contract.
  demo_wallet_address: "0x000000000000000000000000000000000000dEa1"
  demo_chain_id: 84532
---
# Web3: EVM (Base + RainbowKit + wagmi + Foundry + Chainlink VRF + Ponder)
> Used when experiment.yaml has `stack.database: supabase` (for indexer storage) AND a `web3:` block.
> Assumes: `framework/nextjs` (uses App Router providers and `next/headers`), `database/supabase` (the indexer writes into the same Postgres).

This stack scaffolds an EVM-only crypto app with three pieces:
1. **Frontend wallet UX** — RainbowKit + wagmi + viem + TanStack Query.
2. **Smart contracts** — Foundry workspace at `contracts/` with OpenZeppelin imports + Chainlink VRF v2.5 wrapper.
3. **Indexer** — Ponder.sh app at `indexer/` that watches contract events on the configured chain and writes them into the Supabase Postgres so Next.js pages can query indexed state with regular SQL instead of round-tripping the RPC.

Default chain: **Base** (mainnet `8453`, testnet Base Sepolia `84532`). To target a different EVM chain, only `web3-config.ts` and the indexer config need to change — all other code is chain-agnostic.

## Packages
```bash
# Frontend
npm install wagmi viem @rainbow-me/rainbowkit @tanstack/react-query @chainlink/contracts

# Indexer (in indexer/)
cd indexer && npm install ponder@latest

# Contracts (Foundry — installed via foundryup, not npm)
curl -L https://foundry.paradigm.xyz | bash && foundryup
cd contracts && forge install OpenZeppelin/openzeppelin-contracts smartcontractkit/chainlink
```

## Environment Variables

```env
# --- Client (frontend) ---
# 8453 = Base mainnet, 84532 = Base Sepolia (testnet, default for dev/CI)
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
# Get from https://cloud.walletconnect.com/ — free, takes 30 seconds
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
# Set after `forge script script/Deploy.s.sol` — bootstrap leaves these as 0x0...0 placeholders
NEXT_PUBLIC_GIVEAWAY_FACTORY_ADDRESS=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_TREASURY_ADDRESS=0x0000000000000000000000000000000000000000
# USDC address on the target chain. Base mainnet: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
NEXT_PUBLIC_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# --- Server (contract deployment + indexer) ---
# DEPLOYER_PRIVATE_KEY: only used by `forge script` — never imported into Next.js code
DEPLOYER_PRIVATE_KEY=0x...
ALCHEMY_API_KEY=...
BASESCAN_API_KEY=...
# Created in Chainlink VRF subscription manager: https://vrf.chain.link/
CHAINLINK_VRF_SUBSCRIPTION_ID=...
# Used by Ponder — typically the same Alchemy URL with the API key embedded
PONDER_RPC_URL_BASE=https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}
# Same Postgres as Supabase. Use the connection string from Supabase dashboard → Project Settings → Database → Connection pooling
PONDER_DATABASE_URL=postgres://...
```

## Files to Create

### `src/lib/web3-config.ts` — Wagmi + chain config (placeholder + demo guard)

```ts
import { http, createConfig, fallback } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

const PLACEHOLDER_WC_ID = "placeholder-walletconnect-id";

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "84532");
const targetChain = chainId === base.id ? base : baseSepolia;

const wcProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || PLACEHOLDER_WC_ID;

export const isDemoWeb3 =
  wcProjectId === PLACEHOLDER_WC_ID ||
  process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// RainbowKit's getDefaultConfig wires injected + WalletConnect + Coinbase Wallet
// connectors with project-id-aware deeplinking. We fall back to a minimal
// wagmi config in demo mode so RainbowKit's WC modal does not attempt to call
// the relay with a placeholder project id.
export const wagmiConfig = isDemoWeb3
  ? createConfig({
      chains: [targetChain],
      connectors: [injected({ shimDisconnect: true })],
      transports: { [targetChain.id]: http(targetChain.rpcUrls.default.http[0]) },
      ssr: true,
    })
  : getDefaultConfig({
      appName: "LottoBlast",
      projectId: wcProjectId,
      chains: [targetChain],
      transports: {
        [targetChain.id]: fallback([
          http(process.env.NEXT_PUBLIC_RPC_URL || targetChain.rpcUrls.default.http[0]),
          http(targetChain.rpcUrls.default.http[0]),
        ]),
      },
      connectors: [
        injected({ shimDisconnect: true }),
        coinbaseWallet({ appName: "LottoBlast" }),
        walletConnect({ projectId: wcProjectId }),
      ],
      ssr: true,
    });

export const ACTIVE_CHAIN = targetChain;
```

- Export `wagmiConfig`, `ACTIVE_CHAIN`, and the `isDemoWeb3` flag from this single module.
- Pages and hooks must NOT read `NEXT_PUBLIC_CHAIN_ID` directly — read `ACTIVE_CHAIN.id` instead so the demo-mode override works in one place.
- `ssr: true` is required for App Router. Without it, client and server hydrate different connector lists and React throws a hydration mismatch.

### `src/components/web3-provider.tsx` — Top-level provider tree

```tsx
"use client";

import { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";
import { wagmiConfig, isDemoWeb3 } from "@/lib/web3-config";

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {isDemoWeb3 ? (
          // Skip RainbowKit modal in demo: connect button uses the injected demo wallet
          <>{children}</>
        ) : (
          <RainbowKitProvider theme={lightTheme()} modalSize="compact">
            {children}
          </RainbowKitProvider>
        )}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

- `scaffold-wire` adds `<Web3Provider>` to `src/app/layout.tsx` as the outermost wrapper inside `<body>`, **before** `<NavBar />`. Hooks like `useAccount()` must be inside the provider.
- `import "@rainbow-me/rainbowkit/styles.css"` is required — without it, the connect modal renders unstyled.

### `src/components/connect-wallet-button.tsx` — Wallet connect CTA

```tsx
"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { isDemoWeb3 } from "@/lib/web3-config";
import { trackWalletConnectClicked, trackWalletConnected } from "@/lib/events";

export function ConnectWalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isDemoWeb3) {
    // Render a button that flips the demo connected state via the injected
    // demo connector — never opens the WC modal with a placeholder project id.
    return isConnected ? (
      <Button variant="outline" onClick={() => disconnect()}>
        {address?.slice(0, 6)}…{address?.slice(-4)}
      </Button>
    ) : (
      <Button
        onClick={() => {
          trackWalletConnectClicked({ source: "nav" });
          const injected = connectors.find((c) => c.id === "injected");
          if (injected) connect({ connector: injected });
          trackWalletConnected({ chain_id: 84532, demo: true });
        }}
      >
        Connect Wallet
      </Button>
    );
  }

  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;
        return (
          <Button
            variant={connected ? "outline" : "default"}
            onClick={() => {
              if (!connected) {
                trackWalletConnectClicked({ source: "nav" });
                openConnectModal();
              } else {
                openAccountModal();
              }
            }}
          >
            {connected ? account.displayName : "Connect Wallet"}
          </Button>
        );
      }}
    </ConnectButton.Custom>
  );
}
```

- Fires `wallet_connect_clicked` (demand-stage event) BEFORE opening the modal — modal-open does not produce a network event.
- Fires `wallet_connected` from a `useAccount()` watcher elsewhere (e.g. inside `Web3Provider`) on transition from disconnected → connected. The button's optimistic `wallet_connected` call covers the demo path only.
- Use `ConnectButton.Custom` (not the default `<ConnectButton />`) so the styling matches shadcn.

### `src/lib/contracts.ts` — Address + ABI registry

```ts
import { Address } from "viem";
import giveawayAbi from "@/lib/abi/Giveaway.json";
import factoryAbi from "@/lib/abi/GiveawayFactory.json";
import treasuryAbi from "@/lib/abi/Treasury.json";
import erc20Abi from "@/lib/abi/erc20.json";

const PLACEHOLDER_ADDR = "0x0000000000000000000000000000000000000000" as const;

function readAddress(envVal: string | undefined): Address {
  return ((envVal && envVal !== "") ? envVal : PLACEHOLDER_ADDR) as Address;
}

export const CONTRACTS = {
  giveawayFactory: {
    address: readAddress(process.env.NEXT_PUBLIC_GIVEAWAY_FACTORY_ADDRESS),
    abi: factoryAbi,
  },
  treasury: {
    address: readAddress(process.env.NEXT_PUBLIC_TREASURY_ADDRESS),
    abi: treasuryAbi,
  },
  usdc: {
    address: readAddress(process.env.NEXT_PUBLIC_USDC_ADDRESS),
    abi: erc20Abi,
  },
} as const;

// Per-Giveaway contract (one instance per campaign — address from event log)
export const giveawayInstanceAbi = giveawayAbi;
```

- Bootstrap creates the four ABI JSON files as **empty arrays** (`[]`). They're populated by `scaffold-wire` after `forge build` runs (paste the abi from `contracts/out/<Name>.sol/<Name>.json#abi`).
- For an unknown ABI in a fresh codebase, viem typechecks against `[]` — calls compile but throw at runtime. This is intentional: it forces the user to wire the deployed addresses + ABIs before going live without breaking `npm run build`.

### `src/hooks/use-giveaway.ts` — Read + write hooks for a single giveaway

```ts
"use client";

import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { Address } from "viem";
import { CONTRACTS, giveawayInstanceAbi } from "@/lib/contracts";

export function useGiveaway(address: Address) {
  const { address: user } = useAccount();

  // Reads getState() → [status, entryFee, bonusPool, numEntrants, numWinners, endAt]
  const { data: state, refetch: refetchState } = useReadContract({
    address,
    abi: giveawayInstanceAbi,
    functionName: "getState",
    query: { staleTime: 15_000 },
  });

  const { data: hasEntered } = useReadContract({
    address,
    abi: giveawayInstanceAbi,
    functionName: "hasEntered",
    args: user ? [user] : undefined,
    query: { enabled: !!user, staleTime: 15_000 },
  });

  // Read entryFee separately so the entry flow can quote it before reading getState
  const { data: entryFee } = useReadContract({
    address,
    abi: giveawayInstanceAbi,
    functionName: "entryFee",
    query: { staleTime: Infinity }, // Immutable on the contract — never changes
  });

  // Check current USDC allowance to the giveaway contract — used to skip approve when sufficient
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.usdc.address,
    abi: CONTRACTS.usdc.abi,
    functionName: "allowance",
    args: user ? [user, address] : undefined,
    query: { enabled: !!user, staleTime: 15_000 },
  });

  const { writeContractAsync, isPending: isEntering } = useWriteContract();

  /// Two-step paid entry: approve USDC if allowance < entryFee, then call enter().
  /// The page should await this single call — both signatures happen sequentially inside.
  async function enterPaid() {
    if (entryFee === undefined) throw new Error("Entry fee not loaded yet");
    const fee = entryFee as bigint;

    if ((allowance as bigint | undefined ?? 0n) < fee) {
      // 1) Approve the giveaway contract to pull `fee` USDC
      await writeContractAsync({
        address: CONTRACTS.usdc.address,
        abi: CONTRACTS.usdc.abi,
        functionName: "approve",
        args: [address, fee],
      });
      await refetchAllowance();
    }

    // 2) Call enter() — contract will safeTransferFrom the entryFee
    return writeContractAsync({
      address,
      abi: giveawayInstanceAbi,
      functionName: "enter",
      args: [],
    });
  }

  /// Sponsor's create-campaign approval — separate from participant entry.
  async function approveFactory(amount: bigint) {
    return writeContractAsync({
      address: CONTRACTS.usdc.address,
      abi: CONTRACTS.usdc.abi,
      functionName: "approve",
      args: [CONTRACTS.giveawayFactory.address, amount],
    });
  }

  /// Pull-payment claim for winners whose push payout reverted.
  async function claim() {
    return writeContractAsync({
      address,
      abi: giveawayInstanceAbi,
      functionName: "claim",
      args: [],
    });
  }

  return {
    state,
    entryFee,
    allowance,
    hasEntered,
    enterPaid,
    approveFactory,
    claim,
    isEntering,
    refetchState,
    refetchAllowance,
  };
}
```

- `enterPaid()` collapses the two-signature flow (approve + enter) into one awaitable call — the page renders one button, the user signs twice. The hook auto-skips the approve if `allowance >= entryFee` (e.g. user already approved a higher amount in a prior session).
- `claim()` is the pull-payment escape hatch for winners whose push payout reverted. The contract guarantees this function transfers their `unclaimedPrize` balance — there is no admin path that can block, override, or drain it.
- `entryFee` is read with `staleTime: Infinity` because the contract field is immutable.
- All writes use `writeContractAsync` so the page can `await` and update analytics + UI on receipt.
- `useReadContract` with `staleTime: 15_000` prevents thrashing the RPC during fast re-renders.

### `contracts/foundry.toml`

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.24"
optimizer = true
optimizer_runs = 200
via_ir = true
remappings = [
    "@openzeppelin/=lib/openzeppelin-contracts/",
    "@chainlink/=lib/chainlink/",
]

[rpc_endpoints]
base = "${ALCHEMY_API_KEY:+https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}}"
base_sepolia = "${ALCHEMY_API_KEY:+https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}}"

[etherscan]
base = { key = "${BASESCAN_API_KEY}", chain = 8453 }
base_sepolia = { key = "${BASESCAN_API_KEY}", chain = 84532 }
```

### `contracts/src/Giveaway.sol` — Single campaign contract (paid entry model)

The full contract is too long for this stack file — bootstrap copies the canonical reference implementation from `.claude/stacks/web3/contracts/Giveaway.sol` (a sibling reference file authored alongside this stack). Required public surface area:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { VRFConsumerBaseV2Plus } from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import { VRFV2PlusClient } from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

contract Giveaway is VRFConsumerBaseV2Plus, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Status { Funding, Open, Drawing, Resolved }

    struct Tier { uint8 rank; uint256 amount; }

    address public immutable sponsor;
    IERC20  public immutable prizeToken;       // ERC-20 used for both prize AND entry fee (single token simplifies UX)
    uint256 public immutable entryFee;         // Per-entry fee in prizeToken's smallest unit (0 allowed for free entry)
    uint64  public immutable endAt;
    Tier[]  public tiers;                      // Absolute amounts; tiers[0] is 1st place
    Status  public status;

    uint256 public bonusPool;                  // Sum of entry fees collected — added to 1st-place at draw
    address[] public entrants;
    mapping(address => bool) public hasEntered;
    address[] public winners;
    mapping(address => uint256) public unclaimedPrize;
    uint256 public vrfRequestId;

    event Entered(address indexed entrant, uint256 feePaid, uint256 newBonusPool);
    event DrawRequested(uint256 indexed vrfRequestId);
    event WinnersDrawn(address[] winners, uint256[] amounts);   // amounts include 1st-place bonus
    event PrizePaid(address indexed winner, uint256 amount);
    event PrizeClaimed(address indexed winner, uint256 amount);

    error AlreadyEntered();
    error NotOpen();
    error NotEnded();
    error AlreadyDrawn();
    error NoEntrants();
    error InsufficientFee();

    /// @notice Enter the giveaway. Pulls `entryFee` USDC from msg.sender via safeTransferFrom.
    /// @dev Caller MUST have approved at least `entryFee` allowance to this contract first.
    ///      Reverts AlreadyEntered if the wallet has entered before.
    ///      Reverts NotOpen if status != Open or block.timestamp >= endAt.
    function enter() external nonReentrant {
        if (status != Status.Open || block.timestamp >= endAt) revert NotOpen();
        if (hasEntered[msg.sender]) revert AlreadyEntered();
        if (entryFee > 0) {
            prizeToken.safeTransferFrom(msg.sender, address(this), entryFee);
            bonusPool += entryFee;
        }
        hasEntered[msg.sender] = true;
        entrants.push(msg.sender);
        emit Entered(msg.sender, entryFee, bonusPool);
    }

    /// @notice Anyone can trigger the draw once endAt has passed. Pays Chainlink VRF gas via subscription.
    function requestDraw() external { /* require status == Open && block.timestamp >= endAt && entrants.length > 0 */ }

    /// @notice VRF callback: selects winners-by-tier and pays out (push, fallback to claim).
    ///         Tier 0 (1st place) receives tiers[0].amount + bonusPool.
    function fulfillRandomWords(uint256, uint256[] calldata words) internal override {
        // For each tier i:
        //   pick winner uniformly from remaining entrants using words[i] as seed
        //   amount = tiers[i].amount + (i == 0 ? bonusPool : 0)
        //   try prizeToken.safeTransfer(winner, amount)
        //   on revert: unclaimedPrize[winner] += amount
        // emit WinnersDrawn + PrizePaid per winner
    }

    /// @notice Pull-payment escape hatch — winners whose push payout reverted can claim here.
    function claim() external nonReentrant {
        uint256 owed = unclaimedPrize[msg.sender];
        require(owed > 0, "Nothing to claim");
        unclaimedPrize[msg.sender] = 0;
        prizeToken.safeTransfer(msg.sender, owed);
        emit PrizeClaimed(msg.sender, owed);
    }

    function getState() external view returns (
        Status _status,
        uint256 _entryFee,
        uint256 _bonusPool,
        uint256 numEntrants,
        uint256 numWinners,
        uint64 _endAt
    );
}
```

Audit-critical invariants (enforced by tests at `contracts/test/Giveaway.t.sol`):

1. **`prizeToken.balanceOf(this) == sum(tiers.amount) + bonusPool` at all times before draw.** Sponsor's escrowed prize is never co-mingled with entry fees in accounting — they're tracked separately so `bonusPool` is exactly recoverable on draw.
2. **Sponsor escrow at funding:** `prizeToken.balanceOf(this) == sum(tiers.amount)` at the moment `status` transitions Funding → Open. A campaign cannot open with under-funded escrow.
3. **One entry per address.** `hasEntered` prevents Sybil within a single wallet. Combined with the entry fee, this raises the per-wallet cost of farming.
4. **Entry fee is collected before state mutation.** `safeTransferFrom` is the first action in `enter()` after the auth checks — if it reverts (insufficient balance / allowance), no state changes and the user can retry after approving.
5. **`bonusPool` is paid out exactly once, to tier[0].** On draw, the entire `bonusPool` is added to 1st place's amount and zeroed out implicitly by paying the prize. No dust remains.
6. **Push-then-claim payout.** `_payOut` tries `safeTransfer`; on failure, sets `unclaimedPrize[winner] += amount`. A misbehaving prize token (paused, blacklisted recipient) cannot brick the entire draw — losers still get their result, winners with payout failures retain a `claim()` fallback.
7. **`claim()` is real.** The function transfers `unclaimedPrize[msg.sender]` via `safeTransfer` and zeroes the balance. There is no admin path to override, drain, or block this; the only way for a winner to be unable to claim is if the prize token contract itself revokes their address, which is outside the giveaway's responsibility.
8. **`vrfRequestId != 0`** blocks `requestDraw()` re-entry — fulfillment is single-shot.
9. **`endAt` is monotonic.** No code path can move it forward — extending a giveaway requires a new contract.
10. **No owner / admin functions.** The contract has zero privileged functions over user funds. The deploying address (sponsor) cannot pause `claim()`, cannot drain the contract, cannot modify tiers or `endAt`, and cannot block specific entrants. The only sponsor-callable surface is funding at create time. This is enforced by the absence of `Ownable` / `AccessControl` imports — `slither --detect arbitrary-send,suicidal,owner-only-controls` runs in CI and any new privileged function fails the build.

### `contracts/src/GiveawayFactory.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Giveaway } from "./Giveaway.sol";
import { Treasury } from "./Treasury.sol";

contract GiveawayFactory {
    address public immutable vrfCoordinator;
    uint256 public immutable vrfSubscriptionId;
    bytes32 public immutable vrfKeyHash;
    Treasury public immutable treasury;

    event GiveawayCreated(
        address indexed giveaway,
        address indexed sponsor,
        address indexed prizeToken,
        uint256 entryFee,
        uint64 endAt
    );

    /// @notice Deploys a new Giveaway. Sponsor must approve sum(tiers.amount) of prizeToken first.
    /// @param prizeToken ERC-20 used for both prize escrow and per-entry fees.
    /// @param tiers      Absolute prize amounts; tiers[0] is 1st place.
    /// @param entryFee   Per-entry fee in prizeToken's smallest unit. Pass 0 for free entry.
    /// @param endAt      Unix timestamp when entries close. Must be > block.timestamp.
    function create(
        address prizeToken,
        Giveaway.Tier[] calldata tiers,
        uint256 entryFee,
        uint64 endAt
    ) external returns (address);
}
```

`create()` deploys a fresh `Giveaway`, transfers `sum(tiers.amount)` prize tokens from sender into the new giveaway (the sponsor's escrow), and emits `GiveawayCreated` — this is the event the indexer watches to populate the campaign list. `entryFee` is set immutable on the new contract; the sponsor cannot change it after deployment.

### `contracts/script/Deploy.s.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script } from "forge-std/Script.sol";
import { GiveawayFactory } from "../src/GiveawayFactory.sol";
import { Treasury } from "../src/Treasury.sol";

contract Deploy is Script {
    function run() external returns (address factory, address treasury) {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address vrfCoord = vm.envAddress("VRF_COORDINATOR");
        bytes32 vrfKeyHash = vm.envBytes32("VRF_KEY_HASH");
        uint256 subId = vm.envUint("CHAINLINK_VRF_SUBSCRIPTION_ID");
        vm.startBroadcast(pk);
        Treasury t = new Treasury(msg.sender);
        GiveawayFactory f = new GiveawayFactory(vrfCoord, subId, vrfKeyHash, t);
        vm.stopBroadcast();
        return (address(f), address(t));
    }
}
```

Run with: `forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --verify`.

### `indexer/ponder.config.ts` — Ponder app config

```ts
// Load .env before any process.env access. Ponder runs as a standalone Node
// process (not under Next.js) so framework auto-loading does not apply.
import "dotenv/config";

import { createConfig } from "ponder";
import { http } from "viem";
import { GiveawayFactoryAbi } from "./abis/GiveawayFactory";
import { GiveawayAbi } from "./abis/Giveaway";

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "84532");
const rpcUrl = process.env.PONDER_RPC_URL_BASE!;
const factoryAddress = process.env.NEXT_PUBLIC_GIVEAWAY_FACTORY_ADDRESS as `0x${string}`;

export default createConfig({
  networks: {
    base: { chainId, transport: http(rpcUrl) },
  },
  contracts: {
    GiveawayFactory: {
      network: "base",
      abi: GiveawayFactoryAbi,
      address: factoryAddress,
      startBlock: Number(process.env.PONDER_START_BLOCK ?? "0"),
    },
    Giveaway: {
      network: "base",
      abi: GiveawayAbi,
      // Factory pattern — Ponder discovers each Giveaway contract via the
      // GiveawayCreated event emitted by GiveawayFactory.
      factory: {
        address: factoryAddress,
        event: {
          name: "GiveawayCreated",
          inputs: [
            { type: "address", name: "giveaway", indexed: true },
            { type: "address", name: "sponsor", indexed: true },
            { type: "address", name: "prizeToken", indexed: true },
            { type: "uint64", name: "endAt" },
          ],
        },
        parameter: "giveaway",
      },
      startBlock: Number(process.env.PONDER_START_BLOCK ?? "0"),
    },
  },
  database: {
    kind: "postgres",
    connectionString: process.env.PONDER_DATABASE_URL!,
    schema: "indexer", // separate schema so app tables in `public` are untouched
  },
});
```

### `indexer/ponder.schema.ts`

```ts
import { onchainTable, primaryKey } from "ponder";

export const giveaway = onchainTable("giveaway", (t) => ({
  address: t.hex().primaryKey(),
  sponsor: t.hex().notNull(),
  prizeToken: t.hex().notNull(),
  entryFee: t.bigint().notNull(),                 // Per-entry fee in prizeToken's smallest unit
  endAt: t.bigint().notNull(),
  status: t.text().notNull(),                     // 'Open' | 'Drawing' | 'Resolved'
  prizePool: t.bigint().notNull(),                // Sponsor-funded base pool = sum(tiers.amount)
  bonusPool: t.bigint().notNull().default(0n),    // Accumulated entry fees, added to 1st place at draw
  numEntrants: t.integer().notNull().default(0),
  createdAt: t.bigint().notNull(),
}));

export const entry = onchainTable(
  "entry",
  (t) => ({
    giveaway: t.hex().notNull(),
    entrant: t.hex().notNull(),
    feePaid: t.bigint().notNull(),                // Captured from Entered event (may be 0 for free-entry campaigns)
    blockNumber: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  }),
  (t) => ({ pk: primaryKey({ columns: [t.giveaway, t.entrant] }) })
);

export const winner = onchainTable(
  "winner",
  (t) => ({
    giveaway: t.hex().notNull(),
    rank: t.integer().notNull(),
    address: t.hex().notNull(),
    amount: t.bigint().notNull(),                 // For rank=1, includes the bonusPool added to base tier amount
    claimed: t.boolean().notNull().default(false),
    txHash: t.hex().notNull(),
  }),
  (t) => ({ pk: primaryKey({ columns: [t.giveaway, t.rank] }) })
);
```

### `indexer/src/index.ts` — Event handlers

```ts
import { ponder } from "ponder:registry";
import { giveaway, entry, winner } from "ponder:schema";

ponder.on("GiveawayFactory:GiveawayCreated", async ({ event, context }) => {
  await context.db.insert(giveaway).values({
    address: event.args.giveaway,
    sponsor: event.args.sponsor,
    prizeToken: event.args.prizeToken,
    entryFee: event.args.entryFee,
    endAt: event.args.endAt,
    status: "Open",
    prizePool: 0n,                       // Hydrated from tiers via a follow-up read; see below
    bonusPool: 0n,
    numEntrants: 0,
    createdAt: event.block.timestamp,
  });
  // Note: tier amounts are not in the GiveawayCreated event payload (gas).
  // A separate ponder block-handler reads tiers() from the contract on first sight
  // and updates `prizePool = sum(tiers.amount)`. See indexer/src/hydrate-tiers.ts.
});

ponder.on("Giveaway:Entered", async ({ event, context }) => {
  await context.db.insert(entry).values({
    giveaway: event.log.address,
    entrant: event.args.entrant,
    feePaid: event.args.feePaid,
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
  });
  // Atomic update — bonusPool comes straight from the event so we don't need to refetch.
  await context.db
    .update(giveaway, { address: event.log.address })
    .set((row) => ({
      numEntrants: row.numEntrants + 1,
      bonusPool: event.args.newBonusPool,
    }));
});

ponder.on("Giveaway:WinnersDrawn", async ({ event, context }) => {
  for (let i = 0; i < event.args.winners.length; i++) {
    await context.db.insert(winner).values({
      giveaway: event.log.address,
      rank: i + 1,
      address: event.args.winners[i],
      amount: event.args.amounts[i],
      claimed: false,
      txHash: event.transaction.hash,
    });
  }
  await context.db
    .update(giveaway, { address: event.log.address })
    .set({ status: "Resolved" });
});

ponder.on("Giveaway:PrizeClaimed", async ({ event, context }) => {
  // Lookup by (giveaway, address) — Ponder's helper API is Drizzle-compatible
  await context.db
    .update(winner)
    .set({ claimed: true })
    .where((row) =>
      row.giveaway.eq(event.log.address).and(row.address.eq(event.args.winner))
    );
});
```

## Patterns

### Where each piece of data lives

| Data | Source of truth | Reader |
|---|---|---|
| Giveaway address, sponsor, prize token, end time | On-chain event log | Indexer → Postgres → Next.js `from("indexer.giveaway").select()` |
| Current number of entrants | Indexer counter | Same — read from Postgres for list pages |
| Did *I* enter? | On-chain `hasEntered[user]` via `useReadContract` | Detail page only — fast and cheap, but never list pages |
| Connected wallet address | wagmi `useAccount()` | Anywhere (client-only) |
| Server actions need wallet identity | SIWE / verified message → cookie | API routes only — never trust `request.headers["x-wallet-address"]` |

**Anti-pattern:** Reading per-giveaway state by hammering the RPC from a list page (`useReadContract` × 50 cards). Always read the indexer for list pages; reserve direct contract reads for the detail page and write paths.

### Server-side identity

Wallet auth without an off-chain backend is just a connected wallet — server APIs cannot trust the `address` from the connector. Whenever an API route needs to mutate user state on behalf of a specific wallet:

1. Client calls `signMessage` with a SIWE-formatted message containing a server-issued nonce.
2. Server verifies signature with `viem`'s `verifyMessage`, then sets a short-lived signed httpOnly cookie pinning `wallet_address`.
3. Subsequent API routes read the cookie. Reject any body field claiming an `address` — the cookie is the only trusted identity.

This template ships with `auth: none` because the **wallet** is the identity. The cookie session described above is implemented by `scaffold-libs` only when an API route writes off-chain state keyed by `wallet_address` (e.g., email opt-in for winner notifications).

### Sponsor flow (write)

```
User on /create-campaign
    -> form submit
      -> writeContract(usdc.approve(factory, totalPrize))
        -> writeContract(factory.create(prizeToken, tiers, endAt))
          -> wait for receipt → read GiveawayCreated event log → router.push(`/giveaways/${address}`)
```

**Two signatures, not one.** Sponsors must sign approve + create separately. Do not attempt to bundle these via a custom multicall — most wallets show garbled summaries for unknown contracts and users abandon the flow.

### Participant flow (write)

```
User on /giveaways/[address]
    -> click 'Enter (Pay 1 USDC)'
      -> if (allowance < entryFee):
        writeContract(usdc.approve(giveaway, entryFee))   <- signature 1
      -> writeContract(giveaway.enter())                     <- signature 2 (always)
        -> contract pulls entryFee via safeTransferFrom
        -> wait for receipt → trackEntrySubmitted({ entry_fee_usdc: 1 })
        -> refetch hasEntered, numEntrants, bonusPool
```

**Two signatures on first entry, one on subsequent entries from the same wallet** (allowance persists). The hook's `enterPaid()` auto-skips approval when `allowance >= entryFee`, so a returning user signs once.

If `enter()` reverts with:
- `AlreadyEntered` — the indexer is ahead of page state; refresh and show "you're in".
- `NotOpen` — the giveaway closed between page-load and click; show resolved state.
- `ERC20: insufficient allowance` — the approve was front-run or the user reduced allowance externally; re-run `enterPaid()` to re-approve.
- `ERC20: transfer amount exceeds balance` — surface a clear "you need at least 1 USDC to enter" message and link to a faucet (testnet) or an on/off-ramp (mainnet).

## Security

- **Never import `DEPLOYER_PRIVATE_KEY` into Next.js code.** It is a Foundry-only secret. Frontend writes happen via the user's wallet — there is never a server-side signer.
- **Never expose the Chainlink VRF subscription owner key.** The subscription is funded with LINK by the deployer and adds the GiveawayFactory as a consumer — once configured, no further key access is needed at runtime.
- **Always validate prize-token addresses on the server** before showing a giveaway in the public list. An unfamiliar token may be a honeypot (transfer-disabled, infinite-mint). For the MVP, restrict to a hard-coded allowlist (USDC, native-wrapped). Lift the restriction only after on-chain token-screening is wired.
- **Reject zero-fee resolution paths.** `requestDraw()` must require LINK in the subscription — a draw triggered with insufficient LINK silently never fulfills, and the prize escrow is locked. The factory's deployment script verifies subscription balance before each create.
- **Front-running on `enter()` is not a concern** for free entries (no economic gain to ordering). For paid-entry giveaways (Phase 2+), use commit-reveal.

## Demo Mode

The web3 stack supports two failure modes that visual review and `/verify` must tolerate:

1. **No wallet installed** (CI containers, `playwright` runners) → use the injected `wagmi` connector with a fixture-mode shim.
2. **No deployed contract** (fresh bootstrap, before `forge script` runs) → contracts return `0x0` placeholder addresses; reads must not throw.

The `isDemoWeb3` flag in `web3-config.ts` covers both: when truthy, RainbowKit's modal is bypassed, all `useReadContract` calls return `undefined` (caller handles loading state), and `writeContract` calls are intercepted by a wagmi mock connector that resolves immediately with a fake hash. This is implemented entirely in `web3-config.ts` — pages and hooks should never check `process.env.NEXT_PUBLIC_DEMO_MODE` directly.

`DEMO_MODE` is never added to `.env.example`. Only the visual scanner sets it.

## Analytics Integration

Wire these events from `experiment/EVENTS.yaml` (added by `/spec` once this stack is selected):

- `wallet_connect_clicked` (demand) — fired on the connect button BEFORE opening the modal.
- `wallet_connected` (demand) — fired from a single `useAccount` watcher on disconnected → connected transition. Properties: `chain_id`, `connector_id`.
- `entry_approve_signed` (activate) — fired after the USDC approve tx receipt confirms (only when allowance was insufficient). Properties: `giveaway_address`, `entry_fee_usdc`. Skipped on subsequent entries with persistent allowance.
- `entry_submitted` (activate) — fired after the `enter()` tx receipt confirms (not on send). Properties: `giveaway_address`, `entry_fee_usdc`, `bonus_pool_usdc_after`, `chain_id`. The funnel ratio that matters is `entry_submitted / wallet_connected` (h-02 threshold: 0.20 with paid entry).
- `campaign_funded` (activate) — fired after the sponsor's create+approve receipts confirm. Properties: `giveaway_address`, `prize_token`, `prize_pool_usdc`, `entry_fee_usdc`, `chain_id`.
- `entry_repeat` (retain) — fired only when `entry_submitted` fires for a wallet that has fired `entry_submitted` previously. Detection lives in the indexer post-processor (Postgres window function), not the client.
- `claim_submitted` (activate) — fired when a winner clicks the pull-payment claim button after a push-payout failure. Properties: `giveaway_address`, `amount_usdc`, `chain_id`. Should fire rarely — push payout succeeds for ~99% of standard ERC-20s.

All events carry the project's standard `project_name` + `project_owner` global properties. The wallet address is **not** a PII identifier and may be sent as the `distinct_id`.

## Production Observability

This stack file prescribes env-gated source code — both `web3-config.ts` and `contracts.ts` fall back to placeholder values when env vars are missing. Without compensating visibility, a production deployment can silently route into demo mode (no real wallet connect, no real contract reads) and fail open.

**Fail-loud mechanism:**

1. **Build-time prebuild guard** at `scripts/check-web3-env.mjs`, wired as `prebuild` in `package.json`. The script fails the build when `process.env.VERCEL === "1"` AND any of `NEXT_PUBLIC_GIVEAWAY_FACTORY_ADDRESS`, `NEXT_PUBLIC_TREASURY_ADDRESS`, `NEXT_PUBLIC_USDC_ADDRESS`, or `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is empty or matches the canonical placeholder. The check is skipped on local dev and bootstrap CI builds.

2. **Runtime warn-once** in `web3-config.ts` and `contracts.ts`: when `isDemoWeb3` resolves true on a deployed host (`window.location.hostname` is not localhost / `*.local`), each module emits a single `console.error` per page load identifying which env var triggered the fallback. Warnings include the canonical fix command (`vercel env add NEXT_PUBLIC_GIVEAWAY_FACTORY_ADDRESS`).

3. **Health-check signal:** `src/app/api/health/route.ts` (created by `framework/nextjs`) returns `{ web3: "demo" | "live", chain_id, factory_address }` so deploy verification (`/distribute` STATE 2) can detect demo routing without parsing logs.

**Placeholder-replacement contract:**

| File | Placeholder string | Replaced by |
|---|---|---|
| `web3-config.ts` | `placeholder-walletconnect-id` | User edit + `vercel env add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` post-deploy |
| `contracts.ts` | `0x0000000000000000000000000000000000000000` | `forge script script/Deploy.s.sol` writes addresses to `.runs/web3-deploy.json`; `scaffold-wire` then runs `vercel env add` for each |
| `Giveaway.json` etc. | `[]` (empty ABI) | `scaffold-wire` after `forge build` extracts each ABI from `contracts/out/<Name>.sol/<Name>.json#abi` |

**Behavior matrix:**

| Source customized | Env override | Deployment context | Result |
|---|---|---|---|
| no | no | local dev (`npm run dev`) | demo wallet, mock contracts, no warning |
| no | no | Vercel build | **prebuild fails** with explicit env list |
| no | yes | Vercel runtime | live web3 with real WC + real factory |
| yes | no | local dev | live web3 (user pasted address into `web3-config.ts` directly) |
| yes (placeholder kept) | no | Vercel runtime | demo routing, runtime warn-once `console.error` |

`/distribute` STATE 2 reads `/api/health` and blocks campaign launch when `web3 === "demo"`.

## Stack Knowledge

### When `useReadContract` is called on a list page

Reading per-giveaway on-chain state via `useReadContract` once per card on a list page produces an RPC stampede — 50 cards × `getState` = 50 simultaneous `eth_call` requests on every list render. Even Alchemy's free tier hits the rate limit. The pattern that works:

1. List pages read from the indexer (`from("indexer.giveaway")`).
2. Detail pages read on-chain state via `useReadContract` (one card, low concurrency).

If a list page genuinely needs fresh on-chain state (e.g. a "live entries" counter), batch reads with `useReadContracts` (plural) so wagmi multicalls them into a single RPC round-trip — but the better answer is almost always to push the indexer's `numEntrants` counter and accept ~5s lag.

### When `chainId` is read from `process.env` outside `web3-config.ts`

The `isDemoWeb3` flag and `ACTIVE_CHAIN` constant exist precisely so the rest of the codebase has one source of truth for chain selection. Reading `process.env.NEXT_PUBLIC_CHAIN_ID` directly in pages or hooks defeats that — when the demo override fires (placeholder WC id), pages that read the env var directly target the wrong chain and produce confusing "transaction reverted" errors. Always import `ACTIVE_CHAIN` from `@/lib/web3-config`.

### When VRF fulfillment never arrives in production

Three causes, in order of frequency:

1. The Chainlink VRF subscription is out of LINK. Top up at https://vrf.chain.link/ for the target chain.
2. The deployed `GiveawayFactory` is not registered as a consumer of the subscription. Each new factory deployment requires an `addConsumer` tx.
3. The `vrfKeyHash` baked into the factory does not match the target chain. Base mainnet and Base Sepolia have different key hashes — copy from the Chainlink docs at deploy time, do not reuse a hash from a different chain.

`/deploy` automates (1) and (2); `forge script` validates (3) by checking `keyHash` against a hard-coded chain → keyHash map before broadcasting.

### When ERC-20 `approve` is bundled with `create` in a single user click

Wallets show garbled summaries for unknown contracts when two writes are bundled via custom multicall. Sponsors abandon the flow at ~40% rate vs. ~10% for two separate signatures (anecdata from Polymarket migration to permit-based flows). For Phase 1, keep the two-step. Phase 2+ should adopt EIP-2612 `permit` for tokens that support it (USDC on Base does) — the user signs an off-chain typed-data approval, and `create` consumes it. This collapses the UX to one signature without the multicall opacity.

## PR Instructions

Post-merge setup the user must complete:

1. **WalletConnect project ID:** Create at https://cloud.walletconnect.com/, then `vercel env add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`.
2. **Chainlink VRF subscription:** Create at https://vrf.chain.link/base-sepolia, fund with 5 LINK from https://faucets.chain.link/, then `vercel env add CHAINLINK_VRF_SUBSCRIPTION_ID`.
3. **Deploy contracts:**
   ```bash
   cd contracts
   forge install   # first time only
   forge test
   forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --verify
   ```
   Copy `factory` and `treasury` addresses from `.runs/web3-deploy.json` into Vercel env vars (`vercel env add NEXT_PUBLIC_GIVEAWAY_FACTORY_ADDRESS`, etc.).
4. **Register the factory as a VRF consumer:** in the Chainlink VRF UI, add the deployed `GiveawayFactory` address.
5. **Boot the indexer:** `cd indexer && npm install && npx ponder dev` (local), or deploy to Railway / Fly with `PONDER_DATABASE_URL` pointed at the same Supabase instance the Next.js app uses.
6. **Apply indexer schema to Supabase:** `psql $PONDER_DATABASE_URL -c "CREATE SCHEMA IF NOT EXISTS indexer;"` — Ponder creates its tables in this schema. Grant `SELECT` to `authenticated` so the Next.js app can read indexed data:
   ```sql
   GRANT USAGE ON SCHEMA indexer TO authenticated;
   GRANT SELECT ON ALL TABLES IN SCHEMA indexer TO authenticated;
   ALTER DEFAULT PRIVILEGES IN SCHEMA indexer GRANT SELECT ON TABLES TO authenticated;
   ```
   No INSERT/UPDATE grants — the indexer writes via direct DB connection, not the Supabase client.

7. **Geofence:** if shipping to production with US users blocked, configure Vercel Edge Middleware (`src/middleware.ts`) to check `request.geo?.country` and return a 451 page for `US`. The MVP ships without this — add it before mainnet.

## Compatibility

- **incompatible_databases:** none in principle, but Ponder requires Postgres. SQLite database stack is incompatible — use `database: supabase` or another Postgres provider.
- **incompatible_hosting:** none. Vercel deploys the Next.js app; the indexer runs separately (Railway/Fly/own VPS). Do NOT attempt to run the indexer on Vercel — it requires a long-running process and persistent state.
- **incompatible_auth:** `auth: supabase` is incompatible with the wallet-as-identity pattern this stack assumes. Use `auth: none` and let the wallet connector be the identity. If a project genuinely needs both (email-and-wallet hybrid), file an issue — that is a non-trivial extension.
