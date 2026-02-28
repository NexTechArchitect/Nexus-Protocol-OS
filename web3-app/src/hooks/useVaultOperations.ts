'use client';

import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi';
import { CONTRACTS } from '@/constants/contracts';
import { parseUnits } from 'viem';
import { useState, useEffect, useRef } from 'react';

// ─── ABIs defined once (stable references) ────────────────────────────────────
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    name: 'allowance',
    type: 'function',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

const VAULT_LP_ABI = [
  {
    name: 'addLiquidity',      // ← LP deposit (mints HLV shares)
    type: 'function',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    name: 'removeLiquidity',   // ← LP withdraw (burns HLV shares)
    type: 'function',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useVaultOperations(
  onNotification?: (
    title: string,
    msg: string,
    type: 'loading' | 'success' | 'error',
    hash?: string,
  ) => void,
) {
  const { address } = useAccount();

  const [status, setStatus] = useState<
    'IDLE' | 'APPROVING' | 'DEPOSITING' | 'WITHDRAWING' | 'SUCCESS'
  >('IDLE');

  // Store the USDC amount (6-dec bigint) we want to addLiquidity with,
  // so we can fire it automatically once approval is confirmed on-chain.
  const pendingAmountRef = useRef<bigint | null>(null);

  // ── Write hooks ──────────────────────────────────────────────────────────
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovePending,
  } = useWriteContract();

  const {
    writeContract: writeAddLiquidity,
    data: addLiqHash,
    isPending: isAddLiqPending,
  } = useWriteContract();

  const {
    writeContract: writeRemoveLiquidity,
    data: removeLiqHash,
    isPending: isRemoveLiqPending,
  } = useWriteContract();

  // ── Wait-for-receipt hooks ────────────────────────────────────────────────
  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } =
    useWaitForTransactionReceipt({ hash: approveHash });

  const { isLoading: isAddLiqConfirming, isSuccess: isAddLiqSuccess } =
    useWaitForTransactionReceipt({ hash: addLiqHash });

  const { isLoading: isRemoveLiqConfirming, isSuccess: isRemoveLiqSuccess } =
    useWaitForTransactionReceipt({ hash: removeLiqHash });

  // ── Allowance read ────────────────────────────────────────────────────────
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.USDC.address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.VAULT.address] : undefined,
    query: { refetchInterval: 3000 },
  });

  const currentAllowance = (allowanceData as bigint) ?? BigInt(0);
  const currentHash = approveHash ?? addLiqHash ?? removeLiqHash;

  // ── Notification effects ──────────────────────────────────────────────────
  useEffect(() => {
    if (isApprovePending || isAddLiqPending || isRemoveLiqPending) {
      onNotification?.('Wallet Action', 'Please sign the transaction in your wallet.', 'loading');
    }
  }, [isApprovePending, isAddLiqPending, isRemoveLiqPending]);

  useEffect(() => {
    if (isApproveConfirming)
      onNotification?.('Approving USDC', 'Waiting for confirmation...', 'loading', approveHash);
    if (isAddLiqConfirming)
      onNotification?.('Adding Liquidity', 'Minting HLV shares...', 'loading', addLiqHash);
    if (isRemoveLiqConfirming)
      onNotification?.('Removing Liquidity', 'Burning HLV shares...', 'loading', removeLiqHash);
  }, [isApproveConfirming, isAddLiqConfirming, isRemoveLiqConfirming]);

  useEffect(() => {
    if (!isApproveConfirmed) return;

    refetchAllowance();

    const amt = pendingAmountRef.current;
    if (!amt) return;

    pendingAmountRef.current = null; // prevent double-fire
    setStatus('DEPOSITING');

    onNotification?.(
      'Approved ✓',
      'Now submitting liquidity deposit...',
      'loading',
      approveHash,
    );

    writeAddLiquidity({
      address: CONTRACTS.VAULT.address,
      abi: VAULT_LP_ABI,
      functionName: 'addLiquidity',
      args: [amt], // raw USDC amount (6 decimals) — contract accepts 6-dec input
    });
  }, [isApproveConfirmed]);

  // ── Success handlers ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isAddLiqSuccess) {
      onNotification?.(
        'Liquidity Added! 🎉',
        'HLV shares minted to your account.',
        'success',
        addLiqHash,
      );
      setStatus('SUCCESS');
      pendingAmountRef.current = null;
      setTimeout(() => setStatus('IDLE'), 3000);
    }
  }, [isAddLiqSuccess]);

  useEffect(() => {
    if (isRemoveLiqSuccess) {
      onNotification?.(
        'Liquidity Removed ✓',
        'USDC returned to your wallet.',
        'success',
        removeLiqHash,
      );
      setStatus('SUCCESS');
      setTimeout(() => setStatus('IDLE'), 3000);
    }
  }, [isRemoveLiqSuccess]);

  // ── Public handlers ───────────────────────────────────────────────────────

  /**
   * Add liquidity (LP deposit).
   * amountStr = USDC amount as a human-readable string e.g. "100"
   */
  const handleDeposit = (amountStr: string) => {
    if (!amountStr || !address) return;

    const usdcAmount = parseUnits(amountStr, 6); // USDC = 6 decimals

    if (currentAllowance >= usdcAmount) {
      // Already approved — go straight to addLiquidity
      setStatus('DEPOSITING');
      writeAddLiquidity({
        address: CONTRACTS.VAULT.address,
        abi: VAULT_LP_ABI,
        functionName: 'addLiquidity',
        args: [usdcAmount],
      });
    } else {
      // Need approval first — store amount so useEffect can fire addLiquidity after
      pendingAmountRef.current = usdcAmount;
      setStatus('APPROVING');
      writeApprove({
        address: CONTRACTS.USDC.address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.VAULT.address, usdcAmount],
      });
    }
  };

  /**
   * Remove liquidity (LP withdraw).
   * sharesStr = HLV shares as a human-readable string e.g. "20.0000"
   */
  const handleWithdraw = (sharesStr: string) => {
    if (!sharesStr || !address) return;

    const shares = parseUnits(sharesStr, 18); // LP shares = 18 decimals
    setStatus('WITHDRAWING');
    writeRemoveLiquidity({
      address: CONTRACTS.VAULT.address,
      abi: VAULT_LP_ABI,
      functionName: 'removeLiquidity',
      args: [shares],
    });
  };

  /**
   * Returns the current UI action state for the deposit button.
   */
  const getActionState = (amountStr: string) => {
    if (!amountStr || parseFloat(amountStr) <= 0) return 'ENTER_AMOUNT';
    try {
      const amt = parseUnits(amountStr, 6);
      return currentAllowance >= amt ? 'READY_TO_DEPOSIT' : 'NEEDS_APPROVAL';
    } catch {
      return 'ENTER_AMOUNT';
    }
  };

  return {
    handleDeposit,
    handleWithdraw,
    getActionState,
    currentHash,
    isLoading:
      isApprovePending ||
      isAddLiqPending ||
      isRemoveLiqPending ||
      isApproveConfirming ||
      isAddLiqConfirming ||
      isRemoveLiqConfirming,
    status,
    isSuccess: isAddLiqSuccess || isRemoveLiqSuccess,
  };
}
