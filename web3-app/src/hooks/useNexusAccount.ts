'use client';

import { useAccount, useSignMessage, useReadContract, useChainId, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { CONTRACTS } from '@/constants/contracts';
import { useState, useEffect } from 'react';

// Key for browser storage
const SESSION_KEY = 'nexus_protocol_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 Hours

export function useNexusAccount() {
  const { address: ownerAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();
  const [smartAccount, setSmartAccount] = useState<`0x${string}` | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  const isWrongNetwork = isConnected && chainId !== sepolia.id;

  // 1. Automatic Session Check (On Load)
  useEffect(() => {
    if (!ownerAddress) {
      setIsVerified(false);
      return;
    }

    // Check if user has a valid active session
    const storedSession = localStorage.getItem(SESSION_KEY);
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        // Verify address matches and session hasn't expired
        if (session.address === ownerAddress && session.expiry > Date.now()) {
          setIsVerified(true); // Auto-login
        } else {
          localStorage.removeItem(SESSION_KEY); // Clear expired
          setIsVerified(false);
        }
      } catch (e) {
        localStorage.removeItem(SESSION_KEY);
        setIsVerified(false);
      }
    }
  }, [ownerAddress]);

  const { data: predictedAddress, isLoading, isError } = useReadContract({
    address: CONTRACTS.ACCOUNT_FACTORY.address,
    abi: CONTRACTS.ACCOUNT_FACTORY.abi,
    functionName: 'getAddress',
    args: ownerAddress ? [ownerAddress, BigInt(0)] : undefined,
    query: { enabled: !!ownerAddress && !isWrongNetwork, retry: 0 }
  });

  useEffect(() => {
    if (predictedAddress) setSmartAccount(predictedAddress as `0x${string}`);
  }, [predictedAddress]);

  const verifyAndLogin = async () => {
    if (!ownerAddress || isWrongNetwork) return;
    
    try {
      // Generic SIWE Message (No specific Site Name)
      const domain = window.location.host;
      const validNonce = Math.random().toString(36).substring(2, 15);
      const issuedAt = new Date().toISOString();
      
      const message = `${domain} requests authentication:\n\nWallet: ${ownerAddress}\n\nSign this message to verify ownership and authorize protocol session. This is gasless.\n\nURI: https://${domain}\nChain ID: ${chainId}\nNonce: ${validNonce}\nIssued At: ${issuedAt}`;
      
      const signature = await signMessageAsync({ message });
      
      if (signature) {
        setIsVerified(true);
        // Save Session to Local Storage
        const sessionData = {
          address: ownerAddress,
          expiry: Date.now() + SESSION_DURATION
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        console.log("✅ Session Authenticated & Persisted");
      }
    } catch (err) {
      console.error("❌ Signature rejected", err);
    }
  };

  // Helper to logout manually if needed
  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setIsVerified(false);
  };

  return {
    ownerAddress,
    smartAccount,
    isConnected,
    isVerified,
    verifyAndLogin,
    logout,
    isPredicting: isLoading,
    isError,
    isWrongNetwork,
    handleNetworkSwitch: () => switchChainAsync?.({ chainId: sepolia.id })
  };
}