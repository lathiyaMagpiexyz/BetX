"use client";

import { ReactNode, useState } from "react";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";
import { wagmiConfig, isDemoWeb3 } from "@/lib/web3-config";

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {isDemoWeb3 ? (
          <>{children}</>
        ) : (
          <RainbowKitProvider
            theme={darkTheme({
              accentColor: "hsl(320, 90%, 60%)",
              accentColorForeground: "white",
              borderRadius: "medium",
              overlayBlur: "small",
            })}
            modalSize="compact"
          >
            {children}
          </RainbowKitProvider>
        )}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
