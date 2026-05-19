"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { isDemoWeb3 } from "@/lib/web3-config";

interface ConnectWalletButtonProps {
  className?: string;
}

/**
 * Force MetaMask (and other EIP-2255 wallets) to show the account picker.
 * `eth_requestAccounts` only prompts the FIRST time — afterwards it silently
 * returns the previously-authorized account. `wallet_requestPermissions` with
 * `eth_accounts` resets the permission and forces a fresh picker every time.
 */
async function requestAccountPicker(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eth = (window as any).ethereum;
  console.log("[lottoblast-connect] window.ethereum:", eth);
  console.log("[lottoblast-connect] isMetaMask:", eth?.isMetaMask);
  console.log("[lottoblast-connect] providers:", eth?.providers);
  if (!eth || typeof eth.request !== "function") {
    console.error("[lottoblast-connect] No EIP-1193 provider found on window.ethereum");
    return false;
  }
  try {
    console.log("[lottoblast-connect] Calling wallet_requestPermissions...");
    const result = await eth.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });
    console.log("[lottoblast-connect] permissions returned:", result);
    return true;
  } catch (err) {
    console.error("[lottoblast-connect] requestPermissions threw:", err);
    return false;
  }
}

export function ConnectWalletButton({ className }: ConnectWalletButtonProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isDemoWeb3) {
    async function handleConnect() {
      console.log("[lottoblast-connect] handleConnect fired");
      console.log("[lottoblast-connect] available connectors:", connectors.map(c => ({ id: c.id, name: c.name })));
      // Force account picker even if MetaMask already has a permission for this site.
      const picked = await requestAccountPicker();
      console.log("[lottoblast-connect] picked:", picked);
      if (!picked) return;

      const injected = connectors.find((c) => c.id === "injected");
      console.log("[lottoblast-connect] injected connector:", injected);
      if (injected) {
        connect({ connector: injected });
        console.log("[lottoblast-connect] connect() called");
      } else {
        console.error("[lottoblast-connect] No injected connector available");
      }
    }

    async function handleSwitch() {
      // Disconnect from wagmi first, then re-prompt MetaMask for an account.
      disconnect();
      await new Promise((r) => setTimeout(r, 100));
      const picked = await requestAccountPicker();
      if (!picked) return;
      const injected = connectors.find((c) => c.id === "injected");
      if (injected) connect({ connector: injected });
    }

    return isConnected ? (
      <div className="flex gap-2">
        <Button
          variant="outline"
          className={className}
          onClick={handleSwitch}
          title="Switch account"
        >
          {address?.slice(0, 6)}…{address?.slice(-4)}
        </Button>
      </div>
    ) : (
      <Button className={className} onClick={handleConnect}>
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
            className={className}
            onClick={() => {
              if (!connected) {
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
