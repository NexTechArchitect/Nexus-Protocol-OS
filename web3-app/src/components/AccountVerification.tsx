'use client';

import React from 'react';
import { useNexusAccount } from '@/hooks/useNexusAccount';

export const AccountVerification = () => {
  const { 
    smartAccount, isConnected, isVerified, 
    verifyAndLogin, isPredicting, isError, isWrongNetwork, handleNetworkSwitch 
  } = useNexusAccount();

  if (!isConnected) return null;

  // 1. If Verified, Show Small Badge (Or nothing, depending on design preference)
  if (isVerified) {
    return (
      <div className="w-full max-w-md p-8 bg-white/80 backdrop-blur-2xl border border-white/50 rounded-[2rem] shadow-xl flex flex-col items-center animate-in zoom-in duration-500">
        <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border border-emerald-100 shadow-sm">
           <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
           </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Authenticated</h2>
        <p className="text-slate-500 font-medium text-xs mt-1 text-center uppercase tracking-wide">Secure Session Active</p>
      </div>
    );
  }

  // 2. If Not Verified, Show Login Card
  return (
    <div className="w-full max-w-md p-8 bg-white/90 backdrop-blur-3xl border border-white rounded-[2rem] shadow-2xl flex flex-col relative transition-all duration-500">
      
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-200 shadow-sm">
          <div className={`w-3 h-3 rounded-full ${isWrongNetwork ? 'bg-red-500' : 'bg-slate-900 animate-pulse'}`} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {isWrongNetwork ? "Network Check" : "Protocol Access"}
          </h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-0.5">
            {isWrongNetwork ? "Switch Chain Required" : "Signature Required"}
          </p>
        </div>
      </div>

      <div className="w-full bg-slate-50/80 p-4 rounded-xl border border-slate-200 mb-8 shadow-inner">
        <div className="flex justify-between items-center mb-2">
           <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Smart Account</span>
           {isPredicting && <span className="w-2 h-2 bg-blue-400 rounded-full animate-ping"/>}
        </div>
        <code className={`text-xs font-mono font-bold break-all block ${isWrongNetwork || isError ? 'text-red-500' : 'text-slate-700'}`}>
          {isWrongNetwork ? "Waiting for Sepolia..." : (isError ? "Connection Error" : (isPredicting && !smartAccount ? "Computing Address..." : smartAccount))}
        </code>
      </div>

      <button 
        onClick={isWrongNetwork ? handleNetworkSwitch : verifyAndLogin}
        className={`w-full py-4 font-bold text-[1rem] rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] ${
          isWrongNetwork 
            ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100' 
            : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20' 
        }`}
      >
        {isWrongNetwork ? "Switch to Sepolia" : "Secure Login"}
      </button>

      <p className="text-center text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-6 opacity-60">
        Gasless Signature Verification
      </p>
    </div>
  );
};