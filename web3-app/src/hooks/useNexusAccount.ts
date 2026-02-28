'use client';

import { useAccount, useSignMessage, useReadContract, useChainId, useSwitchChain, usePublicClient } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { CONTRACTS } from '@/constants/contracts';
import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Session storage key & duration ──────────────────────────────────────────
const SESSION_KEY      = 'nexus_aa_session_v2';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// ─── Types ────────────────────────────────────────────────────────────────────
interface NexusSession {
  ownerAddress:       string;
  smartAccount:       string;
  sessionToken:       string;
  paymasterSignature: string | null;
  expiresAt:          number;  // ms
  issuedAt:           number;  // ms
}

export type LoginStep =
  | 'idle'
  | 'fetching_nonce'
  | 'awaiting_signature'
  | 'verifying'
  | 'deploying_account'
  | 'done'
  | 'error';

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useNexusAccount() {
  const { address: ownerAddress, isConnected } = useAccount();
  const chainId                                = useChainId();
  const { switchChainAsync }                   = useSwitchChain();
  const { signMessageAsync }                   = useSignMessage();
  const publicClient                           = usePublicClient();

  const [session,   setSession]   = useState<NexusSession | null>(null);
  const [step,      setStep]      = useState<LoginStep>('idle');
  const [errorMsg,  setErrorMsg]  = useState<string | null>(null);

  const isWrongNetwork = isConnected && chainId !== sepolia.id;
  const isVerified     = !!session && session.expiresAt > Date.now();
  const smartAccount   = session?.smartAccount ?? null;

  // ── Restore session from localStorage on mount / address change ──
  useEffect(() => {
    if (!ownerAddress) {
      setSession(null);
      setStep('idle');
      return;
    }

    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return;

      const saved: NexusSession = JSON.parse(raw);

      if (
        saved.ownerAddress.toLowerCase() === ownerAddress.toLowerCase() &&
        saved.expiresAt > Date.now()
      ) {
        setSession(saved);
        setStep('done');
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [ownerAddress]);

  // ── Predicted smart account address (from AccountFactory.getAddress) ──
  const { data: predictedAddress, isLoading: isPredicting, isError } = useReadContract({
    address:      CONTRACTS.ACCOUNT_FACTORY.address,
    abi:          CONTRACTS.ACCOUNT_FACTORY.abi,
    functionName: 'getAddress',
    args:         ownerAddress ? [ownerAddress, BigInt(0)] : undefined,
    query:        { enabled: !!ownerAddress && !isWrongNetwork, retry: 1 },
  });

  // ── Check if smart account is already deployed on-chain ──
  const checkAccountDeployed = useCallback(async (addr: string): Promise<boolean> => {
    if (!publicClient) return false;
    try {
      const code = await publicClient.getBytecode({ address: addr as `0x${string}` });
      return !!code && code !== '0x';
    } catch {
      return false;
    }
  }, [publicClient]);

  // ── Main login flow ───────────────────────────────────────────────────────
  const verifyAndLogin = useCallback(async () => {
    if (!ownerAddress || isWrongNetwork) return;

    setErrorMsg(null);
    setStep('fetching_nonce');

    try {
      // ── Step 1: Get a fresh nonce from backend ──
      const nonceRes = await fetch(`/api/sign?address=${ownerAddress}`);
      if (!nonceRes.ok) throw new Error('Failed to fetch nonce');
      const { nonce } = await nonceRes.json();

      // ── Step 2: Predict smart account address ──
      const saAddr = (predictedAddress as string | undefined) ?? null;

      // ── Step 3: Build SIWE message ──
      const domain    = window.location.host;
      const issuedAt  = new Date().toISOString();
      const expiresAt = new Date(Date.now() + SESSION_DURATION).toISOString();

      const message = [
        `${domain} wants you to sign in with your Ethereum account:`,
        ownerAddress,
        '',
        'Authorize Nexus Protocol session. This is gasless and does not cost ETH.',
        '',
        `Smart Account: ${saAddr ?? 'computing...'}`,
        `URI: https://${domain}`,
        `Version: 1`,
        `Chain ID: ${chainId}`,
        `Nonce: ${nonce}`,
        `Issued At: ${issuedAt}`,
        `Expiration Time: ${expiresAt}`,
      ].join('\n');

      // ── Step 4: Ask user to sign ──
      setStep('awaiting_signature');
      const signature = await signMessageAsync({ message });

      // ── Step 5: Send to backend for verification + paymaster sig ──
      setStep('verifying');
      const verifyRes = await fetch('/api/sign', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          address:      ownerAddress,
          smartAccount: saAddr ?? ownerAddress, // fallback to EOA if not predicted yet
          nonce,
          signature,
          message,
        }),
      });

      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        throw new Error(err.error ?? 'Verification failed');
      }

      const {
        sessionToken,
        paymasterSignature,
        sessionExpiry,
        smartAccount: verifiedSA,
      } = await verifyRes.json();

      // ── Step 6: Check if smart account needs deployment ──
      if (saAddr) {
        const deployed = await checkAccountDeployed(saAddr);
        if (!deployed) {
          setStep('deploying_account');
          // Account will be lazily deployed on first UserOperation via EntryPoint.
          // We just note this — no action needed here since AccountFactory.createAccount
          // is called inside the first UserOp's initCode, sponsored by NexusPaymaster.
          console.log('[nexus] Smart account not yet deployed — will deploy on first tx');
        }
      }

      // ── Step 7: Persist session ──
      const newSession: NexusSession = {
        ownerAddress:       ownerAddress.toLowerCase(),
        smartAccount:       (verifiedSA ?? saAddr ?? ownerAddress).toLowerCase(),
        sessionToken,
        paymasterSignature: paymasterSignature ?? null,
        expiresAt:          sessionExpiry ? sessionExpiry * 1000 : Date.now() + SESSION_DURATION,
        issuedAt:           Date.now(),
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
      setSession(newSession);
      setStep('done');

      console.log('✅ [nexus] AA session established', {
        smartAccount:       newSession.smartAccount,
        expiresIn:          '24h',
        paymasterSig:       !!paymasterSignature,
      });

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      // User rejected signature — quiet fail
      if (msg.includes('rejected') || msg.includes('denied') || msg.includes('cancelled')) {
        setStep('idle');
      } else {
        setErrorMsg(msg);
        setStep('error');
      }
      console.error('❌ [nexus] Login failed:', msg);
    }
  }, [ownerAddress, isWrongNetwork, chainId, signMessageAsync, predictedAddress, checkAccountDeployed]);

  // ── Logout ──
  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setStep('idle');
    setErrorMsg(null);
  }, []);

  // ── Session time remaining 
  const sessionTimeRemaining = session
    ? Math.max(0, session.expiresAt - Date.now())
    : 0;

  const sessionHoursLeft = Math.floor(sessionTimeRemaining / (1000 * 60 * 60));
  const sessionMinsLeft  = Math.floor((sessionTimeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  return {
    // Addresses
    ownerAddress,
    smartAccount:       session?.smartAccount ?? (predictedAddress as string | undefined) ?? null,
    predictedAddress:   predictedAddress as string | undefined,

    // State
    isConnected,
    isVerified,
    isWrongNetwork,
    isPredicting,
    isError,
    step,
    errorMsg,

    // Session info
    session,
    sessionHoursLeft,
    sessionMinsLeft,
    paymasterSignature: session?.paymasterSignature ?? null,

    // Actions
    verifyAndLogin,
    logout,
    handleNetworkSwitch: () => switchChainAsync?.({ chainId: sepolia.id }),
  };
}
