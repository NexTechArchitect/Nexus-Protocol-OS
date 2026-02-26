'use client';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, http, fallback } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { RainbowKitProvider, darkTheme, getDefaultConfig } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

const WALLET_CONNECT_PROJECT_ID = '3cf8b03cfbced72866e6a8fbb009a534';

const RPC_URL = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL;

const config = getDefaultConfig({
  appName: 'Nexus Perps',
  projectId: WALLET_CONNECT_PROJECT_ID,
  chains: [sepolia],
  transports: {
    // fallback() tries Alchemy first, then public nodes if Alchemy fails/slow
    [sepolia.id]: fallback([
      http(RPC_URL || ""),                                          // Alchemy (primary)
      http("https://ethereum-sepolia-rpc.publicnode.com"),          // public fallback 1
      http("https://rpc.sepolia.org"),                              // public fallback 2
      http("https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"), // infura public
    ]),
  },
  ssr: true,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 10_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: '#3b82f6' })}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
